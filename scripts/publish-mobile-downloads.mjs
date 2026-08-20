#!/usr/bin/env node
/**
 * Publish Kiosk mobile (Android APK) installers into public/downloads/mobile/.
 *
 * APKs are built with EAS (`eas build --profile preview --platform android`,
 * see mobile/RELEASE.md). Download the artifact and drop it in one of:
 *   - mobile/artifacts/            (filename must contain the app id,
 *                                   e.g. kiosk-shopper.apk)
 *   - mobile/apps/<app>/           (`eas build --local` output; app id
 *                                   comes from the directory)
 *
 * The newest APK per app wins. Each is copied here with a normalized name
 * and manifest.json is written, which /download reads at runtime.
 *
 * The manifest's `url` field is kept from the previous manifest for unchanged
 * versions, or auto-derived from GitHub Releases (tag `mobile-v<version>`,
 * from the git `origin` remote) for new builds. Override with
 * MOBILE_DOWNLOAD_BASE_URL to use a custom CDN / self-hosted prefix.
 *
 * iOS has no sideload path — App Store / Play Store badge URLs can be
 * injected via APP_MOBILE_STORE_LINK_IOS / APP_MOBILE_STORE_LINK_ANDROID
 * env vars when running this script.
 *
 * Run: node scripts/publish-mobile-downloads.mjs
 *      (or `bun run pack:mobile-downloads`)
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { releaseBaseUrl } from "./release-base-url.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(__dirname, "..");
const MOBILE = join(FRONTEND, "..", "mobile");
const OUT = join(FRONTEND, "public", "downloads", "mobile");
const MANIFEST = join(OUT, "manifest.json");

const APPS = {
  shopper: "Kiosk Shopper",
  cashier: "Kiosk Cashier",
  admin: "Kiosk Admin",
  stock: "Kiosk Stock",
  grocery: "Kiosk Grocery",
};

function appVersion(appId) {
  try {
    const pkg = JSON.parse(
      readFileSync(join(MOBILE, "apps", appId, "package.json"), "utf8"),
    );
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function apksIn(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".apk"))
    .map((e) => join(dir, e.name));
}

function appIdFromName(name) {
  const s = name.toLowerCase();
  return Object.keys(APPS).find((id) => s.includes(id)) ?? null;
}

function collectCandidates() {
  const candidates = [];

  for (const file of apksIn(join(MOBILE, "artifacts"))) {
    const appId = appIdFromName(file);
    if (!appId) {
      console.warn(
        `Skipping ${file} — filename must contain one of: ${Object.keys(APPS).join(", ")}`,
      );
      continue;
    }
    candidates.push({ appId, file });
  }

  for (const appId of Object.keys(APPS)) {
    for (const file of apksIn(join(MOBILE, "apps", appId))) {
      candidates.push({ appId, file });
    }
  }

  return candidates;
}

function main() {
  const candidates = collectCandidates();
  // If a previous manifest exists (e.g. we manually injected an Expo artifact
  // URL for a non-apk installer), preserve its optional `url` field.
  let prevManifest = null;
  try {
    if (existsSync(MANIFEST)) {
      prevManifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
    }
  } catch {
    prevManifest = null;
  }

  // Newest APK wins per app.
  const byApp = new Map();
  for (const cand of candidates) {
    const mtime = statSync(cand.file).mtimeMs;
    const prev = byApp.get(cand.appId);
    if (!prev || mtime > prev.mtime) {
      byApp.set(cand.appId, { ...cand, mtime });
    }
  }

  mkdirSync(OUT, { recursive: true });

  const apps = [];
  const keepNames = new Set(["manifest.json"]);

  for (const appId of Object.keys(APPS)) {
    const cand = byApp.get(appId);
    if (!cand) continue;
    const version = appVersion(appId);
    const outName = `kiosk-${appId}-${version}-android.apk`;
    const outPath = join(OUT, outName);
    copyFileSync(cand.file, outPath);
    keepNames.add(outName);
    const sizeBytes = statSync(outPath).size;
    const prevApp = prevManifest?.apps?.find((a) => a?.id === appId);
    const baseUrl = releaseBaseUrl("MOBILE_DOWNLOAD_BASE_URL", `mobile-v${version}`);
    const url =
      (prevApp && prevApp.version === version && prevApp.url) ||
      (baseUrl ? `${baseUrl}/${outName}` : undefined);
    apps.push({
      id: appId,
      name: APPS[appId],
      version,
      platform: "android",
      file: outName,
      url,
      sizeBytes,
    });
    console.log(
      `Published ${outName} (${(sizeBytes / 1024 / 1024).toFixed(1)} MB) from ${cand.file}`,
    );
  }

  if (apps.length === 0) {
    console.warn(
      "No APKs found — writing an empty manifest. Build one with EAS " +
        "(mobile/RELEASE.md) and drop it in mobile/artifacts/.",
    );
  }

  // Remove stale APKs from previous versions.
  for (const entry of readdirSync(OUT)) {
    if (!keepNames.has(entry)) {
      rmSync(join(OUT, entry), { recursive: true, force: true });
      console.log(`Removed stale ${entry}`);
    }
  }

  writeFileSync(
    MANIFEST,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        storeLinks: {
          ios: process.env.APP_MOBILE_STORE_LINK_IOS || null,
          android: process.env.APP_MOBILE_STORE_LINK_ANDROID || null,
        },
        apps,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Wrote ${MANIFEST}`);
}

main();
