# Daily Stock Audit (Random 25)

> **URLs**
> - Stock Manager: `/inventory/stock-take/daily-audit`
> - Admin review: `/inventory/stock-take/daily-audit/review`
> - Investigations: `/inventory/stock-take/investigations`

Mobile-first daily verification workflow. Each morning the system picks **25 unique random products sold the previous day**. The Stock Manager records blind physical counts (morning and evening). Admins later compare counts against system stock, approve matches, and escalate mismatches.

**Status:** Implemented (Phase 1–5). Run migration `V133__daily_stock_audit.sql` on deploy.

**Backend spec:** [`backend/docs/stocktake/DAILY_AUDIT.md`](../../../../backend/docs/stocktake/DAILY_AUDIT.md)

---

## Goals

1. Catch stock accuracy issues without counting the full catalog.
2. Prevent biased counting — Stock Managers never see system or expected quantities during counting.
3. Give Admins a structured review queue with audit trail (who approved/escalated, when, notes).
4. Keep the same 25 products fixed for the entire business day (morning + evening).

---

## Two Workflows (Same Module)

| Workflow | Route | Audience | Item selection |
|---|---|---|---|
| **General stock take** | `/inventory/stock-take` | Staff | Search, scan, ad-hoc lines |
| **Daily audit** | `/inventory/stock-take/daily-audit` | Stock Manager + Admin | System-generated 25/day |

The entry page at `/inventory/stock-take` will become a **hub** (or role-based redirect) linking to both workflows without removing the general flow.

---

## Business Rules

| Rule | Detail |
|---|---|
| List size | Exactly 25 unique products (or fewer if yesterday had &lt;25 distinct sold SKUs) |
| Selection pool | Products with completed, non-voided sales on the **previous calendar day** (branch-scoped) |
| Selection method | **Random sample** — not top sellers, not checklist order |
| Generation frequency | **Once per business per audit date** — immutable after creation |
| Generation time | Scheduled job each morning (~06:00 business local time) |
| Morning count | Stock Manager counts all 25 blind |
| Evening count | **Same 25 items** from the daily manifest — not derived from morning confirmation |
| System stock visibility | **Never** shown to Stock Manager during daily audit (always masked) |
| Admin verification | Only Admins compare physical counts vs system stock |
| Audit trail | Every count submit, approve, and escalate is timestamped with user ID |
| Escalations | Appear on a separate investigations list/report |

---

## User Flow

```
┌──────────────────────────────────────────────────────────────┐
│  SCHEDULER (each morning, per business)                       │
│  • Query items sold yesterday                                 │
│  • Randomly pick 25 unique item IDs                           │
│  • Insert daily_stock_audits row (fail if already exists)     │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│  STOCK MANAGER — /daily-audit                                 │
│  • Load today's manifest + active morning/evening session     │
│  • One item at a time (mobile wizard)                         │
│  • Show: name, image, SKU/barcode, category, UOM              │
│  • Hide: system stock, expected stock                         │
│  • Enter physical count + optional notes                      │
│  • Auto-save on change / navigation                           │
│  • Save & Next · Previous · progress (e.g. 7/25)              │
│  • Pause and resume later                                     │
└────────────────────────────┬─────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │ Morning session complete     │
              │ (evening shift, same 25)     │
              └──────────────┬──────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│  ADMIN — /daily-audit/review                                  │
│  • Full table of 25 products for selected date/branch         │
│  • Morning count · Evening count · System stock · Expected    │
│  • Variance · Match / mismatch highlighting                   │
│  • Approve matched items (admin notes)                        │
│  • Escalate mismatched items (admin notes)                    │
│  • Track approved_by/at · escalated_by/at                     │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│  INVESTIGATIONS — /investigations                             │
│  • Filterable list of escalated items                         │
│  • Date, branch, product, counts, variance, admin notes       │
└──────────────────────────────────────────────────────────────┘
```

---

## Stock Manager UI

### Layout (mobile-first)

