# Frontend (Slice 6 Scaffold)

**Production deployment:** see the monorepo [Deployment guide](../DEPLOYMENT.md) (Next.js env, API URL, Nginx).

---

Admin UI scaffold for Phase 1 Slice 6:

- Email/password and **PIN** login (PIN flow sends `email`, `branchId`, `pin` per OpenAPI)
- Dashboard shell with **permission-filtered nav** (`users.list` required for Users)
- **`/users` route guard** — cashiers without `users.list` are redirected to Products
- **Business settings** — read-only slug/timezone/currency; **PATCH** name, subscription tier, active
- **Users** — create (status, PIN), rename, assign role, deactivate (gated by permissions)
- **Products** — item type picker, parent create, search, **variant** table + add variant, patch, delete
- API client: **UUIDv7** `Idempotency-Key`, refresh on `token_expired`, `X-Tenant-Id` / `X-Tenant-Host`
- Optional **OpenAPI → TypeScript** codegen (`bun run codegen` → `lib/generated/phase-1-api.ts`)
- Security headers (frame deny, nosniff, referrer policy) + **Turbopack `root`** to avoid wrong workspace detection

## Setup

Create a `.env.local` file:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
# Required when the browser Host is not a mapped tenant domain (e.g. localhost:3000):
NEXT_PUBLIC_TENANT_ID=your-business-uuid
```

The API returns `400` with *Tenant context missing* if neither a mapped **Host** nor **`X-Tenant-Id`** is present. The app sends `X-Tenant-Id` from `NEXT_PUBLIC_TENANT_ID` or from the login field (stored in `sessionStorage` as `ub.tenantId`).

## Run

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## OpenAPI types (optional)

Regenerate whenever `../backend/docs/openapi/phase-1.yaml` changes:

```bash
bun run codegen
```

## Test

```bash
bun test
```

Current tests cover API request helper behavior:

- `Idempotency-Key` is added to `POST` and `PATCH`
- no `Idempotency-Key` on `GET`
- refresh attempt only happens when Problem+JSON `code` is `token_expired`
- `X-Tenant-Host` is attached when tenant host is known
- `X-Tenant-Id` is attached when tenant id is configured
- mutating requests use **UUIDv7** idempotency keys (`uuid` package)

## Slice 6 manual checks

- **Business**: change name → save → refresh page → name persists.
- **Cashier**: create user with PIN and cashier role → log out → PIN login → **Users** hidden and `/users` redirects to Products.
- **Products**: create parent (needs item types), open row, add variant (SKU + variant label), save edits.
- **Lighthouse** (login): labels + `autocomplete` on fields; security headers help Best Practices (run against local or staging build).

## Auth and session

**Access token** — `localStorage` (`ub.accessToken`).

**Refresh token** — httpOnly cookie `ub.refresh` on the API origin (path `/api/v1/auth`), set by login/refresh. Not stored in `localStorage` in cookie mode. Legacy/handoff flows may still pass a refresh token in the URL fragment once; handoff then calls `/auth/refresh` to mint the cookie on the target origin.

**Tenant context** — `ub.tenantId` and `ub.tenantHost` in `sessionStorage`, mirrored to `localStorage` for resilience. Fallback: `business_id` claim on the access JWT.

**Session hint** — non-secret cookie `ub.session=1` for middleware redirects on protected routes; real auth remains JWT validation client-side.

**Sign-out** — `logoutRemote()` revokes the server session, clears the refresh cookie via `/auth/clear-session-cookie`, and runs `finalizeClientSignOut()` (realtime disconnect + cross-tab broadcast).

**Proactive refresh** — `session-refresh.ts` schedules refresh before expiry; cross-tab sync via `BroadcastChannel` + `storage` fallback.

## Tenant Telemetry Header

When `ub.tenantHost` is available, the API client adds:

- `X-Tenant-Host: <tenant-host>`

When `NEXT_PUBLIC_TENANT_ID` or `ub.tenantId` is set, the client adds:

- `X-Tenant-Id: <business-uuid>`
# ub-front
