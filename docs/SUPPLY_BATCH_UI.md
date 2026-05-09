# Supply Batch — Frontend UI Specification

> **Project**: UB (Palmart) Frontend — Next.js / React  
> **Date**: 2025-06-06  
> **Depends on**: Backend `SupplyBatch` entity + API (see `SUPPLY_BATCH_REDESIGN.md`)  
> **Total UI effort**: ~10–14 hours

---

## Table of Contents

1. [Navigation — Where Supply Batches Lives](#1-navigation--where-supply-batches-lives)
2. [Page 1 — Supply Batch List](#2-page-1--supply-batch-list)
3. [Page 2 — Supply Batch Detail](#3-page-2--supply-batch-detail)
4. [Page 3 — Batch Comparison / Analytics (Stretch)](#4-page-3--batch-comparison--analytics-stretch)
5. [Component: Inline Batch Name Editor](#5-component-inline-batch-name-editor)
6. [Component: Batch Badge (Sale Receipt)](#6-component-batch-badge-sale-receipt)
7. [Component: Batch Selector (Wastage Form)](#7-component-batch-selector-wastage-form)
8. [New Route & Permission Gate](#8-new-route--permission-gate)
9. [Files to Create / Modify](#9-files-to-create--modify)
10. [Wireframe](#10-wireframe)
11. [Implementation Order](#11-implementation-order)

---

## 1. Navigation — Where Supply Batches Lives

### Sidebar Placement

Under the **Inventory** section — at the top because it's the most frequently accessed inventory page
(every staff member deals with incoming deliveries daily).

**Before:**
```
Warehouse  Inventory
  ├─ Stock valuation
  ├─ Stock transfers
  └─ Stock take
```

**After:**
```
Warehouse  Inventory
  ├─ Supply batches       ← NEW — first item
  ├─ Stock valuation
  ├─ Stock transfers
  └─ Stock take
```

### Routes

```
/inventory/supply-batches            → Supply Batch List
/inventory/supply-batches/{id}       → Supply Batch Detail
```

### Permissions

| Key | Description | Assigned to |
|---|---|---|
| `inventory.supply_batches.read` | View batch list + detail | owner, manager, cashier |
| `inventory.supply_batches.write` | Rename batches, change status | owner, manager |

---

## 2. Page 1 — Supply Batch List

**Route:** `/inventory/supply-batches`

### Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Supply Batches                                                  [+ New]   │
├────────────────────────────────────────────────────────────────────────────┤
│  [Branch ▼]  [Supplier ▼]  [Status ▼]  [Date range ▼]        [🔍 Search] │
├──────┬──────────┬──────────────┬──────────┬────────┬───────┬───────────────┤
│ #    │ Name                    │ Supplier │ Items  │ Waste │ Status        │
├──────┼──────────┼──────────────┼──────────┼────────┼───────┼───────────────┤
│ 1234 │ Tue Market Run #7      │ Farm Fresh│  3     │  22   │ ● Active      │
│ 1235 │ Mon Wholesale          │ Sunny     │ 12     │  45   │ ⚠️ Partial    │
│ 1236 │ Opening Balance May    │ —         │ 45     │  12   │ ● Active      │
│ 1237 │ —                      │ Green Farm│  1     │   0   │ ✅ Sold out   │
└──────┴──────────┴──────────────┴──────────┴────────┴───────┴───────────────┘
                                  [< 1 2 3 … 12 >]
```

### Status indicators

| Visual | Label | Condition |
|---|---|---|
| 🟢 `● Active` | Active | Has remaining quantity, no expiry issues |
| ⚠️ `⚠️ Partial` | Partially sold | Some items sold, some remaining |
| ✅ `✅ Sold out` | Sold out | All items fully sold / at zero |
| 🔴 `🔴 Expired` | Expired | Contains expired batches (upon confirmation pending) |

### States

**Loading:** 3 skeleton rows with shimmer animation

**Empty:**
```
┌────────────────────────────────────────────┐
│   📦 No supply batches yet                 │
│   Receive stock from a supplier            │
│   to see your first batch here.            │
│                                            │
│   [Go to Add supplies →]                   │
└────────────────────────────────────────────┘
```

**Error:**
```
┌────────────────────────────────────────────┐
│ ⚠️ Couldn't load supply batches             │
│   [Retry]                                   │
└────────────────────────────────────────────┘
```

### Filters

| Filter | Type | Notes |
|---|---|---|
| Branch | Dropdown | Defaults to current branch |
| Supplier | Dropdown | Fetched from `/api/v1/suppliers` |
| Status | Dropdown | `All`, `Active`, `Sold out`, `Partial` |
| Date range | Date range picker | By `receivedAt` |
| Search | Text input | Searches batch name, number, supplier name |

---

## 3. Page 2 — Supply Batch Detail

**Route:** `/inventory/supply-batches/{id}`

### Header Section

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ← Supply Batches                                                          │
│                                                                           │
│  Supply Batch #SB-1234                              [Mark as closed]      │
│                                                                           │
│  Name:  Tuesday Market Run #7  ──────────────────────────── [✏️ Edit]     │
│  Supplier: Farm Fresh Eggs Ltd                                            │
│  Received: 5 Jun 2025, 08:30                                              │
│  Status: ● Active                                                         │
│                                                                           │
│  Summary Cards                                                            │
│  ┌────────────┬────────────┬────────────┬────────────┬────────────┐      │
│  │   3 Items  │  1,250 qty │  540 sold  │  22 wasted  │  688 left  │      │
│  └────────────┴────────────┴────────────┴────────────┴────────────┘      │
└────────────────────────────────────────────────────────────────────────────┘
```

### Items Table

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Items in this batch                                                       │
├──────────┬──────────┬──────┬──────┬──────┬────────┬──────────┬────────────┤
│ Item     │ Received │ Sold │ Waste│ Left │ Cost   │ Profit   │ Status     │
├──────────┼──────────┼──────┼──────┼──────┼────────┼──────────┼────────────┤
│ Eggs     │ 1,000    │ 300  │  20  │ 680  │ 4,590  │ +3,000   │ ● Active   │
├──────────┼──────────┼──────┼──────┼──────┼────────┼──────────┼────────────┤
│ Milk 1L  │ 50       │ 40   │   2  │   8  │   734  │   +600   │ ⚠️ Low     │
├──────────┼──────────┼──────┼──────┼──────┼────────┼──────────┼────────────┤
│ Bread    │ 200      │ 200  │   0  │   0  │ 1,500  │ +1,500   │ ✅ Depleted │
├──────────┼──────────┼──────┼──────┼──────┼────────┼──────────┼────────────┤
│ TOTAL    │ 1,250    │ 540  │  22  │ 688  │ 6,824  │ +5,100   │            │
└──────────┴──────────┴──────┴──────┴──────┴────────┴──────────┴────────────┘

  [View all movements →]   [Export batch report →]
```

### Movement Timeline (Collapsible)

```
▼ Stock Movement Timeline (22 entries)

 5 Jun 09:15  │ Sale       │ −3 units  │ Eggs    │ Till #2  │ #SALE-1024
 5 Jun 09:22  │ Sale       │ −1 unit   │ Milk    │ Till #2  │ #SALE-1024
 5 Jun 10:00  │ Sale       │ −5 units  │ Eggs    │ Till #1  │ #SALE-1030
 5 Jun 11:30  │ Wastage    │ −2 units  │ Milk    │ Spoilage │ #WASTE-005
 5 Jun 12:00  │ Sale       │ −200 units│ Bread   │ Web ord. │ #ORDER-042
 ...
```

Each row links back to the source document (Sale, Wastage, etc.).

### States

**Loading:** Skeleton with header skeleton + 3 table row skeletons

**Error:** Alert + retry

**Not found:** `"Supply batch not found"` with back link to list

---

## 4. Page 3 — Batch Comparison / Analytics (Stretch)

**Route:** `/inventory/supply-batches/analytics`

**Build after Pages 1 and 2 are stable.**

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Batch Analytics                                [Last 30 days ▼]          │
│                                                                           │
│  ┌─── Wastage by Batch ────────────────────────────────────────────────┐  │
│  │  Bar chart — each bar = one batch. Coloured by wastage reason.      │  │
│  │  X-axis: batch name, Y-axis: qty wasted                             │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌─── Top 10 Most Profitable ──────────────────────────────────────────┐  │
│  │  Table: batch #, name, supplier, revenue, COGS, profit              │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌─── Batch Status Breakdown ──────────────────────────────────────────┐  │
│  │  Pie chart: Active vs Sold Out vs Partial                           │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Component: Inline Batch Name Editor

**Used in:** Batch Detail page header, Batch List page (click name to edit)

### Behaviour

```
Display mode:     Name: Tuesday Market Run #7               [✏️]
Edit mode:        Name: [Tuesday Market Run #7        ] [💾] [✕]
```

- Click ✏️ → text input replaces display text, pre-filled
- "Save" or Enter → `PATCH /api/v1/inventory/supply-batches/{id}` with `{ batchName }`
- "Cancel" or Escape → reverts
- Shows saving spinner on the save button while request is in flight

### API Client

```typescript
// frontend/lib/api/inventory.ts (new file or add to existing)

export interface SupplyBatchSummary {
  id: string;
  batchNumber: string;
  batchName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  branchId: string;
  receivedAt: string;
  status: string;
  itemCount: number;
  totalInitialQuantity: number;
  totalRemainingQuantity: number;
}

export interface SupplyBatchDetail extends SupplyBatchSummary {
  items: SupplyBatchItem[];
  movements: StockMovement[];
}

export interface SupplyBatchItem {
  inventoryBatchId: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  initialQuantity: number;
  quantityRemaining: number;
  quantitySold: number;
  quantityWasted: number;
  unitCost: number;
  profit: number;
  status: string;
}

export async function fetchSupplyBatches(params: {
  branchId?: string;
  supplierId?: string;
  status?: string;
  itemId?: string;
  search?: string;
  page?: number;
  size?: number;
}): Promise<SupplyBatchSummary[]> { ... }

export async function fetchSupplyBatchDetail(id: string): Promise<SupplyBatchDetail> { ... }

export async function patchSupplyBatch(id: string, data: {
  batchName?: string;
  status?: string;
}): Promise<void> { ... }
```

---

## 6. Component: Batch Badge (Sale Receipt)

**Used in:** Cashier receipt, sales reports, sale detail page

### Behaviour

A clickable pill next to each item in a sale, showing `SB-1234`. Clicking navigates to the batch detail page.

```
Sale #1024  ┌─────────────────────────────────────┐
            │ Eggs (×3)         75 KES  SB-1234   │
            │ Milk (×2)        120 KES  SB-1234   │
            │ Bread (×1)        50 KES  SB-1240   │
            │ Total            245 KES            │
            └─────────────────────────────────────┘
```

### Data Flow

The sale item response DTO needs two new fields on the backend:

```java
// SaleItemResponse.java — add:
String supplyBatchId;
String supplyBatchNumber;
String supplyBatchName;
```

These come from: `saleItem.batch.supplyBatch` (the new entity). No extra API call — just join in the query.

### Component

```tsx
// components/inventory/supply-batch-badge.tsx
"use client";

import Link from "next/link";

interface Props {
  supplyBatchId: string;
  batchNumber: string;
  batchName?: string | null;
}

export function SupplyBatchBadge({ supplyBatchId, batchNumber, batchName }: Props) {
  return (
    <Link
      href={`/inventory/supply-batches/${supplyBatchId}`}
      title={batchName || batchNumber}
      className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
    >
      {batchNumber}
    </Link>
  );
}
```

---

## 7. Component: Batch Selector (Wastage Form)

**Used in:** Standalone wastage form, stock take adjustments

### Behaviour

Dropdown that lists active supply batches containing the selected item, with remaining quantities. Lets the user choose which batch to write wastage against (or auto-pick).

```
Record Wastage

  Item:    [Eggs (Large)                    ▼]
  Quantity [ 5 ]
  Reason:  [SPOILAGE                        ▼]
  Batch:   [Select batch                    ▼]
           ├─ SB-1234 — Tue Market Run #7    (680 remaining)
           ├─ SB-1240 — Mon Delivery #8      (245 remaining)
           └─ SB-1250 — Wed Market Run #9    (500 remaining)
           └────────────────────────────────────
           └─ Auto-pick (FEFO)
```

### Data Source

```
GET /api/v1/inventory/supply-batches?itemId=xxx&status=active&branchId=xxx
```

Returns only batches where this specific item has remaining quantity > 0.

### Component

```tsx
// components/inventory/supply-batch-selector.tsx
"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BatchOption {
  id: string;
  batchNumber: string;
  batchName: string | null;
  itemRemaining: number;
}

interface Props {
  branchId: string;
  itemId: string;
  value: string; // batch ID or "auto"
  onChange: (batchId: string) => void;
}

export function SupplyBatchSelector({ branchId, itemId, value, onChange }: Props) {
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!itemId || !branchId) return;
    setLoading(true);
    fetch(`/api/v1/inventory/supply-batches?itemId=${itemId}&branchId=${branchId}&status=active`)
      .then(res => res.json())
      .then(data => setBatches(data.content || data))
      .finally(() => setLoading(false));
  }, [itemId, branchId]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Loading batches..." : "Select a batch"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">Auto-pick (FEFO)</SelectItem>
        {batches.map(b => (
          <SelectItem key={b.id} value={b.id}>
            {b.batchNumber} — {b.batchName || b.batchNumber} ({b.itemRemaining} left)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

---

## 8. New Route & Permission Gate

### Route Constants

**File:** `frontend/lib/config.ts`

```typescript
export const APP_ROUTES = {
  // ... existing routes ...
  inventorySupplyBatches: "/inventory/supply-batches",
  inventorySupplyBatchDetail: (id: string) => `/inventory/supply-batches/${id}`,
} as const;
```

### App Router Pages

**New file:** `frontend/app/(dashboard)/inventory/supply-batches/page.tsx`

```tsx
import { SupplyBatchListPage } from "@/components/inventory/supply-batch-list-page";

export default function Page() {
  return <SupplyBatchListPage />;
}
```

**New file:** `frontend/app/(dashboard)/inventory/supply-batches/[id]/page.tsx`

```tsx
import { SupplyBatchDetailPage } from "@/components/inventory/supply-batch-detail-page";

export default function Page({ params }: { params: { id: string } }) {
  return <SupplyBatchDetailPage batchId={params.id} />;
}
```

### Sidebar Nav

**File:** `frontend/components/app-shell.tsx`

Add to `NavGate` type:
```typescript
canViewSupplyBatches: boolean;
```

Add nav item to Inventory section:
```typescript
{
  id: "inventory",
  title: "Inventory",
  blurb: "Stock truth, movement, counts",
  icon: Warehouse,
  items: [
    { href: APP_ROUTES.inventorySupplyBatches, label: "Supply batches" },  // ← NEW
    { href: APP_ROUTES.inventoryValuation, label: "Stock valuation" },
    { href: APP_ROUTES.inventoryTransfers, label: "Stock transfers" },
    { href: APP_ROUTES.inventoryStockTake, label: "Stock take" },
  ],
},
```

Add gate in `isNavItemVisible`:
```typescript
if (item.href === APP_ROUTES.inventorySupplyBatches) return g.canViewSupplyBatches;
```

### Permissions endpoint

The backend should include `inventory.supply_batches.read` and `inventory.supply_batches.write` in the
`GET /api/v1/auth/me` response so the frontend can populate `canViewSupplyBatches`.

---

## 9. Files to Create / Modify

### New Files (~6 files)

| Path | Purpose |
|---|---|
| `frontend/app/(dashboard)/inventory/supply-batches/page.tsx` | Route page — batch list |
| `frontend/app/(dashboard)/inventory/supply-batches/[id]/page.tsx` | Route page — batch detail |
| `frontend/components/inventory/supply-batch-list-page.tsx` | Full list page with filters |
| `frontend/components/inventory/supply-batch-detail-page.tsx` | Detail page with items + timeline |
| `frontend/components/inventory/supply-batch-badge.tsx` | Badge component for sale receipts |
| `frontend/components/inventory/supply-batch-selector.tsx` | Dropdown for wastage form |
| `frontend/lib/api/inventory.ts` | API client (or add to `frontend/lib/api.ts`) |

### Modified Files (~4 files)

| File | Change |
|---|---|
| `frontend/lib/config.ts` | Add `inventorySupplyBatches` routes |
| `frontend/components/app-shell.tsx` | Add sidebar nav item, permission gate, `NavGate` field |
| Backend: Sale response DTO | Add `supplyBatchId`, `supplyBatchNumber`, `supplyBatchName` |

---

## 10. Wireframe

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Logo    [Search…]                                             🤡 User │
│                                                                         │
│  ┌─ Sidebar ─────────────┐  ┌─── Main Content ───────────────────────┐ │
│  │ Organization          │  │                                         │ │
│  │  Business settings    │  │  Supply Batches              [+ New]    │ │
│  │  Branches             │  │                                         │ │
│  │  Users                │  │  Filters: [Branch ▼] [Status ▼]        │ │
│  ├───────────────────────┤  │                                         │ │
│  │ Catalog & relationships│ │  ┌───┬──────────┬──────┬────┬───┬────┐  │ │
│  │  Products             │  │  │ # │ Name     │ Supp │ Itm│Wst│ Sts│  │ │
│  │  Categories           │  │  ├───┼──────────┼──────┼────┼───┼────┤  │ │
│  │  Suppliers            │  │  │   │          │      │    │   │    │  │ │
│  │  Customers            │  │  │   │          │      │    │   │    │  │ │
│  ├───────────────────────┤  │  │   │          │      │    │   │    │  │ │
│  │ Purchasing            │  │  └───┴──────────┴──────┴────┴───┴────┘  │ │
│  │  Add supplies         │  │                                         │ │
│  ├───────────────────────┤  │                                         │ │
│  │ Inventory             │  │                                         │ │
│  │  Supply batches   ◀───│──│── NEW!                                  │ │
│  │  Stock valuation      │  │                                         │ │
│  │  Stock transfers      │  │                                         │ │
│  │  Stock take           │  │                                         │ │
│  ├───────────────────────┤  │                                         │ │
│  │ Operations / Sales    │  │                                         │ │
│  └───────────────────────┘  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Implementation Order

| Order | Step | What | Effort | Depends on |
|---|---|---|---|---|
| 1 | **Routes and Nav** — config, sidebar, permission gate | 15 min | — |
| 2 | **API client** — `lib/api/inventory.ts` | 30 min | Backend API ready |
| 3 | **Batch List page** — table, filters, search, pagination, loading/empty/error states | 3 hr | Steps 1–2 |
| 4 | **Batch Detail page** — header, items table, summary cards, movement timeline | 4 hr | Steps 1–2 |
| 5 | **Inline Name Editor** — edit/save/cancel pattern | 45 min | Backend PATCH endpoint |
| 6 | **Batch Badge** — receipt pill + sale item DTO integration | 1 hr | Backend DTO change |
| 7 | **Batch Selector** — wastage form dropdown integration | 1.5 hr | Backend filter API |
| 8 | **Batch Analytics** (stretch) — charts, top 10, pie | 4 hr | All of the above |
| | **Total** | **~10–14 hr** | |

---

## Summary

| Page / Component | Priority | Who uses it | Key interactions |
|---|---|---|---|
| Batch List | **P0** | All staff | Filter, search, navigate to detail |
| Batch Detail | **P0** | All staff | View items + stats, see movement timeline |
| Inline Name Editor | **P1** | Managers | Rename batches to something recognizable |
| Batch Badge | **P1** | Cashiers, sales viewers | Click a badge on a sale → see the batch |
| Batch Selector | **P1** | Inventory staff | Choose which batch to write wastage against |
| Batch Analytics | **P2** | Managers, owners | Compare batches, spot wastage patterns |