Single-column card wizard. Optimized for phone; usable on tablet/desktop.

### Visible fields (per item)

| Field | Source |
|---|---|
| Product name | Catalog |
| Image | Catalog thumbnail |
| SKU / barcode | Catalog |
| Category | Catalog |
| Unit of measure | Catalog |

### Hidden fields (Stock Manager)

- `systemQtySnapshot`
- Expected stock (opening − sold)
- Variance
- Other lines in the list (only current item shown)

### Inputs

| Input | Required | Notes |
|---|---|---|
| Physical count | Yes | Numeric; allow decimals if UOM supports it |
| Notes | No | Free text per line |

### Navigation & state

| Control | Behavior |
|---|---|
| **Save & Next** | PATCH line count + notes, advance to next uncounted or next index |
| **Previous** | Navigate without losing saved data |
| **Progress** | `currentIndex + 1` of `25` (or manifest size) |
| **Auto-save** | Debounced PATCH on count/notes change |
| **Pause / resume** | Persist `currentIndex` on session; restore on return |
| **Session type toggle** | Morning vs evening — same manifest, different session |

### Empty / edge states

- No manifest for today → “Daily audit not ready yet” (scheduler pending or no sales yesterday)
- Active session exists → resume wizard at last position
- All items counted → summary screen with “Submit session” or auto-complete

---

## Admin UI

### Review page (`/daily-audit/review`)

Filters: branch, audit date (default today).

### Table columns

| Column | Description |
|---|---|
| Product | Name, SKU, thumbnail |
| Category / UOM | Catalog metadata |
| Morning count | Stock Manager morning `countedQty` |
| Evening count | Stock Manager evening `countedQty` |
| System stock | Current or snapshot at review time |
| Expected stock | Opening − sold (same logic as reconciliation) |
| Variance | Counted vs system (admin chooses which count: evening preferred) |
| Match status | Green = within tolerance · Red = mismatch |
| Review status | Pending · Approved · Escalated |
| Reviewed by / at | Audit fields |

### Actions (per row)

| Action | Permission | Effect |
|---|---|---|
| **Approve** | `stocktake.approve` | Mark matched; store admin notes; no stock ledger change |
| **Escalate** | `stocktake.approve` | Mark for investigation; store admin notes; add to investigations queue |

Approval and escalation are **verification actions**, separate from `confirmLine` inventory adjustments (which may follow later for escalated items).

---

## Investigations page (`/investigations`)

List escalated daily-audit lines across dates/branches.

| Column | Description |
|---|---|
| Audit date | Business date of manifest |
| Branch | Branch name |
| Product | Name, SKU |
| Morning / evening counts | Submitted quantities |
| System / expected / variance | Admin-only figures |
| Escalated by / at | User + timestamp |
| Admin notes | Notes from escalation |
| Status | Open · Resolved (future) |

---

## Data Model

### `DailyStockAudit` (new table)

Immutable daily manifest.

```
id
business_id
branch_id          -- audits are branch-scoped
audit_date         -- calendar date the audit runs (not generation date)
item_count         -- actual count (≤ 25)
generated_at
generated_by       -- "system" or scheduler service account
```

Child rows in `daily_stock_audit_items` (`audit_id`, `item_id`, `sort_order`) preserve manifest order.

**Unique constraint:** `(business_id, branch_id, audit_date)`

### `StockTakeSession` (extend)

```
source             -- "manual" | "daily_audit"  (default "manual")
daily_audit_id     -- FK when source = daily_audit
current_line_index -- optional resume pointer for wizard
```

Morning/evening sessions for daily audit reference the same `daily_audit_id` and load the same `item_ids`.

### `StockTakeLine` (extend review fields)

Existing count fields reused. New admin review columns:

```
review_status      -- pending | approved | escalated
review_notes
reviewed_by
reviewed_at
```

Count timestamps already exist (`submitted_by`, `submitted_at`). Admin review is additive.

---

## API

