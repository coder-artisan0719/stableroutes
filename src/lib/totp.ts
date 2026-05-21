import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

const ISSUER = "StableRoute";

// Accept codes from the adjacent 30s step too, to tolerate clock drift
// between the customer's phone and the server.
const EPOCH_TOLERANCE_SECONDS = 30;

/** A fresh base32 TOTP secret for a new authenticator enrollment. */
export function generateTwoFactorSecret(): string {
  return generateSecret();
}

/** The `otpauth://` URI an authenticator app reads from a QR code. */
export function buildOtpAuthUrl(email: string, secret: string): string {
  return generateURI({ issuer: ISSUER, label: email, secret });
}

/** Render an `otpauth://` URI as a data-URL QR image for the setup screen. */
export function buildQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
}

/** True when `code` is a valid TOTP for `secret` (digits only, whitespace ignored). */
export async function verifyTotp(code: string, secret: string): Promise<boolean> {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return false;
  try {
    const result = await verify({
      secret,
      token,
      epochTolerance: EPOCH_TOLERANCE_SECONDS,
    });
    return result.valid;
  } catch {
    return false;
  }
}
