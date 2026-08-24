import {
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

function parseDestinations(payload: unknown): PublicSignInDestination[] {
  if (!Array.isArray(payload)) return [];
  const out: PublicSignInDestination[] = [];
  for (const row of payload) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const doorRaw = typeof r.door === "string" ? r.door.trim().toUpperCase() : "";
    const door =
      doorRaw === "STAFF" || doorRaw === "SHOPPER" || doorRaw === "SUPPLIER"
        ? doorRaw
        : null;
    if (!door) continue;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!name) continue;
    const slug = typeof r.slug === "string" ? r.slug.trim() : "";
    if (door !== "SUPPLIER" && !slug) continue;
    out.push({
      slug: slug || undefined,
      name,
      logoUrl: typeof r.logoUrl === "string" ? r.logoUrl : null,
      primaryHost: typeof r.primaryHost === "string" ? r.primaryHost : null,
      door,
    });
  }
  return out;
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
    return parseDestinations(await response.json());
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
