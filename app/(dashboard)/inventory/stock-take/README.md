# Stock Take

> **URL:** `https://palmart.co.ke/inventory/stock-take`

Inventory counting module with **two workflows**:

| Workflow | Route | Status | Doc |
|---|---|---|---|
| **General stock take** | `/inventory/stock-take` | Implemented | This file |
| **Daily audit (random 25)** | `/inventory/stock-take/daily-audit` | Implemented | [DAILY_AUDIT.md](./DAILY_AUDIT.md) |

**Backend:** Java/Spring in [`backend/`](../../../../backend/) — `StockTakeService`, `StockTakeController`, Flyway migrations `V73+`.

---

## General Stock Take

Physical inventory counting where staff search or scan products, submit quantities, and admins review variances. Supports flexible partial counts and full checklist-based sessions.

### User Flow

```
┌─────────────────────────────────────────────────────────┐
│                     ENTRY POINT                          │
│  /inventory/stock-take                                  │
│  (permission-gated: StocktakeRead | StocktakeRun |      │
│   StocktakeApprove)                                     │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │ Check for active        │
          │ session on branch       │
          └──────┬────────┬─────────┘
                 │        │
        NO SESSION        HAS ACTIVE SESSION
                 │        │
    ┌────────────▼──┐  ┌──▼──────────────────────┐
    │ START MODE     │  │ COUNTING MODE            │
    │                │  │                          │
    │ 1. Select      │  │ 1. Search products       │
    │    type +      │  │    (name/SKU/barcode)    │
    │    branch      │  │ 2. Scan barcode          │
    │ 2. Add notes   │  │ 3. Click → count modal   │
    │ 3. Start       │  │ 4. Enter qty + aisle    │
    │    session     │  │ 5. Submit count          │
    │                │  │ 6. Create new products   │
    │ [Admin only]   │  │    if not in catalog     │
    │ Pending review │  │                          │
    │ sessions list  │  │ [Admin] → Review page    │
    └────────────────┘  └──────────┬───────────────┘
                                   │
                      ┌────────────▼──────────────┐
                      │ REVIEW PAGE                │
                      │ /stock-take/review/{id}    │
                      │ (not implemented)          │
                      └────────────┬───────────────┘
                                   │
                      ┌────────────▼──────────────┐
                      │ RECONCILIATION REPORT      │
                      │ /stock-take/reconciliation │
                      │                            │
                      │ Morning vs evening         │
                      │ variance analysis          │
                      └────────────────────────────┘
```

> **Daily audit** uses a separate mobile wizard and admin review — see [DAILY_AUDIT.md](./DAILY_AUDIT.md). It will be linked from this entry point once implemented.

---

## What's Implemented

### 1. Main Page (`page.tsx` — `StockTakePage`)

| Feature | Status | Notes |
|---|---|---|
| **Session start** | ✅ Done | Type (morning/evening), branch picker, optional notes, POST to API |
| **Branch sync** | ✅ Done | Respects branch-locked roles via `useSyncBranchFilter` |
| **Scope guard** | ✅ Done | Confirms before branch/department change during active session |
| **Stale session warning** | ✅ Done | Shows if an unclosed session exists for the branch |
| **Active session restore** | ✅ Done | Auto-fetches active session on branch change |
| **Search (debounced)** | ✅ Done | 300ms debounce, searches name/SKU/barcode, catalog-scoped to SKUs |
| **Barcode scanner** | ✅ Done | Camera-based scanning via `BarcodeScanner` component |
| **Count modal** | ✅ Done | Qty + aisle input, system stock shown to authorized roles |
| **Count submission** | ✅ Done | Auto-adds item to session if not present, then patches line |
| **Create product (standalone)** | ✅ Done | Atomic create+count via `postStockTakeCreateItemAndAddLine` |
| **Create product (variant)** | ✅ Done | Parent search → attach variant → add line → count |
| **Summary dashboard** | ✅ Done | 4 stat cards: Checklist, Remaining, Pending, Confirmed |
| **Uncounted list** | ✅ Done | Accordion showing up to 50 uncounted lines |
| **Search results** | ✅ Done | `StockTakeSearchResults` with status badges, thumbnails |
| **Pending reviews (admin)** | ✅ Done | Lists all in-progress sessions with pending/confirmed counts |
| **Session delete (admin)** | ✅ Done | Confirm dialog → DELETE API call |
| **Quick links** | ✅ Done | Role-filtered inventory quick links |
| **System stock visibility** | ✅ Done | Controlled by role + `showSystemStockToStockManager` setting |
| **Confirmed line lock** | ✅ Done | Confirmed items show locked state in count modal |

