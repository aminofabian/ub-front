# Business Hub (`/business`) — product scope

> **Goal:** Turn `/business` into the first thing an owner checks in the morning — a live pulse of sales, profit, stock health, and alerts — while keeping business settings reachable one tap away.

**Status:** Complete (Phases 1–3 + hardening)  
**Last reviewed:** 2026-07-02  
**Route:** `http://kiosk.localhost:3000/business`

---

## 1. Why this matters

`/business` is the **default landing page** after sign-in for owners and managers. `resolvePostAuthDestination` sends anyone who isn't a role-specialist (cashier, stock manager, butcher, grocery clerk) straight here.

Today the page is **only** business settings: name, tier, storefront toggle, inventory policy, and a read-only slug/country/currency card. It does not answer the owner's first question:

> *“How is my shop doing right now?”*

There is already a rich KPI dashboard at `/overview`, but:
- Users **do not land there** after login.
- The tablet header labels `/business` as **“Settings”** (`shell-page-titles.ts`).
- The nav groups `/business` under “Organization → Business settings,” which sounds like configuration, not a daily pulse.

This scope merges the useful parts of `/overview` into `/business`, moves the settings form to `/business/settings`, and updates navigation so the landing page finally matches user intent.

---

## 2. As-is vs to-be

| | Today | After this scope |
|---|---|---|
| **Landing page** | `/business` — settings only | `/business` — business pulse + quick actions |
| **Settings** | Drawer inside `/business` | Dedicated `/business/settings` route |
| **KPI dashboard** | `/overview` exists but hidden from landing flow | `/overview` redirects to `/business`; `/business` shows the KPIs |
| **Nav label** | “Business settings” | “Business” (or “Dashboard”), with “Settings” as a sub-item |
| **Header title** | “Settings” | Business name or “Business” |

---

## 3. Proposed information architecture

```
/business                 → Business hub (KPIs, alerts, quick links)
/business/settings        → Current settings form, moved as-is
/business/branding        → Unchanged
/business/mobile          → Unchanged
/business/domains         → Unchanged
/business/import          → Unchanged
/business/promotions      → Unchanged
/overview                 → 302 redirect → /business
```

### Navigation updates

- **Organization** section entry: `/business` → label **“Business”** (recommended) or **“Dashboard”**
- Add **“Settings”** sub-item → `/business/settings`
- Keep existing sub-items: Branding, Store app, Domains, Branches, Users, Data import, Promotions, Desktop & LAN
- **Home** section: remove or point `/overview` entry at `/business`
- Bottom tab **Home** should point to `/business` instead of `/overview`

### Files to update

| File | Change |
|---|---|
| `frontend/components/app-shell.tsx` | Update `NAV_SECTIONS.org.items[0].label`; update `BOTTOM_TABS[0].href` to `APP_ROUTES.business` |
| `frontend/lib/shell-page-titles.ts` | Change `APP_ROUTES.business` exact title from `"Settings"` to `"Business"`; add `APP_ROUTES.businessSettings` title |
| `frontend/lib/config.ts` | Add `businessSettings: "/business/settings"` to `APP_ROUTES` |
| `frontend/lib/post-auth-destination.ts` | No change needed — already lands on `/business` |

---

## 4. Page sections (top → bottom)

All data is scoped to the **header branch/department** (`branchId` / `itemTypeId` from `useDashboard`) wherever the underlying API supports it.

### 4.1 Header

- Business name as H1 (same pattern as `/overview`)
- `ActiveScopeSubtitle` showing branch + department
- Period toggle: **Today** / **This week**
- Compact status chip: Active / Paused, subscription tier
- Gear icon link → `/business/settings` (only when `canManageBusinessSettings` is true)

### 4.2 Pulse — 4 KPI cards

| Metric | Source | Drill-down | Notes |
|---|---|---|---|
| Revenue | `fetchFinancePulse` (today) / `fetchFinancePL` (week) | `/sales` | Trend vs prior period via `fmtTrendPct` |
| Orders / units sold | `pulse.salesCount` (today) / week register `totalQty` | `/sales/transactions` | Trend vs prior period |
| Gross profit + margin | same as revenue | `/analytics` | Hide margin detail if `!canViewAnalytics` |
| Open shifts | `pulse.openShifts` | `/shifts` | Warning tone if > 0 |

### 4.3 Revenue chart