Base path: `/api/v1/inventory/stock-take/daily-audits`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/today?branchId=` | `stocktake.read` | Today's manifest + session summary |
| POST | `/sessions` | `stocktake.run` | Start/resume morning or evening session from manifest |
| GET | `/sessions/{id}` | `stocktake.run` | Resume wizard state |
| PATCH | `/sessions/{id}/lines/{lineId}` | `stocktake.run` | Submit count + notes (masked response) |
| PATCH | `/sessions/{id}/progress` | `stocktake.run` | Save `currentLineIndex` |
| GET | `/review?branchId=` | `stocktake.approve` | Full admin view with system stock |
| POST | `/{auditId}/items/{itemId}/approve` | `stocktake.approve` | Approve matched item |
| POST | `/{auditId}/items/{itemId}/escalate` | `stocktake.approve` | Escalate mismatch |
| GET | `/investigations` | `stocktake.approve` | Escalated items list |

**Response masking:** All Stock Manager endpoints (`stocktake.run` without approve) must call `maskSystemQty()` — same as existing backend helper — and must **never** expose expected stock.

---

## Reuse from Existing Stock Take

| Existing piece | Daily audit usage |
|---|---|
| `StockTakeSession` morning/evening types | Two counting passes per day |
| `StockTakeLine` count + notes | Physical count entry |
| `maskSystemQty()` | Always for daily-audit sessions |
| `stocktake.run` / `stocktake.approve` permissions | Same permission keys |
| Reconciliation expected-stock logic | Admin review variance column |
| Branch scoping + `useSyncBranchFilter` | Same patterns |

| **Do not reuse as-is** | Reason |
|---|---|
| Search/scan UI on main page | Wrong UX for fixed 25-item wizard |
| Evening auto-load from morning **confirmed** lines | Daily audit uses manifest, not confirmation |
| `showSystemStockToStockManager` setting | Daily audit is always blind for counters |
| Empty `review/[id]/` route | Build `daily-audit/review` instead |

---

## Implementation Phases

### Phase 1 — Backend foundation

- [x] Migration: `daily_stock_audits` table
- [x] Migration: session `source`, `daily_audit_id`; line review columns
- [x] Scheduler: random 25 from yesterday's sales
- [x] API: manifest GET, masked session start/count
- [x] Tests: idempotent generation, masking, unique constraint

### Phase 2 — Stock Manager wizard

- [x] Route: `daily-audit/page.tsx`
- [x] Mobile one-item wizard with auto-save
- [x] Progress, previous/next, pause/resume
- [x] Morning/evening session switch

### Phase 3 — Admin review

- [x] Route: `daily-audit/review/page.tsx`
- [x] Full 25-row table with variance highlighting
- [x] Approve / escalate with notes

### Phase 4 — Investigations

- [x] Route: `investigations/page.tsx`
- [x] Escalated items report with filters

### Phase 5 — Hub entry

- [x] Quick links on `/inventory/stock-take`
- [x] Nav items in inventory quick links (global nav)

---

## Frontend Files

```
frontend/app/(dashboard)/inventory/stock-take/
├── README.md
├── DAILY_AUDIT.md              ← this file
├── page.tsx                    ← hub + general stock take
├── daily-audit/
│   ├── page.tsx                ← Stock Manager wizard
│   └── review/page.tsx         ← Admin review
├── investigations/page.tsx
├── reconciliation/page.tsx     ← existing; separate from daily audit review
└── _components/
    └── StockTakeSearchResults.tsx
```

Wizard, review table, and investigations UI live inline in their route pages (no separate `_components` yet).

---

## Open Questions

1. **Tolerance for “match”** — exact zero variance, or allow ±1? (Recommend: configurable per business, default exact match on integer UOMs.)
2. **Fewer than 25 sold yesterday** — audit all available, or skip day? (Recommend: audit all available; show actual count in progress.)
3. **Multi-branch businesses** — one manifest per branch per day. (Recommended default.)
4. **Evening count reference** — admin compares evening count vs system, or both morning and evening? (Recommend: evening as primary; morning shown for context.)
