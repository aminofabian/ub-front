# Grocery Counter Cart Persistence — Revised Specification & Code-Aware Analysis

> **Status:** Revision v1.1 — incorporates implementation-readiness gaps identified in the original scope.  
> **Surface**: Grocery counter PWA at `/grocery` — cart UI in `grocery-invoice-cart.tsx`, state in `grocery-workspace.tsx`  
> **Not in scope**: Cashier POS ring-up (`/cashier`), paying invoices at the register, web storefront carts  
> **Pattern**: Treat the in-progress counter cart as a **draft** — persist on each add, issue `GI-*` barcode only on **Generate Invoice**  
> **Companion doc**: [CASHIER_CART_PERSISTENCE_SCOPE.md](./CASHIER_CART_PERSISTENCE_SCOPE.md) (same idea, different lifecycle)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What the Grocery Counter Is Today](#what-the-grocery-counter-is-today)
3. [The Problem](#the-problem)
4. [Three-Phase Lifecycle](#three-phase-lifecycle)
5. [Why Not Create `grocery_invoices` on First Item?](#why-not-create-grocery_invoices-on-first-item)
6. [Proposed Data Model](#proposed-data-model)
7. [Proposed API Surface](#proposed-api-surface)
8. [Frontend Changes](#frontend-changes)
9. [Sync, Conflict & Offline Strategy](#sync-conflict--offline-strategy)
10. [Admin: Pending Drafts Filter](#admin-pending-drafts-filter)
11. [Decisions (Resolved Recommendations)](#decisions-resolved-recommendations)
12. [What Must NOT Change on Draft Writes](#what-must-not-change-on-draft-writes)
13. [Relationship to Cashier POS Drafts](#relationship-to-cashier-pos-drafts)
14. [Implementation Plan (Phased)](#implementation-plan-phased)
15. [Testing Strategy](#testing-strategy)
16. [Observability & Monitoring](#observability--monitoring)
17. [Rollout & Feature Flags](#rollout--feature-flags)
18. [Open Decisions](#open-decisions)
19. [Appendix: Key Source References](#appendix-key-source-references)

---

## Executive Summary

**Current behavior:** The grocery counter cart (`GroceryInvoiceCart`) receives lines from in-memory React state in `GroceryWorkspace`. Nothing is written to the database until the clerk taps **Generate Invoice**, which bulk-creates a `grocery_invoices` row (`pending_payment`) with a `GI-*` barcode.

**New behavior:**

- On each item add → write/upsert a **draft cart** to the database immediately (`status: building`).
- Qty changes / removals → update the same draft record (line upserts).
- On **Generate Invoice** → atomically convert draft to existing `grocery_invoice` (`pending_payment`), assign `GI-*` barcode, start expiry clock.
- If abandoned before Generate → draft sits as `building` (recoverable, auditable).
- Each new cart gets a sequential **counter number** (1, 2, 3…), assigned on first item — never reused, separate sequence from cashier POS tickets.

The clerk sees **"Counter #12"** in the cart header as soon as the first product is added — before the customer gets a scannable barcode.

### Key design decisions upfront

| Decision | Rationale |
|---|---|
| New `grocery_drafts` table (not `draft` status on `grocery_invoices`) | `grocery_invoices.barcode_code` is NOT NULL and unique; barcode should only exist when the customer is ready to pay at cashier. |
| Stock still deducted at **invoice payment** only | Unchanged — drafts and pending invoices do not touch inventory. |
| **Generate Invoice** = promote draft → invoice | Reuses existing `GroceryInvoiceService.createInvoice()` validation; draft becomes the idempotent source of truth for lines. |
| Line-item upserts by `line_id` | Supports duplicate SKUs, different units, and line-level notes. |
| Snapshot pricing at scan time | Cart totals remain stable while the clerk is still building; `issue` uses draft line prices. |
| One active `building` draft per clerk per branch | Simplifies resume-on-load and avoids abandoned draft accumulation. |
| Idempotency on create and issue | Prevents duplicate counter numbers / duplicate `GI-*` barcodes from retries or double-taps. |
| Branch-scoped counter numbers | Aligns with branch-locked clerks and avoids business-level hot rows. |

---

## What the Grocery Counter Is Today

### Entry point

```tsx
// frontend/app/grocery/page.tsx
import { GroceryWorkspace } from "@/components/grocery/grocery-workspace";

export default function GroceryPage() {
  return <GroceryWorkspace />;
}
```

### Component split

| Layer | File | Role |
|---|---|---|
| Workspace | `grocery-workspace.tsx` | Product browse, scan, **in-memory `lines`**, `onGenerate` |
| Cart UI | `grocery-invoice-cart.tsx` | Presentational panel / bottom sheet — header says **"Current Sale"** |
| Success | `grocery-invoice-success.tsx` | Shows `GI-*` barcode after generate |
| Admin list | `app/grocery/invoices/page.tsx` | Filtered list of **issued** invoices (`pending_payment`, `paid`, …) |
| Cashier pay | `PendingInvoicesPanel` on `/cashier` | Scan barcode to pay |

### Current cart state (in-memory only)

```tsx
// grocery-workspace.tsx
const [lines, setLines] = useState<GroceryCartLine[]>([]);

const addLine = useCallback((item: ItemSummaryRecord) => {
  // merge qty or append new GroceryCartLine with crypto.randomUUID() key
  setLines(...);
}, [lines]);
```

```tsx
// grocery-invoice-cart.tsx — props only, no persistence
export type GroceryCartLine = {
  key: string;
  itemId: string;
  label: string;
  quantity: number;
  unitPrice: number;
  unitName: string;
};
```

### Generate invoice (bulk persist today)

```tsx
const invoice = await createGroceryInvoice({
  branchId: bid,
  lines: lines.map((l) => ({
    itemId: l.itemId,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    unitName: l.unitName || undefined,
  })),
});
// → grocery_invoices.status = pending_payment, barcode GI-*
```

`grocery-outbox.ts` exists for offline **invoice** creation but is **not wired** in `grocery-workspace.tsx` today.

### Existing invoice lifecycle (after Generate)

```
pending_payment → paid | cancelled | expired
```

Cashier pays via `PayGroceryInvoice` → `SaleService.createSale()`.

---

## The Problem

Same class of loss as cashier POS, but on the **grocery counter**:

1. Clerk builds a cart for a customer → lives only in browser memory
2. App refresh, crash, phone call, switch app → **cart lost**; clerk re-scans everything
3. No number or record until **Generate Invoice** — can't reference "the order I was building"
4. Managers can't see in-progress counter work — only invoices already handed to customers

**Generate Invoice** is the grocery equivalent of cashier **Complete sale** — but there's no draft persistence *before* that moment.

---

## Three-Phase Lifecycle

```
┌─────────────────┐     Generate Invoice      ┌──────────────────────┐     Cashier pays     ┌──────┐
│ grocery_drafts  │ ────────────────────────► │ grocery_invoices     │ ───────────────────► │ sale │
│ status: building│                           │ status: pending_payment│                      └──────┘
└─────────────────┘                           └──────────────────────┘
        │                                                │
        └── abandoned (building)                         └── expired / cancelled / paid
```

| Phase | Table | Status | Identifier | Customer action |
|---|---|---|---|---|
| **1. Building** | `grocery_drafts` | `building` | Counter #N | None — clerk still adding items |
| **2. Issued** | `grocery_invoices` | `pending_payment` | `GI-*` barcode | Take barcode to cashier |
| **3. Paid** | `grocery_invoices` | `paid` | `GI-*` + `sale_id` | Done |

---

## Why Not Create `grocery_invoices` on First Item?

| Issue | Detail |
|---|---|
| `barcode_code NOT NULL UNIQUE` | Drafts shouldn't get a scannable code until Generate |
| `expires_at NOT NULL` | Expiry should start when invoice is **issued**, not while clerk is still building |
| Semantic mix | Cashier `PendingInvoicesPanel` lists payables — drafts aren't payables yet |
| Admin confusion | `/grocery/invoices` "Pending" tab would include half-built carts |

Separate `grocery_drafts` keeps issued invoices clean. **Generate Invoice** promotes draft → invoice (same as today's bulk create, but lines already in DB).

---

## Proposed Data Model

### `grocery_drafts` (header)

```sql
CREATE TABLE grocery_drafts (
    id              CHAR(36)       NOT NULL PRIMARY KEY,
    business_id     CHAR(36)       NOT NULL,
    branch_id       CHAR(36)       NOT NULL,
    counter_number  BIGINT         NOT NULL,
    status          VARCHAR(16)    NOT NULL DEFAULT 'building',
    -- building | issued | cancelled | issue_failed
    created_by      CHAR(36)       NOT NULL,
    invoice_id      CHAR(36)       NULL,          -- set when issued (Generate)
    client_draft_id VARCHAR(64)    NULL,          -- idempotency handle from client
    notes           VARCHAR(1000)  NULL,          -- clerk notes, promoted to invoice
    currency        VARCHAR(3)     NOT NULL,      -- denormalized from business
    sub_total       DECIMAL(14,2)  NOT NULL DEFAULT 0,
    discount_total  DECIMAL(14,2)  NOT NULL DEFAULT 0,
    tax_total       DECIMAL(14,2)  NOT NULL DEFAULT 0,
    grand_total     DECIMAL(14,2)  NOT NULL DEFAULT 0,
    cancelled_by    CHAR(36)       NULL,
    cancelled_at    TIMESTAMP      NULL,
    cancelled_reason VARCHAR(500)  NULL,
    issued_at       TIMESTAMP      NULL,
    version         BIGINT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_grocery_drafts_branch_counter (branch_id, counter_number),
    UNIQUE KEY uq_grocery_drafts_client_draft   (business_id, client_draft_id),
    KEY idx_gd_branch_status (business_id, branch_id, status),
    KEY idx_gd_created_by (business_id, created_by, status),
    KEY idx_gd_updated_at (business_id, updated_at),

    CONSTRAINT fk_gd_business   FOREIGN KEY (business_id) REFERENCES businesses(id),
    CONSTRAINT fk_gd_branch     FOREIGN KEY (branch_id)   REFERENCES branches(id),
    CONSTRAINT fk_gd_created_by FOREIGN KEY (created_by)  REFERENCES users(id),
    CONSTRAINT fk_gd_invoice    FOREIGN KEY (invoice_id)  REFERENCES grocery_invoices(id)
);
```

### `grocery_draft_lines`

```sql
CREATE TABLE grocery_draft_lines (
    id              CHAR(36)       NOT NULL PRIMARY KEY,
    draft_id        CHAR(36)       NOT NULL,
    business_id     CHAR(36)       NOT NULL,        -- shard / query helper
    line_index      INT            NOT NULL,
    item_id         CHAR(36)       NOT NULL,
    item_name       VARCHAR(500)   NOT NULL,
    item_barcode    VARCHAR(128)   NULL,            -- speeds re-scan / audit
    quantity        DECIMAL(14,4)  NOT NULL,
    unit_name       VARCHAR(16)    NOT NULL DEFAULT 'each',
    unit_price      DECIMAL(14,4)  NOT NULL,
    discount_amount DECIMAL(14,4)  NOT NULL DEFAULT 0,
    line_total      DECIMAL(14,2)  NOT NULL,
    is_deleted      TINYINT(1)     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_gdl_draft_line (draft_id, line_index),
    KEY idx_gdl_draft (draft_id),
    KEY idx_gdl_item  (business_id, item_id),

    CONSTRAINT fk_gdl_draft FOREIGN KEY (draft_id) REFERENCES grocery_drafts(id) ON DELETE CASCADE,
    CONSTRAINT fk_gdl_item  FOREIGN KEY (item_id)  REFERENCES items(id)
);
```

> **Why `line_index` instead of `item_id` unique?** A grocery cart may legitimately contain the same SKU twice with different units, prices, or weights. Upserts target a specific `line_id` (server-assigned); new lines get a new `line_index`.

### `grocery_draft_audit_log`

Captures who changed what, when — required for abandonment / void / theft analysis.

```sql
CREATE TABLE grocery_draft_audit_log (
    id          CHAR(36)      NOT NULL PRIMARY KEY,
    draft_id    CHAR(36)      NOT NULL,
    user_id     CHAR(36)      NOT NULL,
    action      VARCHAR(32)   NOT NULL,
    -- CREATE_DRAFT | ADD_LINE | UPDATE_LINE | REMOVE_LINE | REFRESH_PRICES
    -- ISSUE | ISSUE_FAILED | CANCEL | REOPEN
    line_id     CHAR(36)      NULL,
    old_value   JSON          NULL,
    new_value   JSON          NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY idx_gdal_draft (draft_id, created_at),
    KEY idx_gdal_user  (user_id, created_at),

    CONSTRAINT fk_gdal_draft FOREIGN KEY (draft_id) REFERENCES grocery_drafts(id) ON DELETE CASCADE,
    CONSTRAINT fk_gdal_user  FOREIGN KEY (user_id)  REFERENCES users(id)
);
```

### `branch_grocery_sequences`

```sql
CREATE TABLE branch_grocery_sequences (
    branch_id      CHAR(36)  NOT NULL PRIMARY KEY,
    next_counter   BIGINT    NOT NULL DEFAULT 1,

    CONSTRAINT fk_bgs_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
);
```

Counter numbers are **independent** from cashier `pos_drafts.ticket_number` — grocery Counter #12 and cashier Sale #12 can coexist. Counter numbers are **branch-scoped** to match branch-locked clerks and avoid business-level hot rows.

Allocate `counter_number` inside the same transaction as draft creation using `SELECT … FOR UPDATE` on the branch sequence row. Never reuse numbers. Gaps from abandoned/cancelled counters are expected.

### Status lifecycle

```
building ──Generate Invoice──► issued  (invoice_id set; draft row kept for audit)
   │
   ├──cancel──► cancelled
   │
   └──issue fails──► issue_failed  (retryable; clerk can retry or cancel)
```

Do not delete `building` rows on issue — mark `issued` so managers can trace Counter #12 → `GI-XXXX`.

---

## Proposed API Surface

All endpoints require `grocery.invoices.create` / `grocery.invoices.read` or dedicated `grocery.drafts.*` permissions (see [Decisions](#decisions-resolved-recommendations)).

### Idempotency contract

- `POST /api/v1/grocery-drafts` accepts an `Idempotency-Key` header (or `clientDraftId` in body). Retrying with the same key returns the same draft, not a new counter number.
- `POST /api/v1/grocery-drafts/{id}/issue` accepts an `Idempotency-Key` header. Retrying returns the already-created invoice; a second `grocery_invoice` must never be created.
- Clients should generate `clientDraftId` once per workspace session (e.g. `crypto.randomUUID()`) and reuse it for the lifetime of that cart.

### Endpoints

```
POST   /api/v1/grocery-drafts
       Headers: Idempotency-Key: <clientDraftId>
       Body: { branchId, clientDraftId, lines: [{ itemId, quantity, unitPrice, unitName?, discountAmount? }] }
       First item — allocates counter_number.
       Returns: { id, counterNumber, status, lines, subTotal, discountTotal, taxTotal, grandTotal, version }

GET    /api/v1/grocery-drafts/{id}
       Returns draft with lines (excluding logically deleted lines by default; includeDeleted=true for audit).

PATCH  /api/v1/grocery-drafts/{id}/lines
       Body: { lines: [{ lineId?, itemId, quantity, unitPrice, unitName?, discountAmount? }], expectedVersion? }
       Bulk upsert/replace lines. Used for initial scan bursts and sync reconciliation.
       Recomputes totals server-side, increments version.
       Returns updated draft.

PUT    /api/v1/grocery-drafts/{id}/lines/{lineId}
       Body: { quantity, unitPrice, unitName?, discountAmount?, expectedVersion? }
       Single-line upsert; logical delete when quantity = 0.
       Returns updated draft.

DELETE /api/v1/grocery-drafts/{id}/lines/{lineId}
       Logical delete of one line.
       Returns updated draft.

POST   /api/v1/grocery-drafts/{id}/issue
       Headers: Idempotency-Key: <issue-key>
       Body: { notes?, expectedVersion? }
       Atomic promotion flow:
         1. Lock draft row; verify status=building and version matches.
         2. Recompute totals from current lines.
         3. Validate max draft age (configurable, default 72h); warn/reject if prices may be stale.
         4. Call GroceryInvoiceService.createInvoice(...) using draft lines as source of truth.
         5. On success: set invoice_id, status=issued, issued_at.
         6. Return invoice with GI-* barcode.

POST   /api/v1/grocery-drafts/{id}/cancel
       Body: { reason? }
       Sets status = cancelled (permission-gated).
       Cannot cancel an issued draft (cancel the invoice instead via existing flow).

POST   /api/v1/grocery-drafts/{id}/retry-issue
       For issue_failed drafts only. Re-runs the issue transaction.

GET    /api/v1/grocery-drafts
       Query: branchId, status, createdBy, from, to, q, staleMinutes, sort, page, limit
       Powers grocery counter resume panel + admin Drafts tab.
       Defaults to drafts updated in last 48h; older drafts require explicit date filter.
```

Existing `POST /api/v1/grocery-invoices` remains for backward compatibility / offline outbox replay without a draft id.

### Error contract (selection)

| Code | When |
|---|---|
| `409 Conflict` | Optimistic lock mismatch; body contains server draft snapshot. |
| `422 Unprocessable` | Draft too stale to issue, or invoice validation failed (e.g. item inactive). |
| `423 Locked` | Draft already issued or cancelled. |
| `400 Bad Request` | Duplicate `clientDraftId` under a different branch. |

---

## Frontend Changes

### `grocery-invoice-cart.tsx`

Presentational today — extend props for draft identity and sync state:

```typescript
type GroceryInvoiceCartProps = {
  // ... existing lines, callbacks, totals ...

  /** Counter #N — null until first item synced */
  counterNumber?: number | null;
  draftId?: string | null;
  syncStatus?: "idle" | "syncing" | "error" | "conflict";
  lastServerSnapshot?: GroceryDraft | null;

  /** When issued, show link to barcode (optional) */
  issuedBarcode?: string | null;
};
```

**Header UX change** (currently "Current Sale"):

| State | Header |
|---|---|
| Empty, no draft | `Current Sale` |
| Building, synced | `Counter #12` |
| Syncing | `Counter #12` + subtle spinner |
| Sync error | `Counter #12` + retry affordance |
| Conflict | `Counter #12` + conflict banner |
| After Generate | Hand off to `GroceryInvoiceSuccess` (unchanged) |

Footer CTA stays **Generate Invoice** — not "Complete sale".

### `grocery-workspace.tsx`

| Action | Change |
|---|---|
| `addLine` | Local update + `POST` or `PATCH` grocery-drafts API |
| `updateLine` / `removeLine` | Debounced upsert |
| `onGenerate` | `POST …/grocery-drafts/{id}/issue` instead of raw `createGroceryInvoice` |
| `clearCart` | Cancel draft if `draftId` set, or local-only if never synced |
| Page load | `GET /grocery-drafts?status=building&createdBy=me&branchId=` → resume most recent active draft |
| Start new order | If a `building` draft exists, prompt: resume, cancel, or archive before creating fresh |

### New operational panel

**`GroceryPendingDraftsPanel`** on `/grocery` workspace header (mirror cashier `PendingSalesPanel`):

- Dropdown: my branch's `building` drafts
- Tap → resume into cart (`loadDraft(draftId)`)
- Badge count for open drafts

Not the same as `/grocery/invoices` — that's for **issued** invoices waiting for payment.

### Files

| File | Change |
|---|---|
| `grocery-invoice-cart.tsx` | Counter # header, sync indicator, conflict banner |
| `grocery-workspace.tsx` | Draft API wiring, resume on load, start-new-order flow |
| `lib/grocery-draft-api.ts` | **New** API client |
| `lib/grocery-draft-sync.ts` | **New** sync state machine, retry, conflict helpers |
| `lib/grocery-draft-store.ts` | **New** local IndexedDB mirror for offline resilience |
| `components/grocery/grocery-pending-drafts-panel.tsx` | **New** resume dropdown |
| `components/grocery/draft-conflict-modal.tsx` | **New** conflict-resolution UI |
| `lib/grocery-outbox.ts` | Phase 2: queue draft mutations or issue-from-draft offline |

---

## Sync, Conflict & Offline Strategy

### Sync state machine (per draft)

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
- Block **Generate Invoice** until resolved.
- Show banner: *"Counter #N was modified elsewhere."*
- Offer:
  - **Use server version** (discard local changes).
  - **Use my version** (force PATCH with latest `expectedVersion`).

### Offline strategy (v1 pragmatic)

The grocery PWA is less real-time than cashier, but clerks still lose carts on refresh.

| Scenario | Behavior |
|---|---|
| Online, first item | `POST /grocery-drafts` immediately; assign Counter #N. |
| Online, subsequent mutations | Debounced API calls; local state updates optimistically. |
| Network drops mid-build | Continue adding to local mirrored draft. Banner: *"Offline — order will sync when connection returns."* |
| Network returns | Replay queued mutations via `PATCH /lines`; if replay fails, surface conflict modal. |
| Generate while offline | Queue `issue` call in `grocery-outbox`; on reconnect, issue draft and show barcode. If draft changed offline, reconcile first. |

**Implementation note:** The local mirror is a temporary buffer, not a replacement for the server draft. v2 can formalize the full mutation outbox.

---

## Admin: Pending Drafts Filter

The grocery module **already has** a full admin list at `/grocery/invoices` with status tabs, search, sort, and detail modal. Extend it — do not build a separate page.

### Architecture decision: Drafts tab is separate from invoice tabs

Do **not** attempt to union `grocery_drafts` and `grocery_invoices` in a single "All" list. The two tables have different lifecycles, actions, and sortable fields. Instead:

- **Drafts** tab lists `grocery_drafts` (`building` / `issued` / `cancelled`).
- **Pending / Paid / Cancelled / Expired** tabs continue to list `grocery_invoices`.
- An **Issued today** summary tile links from Drafts tab to the Pending tab.

### Add **Drafts** tab

Update `STATUS_TABS` in `app/grocery/invoices/page.tsx`:

```typescript
const STATUS_TABS = [
  { label: "All Invoices", value: "all" },          // existing invoices only
  { label: "Drafts", value: "drafts" },              // ← new: grocery_drafts
  { label: "Pending", value: "pending_payment" },    // existing invoices
  { label: "Paid", value: "paid" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Expired", value: "expired" },
];
```

When **Drafts** selected, list from `GET /grocery-drafts` instead of `listGroceryInvoices`.

### Filters (Drafts tab)

| Filter | Notes |
|---|---|
| **Branch** | All · specific (clerks locked to assigned branch) |
| **Clerk** | `created_by` |
| **Date range** | On `updated_at` |
| **Search** | Counter #N, clerk name, item name |
| **Stale only** | `building` with no update ≥ 30 min (`staleMinutes=30`) |
| **Sort** | Newest · Oldest · Highest total · Longest idle |

### Summary tiles (Drafts tab)

- **Building count** — carts in progress
- **Building value** — sum of `grand_total`
- **Stale count** — likely abandoned
- **Issued today** — drafts promoted to invoices today (link to Pending tab)

### Row display

- **Counter #N** (primary)
- Clerk name · branch · item count · total
- Last updated (relative)
- Status badge (`building` / `issued` / `cancelled` / `issue_failed`)
- Actions: **View lines** · **Cancel** (manager) · **Open on counter** → `/grocery?resumeDraft={id}`

### Detail drawer

- Read-only line list
- If `status = issued`: link to invoice (`GI-*`) and open invoice detail
- **No Generate from admin** — clerk issues at counter (same rule as cashier: no checkout from dashboard)

### Permissions

| Action | Permission | Notes |
|---|---|---|
| View drafts | `grocery.invoices.read` (existing) | Read-only access to Drafts tab |
| Create/update own draft | `grocery.invoices.create` (existing) | Clerk at counter |
| Cancel own draft | `grocery.drafts.cancel.own` (new) | Clerk can abandon their own building draft |
| Cancel any draft | `grocery.invoices.cancel` (existing, managers) | Manager/owner can cancel any building draft |

**Permission migration:**
- `grocery_clerk`: `grocery.invoices.read`, `grocery.invoices.create`, `grocery.drafts.cancel.own`
- `manager`, `owner`, `admin`: all of the above + `grocery.invoices.cancel`

---

## Decisions (Resolved Recommendations)

### Cart identity

**One active `building` draft per clerk per branch**, scoped to `(business_id, branch_id, created_by)`.

- Grocery clerks are branch-locked (same as cashiers).
- A single active `building` draft simplifies resume-on-load and avoids abandoned draft accumulation.
- Enforced via application logic: starting a fresh draft prompts to resume, cancel, or archive the existing `building` draft.
- Optional future: relax to multiple drafts if product asks for it.

### Update strategy

**Line-item upserts by `line_id`**, debounced ~300ms on qty/price.

### Multiple building drafts per clerk?

**Default: one.** Unlike cashier multi-tab UX, grocery counter is typically one customer at a time. Allow multiple only if product asks for it later.

### Expiration

**Never hard-delete `building` drafts.** Optional auto-`cancelled` after N days for list hygiene. Issued invoices keep existing 24h expiry via `GroceryInvoiceExpiryScheduler`.

### Sequential numbers

**Per branch `counter_number`**, assigned on first item, never reused. Display as **Counter #N** in `GroceryInvoiceCart` header.

### Counter number scope

**Resolved: per branch.** Aligns with branch-locked clerks and avoids a single hot row per business.

### Price snapshot policy

**Resolved: snapshot at scan time.** `issue` uses draft line prices. A manual `refresh-prices` action can re-snap to current catalog prices with audit log entries.

### Keep draft row after issue

**Yes.** `status=issued`, link `invoice_id` for audit traceability from Counter #N → GI-XXXX.

### Reuse `grocery.invoices.*` perms vs new `grocery.drafts.*`

**Extend existing.** Read and manager cancel reuse `grocery.invoices.read` / `grocery.invoices.cancel`. Only add `grocery.drafts.cancel.own` for clerks cancelling their own building drafts.

---

## What Must NOT Change on Draft Writes

| Effect | When |
|---|---|
| Stock deduction | Cashier pays invoice (`PayGroceryInvoice`) |
| `GI-*` barcode assignment | **Generate Invoice** (`/issue`) |
| Invoice expiry clock | **Generate Invoice** |
| Sale / GL / drawer | Cashier payment only |
| Shift requirement | Not required for grocery clerk (unchanged) |

Draft lines store `item_id`, `quantity`, `unit_price`, `unit_name`, denormalized `item_name`, `item_barcode` — **no stock batch, no barcode**.

---

## Relationship to Cashier POS Drafts

| | Grocery draft (`grocery_drafts`) | Cashier draft (`pos_drafts`) |
|---|---|---|
| Surface | `/grocery` · `GroceryInvoiceCart` | `/cashier` · cart drawer |
| Number | Counter #N | Sale #N |
| Complete action | Generate Invoice → `GI-*` | Complete sale → `sales` row |
| Payment | At cashier (separate app area) | At same register |
| Admin list | `/grocery/invoices` → **Drafts** tab | `/sales/pending-carts` or similar |
| Sequence table | `branch_grocery_sequences` | `branch_pos_sequences` |
| Active drafts per user | One recommended | Up to 8 tabs allowed |

Shared implementation patterns (upsert service, list API, stale filter, resume deep link) — **separate tables and sequences**.

Cross-reference: [CASHIER_CART_PERSISTENCE_SCOPE.md](./CASHIER_CART_PERSISTENCE_SCOPE.md)

---

## Implementation Plan (Phased)

| Phase | Scope | Effort | Risk |
|---|---|---|---|
| **0** | Feature flags, permission seeds, shadow-write telemetry | ~0.5 day | Low |
| **1** | Migration + `grocery-drafts` CRUD + branch sequence + audit log | ~3 days | Low |
| **2** | Wire `grocery-workspace` add/update/remove + `GroceryInvoiceCart` Counter # header | ~2 days | Medium |
| **3** | `POST …/issue` promoting to `grocery_invoice` with idempotency | ~2 days | Medium |
| **4** | Resume on load + `GroceryPendingDraftsPanel` + start-new-order flow | ~1.5 days | Low |
| **5** | **Drafts tab** on `/grocery/invoices` + filters + detail drawer | ~1.5 days | Low |
| **6** | Local draft mirror + offline mutation / issue replay | ~2 days | Medium |
| **7** | Realtime (optional) — notify branch of stale drafts | ~0.5 day | Optional |
| **8** | Load test sequence allocation, observability dashboards, rollout | ~1 day | Low |

### Backend package (suggested)

```
backend/src/main/java/zelisline/ub/grocery/
  draft/
    GroceryDraftController.java
    GroceryDraftService.java
    domain/GroceryDraft.java, GroceryDraftLine.java, GroceryDraftAuditLog.java
    repository/GroceryDraftRepository.java, GroceryDraftLineRepository.java
  infrastructure/BranchGrocerySequenceAllocator.java
```

---

## Testing Strategy

### Unit tests
- `GroceryDraftService` line recomputation (totals, tax, discounts, unit conversions).
- Optimistic locking: version mismatch → `409`.
- Idempotency: duplicate `clientDraftId` returns same draft; duplicate issue key returns same invoice.
- Sequence allocator: concurrent inserts produce unique, gap-free counter numbers per branch.
- Issue validation: stale draft rejection, inactive item rejection.

### Integration tests
- Full happy path: scan → create draft → update qty → issue → verify `grocery_invoice` and barcode.
- Issue failure: invoice service throws → draft status `issue_failed`, retry succeeds.
- Cancellation: cancelled draft cannot be issued.
- Resume: load `/grocery`, fetch most recent `building` draft, hydrate lines.

### Load tests
- 50 concurrent clerks scanning first items at the same branch — measure counter allocation latency.
- Target p99 < 200ms for draft create at normal load.

### End-to-end tests
- Offline build → reconnect → replay mutations → issue invoice.
- Conflict modal: two devices update same draft; clerk resolves with server version.

---

## Observability & Monitoring

### Metrics to emit

| Metric | Type | Alert |
|---|---|---|
| `grocery_draft.created` | counter | — |
| `grocery_draft.issued` | counter | — |
| `grocery_draft.issue_failed` | counter | > 5/min |
| `grocery_draft.cancelled` | counter | spike over baseline |
| `grocery_draft.conflict` | counter | > 5/min |
| `grocery_draft.issue_duration_ms` | histogram | p99 > 1s |
| `grocery_draft.counter_allocation_ms` | histogram | p99 > 100ms |
| `grocery_draft.sync_error` | counter | > 10/min |

### Dashboards
- Drafts by status per branch (building / issued / cancelled / issue_failed).
- Median time from draft creation to issue.
- Offline mutation replay backlog.

### Logging
- Every mutation writes one `grocery_draft_audit_log` row.
- Structured application logs for issue failures with `draft_id`, `invoice_id`, `reason`.

---

## Rollout & Feature Flags

### Feature flags

| Flag | Purpose |
|---|---|
| `grocery_drafts.enabled` | Master kill-switch for the entire feature. |
| `grocery_drafts.shadow_writes` | Phase 0: create drafts in the background without changing UI; validate data integrity. |
| `grocery_drafts.ui_visible` | Show Counter #, sync status, pending panel, and Drafts admin tab. |
| `grocery_drafts.offline_mirror` | Enable local IndexedDB mirror and mutation replay. |

### Rollout plan

1. **Shadow mode (1 week):** Enable `shadow_writes` for a subset of branches. Compare draft totals to issued invoices; no user-facing change.
2. **Limited GA:** Enable `ui_visible` for one branch; monitor issue/error rates.
3. **Full GA:** Enable for all branches; enable `offline_mirror` once sync reliability is proven.
4. **Cleanup:** Remove shadow-write flag after 30 days of stable operation.

### Rollback criteria
- `grocery_draft.issue_duration_ms` p99 > 3s for 10 minutes.
- Increase in failed issues > 1% for 30 minutes.
- Duplicate `GI-*` barcodes detected.
- Data integrity discrepancies between drafts and invoices.

**Rollback action:** Disable `grocery_drafts.ui_visible` and `grocery_drafts.enabled`; clerks fall back to in-memory cart + existing `createGroceryInvoice` flow. Existing issued invoices remain valid; building drafts stay in DB for later reconciliation.

---

## Open Decisions

| # | Question | Options | Recommendation |
|---|---|---|---|
| 1 | **Auto-cancellation TTL** | Never auto-cancel vs 24h/7d/30d | **Defer**; keep all `building` rows until explicit cancellation or manual archival |
| 2 | **Discount engine on draft lines** | Store raw `discount_amount` vs compute from promo rules | **Raw amount v1**; apply promo engine at issue via existing invoice pipeline |
| 3 | **Tax engine on draft totals** | Compute tax per line vs store aggregate only | **Compute per line and store** so totals are accurate before issue |
| 4 | **Max draft age before issue** | No limit vs 24h/72h/warn only | **Warn at 24h, reject at 72h** configurable per business |
| 5 | **Customer/notes on draft header** | Persist notes on draft vs client-only until issue | **Persist notes**; promote to invoice on issue; customer linkage defer to v2 |

---

## Appendix: Key Source References

| Area | Path |
|---|---|
| Cart UI | `frontend/components/grocery/grocery-invoice-cart.tsx` |
| Cart state + generate | `frontend/components/grocery/grocery-workspace.tsx` |
| Admin invoice list | `frontend/app/grocery/invoices/page.tsx` |
| Invoice API | `frontend/lib/grocery-api.ts` |
| Offline outbox (invoice) | `frontend/lib/grocery-outbox.ts` |
| Invoice service | `backend/.../grocery/application/GroceryInvoiceService.java` |
| Invoice entity | `backend/.../grocery/domain/GroceryInvoice.java` |
| Cashier cart persistence spec | `frontend/docs/CASHIER_CART_PERSISTENCE_SCOPE.md` |

---

## Changelog from original scope

| Area | Change |
|---|---|
| Counter numbers | Changed scope from **business** to **branch** to avoid hot rows. |
| Draft lines | Replaced `UNIQUE(draft_id, item_id)` with `UNIQUE(draft_id, line_index)` to allow duplicate SKUs and mixed units. |
| API | Added `Idempotency-Key`, `PATCH /lines` bulk endpoint, `retry-issue`, explicit issue transaction, and error contract. |
| Data model | Added `grocery_draft_audit_log`, `client_draft_id`, tax/discount/currency fields, `notes`, `issued_at`, `issue_failed` status, and logical delete on lines. |
| Frontend | Added sync state machine, conflict-resolution modal, hydration algorithm, start-new-order flow, and local IndexedDB mirror. |
| Admin | Clarified Drafts tab as separate from invoice tabs; do not union the two tables. |
| Offline | Replaced "online-required" with pragmatic local mirror + replay. |
| Operations | Added testing strategy, observability metrics, feature flags, and rollout/rollback plan. |
