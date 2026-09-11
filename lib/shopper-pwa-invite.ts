import { STORAGE_KEYS } from "@/lib/config";

export type ShopperPwaInviteRecord = "installed" | "dismissed";

export function shopperPwaInviteKey(slug: string): string {
  return STORAGE_KEYS.shopperPwaInvite(slug.trim().toLowerCase());
}

export function readShopperPwaInviteRecord(
  slug: string,
): ShopperPwaInviteRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(shopperPwaInviteKey(slug));
    if (raw === "installed" || raw === "dismissed") return raw;
    return null;
  } catch {
    return null;
  }
}

export function writeShopperPwaInviteRecord(
  slug: string,
  record: ShopperPwaInviteRecord,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(shopperPwaInviteKey(slug), record);
  } catch {
    /* private mode / quota */
  }
}

export function shouldShowShopperPwaInvite(input: {
  slug: string;
  standalone: boolean;
}): boolean {
  if (!input.slug.trim()) return false;
  if (input.standalone) return false;
  const record = readShopperPwaInviteRecord(input.slug);
  return record !== "installed" && record !== "dismissed";
}
