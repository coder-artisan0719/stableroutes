import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/** Best-effort parse of a user agent into a short, readable label. */
export function parseDevice(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";

  // Order matters — Chrome's UA also matches Safari, so check Chrome first.
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";

  const os = /Windows NT/.test(ua)
    ? "Windows"
    : /Macintosh|Mac OS X/.test(ua)
      ? "macOS"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Android/.test(ua)
          ? "Android"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";

  const mobile = /Mobi|Android|iPhone|iPad/.test(ua) ? " (Mobile)" : "";
  return `${browser} on ${os}${mobile}`;
}

/** Loopback, RFC 1918 private, link-local — never geolocatable. */
function isLocalIp(ip: string): boolean {
  if (ip === "::1" || ip === "127.0.0.1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) {
    return true;
  }
  return false;
}

export type GeoLookup = {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
};

/**
 * Look up location for a single IP via a chain of free geolocation APIs.
 * Tries ipwho.is, then ipapi.co, then ip-api.com so a single provider being
 * down or rate-limiting doesn't leave the country blank. Each call is
 * bounded by a short timeout. Returns whatever fields the first successful
 * provider yielded (empty object if all fail or the IP is non-routable).
 */
export async function geolocateIp(ip: string): Promise<GeoLookup> {
  if (!ip || isLocalIp(ip)) return {};
  const encoded = encodeURIComponent(ip);

  // Provider 1: ipwho.is — free, no key, commercial OK.
  try {
    const res = await fetch(`https://ipwho.is/${encoded}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const d = (await res.json()) as {
        success?: boolean;
        ip?: string;
        city?: string;
        region?: string;
        country?: string;
      };
      if (d.success && d.country) {
        return {
          ip: d.ip ?? ip,
          city: d.city || undefined,
          region: d.region || undefined,
          country: d.country,
        };
      }
    }
  } catch {
    // fall through to next provider
  }

  // Provider 2: ipapi.co — free 1k/day, HTTPS, no key.
  try {
    const res = await fetch(`https://ipapi.co/${encoded}/json/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const d = (await res.json()) as {
        ip?: string;
        city?: string;
        region?: string;
        country_name?: string;
        error?: boolean;
      };
      if (!d.error && d.country_name) {
        return {
          ip: d.ip ?? ip,
          city: d.city || undefined,
          region: d.region || undefined,
          country: d.country_name,
        };
      }
    }
  } catch {
    // fall through to next provider
  }

  // Provider 3: ip-api.com — free, HTTP only on the free plan.
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encoded}?fields=status,country,regionName,city,query`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      },
    );
    if (res.ok) {
      const d = (await res.json()) as {
        status?: string;
        country?: string;
        regionName?: string;
        city?: string;
        query?: string;
      };
      if (d.status === "success" && d.country) {
        return {
          ip: d.query ?? ip,
          city: d.city || undefined,
          region: d.regionName || undefined,
          country: d.country,
        };
      }
    }
  } catch {
    // give up
  }

  return { ip };
}

/**
 * Resolve location for the incoming request. First tries to learn the public
 * client IP (server egress in local dev), then geolocates via the provider
 * chain. Used at sign-in time when Vercel's geo headers aren't present.
 */
async function resolveGeo(initialIp: string | undefined): Promise<GeoLookup> {
  let ip = initialIp;

  // Private/loopback addresses are useless for geolocation. In local dev
  // x-forwarded-for is usually absent, so ask a public service for the
  // server's egress IP — that's at least the right hemisphere.
  if (!ip || isLocalIp(ip)) {
    try {
      const res = await fetch("https://api.ipify.org?format=json", {
        cache: "no-store",
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = (await res.json()) as { ip?: string };
        if (data.ip) ip = data.ip;
      }
    } catch {
      // Swallow — we'll just have no IP.
    }
  }

  if (!ip) return {};
  if (isLocalIp(ip)) return { ip };

  const geo = await geolocateIp(ip);
  return { ip: geo.ip ?? ip, city: geo.city, region: geo.region, country: geo.country };
}

/**
 * Persist a successful sign-in with device + IP + location. Uses Vercel's
 * geo headers when present and falls back to a public geolocation API
 * otherwise, so the data is captured in every environment. Never throws —
 * sign-in must not fail because audit logging did.
 */
export async function recordLoginEvent({
  userId,
  provider,
}: {
  userId: string;
  provider: string;
}): Promise<void> {
  try {
    const h = headers();
    const ua = h.get("user-agent");

    const xff = h.get("x-forwarded-for");
    let ip = xff?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined;
    // Strip the IPv6-mapped IPv4 prefix Node sometimes emits ("::ffff:1.2.3.4").
    if (ip?.startsWith("::ffff:")) ip = ip.slice(7);

    const rawCity = h.get("x-vercel-ip-city");
    let city = rawCity ? decodeURIComponent(rawCity) : null;
    let region = h.get("x-vercel-ip-country-region");
    let country = h.get("x-vercel-ip-country");

    // No Vercel headers? Use a public geolocation API as a fallback so we
    // capture real IP + location locally and on non-Vercel hosts too.
    if (!country) {
      const geo = await resolveGeo(ip);
      if (geo.ip) ip = geo.ip;
      if (geo.city) city = geo.city;
      if (geo.region) region = geo.region;
      if (geo.country) country = geo.country;
    }

    await prisma.loginEvent.create({
      data: {
        userId,
        provider,
        device: parseDevice(ua),
        userAgent: ua ?? undefined,
        ip: ip ?? undefined,
        city: city ?? undefined,
        region: region ?? undefined,
        country: country ?? undefined,
      },
    });
  } catch (err) {
    // Keep the user signed in even if the audit insert fails.
    console.error("recordLoginEvent failed", err);
  }
}

/** Format `city`, `region`, `country` into a single location string. */
export function formatLocation(parts: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string {
  const pieces = [parts.city, parts.region, parts.country].filter(
    (s): s is string => Boolean(s),
  );
  return pieces.length ? pieces.join(", ") : "Unknown";
}