### 2. Search Results Component (`StockTakeSearchResults.tsx`)

| Feature | Status | Notes |
|---|---|---|
| **Product cards** | ✅ Done | Thumbnail, name, SKU/barcode badges, category pill |
| **Status badges** | ✅ Done | Confirmed (green), submitted qty (amber), "Add to list" (blue) |
| **Hover hint** | ✅ Done | "Count →" appears on hover for uncounted items |
| **Create fallback** | ✅ Done | "No products found" → "Create {query}" button |
| **Disabled confirmed** | ✅ Done | Confirmed items are non-clickable |

### 3. Reconciliation Page (`reconciliation/page.tsx`)

| Feature | Status | Notes |
|---|---|---|
| **Auto-detect sessions** | ✅ Done | Branch + date → finds morning & evening sessions |
| **Summary cards** | ✅ Done | Items reconciled, zero variance, with variance, session names |
| **Variance table** | ✅ Done | Opening stock → sold → expected → actual → variance |
| **Color coding** | ✅ Done | Green (zero), amber (≤2), red (>2) |
| **Empty state messaging** | ✅ Done | Explains why reconciliation is empty |

### 4. Review Pages

| Feature | Status | Notes |
|---|---|---|
| **Daily audit review** | ✅ Done | `/daily-audit/review` — admin table, approve/escalate |
| **General session review** | ❌ Not implemented | Legacy `review/[id]/` directory empty; API exists for adjustment workflow |

### 5. API Client (`lib/api.ts`)

| Function | Endpoint | Method |
|---|---|---|
| `postStockTakeStart` | `/api/v1/inventory/stock-take/sessions` | POST |
| `fetchStockTakeSession` | `/api/v1/inventory/stock-take/sessions/{id}` | GET |
| `fetchActiveStockTakeSession` | `/api/v1/inventory/stock-take/sessions/active?branchId=...` | GET |
| `fetchStockTakeSessions` | `/api/v1/inventory/stock-take/sessions?status=...` | GET |
| `postStockTakeAddLine` | `/api/v1/inventory/stock-take/sessions/{id}/lines` | POST |
| `postStockTakeCreateItemAndAddLine` | `/api/v1/inventory/stock-take/sessions/{id}/lines/with-product` | POST |
| `patchStockTakeSingleLine` | `/api/v1/inventory/stock-take/sessions/{id}/lines/{lineId}` | PATCH |
| `patchStockTakeCounts` | `/api/v1/inventory/stock-take/sessions/{id}/lines` | PATCH |
| `postStockTakeConfirmLine` | `/api/v1/inventory/stock-take/sessions/{id}/lines/{lineId}/confirm` | POST |
| `postStockTakeClose` | `/api/v1/inventory/stock-take/sessions/{id}/close` | POST |
| `deleteStockTakeSession` | `/api/v1/inventory/stock-take/sessions/{id}` | DELETE |
| `fetchStockTakeReconciliation` | `/api/v1/inventory/stock-take/sessions/reconciliation` | GET |
| `postApproveStockAdjustment` | `.../adjustment-requests/{id}/approve` | POST |
| `postRejectStockAdjustment` | `.../adjustment-requests/{id}/reject` | POST |

