import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * StableRoute brand mark — a combined currency monogram of the initials
 * S and R. The S is rendered as "$" (USD); two horizontal "€" bars (EUR)
 * bridge across to the R, binding both letters into one mark.
 * `currentColor` makes it inherit white inside the gold tile.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* S as USD */}
      <text
        x="6.5"
        y="12.3"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="16"
        fill="currentColor"
      >
        $
      </text>
      {/* R */}
      <text
        x="17"
        y="12.3"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="16"
        fill="currentColor"
      >
        R
      </text>
      {/* euro bars — bridge the S and R, reading as € */}
      <rect x="8.4" y="8.7" width="10.6" height="2" rx="1" fill="currentColor" />
      <rect x="8.4" y="13.5" width="10.6" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  size = "default",
}: {
  className?: string;
  href?: string;
  size?: "sm" | "default" | "lg";
}) {
  const sizes = {
    sm: { box: "h-7 w-7", text: "text-base" },
    default: { box: "h-9 w-9", text: "text-lg" },
    lg: { box: "h-11 w-11", text: "text-2xl" },
  } as const;
  const s = sizes[size];
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2.5 font-display", className)}
    >
      <span
        className={cn(
          "grid place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-white shadow-sm ring-1 ring-amber-500/30",
          s.box,
        )}
        aria-hidden
      >
        <LogoMark className="h-[58%] w-[58%]" />
      </span>
      <span className={cn("font-semibold tracking-tight", s.text)}>
        <span className="text-foreground">Stable</span>
        <span className="text-primary">Route</span>
      </span>
    </Link>
  );
}
