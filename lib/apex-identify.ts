import {
  parseSignInDestinations,
  type PublicSignInDestination,
} from "@/lib/api";
import { apiUrl } from "@/lib/config";

/**
 * Phase 4 apex identity — tenant-agnostic phone identification.
 * The apex verifies a phone once platform-wide, then lists destinations
 * (shopper shops, staff tills, supplier portal) so the sheet can forward
 * without asking shopper vs merchant. Never authenticates: PIN/password
 * still happen on the destination host.
 */

export type ApexIdentifySendResult = {
  phone: string;
  maskedHint?: string;
  channel?: string;
};

export async function sendShopperIdentifyCode(
  phone: string,
): Promise<ApexIdentifySendResult | null> {
  const p = phone.trim();
  if (p.length < 9) return null;
  try {
    const response = await fetch(apiUrl("/api/v1/public/shopper/auth/identify/send-code"), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ phone: p }),
    });
    if (!response.ok) return null;
    return (await response.json()) as ApexIdentifySendResult;
  } catch {
    return null;
  }
}

export type ApexIdentifyVerifyResult = {
  phoneVerificationToken: string;
  expiresAt?: string;
};

export async function verifyShopperIdentifyCode(
  phone: string,
  code: string,
): Promise<ApexIdentifyVerifyResult | null> {
  const p = phone.trim();
  const c = code.replace(/\D/g, "");
  if (p.length < 9 || c.length < 4) return null;
  try {
    const response = await fetch(apiUrl("/api/v1/public/shopper/auth/identify/verify-code"), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ phone: p, code: c }),
    });
    if (!response.ok) return null;
    return (await response.json()) as ApexIdentifyVerifyResult;
  } catch {
    return null;
  }
}

/**
 * Destinations for a platform-verified phone (shopper + staff + supplier).
 * Empty list is valid and privacy-preserving.
 */
export async function fetchSignInDestinationsByPhone(
  phone: string,
  phoneVerificationToken: string,
): Promise<PublicSignInDestination[]> {
  const p = phone.trim();
  const t = phoneVerificationToken.trim();
  if (!p || !t) return [];
  try {
    const response = await fetch(apiUrl("/api/v1/public/shopper/auth/destinations"), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ phone: p, phoneVerificationToken: t }),
    });
    if (!response.ok) return [];
    return parseSignInDestinations(await response.json());
  } catch {
    return [];
  }
}

/** @deprecated Prefer {@link fetchSignInDestinationsByPhone}. */
export async function fetchShopperShops(
  phone: string,
  phoneVerificationToken: string,
): Promise<PublicSignInDestination[]> {
  const rows = await fetchSignInDestinationsByPhone(phone, phoneVerificationToken);
  return rows.filter((row) => row.door === "SHOPPER");
}
