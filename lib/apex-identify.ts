import { type PublicShopSearchResult } from "@/lib/api";
import { apiUrl } from "@/lib/config";

/**
 * Phase 4 apex "one door" — tenant-agnostic phone identification (§8, §13).
 * The apex verifies a phone once platform-wide (no tenant host needed), then
 * lists the shops that phone has a customer record in so the apex can forward
 * to the right shop host. Never authenticates: the OTP + PIN round trip still
 * happens on the shop host.
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
 * The shops a platform-verified phone has a customer record in. An empty list
 * is a valid (and privacy-preserving) answer — the sheet shows a generic,
 * non-confirming message (§12).
 */
export async function fetchShopperShops(
  phone: string,
  phoneVerificationToken: string,
): Promise<PublicShopSearchResult[]> {
  const p = phone.trim();
  const t = phoneVerificationToken.trim();
  if (!p || !t) return [];
  try {
    const response = await fetch(apiUrl("/api/v1/public/shopper/auth/shops"), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ phone: p, phoneVerificationToken: t }),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) return [];
    return (payload as PublicShopSearchResult[]).filter(
      (row) =>
        row &&
        typeof row === "object" &&
        typeof row.slug === "string" &&
        row.slug.trim() !== "" &&
        typeof row.name === "string",
    );
  } catch {
    return [];
  }
}
