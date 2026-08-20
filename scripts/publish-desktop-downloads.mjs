#!/usr/bin/env node
/**
 * Publish Kiosk Desktop installers into public/downloads/desktop/.
 *
 * Collects the newest Tauri bundle per (os, arch) from:
 *   - desktop/src-tauri/target/release/bundle/**        (fresh `cargo tauri build`)
 *   - desktop/src-tauri/target/<triple>/release/bundle/** (targeted builds)
 *   - desktop/*.dmg / *.msi / *.exe / *.AppImage / *.deb  (local artifacts)
 *
 * Copies each with a normalized, URL-safe name and writes manifest.json,
 * which /download and the landing page read at runtime.
 *
 * Files ≥ 95 MB exceed GitHub's push limit and are gitignored. The manifest's
 * `url` field points at GitHub Releases by default (tag `desktop-v<version>`,
 * derived from the git `origin` remote). Override with DESKTOP_DOWNLOAD_BASE_URL
 * to use a custom CDN / self-hosted prefix instead.
 *
 * Run: node scripts/publish-desktop-downloads.mjs
 *      (or `bun run pack:desktop-downloads`)
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
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { releaseBaseUrl } from "./release-base-url.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(__dirname, "..");
const REPO = join(FRONTEND, "..");
const DESKTOP = join(REPO, "desktop");
const OUT = join(FRONTEND, "public", "downloads", "desktop");
const MANIFEST = join(OUT, "manifest.json");

/** Soft ceiling matching GitHub's hard 100 MB blob limit (with headroom). */
const GIT_SAFE_BYTES = 95 * 1024 * 1024;

const INSTALLER_EXTS = new Set([".dmg", ".msi", ".exe", ".appimage", ".deb"]);

const PLATFORM_LABELS = {
  "macos-aarch64": "macOS (Apple Silicon)",
  "macos-x86_64": "macOS (Intel)",
  "windows-x86_64": "Windows (64-bit)",
  "windows-aarch64": "Windows (ARM)",
  "linux-x86_64": "Linux (64-bit)",
  "linux-aarch64": "Linux (ARM)",
};

function tauriVersion() {
  const conf = JSON.parse(
    readFileSync(join(DESKTOP, "src-tauri", "tauri.conf.json"), "utf8"),
  );
  return conf.version ?? "0.0.0";
}

function osForExt(ext) {
  if (ext === ".dmg") return "macos";
  if (ext === ".msi" || ext === ".exe") return "windows";
  return "linux"; // .appimage / .deb
}

function archFromName(name) {
  const s = name.toLowerCase();
  if (/aarch64|arm64/.test(s)) return "aarch64";
  if (/x86_64|x64|amd64/.test(s)) return "x86_64";
  return null;
}

/** Fallback when the filename carries no arch hint: assume the build host's arch. */
function hostArch() {
  return process.arch === "arm64" ? "aarch64" : "x86_64";
}

function* walkInstallers(dir, depth = 0) {
  if (!existsSync(dir) || depth > 6) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip .app bundles and other bundle-shaped directories.
      if (entry.name.endsWith(".app")) continue;
      yield* walkInstallers(full, depth + 1);
    } else if (INSTALLER_EXTS.has(extname(entry.name).toLowerCase())) {
      yield full;
    }
  }
}

function collectCandidates() {
  const roots = [join(DESKTOP, "src-tauri", "target")];
  const candidates = [];

  for (const root of roots) {
    for (const file of walkInstallers(root)) {
      // Only pick from release bundle output, not debug builds.
      if (!file.includes(`${join("release", "bundle")}`)) continue;
      candidates.push(file);
    }
  }

  // Local artifacts sitting directly in desktop/ (e.g. a built NSIS installer).
  if (existsSync(DESKTOP)) {
    for (const entry of readdirSync(DESKTOP, { withFileTypes: true })) {
      if (
        entry.isFile() &&
        INSTALLER_EXTS.has(extname(entry.name).toLowerCase())
      ) {
        candidates.push(join(DESKTOP, entry.name));
      }
    }
  }

  return candidates;
}

function main() {
  const version = tauriVersion();
  const candidates = collectCandidates();
  const baseUrl = releaseBaseUrl(
    "DESKTOP_DOWNLOAD_BASE_URL",
    `desktop-v${version}`,
  );

  if (candidates.length === 0) {
    console.error(
      "No desktop installers found. Build one first (see desktop/README.md) " +
        "or drop a .dmg/.msi/.exe/.AppImage/.deb into desktop/.",
    );
    process.exit(1);
  }

  // Newest file wins per (os, arch).
  const byPlatform = new Map();
  for (const file of candidates) {
    const ext = extname(file).toLowerCase();
    const os = osForExt(ext);
    const arch = archFromName(file) ?? (os === "macos" ? hostArch() : "x86_64");
    const key = `${os}-${arch}`;
    const mtime = statSync(file).mtimeMs;
    const prev = byPlatform.get(key);
    if (!prev || mtime > prev.mtime) {
      byPlatform.set(key, { file, ext, os, arch, mtime });
    }
  }

  mkdirSync(OUT, { recursive: true });

  const platforms = [];
  const keepNames = new Set(["manifest.json"]);
  const tooLarge = [];

  for (const [key, cand] of [...byPlatform.entries()].sort()) {
    const outName = `kiosk-desktop-${version}-${key}${cand.ext === ".appimage" ? ".AppImage" : cand.ext}`;
    const outPath = join(OUT, outName);
    copyFileSync(cand.file, outPath);
    keepNames.add(outName);
    const sizeBytes = statSync(outPath).size;
    const entry = {
      id: key,
      os: cand.os,
      arch: cand.arch,
      label: PLATFORM_LABELS[key] ?? key,
      file: outName,
      sizeBytes,
    };
    if (baseUrl) {
      entry.url = `${baseUrl}/${outName}`;
    }
    platforms.push(entry);
    const mb = (sizeBytes / 1024 / 1024).toFixed(1);
    console.log(`Published ${outName} (${mb} MB) from ${cand.file}`);
    if (sizeBytes >= GIT_SAFE_BYTES) {
      tooLarge.push({ outName, mb });
    }
  }

  // Remove stale installers from previous versions.
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
        product: "Kiosk Desktop",
        version,
        generatedAt: new Date().toISOString(),
        platforms,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Wrote ${MANIFEST}`);

  if (tooLarge.length > 0) {
    console.warn("");
    console.warn(
      "⚠ These installers are ≥ 95 MB and must NOT be committed to git",
    );
    console.warn("  (GitHub rejects blobs over 100 MB). They are gitignored.");
    for (const f of tooLarge) {
      console.warn(`  - ${f.outName} (${f.mb} MB)`);
    }
    console.warn("");
    if (baseUrl) {
      console.warn(
        `  Upload them to the "desktop-v${version}" release on GitHub;`,
      );
      console.warn(`  the manifest already points at ${baseUrl}/…`);
    } else {
      console.warn(
        "  No GitHub remote detected — set DESKTOP_DOWNLOAD_BASE_URL to",
      );
      console.warn("  your Releases/CDN prefix so the manifest gets real URLs.");
    }
  }
}

main();
