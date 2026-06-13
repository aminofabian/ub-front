# Cashier Cart Persistence — Revised Specification & Code-Aware Analysis

> **Status:** Revision v1.1 — incorporates implementation-readiness gaps identified in the original scope.  
> **Surface:** Cashier POS PWA at `/cashier` (`kiosk.localhost:3000/cashier`)  
> **Not in scope**: Grocery checkout (`/grocery`), web storefront carts, grocery invoice creation  
> **Pattern**: Treat the in-progress ring-up as a draft ticket — persist immediately, complete through existing sale pipeline

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What `/cashier` Is Today](#what-cashier-is-today)
3. [The Problem](#the-problem)
4. [Proposed Behavior](#proposed-behavior)
5. [Why Not Extend `sales`?](#why-not-extend-sales)
6. [Proposed Data Model](#proposed-data-model)
7. [Proposed API Surface](#proposed-api-surface)
8. [Frontend Changes](#frontend-changes)
9. [Sync, Conflict & Offline Strategy](#sync-conflict--offline-strategy)
10. [Decisions (Resolved Recommendations)](#decisions-resolved-recommendations)
11. [What Must NOT Change on Draft Writes](#what-must-not-change-on-draft-writes)
12. [Relationship to Grocery Invoices](#relationship-to-grocery-invoices)
13. [Implementation Plan (Phased)](#implementation-plan-phased)
14. [Testing Strategy](#testing-strategy)
15. [Observability & Monitoring](#observability--monitoring)
16. [Rollout & Feature Flags](#rollout--feature-flags)
17. [Open Decisions](#open-decisions)
18. [Appendix: Key Source References](#appendix-key-source-references)

---

## Executive Summary

**Current behavior:** The cashier cart lives in React component state until checkout completes, then gets persisted via `POST /api/v1/sales`.

**New behavior:**

- On each item add → write/upsert the cart to the database immediately (`status: pending`).
- Cart updates (qty changes, removals, price overrides) → update the same DB record.
- On checkout completion → run existing `SaleService.createSale()` inside the draft completion transaction, link `sale_id`, update status to `completed`.
- If abandoned → record sits as `pending` (recoverable, auditable).
- Each new cart gets a sequential ticket number (1, 2, 3, 4…), assigned when the first item is added — counts up forever, never reused.

This is essentially **"treat the in-progress cart as a draft order"** — a common and solid pattern for POS systems.

### Key design decisions upfront

| Decision | Rationale |
|---|---|
| New `pos_drafts` table (not reusing `sales`) | Sales imply stock transfer, GL posting, and drawer effects. Draft lines have no `batch_id`. Keeps `SaleService.createSale()` intact. |
| Stock deducted at checkout only | Avoids holding inventory hostage on abandoned ring-ups. Matches current cashier behavior. |
| Sequential `ticket_number` on draft header | Human-readable "Sale #47" visible from first scan — not only on receipt. |
| Line-item upserts (by `line_id`, not `item_id`) | Supports duplicate SKUs, different prices, and line-level discounts on the same draft. |
| Snapshot pricing at scan time | Cart totals remain stable while the customer is still at the counter; a manual refresh action reapplies live prices. |
| Never hard-delete pending headers | Audit trail for abandoned transactions, training issues, theft/voids. Lines use logical delete where audit is required. |
| Idempotency on create and complete | Prevents duplicate tickets / duplicate sales from retries, slow networks, or double-taps. |

---

## What `/cashier` Is Today

### Entry point

```tsx
// frontend/app/cashier/page.tsx
import { QuickSaleWorkspace } from "@/components/cashier/quick-sale-workspace";

export default function CashierHomePage() {
  return <QuickSaleWorkspace variant="cashier" />;
}
```

### Layout stack

| Layer | File | Role |
|---|---|---|
| Layout | `frontend/app/cashier/layout.tsx` | Auth, PWA service worker, `CashierShell`, realtime |
| Shell | `frontend/components/cashier-shell.tsx` | Branch lock, brand theme, logout |
| Workspace | `frontend/components/cashier/quick-sale-workspace.tsx` | Cart state, checkout, shift modals |
| POS UI | `frontend/components/cashier/cashier-pos-layout.tsx` | Search, scan, multi-cart tabs, cart drawer |
| Cart drawer | `frontend/components/cashier/cashier-cart-drawer.tsx` | Payment, complete sale, receipt |
| Cart types | `frontend/lib/cart-session.ts` | `CartSession`, `MAX_CARTS = 8` |

The dashboard **Quick sale** page uses the same `QuickSaleWorkspace` with `variant="admin"`. Backend work applies to both; `/cashier` is the primary UX target.

### Existing sale flow (unchanged at checkout)

```
POST /api/v1/sales  (SalesController.createSale)
    │
    ├─ SaleService.createSale()
    │   ├─ Check idempotency key → return existing if duplicate
    │   ├─ Validate branch, shift is open
    │   ├─ Compute grand total from lines
    │   ├─ pickAndBuildSaleItems()          ← picks inventory batches + decrements stock NOW
    │   ├─ saveNewSaleAndPayments()
    │   ├─ saleItemRepository.saveAll()
    │   ├─ postSaleJournal()
    │   ├─ creditSaleDebtService / walletLedgerService / loyaltyPointsService
    │   ├─ applyDrawerCash()
    │   └─ enqueueSaleCompletedWebhook()
    └─ Return SaleResponse
```

### Current cart state (in-memory only)

```tsx
// frontend/components/cashier/quick-sale-workspace.tsx
const [carts, setCarts] = useState<CartSession[]>(() => [
  createEmptyCartSession(),
]);
const [activeCartId, setActiveCartId] = useState<string>(carts[0].id);
```

```tsx
// frontend/lib/cart-session.ts
export const MAX_CARTS = 8;

export function createEmptyCartSession(): CartSession {
  cartCounter += 1;
  return {
    id: crypto.randomUUID(),
    label: `Cart ${cartCounter}`,  // session-only counter, not persisted
    lines: [],
    // ... payment prefs, customer search, STK push state
  };
}
```

Mutations today:

- `addLine` → append to `activeCart.lines`
- `removeLine` / `updateLine` → filter/map local lines
- `onComplete` → build `PostSalePayload`, call `tryPostSaleWithRetries` or `enqueuePendingSale` (offline)

### Cashier-specific features already present

- PWA service worker registration
- Branch-locked for `cashier` role
- In-place shift open / close / drawout modals (no redirect)
- Barcode scanner + product search via `CashierPosLayout`
- IndexedDB offline sale outbox (`frontend/lib/sale-outbox.ts`) — queues **completed** sales only
- `PendingInvoicesPanel` — separate path for paying **grocery** invoices (`GI-*` barcodes) at the counter

---

## The Problem

On `/cashier` today:

1. Cashier scans/adds items → lives only in browser memory
2. Browser crash, tab refresh, navigation, or interruption → **cart may be lost**
3. No ticket number until checkout completes
4. No record of abandoned ring-ups

The offline outbox only helps when checkout *finished* but `POST /api/v1/sales` failed — not mid-ring-up.

### Why this matters for cashiers

- As soon as they ring up the first item, that sale should get a number.
- Every item added or removed updates that sale's record right away — nothing waits until the end.
- If the sale completes, it's marked `completed` (paid).
- If the cashier walks away, switches screens, or the sale never finishes, it sits `pending` — nothing is lost.

### Operational value

- No more losing a cart if something crashes or a cashier gets interrupted.
- Every sale, finished or not, has a record and a number you can look up.
- `pending` sales are visible — useful for spotting abandoned transactions, training issues, or theft/voids.

---

## Proposed Behavior

| Event | Today | New |
|---|---|---|
| First item scanned/added | Local `CartSession` only | Create DB draft → assign **Sale #N** |
| Qty change / remove | Local state | Upsert/delete line on same draft |
| Cashier switches tab / refreshes / walks away | Lost (unless tab still in memory) | Draft recoverable from DB |
| Tap "Complete sale" | `POST /api/v1/sales` | Same pipeline, completes *that* draft ticket |
| Never completes | Nothing persisted | Stays `pending` — auditable |

Cashier sees **"Sale #47"** in the tab strip as soon as the first item lands.

---

## Why Not Extend `sales`?

The `sales` table and `SaleService` assume a **completed** transaction:

| Constraint | Issue for drafts |
|---|---|
| `shift_id NOT NULL` | Draft may start before shift open (policy choice) |
| `sale_items.batch_id NOT NULL` | Batch pick only at checkout |
| Statuses: `completed`, `voided`, `refunded` | No `pending` lifecycle |
| Void/refund/reporting | All assume completed sale |

Adding `pending` to `sales` would require massive conditional branching through stock, GL, drawer, and void paths. A separate draft table with a `sale_id` link on completion keeps the existing pipeline clean — same approach documented for grocery invoices in `GROCERY_CHECKOUT_SCOPE.md`, but this is a **cashier-native** module.

---

## Proposed Data Model

### `pos_drafts` (header)

```sql
CREATE TABLE pos_drafts (
    id              CHAR(36)       NOT NULL PRIMARY KEY,
    business_id     CHAR(36)       NOT NULL,
    branch_id       CHAR(36)       NOT NULL,
    ticket_number   BIGINT         NOT NULL,
    status          VARCHAR(16)    NOT NULL DEFAULT 'pending',
    -- pending | completed | cancelled
    created_by      CHAR(36)       NOT NULL,
    shift_id        CHAR(36)       NULL,          -- set at checkout
    sale_id         CHAR(36)       NULL,          -- set on complete
    customer_id     CHAR(36)       NULL,          -- optional, phase 2
    client_draft_id VARCHAR(64)    NULL,          -- idempotency handle from client
    currency        VARCHAR(3)     NOT NULL,      -- denormalized from business
    sub_total       DECIMAL(14,2)  NOT NULL DEFAULT 0,
    discount_total  DECIMAL(14,2)  NOT NULL DEFAULT 0,
    tax_total       DECIMAL(14,2)  NOT NULL DEFAULT 0,
    grand_total     DECIMAL(14,2)  NOT NULL DEFAULT 0,
    cancelled_by    CHAR(36)       NULL,
    cancelled_at    TIMESTAMP      NULL,
    cancelled_reason VARCHAR(500)  NULL,
    completed_at    TIMESTAMP      NULL,
    version         BIGINT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_pos_drafts_business_ticket (business_id, ticket_number),
    UNIQUE KEY uq_pos_drafts_client_draft   (business_id, client_draft_id),
    KEY idx_pos_drafts_branch_status (business_id, branch_id, status),
    KEY idx_pos_drafts_created_by (business_id, created_by, status),
    KEY idx_pos_drafts_updated_at (business_id, updated_at),

    CONSTRAINT fk_pd_business  FOREIGN KEY (business_id) REFERENCES businesses(id),
    CONSTRAINT fk_pd_branch    FOREIGN KEY (branch_id)   REFERENCES branches(id),
    CONSTRAINT fk_pd_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_pd_shift     FOREIGN KEY (shift_id)    REFERENCES shifts(id),
    CONSTRAINT fk_pd_sale      FOREIGN KEY (sale_id)     REFERENCES sales(id)
);
```

### `pos_draft_lines`

```sql
CREATE TABLE pos_draft_lines (
    id           CHAR(36)       NOT NULL PRIMARY KEY,
    draft_id     CHAR(36)       NOT NULL,
    business_id  CHAR(36)       NOT NULL,        -- shard / query helper
    line_index   INT            NOT NULL,
    item_id      CHAR(36)       NOT NULL,
    item_name    VARCHAR(500)   NOT NULL,
    item_barcode VARCHAR(128)   NULL,            -- speeds re-scan / audit
    quantity     DECIMAL(14,4)  NOT NULL,
    unit_price   DECIMAL(14,4)  NOT NULL,
    discount_amount DECIMAL(14,4) NOT NULL DEFAULT 0,
    line_total   DECIMAL(14,2)  NOT NULL,
    is_deleted   TINYINT(1)     NOT NULL DEFAULT 0,
    created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_pdl_draft_line (draft_id, line_index),
    KEY idx_pdl_draft (draft_id),
    KEY idx_pdl_item  (business_id, item_id),

    CONSTRAINT fk_pdl_draft FOREIGN KEY (draft_id) REFERENCES pos_drafts(id) ON DELETE CASCADE,
    CONSTRAINT fk_pdl_item  FOREIGN KEY (item_id)  REFERENCES items(id)
);
```

> **Why `line_index` instead of `item_id` unique?** A POS cart may legitimately contain the same SKU twice with different prices, discounts, or notes. Upserts target a specific `line_id` (server-assigned); new lines get a new `line_index`.

### `pos_draft_audit_log`

Captures who changed what, when — required for abandonment / void / theft analysis.

```sql
CREATE TABLE pos_draft_audit_log (
    id          CHAR(36)      NOT NULL PRIMARY KEY,
    draft_id    CHAR(36)      NOT NULL,
    user_id     CHAR(36)      NOT NULL,
    action      VARCHAR(32)   NOT NULL,
    -- CREATE_DRAFT | ADD_LINE | UPDATE_LINE | REMOVE_LINE | REFRESH_PRICES
    -- COMPLETE | CANCEL | REOPEN | OPTIMISTIC_LOCK_REFRESH
    line_id     CHAR(36)      NULL,
    old_value   JSON          NULL,
    new_value   JSON          NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_pdal_draft (draft_id, created_at),
    KEY idx_pdal_user  (user_id, created_at),

    CONSTRAINT fk_pdal_draft FOREIGN KEY (draft_id) REFERENCES pos_drafts(id) ON DELETE CASCADE,
    CONSTRAINT fk_pdal_user  FOREIGN KEY (user_id)  REFERENCES users(id)
);
```

### `branch_pos_sequences` (ticket numbers)

```sql
CREATE TABLE branch_pos_sequences (
    branch_id     CHAR(36)  NOT NULL PRIMARY KEY,
    next_ticket   BIGINT    NOT NULL DEFAULT 1,

    CONSTRAINT fk_bps_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
);
```

> **Scope changed from business to branch.** Cashiers are branch-locked, branch-scoped sequences avoid cross-branch hot rows, and operators who want independent per-branch numbering get it by default.

Allocate `ticket_number` inside the same transaction as draft creation using `SELECT … FOR UPDATE` on the branch sequence row. Never reuse numbers. Gaps from abandoned/cancelled tickets are expected.

**High-volume mitigation (defer):** If ticket allocation becomes a bottleneck, pre-allocate number blocks per active terminal/session and consume them locally.

### Status lifecycle

```
pending ──complete──► completed  (sale_id set, completed_at set)
   │
   └──cancel──► cancelled        (cancelled_by, cancelled_at, reason set)
```

No hard delete of headers. Optional future: auto-`cancelled` with reason `auto_abandoned` after N days for UI hygiene only.

---

## Proposed API Surface

All endpoints require `sales.sell` or dedicated `pos.drafts.*` permissions (see [Decisions](#decisions-resolved-recommendations)).

### Idempotency contract

- `POST /api/v1/pos-drafts` accepts an `Idempotency-Key` header (or `clientDraftId` in body). Retrying with the same key returns the same draft, not a new ticket number.
- `POST /api/v1/pos-drafts/{id}/complete` accepts an `Idempotency-Key` header. Retrying returns the already-completed sale; a second successful `SaleService.createSale()` must never occur.
- Clients should generate `clientDraftId` once per tab (e.g. `crypto.randomUUID()`) and reuse it for the lifetime of that tab.

### Endpoints

```
POST   /api/v1/pos-drafts
       Headers: Idempotency-Key: <clientDraftId>
       Body: { branchId, clientDraftId, lines: [{ itemId, quantity, unitPrice, discountAmount? }] }
       Creates draft + first line(s), allocates ticket_number.
       Returns: { id, ticketNumber, status, lines, subTotal, discountTotal, taxTotal, grandTotal, version }

GET    /api/v1/pos-drafts/{id}
       Returns draft with lines (excluding logically deleted lines by default; includeDeleted=true for audit).

PATCH  /api/v1/pos-drafts/{id}/lines
       Body: { lines: [{ lineId?, itemId, quantity, unitPrice, discountAmount? }], expectedVersion? }
       Bulk upsert/replace lines. Used for initial scan bursts and sync reconciliation.
       Recomputes totals server-side, increments version.
       Returns updated draft.

PUT    /api/v1/pos-drafts/{id}/lines/{lineId}
       Body: { quantity, unitPrice, discountAmount?, expectedVersion? }
       Single-line upsert; delete when quantity = 0 (logical delete).
       Returns updated draft.

DELETE /api/v1/pos-drafts/{id}/lines/{lineId}
       Logical delete of one line.
       Returns updated draft.

POST   /api/v1/pos-drafts/{id}/refresh-prices
       Re-snapshots all lines to current catalog prices. Creates audit log entries.
       Returns updated draft.

POST   /api/v1/pos-drafts/{id}/complete
       Headers: Idempotency-Key: <complete-key>
       Body: { payments, customerId?, clientSoldAt?, expectedVersion? }
       Transactional flow:
         1. Lock draft row; verify status=pending and version matches.
         2. Recompute totals from current lines.
         3. Build PostSaleRequest from draft lines + provided payments.
         4. Call SaleService.createSale(draftId, ...).
         5. On success: set sale_id, status=completed, completed_at.
         6. Return SaleResponse.

POST   /api/v1/pos-drafts/{id}/cancel
       Body: { reason? }
       Sets status = cancelled (permission-gated).
       Cannot cancel a completed draft.

GET    /api/v1/pos-drafts?branchId=&status=pending&createdBy=&limit=&cursor=
       List pending drafts for branch (resume / audit panel).
       Defaults to drafts updated in the last 48 hours; older drafts require an explicit date filter.
```

### Error contract (selection)

| Code | When |
|---|---|
| `409 Conflict` | Optimistic lock mismatch; body contains server draft snapshot. Client refreshes and prompts cashier. |
| `422 Unprocessable` | Item unavailable / out of stock at completion; body lists affected lineIds. |
| `423 Locked` | Draft already completed or cancelled. |
| `400 Bad Request` | Duplicate `clientDraftId` under a different branch, or completed sale request does not match draft. |

---

## Frontend Changes

### Files to create

| File | Purpose |
|---|---|
| `frontend/lib/pos-draft-api.ts` | API client for draft CRUD + complete, including idempotency-key plumbing. |
| `frontend/lib/pos-draft-sync.ts` | Sync state machine, retry queue, conflict resolution helpers. |
| `frontend/lib/pos-draft-store.ts` | Local IndexedDB mirror of drafts for offline resilience. |
| `frontend/components/cashier/pending-sales-panel.tsx` | Branch pending ring-ups list with cancel/resume actions. |
| `frontend/components/cashier/draft-conflict-modal.tsx` | UI shown on 409 / stale draft. |

### Files to modify

| File | Change |
|---|---|
| `frontend/lib/cart-session.ts` | Add `draftId`, `ticketNumber`, `clientDraftId`, `version`, `syncStatus` (`idle` \| `syncing` \| `error` \| `conflict`), `lastServerSnapshot`. |
| `frontend/components/cashier/quick-sale-workspace.tsx` | Wire `addLine` / `removeLine` / `updateLine` / `onComplete` to sync layer; hydrate on load. |
| `frontend/components/cashier/cashier-pos-layout.tsx` | Tab labels show `#N` · item count · total; sync spinner on conflict. |
| `frontend/components/cashier/cashier-cart-drawer.tsx` | Display ticket number in checkout header; show stale/conflict banner. |
| `frontend/app/cashier/page.tsx` | No change expected (thin wrapper). |

### `CartSession` extension (sketch)

```typescript
export type CartSession = {
  id: string;                    // client tab id (stable for UI)
  clientDraftId: string;         // used for idempotency on create
  draftId: string | null;        // server pos_drafts.id
  ticketNumber: number | null;   // e.g. 47
  version: number;               // server optimistic lock version
  syncStatus: "idle" | "syncing" | "error" | "conflict";
  lastSyncedAt: string | null;
  lastServerSnapshot: PosDraft | null;
  label: string;
  lines: CartSessionLine[];
  // ... existing payment/customer/STK fields unchanged
};
```

### Sync strategy

| Action | API call |
|---|---|
| First item on empty tab | `POST /pos-drafts` (idempotent) |
| Add item to existing draft | `PATCH /pos-drafts/{id}/lines` or `PUT …/lines/{lineId}` |
| Qty / price edit | `PUT …/lines/{lineId}` (debounced ~300ms) |
| Remove line | `DELETE …/lines/{lineId}` or PUT with qty=0 |
| Refresh prices | `POST …/refresh-prices` |
| Complete sale | `POST …/complete` with idempotency key (then existing receipt flow) |
| Page load | `GET /pos-drafts?branchId&status=pending&createdBy=me` → merge into cart tabs |

Empty tabs remain client-only until the first item is added.

### Hydration algorithm (on `/cashier` load)

1. Load local tabs from `pos-draft-store` (IndexedDB) if any.
2. Fetch server drafts for `(business, branch, me)` updated within last 48h.
3. Match server drafts to local tabs by `draftId` or `clientDraftId`.
4. For each unmatched server draft, create a new tab (up to `MAX_CARTS`).
5. If server drafts exceed `MAX_CARTS`, render the excess in `PendingSalesPanel` instead of tabs.
6. Always append one empty local tab for a new sale.
7. If a local tab is ahead of the server snapshot, queue a sync; if the server is ahead, adopt the server snapshot and mark conflict if local also changed.

---

## Sync, Conflict & Offline Strategy

### Sync state machine (per cart tab)

```
        ┌─────────┐
   ┌───►│  idle   │◄────────────────┐
   │    └────┬────┘                 │
   │         │ local mutation       │ success / no-op
   │         ▼                      │
   │    ┌─────────┐    error    ┌───┴───┐
   └────┤ syncing │────────────►│ error │────► retry / discard
        └────┬────┘             └───────┘
             │ 409 / stale
             ▼
        ┌──────────┐
        │ conflict │────► show modal: keep mine / keep server / merge
        └──────────┘
```

### Conflict-resolution UI

When the server returns `409` or a stale snapshot:
- Block checkout until resolved.
- Show a non-blocking banner: *"Sale #N was modified elsewhere."*
- Offer:
  - **Use server version** (discard local changes).
  - **Use my version** (force PATCH with latest `expectedVersion`).
  - **Review differences** (side-by-side line comparison; defer if complexity is high).

### Offline strategy (v1 pragmatic)

The cashier PWA already registers a service worker and `sale-outbox.ts` queues **completed** sales. This spec adds a local draft mirror so mid-ring-up resilience does not fully regress.

| Scenario | Behavior |
|---|---|
| Online, first item | `POST /pos-drafts` immediately; assign ticket number. |
| Online, subsequent mutations | Debounced API calls; local state updates optimistically. |
| Network drops mid-ring-up | Continue scanning into local mirrored draft. Banner: *"Offline — sale will sync when connection returns."* |
| Network returns | Replay queued mutations via `PATCH /lines`; if replay fails (e.g. item changed), surface conflict modal. |
| Complete while offline | Queue completed sale in existing `sale-outbox`; also queue draft-complete. On reconnect, complete both. Receipt prints after confirmation. |

**Implementation note:** The local mirror is not a replacement for the server draft. It is a temporary buffer. v2 can formalize the mutation outbox; v1 keeps the existing outbox for completed sales and adds a lightweight draft buffer.

---

## Decisions (Resolved Recommendations)

### Cart identity: one row per active cart per what?

**Recommendation: one DB row per cart tab**, scoped to `(business_id, branch_id, created_by)`.

- No register/terminal entity exists today.
- Cashier role is branch-locked — drafts are naturally branch-scoped.
- Client `CartSession.id` maps to server `pos_drafts.id` after first sync; `clientDraftId` provides idempotency before mapping.

### Update strategy: full overwrite vs line upserts?

**Recommendation: line-item upserts by `line_id`**.

- Upsert on `(draft_id, line_id)`; logical delete when qty → 0.
- Recompute `grand_total` server-side.
- Optimistic locking via `@Version` on draft header.
- Bulk `PATCH /lines` for scan bursts; single `PUT` for edits.

### Do pending carts expire?

**Recommendation: never hard-delete headers.**

- Keep `pending` rows for audit.
- UI defaults to recent (today + yesterday) with filter for older.
- Optional later: auto-`cancelled` with reason `auto_abandoned` after configurable TTL for list hygiene — not payment blocking.

### Can a cashier have more than one pending sale open?

**Yes.** UI already supports up to 8 cart tabs (`MAX_CARTS = 8`). Each tab with items gets its own ticket number. Empty tabs stay local-only.

### Concurrency: second cart before first is finalized?

**Allowed.** Each tab → separate draft → separate ticket number.

- Same cashier on two devices → independent drafts, both on branch pending list.
- Same cashier on two tabs → same behavior.
- Optimistic lock conflict → 409, refresh from server (rare).

### Who can see / cancel pending sales?

| Permission | Who | Action |
|---|---|---|
| `pos.drafts.read` | cashier+ at branch | See branch pending list |
| `pos.drafts.write` | cashier+ | Create/update own drafts |
| `pos.drafts.cancel.own` | cashier | Cancel own pending |
| `pos.drafts.cancel.any` | manager/owner | Cancel any pending at branch |

Cashiers should be able to **resume** any branch pending draft (customer moved registers). **Cancel own** by default; managers cancel any.

**Permission migration:** Seed these permissions into existing roles:
- `cashier`: `read`, `write`, `cancel.own`
- `manager`, `owner`, `admin`: all of the above + `cancel.any`

### Ticket-number scope

**Resolved: per branch.** Aligns with branch-locked cashiers and avoids a single hot row per business.

### Shift requirement

**Resolved: required at checkout only.** Drafts may be created before a shift is open, but `complete` validates an open shift just like `SaleService.createSale()` does today.

---

## What Must NOT Change on Draft Writes

These effects stay **checkout-only** (via `SaleService.createSale()`):

| Effect | When |
|---|---|
| Stock / batch pick | Checkout |
| GL journal | Checkout |
| Shift drawer | Checkout |
| Loyalty earn/redeem | Checkout |
| Customer credit/wallet debits | Checkout |
| Receipt / PDF | Checkout |
| Void flow | Completed sales only |

Draft lines store `item_id`, `quantity`, `unit_price`, `discount_amount`, denormalized `item_name`, `item_barcode` — **no `batch_id`**.

---

## Relationship to Grocery Invoices

These coexist on the same cashier page but are **separate workflows**:

| | Cashier draft (this spec) | Grocery invoice |
|---|---|---|
| Who builds it | Cashier at register | Grocery clerk |
| Identifier | Sale #N (sequential) | `GI-*` barcode |
| Entry on cashier | Direct ring-up | Scan barcode → `PendingInvoicesPanel` |
| Table | `pos_drafts` | `grocery_invoices` |
| Checkout | `POST …/pos-drafts/{id}/complete` | `PayGroceryInvoice` → `SaleService` |

Both finish through `SaleService.createSale()`. Do not merge the data models.

### Not in scope

- Grocery invoice creation or payment flow changes
- Web storefront `web_carts`
- Register/terminal hardware entity
- Holding stock against pending drafts
- Layaways, partial payments, or credit-on-draft before checkout

---

## Implementation Plan (Phased)

| Phase | Scope | Effort | Risk |
|---|---|---|---|
| **0** | Feature flags, permission seeds, shadow-write telemetry | ~0.5 day | Low |
| **1** | DB migration + branch sequence + create/read/upsert/cancel API + audit log | ~3 days | Low |
| **2** | Wire `addLine` / `removeLine` / `updateLine` to sync layer; tab shows `#N` | ~2 days | Medium (latency UX) |
| **3** | `complete` endpoint wrapping `SaleService.createSale()` with idempotency | ~2 days | Medium |
| **4** | Hydrate pending drafts on `/cashier` load; `PendingSalesPanel` | ~1.5 days | Low |
| **5** | Local draft mirror + offline mutation replay | ~2 days | Medium |
| **6** | Realtime fan-out (new pending at branch) | ~0.5 day | Optional |
| **7** | Load test ticket allocation, observability dashboards, rollout | ~1 day | Low |

### Backend package layout (suggested)

```
backend/src/main/java/zelisline/ub/posdraft/
  api/PosDraftController.java
  application/PosDraftService.java
  domain/PosDraft.java, PosDraftLine.java, PosDraftAuditLog.java
  repository/PosDraftRepository.java, PosDraftLineRepository.java, PosDraftAuditLogRepository.java
  infrastructure/BranchPosSequenceAllocator.java
  PosDraftConstants.java
```

---

## Testing Strategy

### Unit tests
- `PosDraftService` line recomputation (totals, tax, discounts).
- Optimistic locking: version mismatch → `409`.
- Idempotency: duplicate `clientDraftId` returns same draft; duplicate complete key returns same sale.
- Sequence allocator: concurrent inserts produce unique, gap-free ticket numbers per branch.

### Integration tests
- Full happy path: scan → create draft → update qty → complete → verify `sale_id` link and stock decrement.
- Completion failure: item goes out of stock between draft and complete → `422` with affected line.
- Cancellation: cancelled draft cannot be completed.
- Hydration: load `/cashier`, fetch pending drafts, merge into tabs.

### Load tests
- 50 concurrent cashiers scanning first items at the same branch — measure ticket allocation latency and contention.
- Target p99 < 200ms for draft create at normal load; if exceeded, implement number-block pre-allocation.

### End-to-end tests
- Offline ring-up → reconnect → replay mutations → complete sale.
- Conflict modal: two tabs update the same draft; cashier resolves with server version.

---

## Observability & Monitoring

### Metrics to emit

| Metric | Type | Alert |
|---|---|---|
| `pos_draft.created` | counter | — |
| `pos_draft.completed` | counter | — |
| `pos_draft.cancelled` | counter | spike over baseline |
| `pos_draft.conflict` | counter | > 5/min |
| `pos_draft.complete_duration_ms` | histogram | p99 > 1s |
| `pos_draft.ticket_allocation_ms` | histogram | p99 > 100ms |
| `pos_draft.sync_error` | counter | > 10/min |

### Dashboards
- Drafts by status per branch (pending / completed / cancelled).
- Median time from draft creation to completion.
- Offline mutation replay backlog.

### Logging
- Every mutation writes one `pos_draft_audit_log` row.
- Structured application logs for completion failures with `draft_id`, `sale_id`, `reason`.

---

## Rollout & Feature Flags

### Feature flags

| Flag | Purpose |
|---|---|
| `pos_drafts.enabled` | Master kill-switch for the entire feature. |
| `pos_drafts.shadow_writes` | Phase 0: create drafts in the background without changing UI; validate data integrity. |
| `pos_drafts.ui_visible` | Show ticket numbers, sync status, and pending panel. |
| `pos_drafts.offline_mirror` | Enable local IndexedDB mirror and mutation replay. |

### Rollout plan

1. **Shadow mode (1 week):** Enable `shadow_writes` for a subset of branches. Compare draft totals to completed sales; no user-facing change.
2. **Limited GA:** Enable `ui_visible` for one branch; monitor conflict/error rates.
3. **Full GA:** Enable for all branches; enable `offline_mirror` once sync reliability is proven.
4. **Cleanup:** Remove shadow-write flag after 30 days of stable operation.

### Rollback criteria
- `pos_draft.complete_duration_ms` p99 > 3s for 10 minutes.
- Increase in failed completions > 1% for 30 minutes.
- Data integrity discrepancies between drafts and sales.

**Rollback action:** Disable `pos_drafts.ui_visible` and `pos_drafts.enabled`; existing completed sales remain valid, pending drafts stay in DB for later reconciliation.

---

## Open Decisions

| # | Question | Options | Recommendation |
|---|---|---|---|
| 1 | **Customer/payment prefs on draft** | Persist on header vs client-only until checkout | **Client-only v1**; persist `customer_id` on header in phase 2 if resume-across-devices matters |
| 2 | **Auto-cancellation TTL** | Never auto-cancel vs 24h/7d/30d | **Defer**; keep all pending rows until explicit cancellation or manual archival |
| 3 | **Discount engine on draft lines** | Store raw `discount_amount` vs compute from promo rules | **Raw amount v1**; apply promo engine at checkout via existing sale pipeline |
| 4 | **Tax engine on draft totals** | Compute tax per line vs store aggregate only | **Compute per line and store** so receipt preview is accurate |
| 5 | **Naming** | `pos_drafts` vs `pos_carts` | Either works; `pos_drafts` emphasizes non-sale semantics |

---

## Appendix: Key Source References

| Area | Path |
|---|---|
| Cashier page | `frontend/app/cashier/page.tsx` |
| Cart workspace | `frontend/components/cashier/quick-sale-workspace.tsx` |
| Cart session types | `frontend/lib/cart-session.ts` |
| POS layout | `frontend/components/cashier/cashier-pos-layout.tsx` |
| Offline sale queue | `frontend/lib/sale-outbox.ts` |
| Sale creation | `backend/.../sales/application/SaleService.java` |
| Sale entity | `backend/.../sales/domain/Sale.java` |
| Web cart upsert pattern | `backend/.../storefront/application/PublicWebCartService.java` |

---

## Changelog from original scope

| Area | Change |
|---|---|
| Ticket numbers | Changed scope from **business** to **branch** to avoid hot rows. |
| Draft lines | Replaced `UNIQUE(draft_id, item_id)` with `UNIQUE(draft_id, line_index)` to allow duplicate SKUs. |
| API | Added `Idempotency-Key`, `PATCH /lines` bulk endpoint, `refresh-prices`, and explicit completion transaction. |
| Data model | Added `pos_draft_audit_log`, `client_draft_id`, tax/discount/currency fields, and logical delete on lines. |
| Frontend | Added sync state machine, conflict-resolution modal, hydration algorithm, and local IndexedDB mirror. |
| Offline | Replaced "online-required" with pragmatic local mirror + replay, avoiding a UX regression. |
| Operations | Added testing strategy, observability metrics, feature flags, and rollout/rollback plan. |
