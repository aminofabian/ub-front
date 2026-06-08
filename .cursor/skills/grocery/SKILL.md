---
name: grocery
description: >-
  Maintain and debug the grocery clerk POS at /grocery on iPad Safari and custom
  tenant domains (e.g. palmart.co.ke). Use when fixing grocery login, session,
  branch loading, API calls, kiosk layout, or iPad-specific regressions on the
  grocery counter or grocery invoices routes.
---

# Grocery POS (`/grocery`)

## Architecture

- **Route**: `app/grocery/` — **not** under `(dashboard)`. Uses `AuthenticatedShellGate` + `DashboardProvider`, **no** `AppShell` (no desktop sidebar).
- **UI**: `components/grocery/grocery-workspace.tsx` — standalone full-viewport POS.
- **Role landing**: `grocery_clerk` → `/grocery` via `lib/post-auth-destination.ts`.
- **API**: Same-origin `/api/v1/*` BFF proxy. Grocery endpoints in `lib/grocery-api.ts`.

## iPad / Safari constraints

1. **Never block on `useEffect` for session** — use `useSyncExternalStore` (`hooks/use-client-session.ts`, `hooks/use-session-bootstrap-snapshot.ts`).
2. **Never read `sessionStorage` in `useState` initializers** — causes hydration mismatch → dead buttons, no fetches.
3. **Tokens**: Mirror `ub.accessToken` to **both** `localStorage` and `sessionStorage` at login handoff (`lib/login-session.server.ts`).
4. **Cookie fallback**: If localStorage is empty, `POST /api/auth/restore-session` mints access token from httpOnly refresh cookie (`lib/restore-client-session.ts`).
5. **Tenant host on custom domains**: `getSessionTenantHost()` must return `window.location.hostname` (e.g. `palmart.co.ke`), not `slug.kiosk.ke`. Set in `beforeInteractive` script in `app/layout.tsx`.
6. **Unregister service workers** before React — stale SW can serve broken JS bundles.
7. **Do not gate navigations on `ub.session` cookie** in middleware (Safari drops JS cookies).

## Login flow (iPad-safe)

1. Native form → `POST /api/auth/login-bridge` (no client JS required).
2. Server prefetches `me`, `business`, `branches` → `buildSessionFinalizeHtml`.
3. Inline script sets tokens + `sessionStorage` bootstrap keys (`ub.bootstrap.*`), then redirects.
4. JS login path → `POST /api/auth/store-session` (same finalize HTML).

## Session bootstrap keys

| Key | Content |
|-----|---------|
| `ub.bootstrap.me` | `/api/v1/me` |
| `ub.bootstrap.business` | `/api/v1/businesses/me` |
| `ub.bootstrap.branches` | `/api/v1/branches?page=0&size=100` |

Read via `readSessionBootstrap()` / `useSessionBootstrapSnapshot()`. Dashboard provider merges bootstrap with network fetch.

## Layout rules

- **`/grocery` must not use `AppShell`** — AppShell shows desktop sidebar when `me` is null; grocery has its own header.
- Grocery workspace height: `100dvh` (no AppShell offset).
- Bottom nav for grocery lives **inside** the workspace header (Invoices link), not AppShell.

## Debugging checklist (iPad)

After deploy, on device:

1. Clear Safari website data for the tenant domain.
2. Sign in → should briefly see "Signing you in…" → land on `/grocery`.
3. In Web Inspector (Mac + USB):
   - `localStorage.getItem('ub.accessToken')` or `sessionStorage` copy present?
   - `sessionStorage.getItem('ub.bootstrap.me')` present?
   - Network tab: `/api/v1/me`, `/api/v1/branches`, `/api/v1/grocery/...` return 200?
   - `X-Tenant-Host` header = custom domain, not `slug.kiosk.ke`?
4. If UI renders but buttons dead → hydration mismatch or JS error in console.
5. If shell shows desktop sidebar on grocery → `AppShell` was re-added to grocery layout; remove it.

## Common fixes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Infinite skeleton | Session gate waiting on `useEffect` | Sync session read + cookie restore |
| Desktop sidebar on iPad grocery | `AppShell` + null `me` | Remove AppShell from grocery layout |
| Branch never loads | Wrong `X-Tenant-Host` | Browser hostname fallback |
| Buttons dead, no API calls | Hydration failed | No storage in `useState` init; check console |
| Login works, API 401 | Token not in storage | sessionStorage mirror + restore-session |

## Key files

- `app/grocery/layout.tsx`
- `components/grocery/grocery-workspace.tsx`
- `lib/grocery-api.ts`
- `lib/login-session.server.ts`
- `lib/restore-client-session.ts`
- `app/api/auth/login-bridge/route.ts`
- `app/api/auth/restore-session/route.ts`
- `hooks/use-authenticated-session.ts`
- `components/auth/authenticated-shell-gate.tsx`

## Do not

- Wrap `/grocery` in `(dashboard)` layout or `AppShell`.
- Use `persistTenantHostFromSlug()` alone on custom domains — use `persistTenantHostAfterAuth()` or browser hostname.
- Block grocery shell on `fetchMe()` completing.
- Register service workers on auth/grocery routes.