Daily audit client functions (`fetchDailyStockAuditToday`, `postDailyStockAuditSession`, `patchDailyAuditLine`, `fetchDailyStockAuditReview`, `postDailyAuditApprove`, `postDailyAuditEscalate`, `fetchDailyStockAuditInvestigations`) — see [DAILY_AUDIT.md](./DAILY_AUDIT.md#api).

---

## Permission Model

| Permission Key | Used For |
|---|---|
| `stocktake.read` | View stock take pages, pending sessions, reconciliation |
| `stocktake.run` | Start sessions, submit counts |
| `stocktake.approve` | Confirm/reject lines, see pending reviews, access review page |
| `stocktake.delete` | Delete sessions (also granted to owner/admin roles) |

**System stock visibility (general stock take only):**

- `owner` / `admin`: always see system stock
- `stock_manager`: sees system stock only if `business.inventory.stocktake.showSystemStockToStockManager` is `true`
- Others: never see system stock during counting

Daily audit sessions are **always blind** for Stock Managers regardless of this setting — see [DAILY_AUDIT.md](./DAILY_AUDIT.md).

---

## Data Model (Types)

### `StockTakeSessionRecord`
```
id, sessionNumber, branchId, status, sessionType, sessionDate,
name, notes, startedBy, closedAt, closedBy,
lines: StockTakeLineRecord[],
adjustmentRequests: StockAdjustmentRequestRecord[],
summary: StockTakeSessionSummary
```

### `StockTakeLineRecord`
```
id, itemId, itemName, itemSku, systemQtySnapshot, countedQty,
adminQuantity, note, aisle, status (pending/submitted/confirmed),
batches: StockTakeLineBatchRecord[], timestamps
```

### `StockTakeSessionSummary`
```
totalCount, pendingCount, submittedCount, confirmedCount, remainingCount
```

### `ReconciliationResponseRecord`
```
morningSessionId, eveningSessionId, morningSessionName, eveningSessionName,
totalReconciled, zeroVariance, withVariance,
morningConfirmedCount, eveningConfirmedCount,
lines: ReconciliationLineRecord[]
```

Daily audit types: see [DAILY_AUDIT.md](./DAILY_AUDIT.md#data-model).

---

## Key Architecture Decisions

1. **Single-page dual-mode (general):** The main page renders either "Start Session" or "Counting" based on whether an active session exists.

2. **Optimistic session state:** After every mutation, the full updated session object replaces local state.

3. **Debounced search (300ms):** Catalog search uses `fetchItemsPage` scoped to `SKUS_ONLY`.

4. **Branch-scoped:** Every session is tied to a branch. Branch-locked roles cannot change branches.

5. **Scope guard:** Active sessions prompt before changing branch or department in the header.

6. **Atomic create+count:** Standalone "Create & Count" uses `POST .../lines/with-product`.

7. **Backend masking:** `StockTakeService.maskSystemQty()` strips system quantities for unauthorized roles — reused for daily audit.

8. **Two workflows, shared module:** Daily audit extends sessions with `source = daily_audit` rather than a parallel counting system. See [DAILY_AUDIT.md](./DAILY_AUDIT.md).

---

## Backend Reference

| Resource | Path |
|---|---|
| Service | `backend/src/main/java/zelisline/ub/inventory/application/StockTakeService.java` |
| Controller | `backend/src/main/java/zelisline/ub/inventory/api/StockTakeController.java` |
| Migrations | `backend/src/main/resources/db/migration/V73__*`, `V74__*`, `V80__*` |
| Improvements doc | `backend/docs/stocktake/STOCKTAKE_IMPROVEMENTS.md` |
| Daily audit spec | `backend/docs/stocktake/DAILY_AUDIT.md` |

---

## What's NOT Yet Implemented

### General stock take

| Gap | Priority | Notes |
|---|---|---|
| **Review page** | 🟡 Medium | Legacy `review/[id]/` empty; daily audit review is at `/daily-audit/review`. |
| **Batch-level counting** | 🟡 Medium | Type exists; no UI for batch-level input. |
| **Adjustment request workflow** | 🟡 Medium | Approve/reject API exists; no UI. |
| **Session close confirmation** | 🟡 Medium | `postStockTakeClose` not wired in UI. |
| **Bulk count input** | 🟢 Low | Batch PATCH API exists; UI is single-line only. |
| **Entry hub** | ✅ Done | Links on `/inventory/stock-take` hub + global nav for daily audit. |

### Daily audit

All phases complete — see [DAILY_AUDIT.md](./DAILY_AUDIT.md#implementation-phases).