- Bar chart, last 12 days (today mode) or 7 days (week mode)
- Source: `fetchSalesRegister`
- Reuse `RevenueBarChart` from `/overview`

### 4.4 Inventory health — 3 cards

| Metric | Source | Drill-down |
|---|---|---|
| Stock value | `fetchInventoryValuation(branchId)` | `/inventory/valuation` |
| Catalogue items | `fetchItemsPage({ page: 0, size: 1, branchId, itemTypeId })` | `/products` |
| Branches with stock | `valuation.byBranch.length` | `/branches` |

> **Note:** Low-stock and expiring-batch alerts live in the **Action items** strip rather than as top-level cards, because the count can be noisy for large catalogues.

### 4.5 Action items / alerts strip

Show only non-zero items. Each row is a tappable link.

| Alert | Source | Link | Permission |
|---|---|---|---|
| Low stock products | `fetchBatchDashboard(...).lowStockProducts` | `/inventory/restock` | `canViewInventoryValuation` |
| Expiring batches | `fetchBatchDashboard(...).expiringBatches` or `fetchInventoryExpiryPipeline` | `/inventory/supply-batches` | `canViewSupplyBatches` |
| Open shifts | `pulse.openShifts` | `/shifts` | `canViewShifts` |
| Storefront disabled | `business.storefront.enabled === false` | `/business/settings` | `canManageBusinessSettings` |
| Pending supply bills | `ownerSummary.openPayables` | `/purchasing/ap-aging` | `canViewApAging` |

### 4.6 Top products — last 30 days

From `ownerSummary.topSkusLast30Days` (top 5). Already built on `/overview`.

### 4.7 Quick access chips

Sales · Catalogue · Inventory · Analytics · Storefront · Team · Settings

### 4.8 Post-setup checklist

Reuse `PostSetupChecklist` from `/overview` for new businesses (first 48h after onboarding questionnaire completion).

### 4.9 Compact identity strip (optional)

If business name/tier is not already clear from the header, show a small read-only card with:
- Business name, tier, active status
- Slug, country, currency, timezone
- Link to `/business/settings`

> Recommendation: keep this minimal or omit it on the hub; the H1 + status chip is enough.

---

## 5. APIs — existing, no backend work

All functions are in `frontend/lib/api.ts` and already used by `/overview` or inventory pages.

| Client function | Endpoint | Params used | Purpose |
|---|---|---|---|
| `fetchDashboardOwnerSummary()` | `GET /api/v1/dashboard/owner-summary` | None — **business-wide** | Pulse fallback, top SKUs, payables |
| `fetchFinancePulse(date, branchId)` | `GET /api/v1/finance/pulse` | `date`, `branchId` | Today revenue / profit / shifts |
| `fetchFinancePL(from, to, branchId)` | `GET /api/v1/finance/pl` | `from`, `to`, `branchId` | Week P&L |
| `fetchSalesRegister(from, to, branchId)` | `GET /api/v1/reports/sales/register` | `from`, `to`, `branchId` | Chart + week units |
| `fetchInventoryValuation(branchId)` | `GET /api/v1/reports/inventory/valuation` | `branchId` | Stock value |
| `fetchInventoryExpiryPipeline(branchId, asOf)` | `GET /api/v1/reports/inventory/expiry-pipeline` | `branchId`, `asOf` | Expiry buckets |
| `fetchBatchDashboard({ branchId, from, to })` | `GET /api/v1/inventory/supply-batches/analytics/dashboard` | `branchId`, date range | Low stock + expiring |
| `fetchItemsPage(undefined, { page, size, branchId, itemTypeId })` | `GET /api/v1/items` | `branchId`, `itemTypeId` | Catalogue count |

### Scope rules

Per `frontend/docs/GLOBAL_BRANCH_AND_TYPE_SCOPE.md`:

- Pass `branchId` from `useDashboard()` on all branch-scoped calls.
- Pass `itemTypeId` on `fetchItemsPage` for catalogue count.
- `fetchDashboardOwnerSummary` is **business-wide** — do not try to pass branch/type. Use its `pulseToday` only as a fallback if `fetchFinancePulse` fails.
- Auto-refetch when header branch changes (cheap calls, same as `/overview`).

---

## 6. Role & permission gating

