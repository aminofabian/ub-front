import { applyAuthSessionPayload, type AuthSessionClaims } from "@/lib/auth";
import {
  parseSignInDestinations,
  type PublicSignInDestination,
} from "@/lib/api";

const SHOPS_PATH = "/api/v1/auth/oauth/google/shops";
const COMPLETE_PATH = "/api/v1/auth/oauth/google/complete";

export const GOOGLE_SHOP_PICK_PARAM = "googleShopPick";

export type GoogleShopPick = {
  email: string;
  destinations: PublicSignInDestination[];
};

export type CompletedGoogleShopPick = {
  slug: string | null;
  nextPath: string | null;
  returnHost: string | null;
  businessId: string | null;
};

/** Staff shops only — the same list password sign-in offers on the apex. */
export function staffShopsFromPayload(payload: unknown): PublicSignInDestination[] {
  if (!payload || typeof payload !== "object") return [];
  const destinations = (payload as { destinations?: unknown }).destinations;
  return parseSignInDestinations(destinations).filter(
    (row) => row.door === "STAFF" && Boolean(row.slug?.trim()),
  );
}

export function googleShopPickErrorMessage(detail: string): string {
  switch (detail.trim()) {
    case "expired_state":
    case "invalid_state":
    case "binding_mismatch":
      return "That Google sign-in expired. Try again.";
    case "unknown_shop":
      return "That shop is not linked to this Google account.";
    case "":
      return "Could not sign in to that shop. Try again.";
    default:
      return detail;
  }
}

export async function fetchGoogleShopPick(): Promise<GoogleShopPick | null> {
  const response = await fetch(SHOPS_PATH, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const body = (await response.json().catch(() => null)) as {
    email?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const destinations = staffShopsFromPayload(body);
  if (!email || destinations.length === 0) return null;
  return { email, destinations };
}

export async function completeGoogleShopPick(
  slug: string,
): Promise<CompletedGoogleShopPick> {
  const response = await fetch(COMPLETE_PATH, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ slug }),
  });
  const payload = (await response.json().catch(() => null)) as {
    detail?: unknown;
    slug?: unknown;
    nextPath?: unknown;
    returnHost?: unknown;
    session?: AuthSessionClaims;
  } | null;
  if (!response.ok || !payload) {
    const detail = typeof payload?.detail === "string" ? payload.detail : "";
    throw new Error(googleShopPickErrorMessage(detail));
  }
  if (!applyAuthSessionPayload(payload, { signIn: true })) {
    throw new Error("Could not sign in to that shop. Try again.");
  }
  const businessId = payload.session?.businessId;
  return {
    slug: typeof payload.slug === "string" ? payload.slug : null,
    nextPath: typeof payload.nextPath === "string" ? payload.nextPath : null,
    returnHost: typeof payload.returnHost === "string" ? payload.returnHost : null,
    businessId: typeof businessId === "string" ? businessId : null,
  };
}
