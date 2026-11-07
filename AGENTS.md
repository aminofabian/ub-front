<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:kiosk-frontend-rules (hand-maintained; outside the Next.js managed block) -->
## Kiosk frontend rules

Also read `../AGENTS.md` (workspace rules) and `../PRODUCT.md`. Design context: `DESIGN.md`; the `grocery` skill covers the grocery POS on iPad Safari.

- **Package manager is unresolved.** `bun.lock`, `package-lock.json` and `pnpm-lock.yaml` all exist and `package.json` has no `packageManager` field. The production `Dockerfile` runs `npm ci || npm install`; `package-lock.json` is out of sync with `package.json` (it lacks `jsbarcode` and `jspdf`), so `npm ci` fails and the image silently falls back to `npm install`. Do not add or upgrade dependencies or regenerate any lockfile until the owner chooses one manager.
- **Checks.** `node_modules/.bin/tsc --noEmit --incremental false` (tests are excluded from `tsconfig`, so they are not type-checked), `npm run lint`, `bun test`. `npm run build` also runs `scripts/verify-legacy-safe.mjs`, which fails the build on syntax that breaks iPadOS 15 / Safari 15 (static blocks, regex lookbehind, …). Keep `browserslist` and that guard intact.
- **API.** All backend calls go through the proxy (`app/api/v1/[[...path]]`, `lib/api.ts`) and carry the tenant headers (`X-Tenant-Id` / `X-Tenant-Host`). Tokens live in httpOnly cookies — never in JS-readable storage. Mutating calls send a UUIDv7 `Idempotency-Key`; sales queue in an offline outbox (`lib/sale-outbox.ts`), so UI and code must tolerate replays.
- **Generated types.** `lib/generated/phase-1-api.ts` comes from `../docs/openapi/phase-1.yaml` via `npm run codegen`. Never hand-edit it; change the YAML, then regenerate.
- **CSP.** `next.config.ts` sets a strict Content-Security-Policy. A new third-party origin means an explicit allow-list change, and the user's approval.
- **Two build targets.** The server build uses `middleware.ts` and `app/api/**` route handlers. The desktop build (`npm run build:desktop`, `scripts/build-desktop.mjs`) is a static export (`output: 'export'`), which cannot contain middleware or route handlers. Read that script before touching `middleware.ts`, `middleware.ts.cloud-only`, `app/api/**` or `next.config.ts`.
- **Copy and UI.** en-KE, KES. No invented pricing, testimonials or accessibility claims (see `../PRODUCT.md`). Match the existing component and token patterns (shadcn/Radix, Tailwind 4) before adding new ones.
<!-- END:kiosk-frontend-rules -->