| Role / permission | What they see |
|---|---|
| Owner / manager | Full hub |
| Without `BusinessManageSettings` | Full hub, but no **Settings** gear or settings quick link |
| Without `canViewAnalytics` (`SalesIntelligenceRead`) | Hide profit margin detail; show revenue + orders only |
| Without `canViewInventoryValuation` | Hide stock value / catalogue cards |
| Without `canViewApAging` | Hide payables alert |
| `stock_manager` / `cashier` / `butcher_cashier` / `grocery_clerk` | Redirected elsewhere by post-auth and `AppShell` guards — unlikely to hit this page |

---

## 7. Moving settings out of `/business`

Current `/business/page.tsx` contains a large settings drawer. Move the entire settings form into a new route, **`/business/settings/page.tsx`**, functionally unchanged.

### What moves

- Profile & billing (name, tier, active toggle)
- Online storefront controls
- Stock take visibility
- Stock levels permissions
- Cashier POS draft flags
- The `?onboarding=storefront` deep-link behavior

### What stays on `/business`

- Compact identity strip (optional)
- KPIs, alerts, quick links

### New route constant

```ts
// frontend/lib/config.ts
businessSettings: "/business/settings",
```

### Redirects / back links

- Existing deep link `?onboarding=storefront` on `/business` should redirect to `/business/settings?onboarding=storefront`.
- Update back-link copy in `/business/mobile`, `/business/domains`, `/business/branding`, `/business/import`, `/business/promotions` from “Back to business settings” to “Back to business” if they link to `APP_ROUTES.business`.

---

## 8. Relationship with `/overview`

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. Merge** — `/overview` redirects to `/business`; Home nav points to `/business` | One home; matches post-auth landing; reduces maintenance | Small redirect change; bookmarks to `/overview` need redirect | **Chosen** |
| **B. Keep both** | No nav churn | Duplicate pages; confusing; divergence over time | Rejected |

### Chosen approach

1. Add a server-side redirect or client `useEffect` redirect in `frontend/app/(dashboard)/overview/page.tsx` to send traffic to `/business`.
2. Remove `/overview` from nav; point Home tab/section to `/business`.
3. Keep the redirect for at least one release so existing bookmarks recover gracefully.

---

## 9. Decisions (resolved)

| # | Question | Decision |
|---|---|---|
| D1 | Merge with `/overview`? | **Redirect** `/overview` → `/business` |
| D2 | Settings surface | New **`/business/settings`** route |
| D3 | Page title | Business name as H1; tablet header title `"Business"` |
| D4 | Priority alerts | Low stock, expiring batches, open shifts, storefront disabled |
| D5 | Period toggle labels | Keep “Today” / “This week” (same as `/overview`) |
| D6 | Retain `/overview` URL? | Yes, as a redirect for one release |

---

## 10. Implementation plan

### Phase 1 — Core hub (MVP)

1. **Create shared components** from `/overview` code:
   - `frontend/components/business-hub/period-toggle.tsx`
   - `frontend/components/business-hub/stat-card.tsx`
   - `frontend/components/business-hub/revenue-bar-chart.tsx`
   - `frontend/components/business-hub/quick-chip.tsx`
   - `frontend/components/business-hub/post-setup-checklist.tsx`
   - `frontend/lib/business-hub/formatters.ts` (`fmtKes`, `fmtPct`, `fmtCount`, `fmtTrendPct`)
2. **Create `/business/settings/page.tsx`** by extracting the settings form from `/business/page.tsx` (lines ~216–1208).
3. **Rebuild `/business/page.tsx`** as the KPI hub, copying data-loading logic from `/overview/page.tsx`.
4. **Update navigation & titles** in `app-shell.tsx`, `shell-page-titles.ts`, and `config.ts`.
5. **Add redirect** `/overview` → `/business`.
6. **Handle onboarding deep link**: if `?onboarding=storefront` lands on `/business`, redirect to `/business/settings?onboarding=storefront`.

### Phase 2 — Alerts & payables

7. Wire `fetchBatchDashboard` + `fetchInventoryExpiryPipeline` for stock alerts.
8. Add payables alert from `ownerSummary.openPayables` for users with `canViewApAging`.

### Phase 3 — Polish

9. Skeleton / loading states (`BusinessHubSkeleton`).
10. Empty states for new businesses with zero sales.
11. Responsive layout: tablet header already shows page title; ensure hub works in both tablet and desktop shells.
12. Regression test role gating and restricted-role redirects.

