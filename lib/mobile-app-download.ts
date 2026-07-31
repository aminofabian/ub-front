/**
 * Kiosk mobile app downloads — manifest types, device detection, helpers.
 *
 * Android APKs + manifest.json live in `public/downloads/mobile/`, staged by
 * `scripts/publish-mobile-downloads.mjs` from EAS build artifacts (see
 * mobile/RELEASE.md). iOS installs only via the App Store, so the manifest
 * carries optional store badge URLs instead. Everything here is client-safe.
 */

export type MobileDeviceOs = "android" | "ios" | "other";

export type MobileAppEntry = {
  /** e.g. "shopper" */
  id: string;
  /** e.g. "Kiosk Shopper" */
  name: string;
  version: string;
  platform: "android";
  /** Filename relative to /downloads/mobile/ */
  file: string;
  sizeBytes: number;
};

export type MobileAppManifest = {
  generatedAt: string;
  storeLinks: {
    ios: string | null;
    android: string | null;
  };
  apps: MobileAppEntry[];
};

export const MOBILE_APP_DOWNLOADS_BASE = "/downloads/mobile";

export const MOBILE_APP_MANIFEST_URL = `${MOBILE_APP_DOWNLOADS_BASE}/manifest.json`;

/** What each app is for — shown on the download page. */
export const MOBILE_APP_DESCRIPTIONS: Record<string, string> = {
  shopper: "Browse shops and order from your phone",
  cashier: "Sell at the counter — scan, M-Pesa, receipts",
  admin: "Run your business from your pocket",
  stock: "Inventory, stock takes, and receiving",
  grocery: "Grocery counter mode for fresh produce",
};

export function mobileAppInstallerUrl(app: MobileAppEntry): string {
  return `${MOBILE_APP_DOWNLOADS_BASE}/${app.file}`;
}

/** Detect the visitor's phone/tablet OS. Desktops resolve to "other". */
export function detectMobileDeviceOs(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : "",
): MobileDeviceOs {
  const s = ua || "";
  if (/Android/i.test(s)) return "android";
  if (/iPhone|iPad|iPod/i.test(s)) return "ios";
  return "other";
}

/** Fetch the published manifest; null when none is published on this host. */
export async function fetchMobileAppManifest(): Promise<MobileAppManifest | null> {
  try {
    const res = await fetch(MOBILE_APP_MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as MobileAppManifest;
    if (!Array.isArray(data.apps)) return null;
    return data;
  } catch {
    return null;
  }
}
