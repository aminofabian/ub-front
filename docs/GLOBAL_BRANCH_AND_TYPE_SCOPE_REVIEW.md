# Review: Global branch & department (item type) scope

> Original doc: `frontend/docs/GLOBAL_BRANCH_AND_TYPE_SCOPE.md`  
> Reviewed: 2026-07-02

## Executive summary

`GLOBAL_BRANCH_AND_TYPE_SCOPE.md` is a strong, readable scope document. The page-by-page audit, anti-pattern taxonomy, target rules, and success criteria are clear and actionable. However, it is already **partially stale** and leaves several implementation-critical gaps that should be closed before tickets are written or work begins.

---

## 1. Stale / inaccurate statements (verified against current code)

| # | Doc claim | Current code reality | Implication |
|---|---|---|---|
| 1.1 | Products list (`products-workspace.tsx`) “`itemTypeId` only seeds create forms; list is not filtered by header department” (§3.1). | `ProductsWorkspace` calls `useCatalogList(branchId, dashboardItemTypeId)` (line 78), and `useCatalogList` passes `itemTypeId` to both `fetchItemsPage` and `fetchCatalogListStats` (`frontend/app/(dashboard)/products/_hooks/useCatalogList.ts`, lines 121–122, 192). | The products grid **already filters by header department**. This should move from 🟡 to ✅ in the audit; otherwise the team may build duplicate filtering or QA will test the wrong behavior. |
| 1.2 | Header `itemTypeId` is “largely decorative … Only product creation defaults benefit” (§4.2). | Same as above — the main catalog list consumes `dashboardItemTypeId`. | The problem statement overstates the gap. Re-audit the current state before estimating the remaining work. |
| 1.3 | `DashboardProvider` exposes only `branchId, setBranchId, itemTypeId, setItemTypeId, branches, itemTypes` (§1.1). | The context exposes ~40 permission flags, `me`, `business`, loading states, refresh callbacks, etc. (`frontend/components/dashboard-provider.tsx`, lines 98–140). | Permission-gated scope behavior is missing from the analysis entirely. |
| 1.4 | Branch-locked roles are the only role-based scope concern (§1.1, §5.1 B3). | `dashboard-provider.tsx` also filters `itemTypes` for `grocery_clerk` to `me.itemTypeIds` and computes `assignedItemTypeIds` (lines 192–219). | The doc needs rules for **item-type-locked roles**, not just branch-locked roles. |

---

## 2. Major gaps in the analysis

### 2.1 Item-type role restrictions
- Should a `grocery_clerk` be allowed to change the header department at all?
- If yes, should the picker only show departments in `me.itemTypeIds`?
- What is the default when `assignedItemTypeIds` is empty?
- What happens when an admin removes the clerk’s last assigned department while they are logged in?

### 2.2 Stale / deleted / inactive branches and departments
The seeding logic prefers persisted values, but the doc does not define behavior when:
- A selected branch or department is deleted or set to `active=false`.
- A user loses permission to a previously selected branch.
- `effectiveBranches` or `itemTypes` is empty (e.g., a new business).
- A locked-role user is assigned to a branch that no longer exists.

Current code partly handles this, but the expected UX should be documented.

### 2.3 Multi-tenant and persistence edge cases
- **Tenant switching:** keys include `businessId`, which is good, but subdomain/host changes are not discussed.
- **Desktop/Tauri app (`desktop/src-tauri`):** may not share the same `localStorage` namespace or persistence behavior as the web PWA.
- **Cashier PWA vs. dashboard:** how is scope kept in sync when one runs in the desktop wrapper and the other in a browser tab?

### 2.4 Caching / refetch strategy
Most pages use manual `useEffect` + `useState` (no TanStack Query/SWR in source). Changing the header branch will require explicit refetch orchestration. The doc says “refetch or show Apply/stale banner” but does not define:
- Which pages refetch automatically vs. show a banner.
- How to avoid N refetches when one header change affects multiple open surfaces.
- How to invalidate dependent data (e.g., product detail panel, supplier catalog side drawer).
- Loading and error UX during refresh.

### 2.5 URL / query params
The doc treats scope as purely in-memory + `localStorage`. Consider whether report pages should support shareable URLs such as `?branchId=...&itemTypeId=...`, or whether this is explicitly out of scope.

### 2.6 Form-draft / mid-transaction behavior
D6 asks the right question, but a single global answer is insufficient. Different flows need different rules:

| Flow | Suggested behavior | Rationale |
|---|---|---|
| Stock take in progress | Warn / lock | Counts are branch- and often department-specific. |
| Supply bill draft | Warn | Delivery branch is part of the draft. |
| Pricing bulk edit | Warn / lock | Changing branch could silently affect which prices are updated. |
| Product create drawer | Auto-switch defaults | No risk; new product inherits new scope. |

### 2.7 Backend API contract
Phase 5 lists a few query params but does not define:
- Whether `branchId`/`itemTypeId` are optional or required.
- Default behavior when omitted (business-wide? current branch? error?).
- Which endpoints support “All branches” (`branchId` absent vs. `branchId=all`).
- Pagination and filter interactions.

Without this, frontend changes will outpace backend support.

### 2.8 Missing or under-specified surfaces
- **Stock transfers:** marked ❌ with “own branch fields for from/to.” Should *From* default to header branch? Should *To* be scoped?
- **Pricing page:** marked ❌ with no detail. Pricing has branch-specific sell prices and branch-independent cost prices — separate rules are needed.
- **Sales reports / Activity / Sales by category:** not in the audit table.
- **Customers / Credit / Promotions:** marked N/A, but some (customer balances, credit limits) may be branch-scoped in practice.

### 2.9 Terminology inconsistency
The header shows “Department,” the route is `/item-types`, the code uses `itemTypeId`, and the doc uses both “department” and “item type.” The doc says renaming is out of scope (§11), but the inconsistency is a real source of confusion. Add at minimum a glossary.

---

## 3. Structural / readability improvements

1. **Add an implementation-status column to the audit table**  
   The doc says “Scoped (not yet implemented)” but several items appear done. A `Implemented / Partial / Not started` column turns the doc into a useful tracker.

2. **Turn open decisions (§7) into a decision log**  
   Include decision owner, date decided, final choice, and link to ADR or ticket.

3. **Add an API contract table**  
   List every endpoint, current query-param support, and required support after this scope.

4. **Add a per-page “branch-change behavior” table**  
   Page/component → auto-refetch / stale banner / warn / lock.

5. **Add a glossary**  
   Define Branch, Department, Item type, Locked role, Scope, All-branches mode, etc.

6. **Improve the Mermaid diagram**  
   Add data flow from `DashboardProvider` → page hooks → API params, the cashier PWA split (`PosCatalogItemTypeContext` vs. header), and the locked-role override path.

7. **Add a risk/impact matrix**  
   e.g., “Auto-refetch all pages on branch change” = high UX impact / medium dev cost / risk of over-fetching.

8. **Add test file references**  
   The testing checklist is good, but add where tests should live and what mocks are needed.

---

## 4. Implementation-plan improvements

### 4.1 `use-session-scope.ts` is under-specified
Define:
- Behavior when the page also supports “All branches.”
- Whether it returns the raw header value or the effective value after role checks.
- How it interacts with `userTouchedBranchRef` / `userTouchedItemTypeRef` in `DashboardProvider`.

### 4.2 Insert an API-contract phase before catalog filtering
Item-type filtering on catalog surfaces (Phase 2) depends on backend endpoints accepting `itemTypeId`. Add a **Phase 0.5 — API contract + backend query params** before Phase 2.

### 4.3 Add rollout gating
- Introduce a feature flag (e.g., `global_scope_v2`) so the refactor can be released page by page.
- Define a rollback plan if auto-refetch causes performance issues.

---

## 5. Recommended next steps

1. **Re-audit current code** before writing implementation tickets — especially `products-workspace.tsx`, `useCatalogList.ts`, `cashier-shell.tsx`, `stock-levels-page.tsx`, and `sales-overview-page.tsx`.
2. **Document item-type role restrictions** for `grocery_clerk` and any other assigned-department roles.
3. **Resolve D1–D6** and record the decisions in a decision log.
4. **Add an API contract table** for `branchId`/`itemTypeId` support across backend endpoints.
5. **Define stale/deleted branch & department behavior** explicitly.
6. **Add a per-page “branch change behavior” rule** (auto-refetch / banner / warn / lock).
7. **Update the doc status** from “Scoped (not yet implemented)” to a phase-by-phase tracker.

---

*If you want this turned into a revised version of the original scope doc (rather than a side-by-side review), let me know and I can rewrite `GLOBAL_BRANCH_AND_TYPE_SCOPE.md` directly.*
