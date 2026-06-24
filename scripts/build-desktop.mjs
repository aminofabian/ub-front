#!/usr/bin/env node
/**
 * Desktop static-export builder.
 *
 * `output: 'export'` is incompatible with Next.js middleware, route handlers,
 * and any page that exports `runtime` / `dynamic`. Rather than litter the
 * cloud code with `isDesktop` guards (which would still leave the offending
 * files on disk for Next to compile), this script:
 *
 *   1. Moves each cloud-only path aside to a `.cloud-only` sibling.
 *   2. Runs `next build` with `NEXT_PUBLIC_RUNTIME=desktop`.
 *   3. Restores everything in a `finally`, even on Ctrl-C / crash.
 *
 * The resulting static site lives in `frontend/out/`. The backend Gradle
 * `copyDesktopUi` task then drops it into the fat JAR's
 * `src/main/resources/static/` so Spring serves it on `:5050`.
 *
 * Cloud builds (`bun run build`) are unaffected — this script is never run.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const FRONTEND_ROOT = resolve(dirname(SELF), "..");

// Stash dir is *outside* the project so the Next.js compiler never sees it.
// Renaming files in place with a `.cloud-only` suffix doesn't work because
// the suffix becomes part of a route segment (e.g. `(dashboard)/storefront`
// → `(dashboard)/storefront.cloud-only`) and Next still tries to compile it.
const STASH_DIR = resolve(FRONTEND_ROOT, ".desktop-build-stash");

/**
 * Files / directories that must not exist during a desktop static export.
 *
 * Keep this list minimal — every entry adds a moving part. Anything that can
 * be fenced via a runtime check should be fenced inside the source file, not
 * shuffled around here.
 */
const CLOUD_ONLY_PATHS = [
  // Next.js refuses `output: 'export'` if middleware.ts exists at all.
  "middleware.ts",
  // BFF proxy — irrelevant to desktop; Spring serves /api/* directly.
  "app/api/v1/[[...path]]/route.ts",
  // Per-tenant SVG favicon endpoint — single-tenant desktop uses a static favicon.
  "app/tenant-favicon/route.ts",
  // Dynamic per-tenant <link rel="icon"> generator. Reads `headers()` and
  // optionally fetches a remote favicon, both impossible at static-export
  // time. Desktop falls back to the bundled `app/favicon.ico`.
  "app/icon.tsx",
  // Customer-facing storefront pages (server components with generateMetadata
  // calling `headers()`); the desktop SKU explicitly hides the storefront.
  "app/[sku]",
  "app/shop",
  // Accidental Finder duplicate — same routes as `app/shop`; must not ship.
  "app/shop 2",
  // Super-admin console — multi-tenant only.
  "app/super-admin",
  // Online-order dashboard for the storefront — irrelevant when the storefront
  // is disabled. Stashing the whole subtree avoids dealing with the
  // `[orderId]` dynamic route.
  "app/(dashboard)/storefront",
  // Public payment-claim link landing page (sent via email). Desktop has no
  // outbound email, so this URL is never produced.
  "app/public/credits/payment-claims/[token]",
  // Dashboard dynamic routes that are reached via SPA navigation. Spring's
  // SPA fallback serves `/index.html` for hard refreshes on these paths and
  // the client router takes over. `output: 'export'` requires every dynamic
  // route to declare `generateStaticParams()`; we'd have to refactor these
  // `"use client"` pages into server wrappers to add it, which is more
  // invasive than just keeping them out of the static build.
  "app/(dashboard)/customers/[customerId]",
  "app/(dashboard)/categories/[slug]",
  "app/(dashboard)/inventory/stock-take/review/[id]",
  "app/(dashboard)/inventory/supply-batches/[id]",
  // Payment-gateway settings (KopoKopo STK config + simulator). The nav entry
  // for these pages is already hidden via DESKTOP_HIDDEN_NAV_HREFS in
  // app-shell.tsx, but stashing the routes ensures they're not even reachable
  // by typing the URL — there's no STK gateway on a desktop install to configure.
  "app/(dashboard)/payments",
];

const swapped = [];

function abs(rel) {
  return join(FRONTEND_ROOT, rel);
}

function stashPathFor(rel) {
  return join(STASH_DIR, rel);
}

function moveAside(rel) {
  const from = abs(rel);
  const to = stashPathFor(rel);
  if (!existsSync(from)) {
    return;
  }
  if (existsSync(to)) {
    throw new Error(
      `Cannot stash ${rel}: ${to} already exists (likely from a previous interrupted build). Resolve manually.`,
    );
  }
  mkdirSync(dirname(to), { recursive: true });
  renameSync(from, to);
  swapped.push(rel);
}

function restoreAll() {
  // Restore in reverse order so nested paths come back before their parents.
  const remaining = [...swapped].reverse();
  if (remaining.length > 0) {
    console.log(
      `[build-desktop] restoring ${remaining.length} stashed path(s)...`,
    );
  }
  for (const rel of remaining) {
    const from = stashPathFor(rel);
    const to = abs(rel);
    if (!existsSync(from)) {
      console.warn(`[build-desktop] stash entry missing, skipping: ${rel}`);
      continue;
    }
    try {
      // Ensure the destination parent directory exists (it may have been
      // deleted by a prior restore of a parent path).
      mkdirSync(dirname(to), { recursive: true });
      renameSync(from, to);
    } catch (err) {
      console.error(
        `[build-desktop] failed to restore ${rel}:`,
        err.message ?? err,
      );
    }
  }
  swapped.length = 0;
  // Best-effort cleanup of the empty stash dir.
  if (existsSync(STASH_DIR)) {
    try {
      rmSync(STASH_DIR, { recursive: true, force: true });
      console.log("[build-desktop] stash directory cleaned up.");
    } catch (err) {
      console.warn(
        "[build-desktop] could not remove stash directory:",
        err.message ?? err,
      );
    }
  }
}

function runNextBuild() {
  // Prefer bun when available so we honour the project's lockfile, but fall
  // back to npx so this still works on a CI runner without bun.
  const runner = process.env.DESKTOP_BUILD_RUNNER ?? "bun";
  const args = runner === "bun" ? ["run", "build"] : ["next", "build"];
  const result = spawnSync(runner, args, {
    cwd: FRONTEND_ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_RUNTIME: "desktop",
      // The cloud build bakes a remote backend origin into the bundle for
      // WebSocket use. Desktop is same-origin, so strip it explicitly.
      NEXT_PUBLIC_REALTIME_WS_ORIGIN: "",
      NEXT_PUBLIC_API_BASE_URL: "",
      BACKEND_ORIGIN: "",
    },
  });
  if (result.status !== 0) {
    throw new Error(`next build (${runner}) exited with code ${result.status}`);
  }
}

let exitCode = 0;
const onSignal = (signal) => {
  console.error(`\n[build-desktop] received ${signal}, restoring files...`);
  restoreAll();
  process.exit(130);
};
process.on("SIGINT", () => onSignal("SIGINT"));
process.on("SIGTERM", () => onSignal("SIGTERM"));

try {
  for (const rel of CLOUD_ONLY_PATHS) {
    moveAside(rel);
  }
  runNextBuild();
} catch (err) {
  console.error("[build-desktop]", err instanceof Error ? err.message : err);
  exitCode = 1;
} finally {
  restoreAll();
}

process.exit(exitCode);
