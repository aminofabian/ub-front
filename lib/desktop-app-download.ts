/**
 * Kiosk Desktop installer downloads — manifest types, OS detection, helpers.
 *
 * Installers + manifest.json live in `public/downloads/desktop/`, staged by
 * `scripts/publish-desktop-downloads.mjs` from the Tauri build output
 * (see `desktop/README.md`). Everything here is client-safe.
 */

export type DesktopAppOs = "macos" | "windows" | "linux" | "unknown";

export type DesktopAppPlatform = {
  /** e.g. "macos-aarch64" */
  id: string;
  os: Exclude<DesktopAppOs, "unknown">;
  arch: string;
  /** Human label, e.g. "macOS (Apple Silicon)" */
  label: string;
  /** Filename relative to /downloads/desktop/ */
  file: string;
  sizeBytes: number;
  /**
   * Absolute download URL when the binary is hosted outside this repo
   * (GitHub Releases / CDN). Prefer this over `/downloads/desktop/{file}`.
   */
  url?: string | null;
};

export type DesktopAppManifest = {
  product: string;
  version: string;
  generatedAt: string;
  platforms: DesktopAppPlatform[];
};

export const DESKTOP_APP_DOWNLOADS_BASE = "/downloads/desktop";

export const DESKTOP_APP_MANIFEST_URL = `${DESKTOP_APP_DOWNLOADS_BASE}/manifest.json`;

export function desktopAppInstallerUrl(platform: DesktopAppPlatform): string {
  if (platform.url) return platform.url;
  return `${DESKTOP_APP_DOWNLOADS_BASE}/${platform.file}`;
}

/** Detect the visitor's desktop OS. Phones/tablets resolve to "unknown". */
export function detectDesktopAppOs(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : "",
): DesktopAppOs {
  const s = ua || "";
  if (/Android|iPhone|iPad|iPod/i.test(s)) return "unknown";
  if (/Windows/i.test(s)) return "windows";
  if (/Mac OS X|Macintosh/i.test(s)) return "macos";
  if (/Linux|X11/i.test(s)) return "linux";
  return "unknown";
}

export function desktopAppOsLabel(os: DesktopAppOs): string {
  switch (os) {
    case "macos":
      return "macOS";
    case "windows":
      return "Windows";
    case "linux":
      return "Linux";
    default:
      return "your computer";
  }
}

/** Installers matching the given OS, in manifest order. */
export function desktopAppPlatformsForOs(
  manifest: DesktopAppManifest,
  os: DesktopAppOs,
): DesktopAppPlatform[] {
  return manifest.platforms.filter((p) => p.os === os);
}

export function formatInstallerSize(sizeBytes: number): string {
  const mb = sizeBytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(1)} MB`;
}

/** Fetch the published manifest; null when none is published on this host. */
export async function fetchDesktopAppManifest(): Promise<DesktopAppManifest | null> {
  try {
    const res = await fetch(DESKTOP_APP_MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as DesktopAppManifest;
    if (!Array.isArray(data.platforms)) return null;
    return data;
  } catch {
    return null;
  }
}
