#!/usr/bin/env node
/**
 * Shared helper for the download publish scripts: derive the base URL for a
 * GitHub Releases download prefix.
 *
 * Resolution order:
 *   1. Explicit env override (DESKTOP_DOWNLOAD_BASE_URL /
 *      MOBILE_DOWNLOAD_BASE_URL) — use this for a custom CDN or self-hosted
 *      mirror.
 *   2. The git `origin` remote of this repo, combined with the given release
 *      tag — e.g. https://github.com/<owner>/<repo>/releases/download/<tag>.
 *   3. null — callers then omit the manifest `url` field (local/dev only).
 */

import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, ".."); // frontend/ (git work root)

export function releaseBaseUrl(envName, tag) {
  const override = (process.env[envName] || "").replace(/\/+$/, "");
  if (override) return override;

  const remote = originOwnerRepo();
  if (!remote) return null;

  return `https://github.com/${remote.owner}/${remote.repo}/releases/download/${tag}`;
}

function originOwnerRepo() {
  try {
    const url = execSync("git config --get remote.origin.url", {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
    const match = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}