**Estimated touch points:** ~8–10 files, no backend changes.

---

## 11. Out of scope (for now)

- New backend aggregations
- Department-level profit breakdown on this page (lives in `/analytics`)
- Staff performance leaderboard (analytics)
- Payment method breakdown (analytics)
- Real-time websocket updates
- Custom date range picker (keep Today / This week only)
- Replacing `/overview` components in other pages — only extract and reuse

---

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Settings drawer is large and easy to break during move | Move the whole component tree first, then refactor; keep `FormDrawer` imports identical |
| `/overview` redirect breaks tests or bookmarks | Implement as a real redirect, not a silent replace; keep for one release |
| Header branch change causes excessive re-fetching | Same pattern as `/overview` — cheap calls, `useEffect` on `load` |
| `fetchDashboardOwnerSummary` is business-wide, so `pulseToday` may not match scoped `fetchFinancePulse` | Prefer scoped pulse; only fall back to owner summary on error |
| Settings gear hidden for non-owners but page still shows “Settings” in tablet header | Update `shell-page-titles.ts` at the same time as the nav |

---

## 13. Testing checklist

- [x] Owner lands on `/business` after login and sees KPIs.
- [x] `/overview` redirects to `/business` (page + `next.config` permanent redirect).
- [x] `/business/settings` loads the full settings form and saves correctly.
- [x] `?onboarding=storefront` opens the settings form (scrolls to storefront section).
- [x] Switching header branch refreshes all hub numbers.
- [x] Switching department filters catalogue count.
- [x] Manager without `BusinessManageSettings` sees hub but no Settings gear/link.
- [x] Cashier / stock manager / grocery clerk cannot navigate to `/business` (redirected by role guards).
- [x] Tablet header title for `/business` reads “Business,” not “Settings.”
- [x] Bottom tab “Home” points to `/business`.
- [x] Existing business sub-pages (branding, mobile, domains, import, promotions) still link back correctly.

---

## 14. Related files

| File | Relevance |
|---|---|
| `frontend/app/(dashboard)/business/page.tsx` | Business hub — KPIs, alerts, quick links |
| `frontend/app/(dashboard)/business/settings/page.tsx` | Inline settings form |
| `frontend/app/(dashboard)/overview/page.tsx` | Redirect → `/business` |
| `frontend/components/business-hub/` | Shared hub UI (stat cards, chart, alerts, empty state) |
| `frontend/components/business/` | Settings types + inline form |
| `frontend/app/(dashboard)/business/branding/page.tsx` | Existing sub-page; update back link copy |
| `frontend/app/(dashboard)/business/mobile/page.tsx` | Existing sub-page; update back link copy |
| `frontend/app/(dashboard)/business/domains/page.tsx` | Existing sub-page; update back link copy |
| `frontend/app/(dashboard)/business/import/page.tsx` | Existing sub-page; update back link copy |
| `frontend/app/(dashboard)/business/promotions/page.tsx` | Existing sub-page; update back link copy |
| `frontend/lib/post-auth-destination.ts` | Post-login lands on `/business` |
| `frontend/components/app-shell.tsx` | Nav section “Organization” + bottom tab Home |
| `frontend/lib/shell-page-titles.ts` | Tablet header title |
| `frontend/lib/config.ts` | `APP_ROUTES` — add `businessSettings` |
| `frontend/lib/api.ts` | All data client functions |
| `frontend/components/dashboard-provider.tsx` | `branchId`, `itemTypeId`, permission flags |
| `frontend/components/active-scope-subtitle.tsx` | Scope subtitle component |
| `frontend/docs/GLOBAL_BRANCH_AND_TYPE_SCOPE.md` | Branch/department scoping rules |

---

## 15. Changelog

| Date | Change |
|---|---|
| 2026-07-02 | Initial scope |
| 2026-07-02 | Rewrote to reflect actual code: confirmed `/overview` implementation, settings drawer contents, existing business sub-routes, API signatures, and resolved all open decisions |
| 2026-07-02 | Implemented Phases 1–3: business hub, settings route, overview redirect, expiry pipeline alerts, empty states, tests |
| 2026-07-02 | Settings page: inline form (no drawer), access gate, onboarding route fix |
| 2026-07-02 | Hardening: permanent `/overview` redirect, role-guard tests, doc audit updates |
