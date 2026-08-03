# Live Pending Carts — Product & Engineering Scope

> **Goal:** Every cashier scan becomes a durable, identifiable cart that admins can watch live — adds, edits, and clears — until payment completes. Admins can turn the whole behavior off.
>
> **Status:** Scope + code audit complete; implementation broken into 5 phases below.  
> **Date:** 2026-08-03 · last audited 2026-08-03  
> **Primary surfaces:** Cashier PWA `/cashier`, Admin `/sales/pending-carts`  
> **Foundation:** Existing `pos_drafts` system (V114 + `PosDraftService` + `PendingCartsPage`)  
> **Related:** [`CASHIER_CART_PERSISTENCE_SCOPE_REVISED.md`](./CASHIER_CART_PERSISTENCE_SCOPE_REVISED.md)

---

## Implementation status at a glance

| Phase | What | Code exists? | Gaps |
|-------|------|:------------:|------|
| A | Scan-to-cart | ❌ 0 % | Barcode only fills search box — never auto‑adds. No `pos.scan_to_cart` flag. |
| B | Always‑on persistence | ⚠️ ~80 % | Drafts sync (debounced 300 ms), IDB mirror works, completion flows wired. Missing: sync‑status chip, clear‑cart doesn't cancel server draft, `shadow_writes` inconsistent. |
| C | Realtime + admin live UI | ❌ 0 % | No draft WS events anywhere. Admin page is REST + manual refresh. No audit endpoint. |
| D | Admin override polish | ⚠️ stubs | Flags exist but no scan‑to‑cart toggle, no mid‑day disable policy, no hardened OFF‑guarantee. |
| E | Hardening | ❌ 0 % | Offline‑replay event publishing, OCC conflict resolution, load testing. |

---

## 1. One-sentence brief

When a cashier scans a product, it goes straight into the active cart; that cart is assigned a stable ID, persisted as a **pending cart**, streamed to admin in real time (including line edits), and leaves the pending list only when payment completes or the cart is explicitly cleared/cancelled — unless an admin has disabled the feature.

---

## 2. Why this exists

Owners and managers need to see what is being rung up **right now**, not only after payment. Today:

| Capability | Today (actual code) | Desired |
|---|---|---|
| Scan → cart | `cashier-pos-layout.tsx:954` — `applyBarcodeSearch` fills search; cashier picks | Exact barcode match → `addLine(+1)` immediately |
| Cart ID while ringing | Local `CartSession.id`; server `draftId` / `ticketNumber` only after debounced sync (300 ms, `quick-sale-workspace.tsx:432`) | Every active till cart has a server ID as soon as the first line lands |
| Admin pending view | `pending-carts-page.tsx:166` — `loadDrafts()` calls REST on mount + on filter change; manual Refresh button | Live list + live line/audit updates via WebSocket |
| Edit visibility | `pos_draft_audit_log` rows written server-side (`PosDraftService.writeAudit`, L531); **no endpoint** to expose them to the frontend | Admin sees qty/price/remove changes as they happen in an activity timeline |
| Clear / pay | Payment completes draft → `completed` + till clears. **But** `clearCartAfterSale` (L919) only removes IDB mirror — never calls `cancelPosDraft` when a server draft exists | Pending list updates instantly via WS; empty clear also drops from live pending |
| Admin override | Flags exist in `FeatureFlagService.java:44-53` + `PosDraftsFeatureFlagsPatch` DTO; `shadow_writes` semantic broken (frontend treats it as `enabled`, backend rejects if `enabled` is off) | Clear admin kill-switch that cashiers cannot bypass; `shadow_writes` either fixed or removed |

This scope is **not** a greenfield cart system. It closes the remaining product gaps on top of `pos_drafts`.

---

## 3. In scope / out of scope

### In scope

1. **Scan-to-cart** on the main cashier till (wedge + camera barcode).
2. **Mandatory persistence** of every non-empty till cart as a `pos_draft` with stable IDs when the feature is enabled.
3. **Realtime admin pending carts** — create, update, edit, complete, cancel/clear.
4. **Edit trail in admin** — show what changed (qty, price, remove, add) with actor + time.
5. **Lifecycle rules** — pending until payment complete or explicit clear/cancel; then leave the live pending list.
6. **Admin override** — business-level feature flags to enable/disable persistence, UI, and (optionally) scan-to-cart independently.
7. Hardening of flag semantics so “off” really means off for cashiers.

### Out of scope

- Grocery invoice carts (`GI-*` / `grocery_drafts`) — already a parallel flow.
- Web storefront carts (`web_carts`).
- Butchery variable-weight auto-resolve (already exists; keep compatible).
- Stock reservation / hold on scan (stock still deducts only at sale completion).
- Admin remote-editing of a cashier's live cart (watch + cancel only, unless a later phase adds remote void).
- Replacing completed sales history / Business Hub sale pulse.
- New payment methods.

---

## 4. Personas & jobs

| Persona | Job |
|---|---|
| **Cashier** | Scan fast; cart updates without an extra tap when the barcode is unique. |
| **Owner / Admin / Manager** | Open Pending carts and see every open till cart live; spot suspicious qty/price edits; cancel abandoned carts. |
| **Admin (settings)** | Turn live pending carts on/off for the business without a deploy. |

---

## 5. Desired end-to-end behavior

```text
Cashier scans barcode
  → special-code prefix? (GI-*, butcher VW, etc.)
       yes → delegate to existing handlers (grocery lock, butcher resolve)
  → exact unique product match?
       yes → addLine(+1) immediately (merge same item+price);
              brief cart pulse; refocus for next scan
       no  → keep today's search / multi-hit / create-product path
  → if cart was empty: assign / ensure server pending cart ID + ticket
  → sync draft (create or patch) with audit (ADD_LINE / UPDATE_LINE / …)
  → publish realtime event → admin pending list upserts

Cashier edits qty / price / removes line
  → patch draft + audit
  → realtime update → admin detail refreshes (lines + activity)

Cashier pays successfully
  → complete draft → sale_id linked → status=completed
  → till clears cart tab
  → realtime → admin removes from Pending (moves to Completed history)

Cashier clears / cancels cart
  → if has server draftId → cancelPosDraft (CANCEL audit + cancelled)
  → if local-only / no sync yet → discard locally
  → realtime → admin removes from Pending (Cancelled tab)

Admin disables feature mid-day
  → no new server drafts; no live pending stream required
  → cashier falls back to local-only cart + direct POST /sales
  → existing synced drafts remain completable by cashier who owns them
  → admin can still view + cancel remaining pending drafts
```

---

## 6. Cart identity & lifecycle

### Identifiers (keep existing model)

| ID | Role | Code location |
|---|---|---|
| `CartSession.id` | Local tab identity (multi-cart UI) | `cart-session.ts:12` |
| `clientDraftId` | Idempotent create key → unique `(business_id, client_draft_id)` | `cart-session.ts:14`, `pos-draft-api.ts:123` |
| `pos_drafts.id` | Server pending cart UUID (admin primary key) | `PosDraft.java` entity |
| `ticket_number` | Human-readable per-branch sequence ("Sale #47") | `BranchPosSequenceAllocator` |
| `sale_id` | Set only on payment complete | `PosDraftService.java:314` |

**Rule:** With the feature **enabled**, the first successful line add must create (or attach) a server draft before or immediately after the local add. Prefer: optimistic local add + debounced sync (already in `pos-draft-sync.ts` + `schedulePosDraftSync`, `quick-sale-workspace.tsx:432-517`), with a visible "syncing / synced / offline" state so admins don't see a ghost delay without explanation.

**Empty carts:** Do not create a server draft for an empty tab. Creating a new empty tab after payment does not appear in pending until the first item is added.

### Status machine (unchanged semantics, clearer product language)

| Status | Meaning | In live "Pending" list? |
|---|---|---|
| `pending` | Open till cart | **Yes** |
| `completed` | Payment finished; linked to `sales` | No (history tab only) |
| `cancelled` | Cleared / voided by cashier or admin | No (history tab only) |

**"Cleared" product language:**

- **Clear empty / discard before first sync** → nothing to show admin (no `draftId` → local discard only).
- **Clear / cancel after server draft exists** → call `cancelPosDraft(draftId)` → `CANCEL` audit + `cancelled` → drop from live pending.
- **Payment complete** → `COMPLETE` + `completed` → drop from live pending.
- Never hard-delete draft headers (audit retention); soft-remove from the live list only.

---

## 7. Scan-to-cart

### Target UX

1. Wedge or camera emits a barcode.
2. If till is locked / modal open / payment drawer blocking wedge → keep current guards (already in `usePosBarcodeWedge` enabled check, `cashier-pos-layout.tsx:966-976`).
3. **Special-code check first:** if barcode starts with `GI-` or matches butcher VW patterns, delegate to existing handlers (grocery invoice lock, butcher resolution). Do not attempt product lookup.
4. Resolve barcode against catalog (branch-scoped, same APIs as search — reuse `fetchItems` with barcode filter).
5. **Exactly one sellable match** → `addLine(item, 1, shelfPrice)` immediately; brief cart pulse; refocus for next scan.
6. **Zero matches** → keep search filled; optional "not found / create product" affordance (existing flags).
7. **Multiple matches** → do **not** auto-add; show search hits for cashier choice (ambiguous barcodes).

### Configuration

| Flag | Default | Purpose | Where defined |
|---|---|---|---|
| `pos.scan_to_cart` | `true` when `pos_drafts.enabled`, else `false` | Admin can force search-only scanning | Must be added to `FeatureFlagService.java` + `POS_CASHIER_CAPABILITY_FLAGS` (`pos-cashier-capabilities.ts`) |

Alternatively fold into POS drafts settings UI as a checkbox: **"Add scanned items straight to cart"**.

### Non-goals for v1

- Auto-add from fuzzy name search (only barcode / exact code paths).
- Auto-open weighed / package modal on scan when price is unknown — if shelf price missing, open the existing product modal instead of guessing.

---

## 8. Realtime admin visibility

### As-is gap (code-verified)

| What | Actual state | File / line |
|---|---|---|
| Draft WS events | **None.** `RealtimeBridge.java` has no `onPosDraft*` methods | `backend/.../platform/realtime/RealtimeBridge.java` |
| Frontend event handlers | **None.** `TYPE_HANDLER_MAP` (`realtime.ts:141`) has no `pos_draft.*` entries | `frontend/lib/realtime.ts:141-161` |
| Frontend event hook | `usePosEvents.ts` only handles stock/price/payment/STK — no draft events | `frontend/hooks/use-pos-events.ts:7-12` |
| Admin page update mechanism | REST `listPosDrafts()` called on mount + filter change + manual Refresh button | `pending-carts-page.tsx:166-196` |
| Audit log endpoint | **Missing.** `PosDraftController.java` has no audit endpoint despite `PosDraftAuditLogRepository` existing | `backend/.../posdraft/api/PosDraftController.java` |
| Audit constants | ✅ Exist in `PosDraftConstants.java:9-14` | `backend/.../posdraft/PosDraftConstants.java` |
| Audit writes | ✅ `PosDraftService.writeAudit()` writes to `pos_draft_audit_log` on every operation | `PosDraftService.java:531-547` |

### Proposed events (channel: `pos` or dedicated `pos_drafts`)

| Event | When | Payload (minimal) |
|---|---|---|
| `pos_draft.created` | First sync create | `draftId`, `ticketNumber`, `branchId`, `cashierId`, `cashierName`, `lineCount`, `grandTotal`, `updatedAt`, `version` |
| `pos_draft.updated` | Line add/update/remove / totals change | Same summary + optional `changeType` |
| `pos_draft.cancelled` | Cancel/clear | `draftId`, `ticketNumber`, `branchId` |
| `pos_draft.completed` | Payment success | `draftId`, `saleId`, `ticketNumber`, `branchId` |

**Backend changes required:**

| Change | Location |
|---|---|
| Add 4 event record types to `RealtimeBridge` | `RealtimeBridge.java` — new `onPosDraftCreated/Updated/Cancelled/Completed` methods |
| Fire events from `PosDraftService` after each transactional operation | `PosDraftService.java` — inject `RealtimeBridge`, call after `createDraft` (L101), `patchLines` (L177), `putLine` (L210), `deleteLine` (L237), `cancelDraft` (L354), `completeDraft` (L320) |

**Frontend changes required:**

| Change | Location |
|---|---|
| Add `pos_draft.*` entries to `TYPE_HANDLER_MAP` + `RealtimeClientOptions` | `realtime.ts:141` + `realtime.ts:107` |
| Build `usePosDraftEvents` hook (or extend `usePosEvents`) | New file: `frontend/hooks/use-pos-draft-events.ts` |
| Subscribe in `PendingCartsPage`; upsert/remove rows on events | `pending-carts-page.tsx` — add `useEffect` subscribing to draft events |
| On `pos_draft.updated` while detail drawer open, refetch audit | (requires audit endpoint → see below) |

**Admin client behavior (`PendingCartsPage`):**

- Subscribe while page is mounted (and online).
- On `created` / `updated` → upsert row in Pending list; if detail drawer open for that id → refetch detail (or patch lines from event if payload includes them).
- On `cancelled` / `completed` → remove from Pending tab instantly; optionally toast ("Ticket #47 paid" / "Ticket #47 cancelled").
- Keep REST initial load + reconnect resync (same pattern as `frontend/lib/realtime.ts` poll fallback).

**Detail drawer — activity:**

- **Add endpoint:** `GET /api/v1/pos-drafts/{id}/audit` → `PosDraftController.java` (new method), `PosDraftService.java` (new `getAuditLog` method), return `pos_draft_audit_log` entries ordered by `created_at` desc.
- Render timeline: Added / Qty 1→3 / Price override / Removed / Cancelled / Completed, with actor name + timestamp.
- Live updates: on `pos_draft.updated`, append or refetch audit.

**Note:** `PosDraftAuditLog` currently stores `userId` but not `userName`. The endpoint must resolve names (via `SaleActorNameService`, already injected in `PosDraftService`).

### Latency target

- Admin sees a new scan within **~1s** under normal LAN/WAN (sync debounce + WS). The current debounce is **300 ms** (`schedulePosDraftSync`, `quick-sale-workspace.tsx:433`). WS hop adds ~50-200 ms on LAN. Total ~350-500 ms is realistic.

---

## 9. Admin override (feature control)

Reuse and tighten existing flags rather than inventing a parallel system.

### Current flags (all defined in `FeatureFlagService.java`)

| Flag | Constant | Current role | Gap |
|---|---|---|---|
| `pos_drafts.enabled` | `FLAG_POS_DRAFTS_ENABLED` (L44) | Master switch. Backend `requireFeatureEnabled` gates all draft endpoints. Frontend `posDraftPersistence` gates sync + draft-complete path. | ✅ Works correctly |
| `pos_drafts.ui_visible` | `FLAG_POS_DRAFTS_UI_VISIBLE` (L50) | Show ticket number on cart, pending panel, admin live UI chrome. | ✅ Flag exists; UI wiring partially done |
| `pos_drafts.shadow_writes` | `FLAG_POS_DRAFTS_SHADOW_WRITES` (L47) | **BROKEN.** Frontend treats it as `posDraftPersistence` (`quick-sale-workspace.tsx:243`). Backend's `requireFeatureEnabled` only checks `pos_drafts.enabled`, so shadow-only mode gets 404s. | 🔴 Must fix or remove (see §16) |
| `pos_drafts.offline_mirror` | `FLAG_POS_DRAFTS_OFFLINE_MIRROR` (L53) | Controls whether offline draft completions are queued to IDB. | ✅ Works correctly |
| `pos.scan_to_cart` | **(does not exist)** | Scan auto-add independent of whether admin wants live monitoring. | 🔴 Must be created |

### Override UX (Business settings → POS drafts)

- Toggle: **Live pending carts** → sets `enabled` + `ui_visible` together (with advanced expand for granular flags).
- Toggle: **Scan straight into cart** → sets `pos.scan_to_cart`.
- Copy: "When off, cashiers keep a local cart only; admins will not see live pending tickets. Existing open tickets stay listed until paid or cancelled."
- The `PosDraftsFeatureFlagsPatch` DTO (`backend/.../tenancy/api/dto/PosDraftsFeatureFlagsPatch.java`) already has `enabled`, `uiVisible`, `shadowWrites`, `offlineMirror`. Must add `scanToCart`.

### Policy when admin turns the feature OFF mid-day

**Recommended default:**

1. Stop creating **new** drafts.
2. Open `pending` drafts remain visible to admin (read + cancel + complete still allowed) so money isn't stuck.
3. Cashiers with an already-synced `draftId` may still complete that draft; new tabs go local-only / direct sale.
4. Optional hard kill (phase 2): force-cancel all pending — not default.

**Implementation note:** The frontend must detect a **transition** from ON→OFF during a session. Currently `posDraftPersistence` is read at component mount via `useFeatureFlag` — if it changes mid-session, existing synced carts must remain completable. This requires either:
- Snapshoting `posDraftPersistence` per-cart at sync time, **or**
- Checking `activeCart.draftId != null` before deciding whether to use draft-complete path, regardless of current flag state.

Cashiers must **not** be able to re-enable via till UI. All feature-flag endpoints are gated by `business.manage_settings` which cashiers lack.

---

## 10. Permissions (existing, confirm)

| Permission | Cashier | Admin / Owner / Manager |
|---|---|---|
| `pos.drafts.read` | Yes | Yes |
| `pos.drafts.write` | Yes | Yes |
| `pos.drafts.cancel.own` | Yes | Yes |
| `pos.drafts.cancel.any` | No | Yes |
| `sales.sell` | Required to complete | Required to complete |
| `business.manage_settings` | No | Yes (flags) |

Branch scoping: cashiers see/sync their branch; admins may filter by branch on the pending page (already partially there — keep).

---

## 11. UX surfaces

### Cashier (`QuickSaleWorkspace` / `CashierPosLayout`)

| Element | Status | Notes |
|---|---|---|
| Scan-to-cart feedback | ❌ Not built | Pulse/toast only on failure (not found, ambiguous, offline sync fail). Success = silent cart pulse. |
| Ticket number on active cart | ⚠️ Partial | `cartSessionLabel()` shows `#N` when `ticketNumber` is set, but cart tab label only updates after sync. |
| Sync chip | ❌ Not built | `CartSession.syncStatus` field exists and is set to `syncing`/`idle`/`error` — but no UI renders it. |
| Clear cart → cancel server draft | ❌ Broken | `clearCartAfterSale` (L919-935) removes IDB mirror but never calls `cancelPosDraft` when `draftId` exists. |
| Payment → clear + refresh | ⚠️ Partial | `onComplete` calls `clearCartAfterSale` + `setPendingSalesRefreshKey`. Realtime notification not wired. |

### Admin (`/sales/pending-carts`)

| Element | Status | Notes |
|---|---|---|
| Live pending list | ❌ REST only | `loadDrafts()` fetches on mount + filter change. No WS subscription. |
| Activity timeline | ❌ Not built | No audit endpoint. Detail drawer only shows static line list. |
| Cancel action | ✅ Works | `handleCancel` calls `cancelPosDraft` with permission check. |
| Stale indicator | ✅ Works | `isStale()` → 30-minute threshold, amber badge on rows. |

### Settings

- POS drafts section already exists (`settings-pos-drafts` in business settings forms) — extend with scan-to-cart + clearer master toggle copy.

---

## 12. Technical plan (phased) — with gap detail

### Phase A — Scan-to-cart

**What must change:**

| # | Change | File | Gap |
|---|---|---|---|
| A1 | Create `pos.scan_to_cart` flag | `FeatureFlagService.java` + `pos-cashier-capabilities.ts` | Flag doesn't exist |
| A2 | Replace `applyBarcodeSearch` with barcode→resolve→auto-add path | `cashier-pos-layout.tsx:954-964` | Currently only fills search box |
| A3 | Add special-code prefix check (GI-*, butcher VW) before product lookup | `cashier-pos-layout.tsx` | Prevents breaking existing grocery/butcher flows |
| A4 | Add scan feedback (silent success pulse, toast on failure) | `cashier-pos-layout.tsx` | No scan feedback exists |
| A5 | Pass `addLine` callback through to layout; pulse cart state | `CashierPosLayoutProps` + `cashier-pos-layout.tsx` | `addLine` not called from layout currently |
| A6 | Handle barcode match count: 0→search, 1→auto-add, 2+→search | `cashier-pos-layout.tsx` (new `useBarcodeToCart` logic) | Resolution not implemented |

**Database / API impact:** None — reuses existing `fetchItems` with barcode filter.  
**Flag gating:** Scan-to-cart respects `pos.scan_to_cart`; independently respects `pos_drafts.enabled` for draft creation.

**Acceptance:** Unique barcode scan adds without a second tap; ambiguous/missing does not. Grocery/butcher prefixes still route to their handlers. Scan-to-cart can be toggled independently of draft persistence.

---

### Phase B — Fix persistence gaps

**What must change:**

| # | Change | File | Gap |
|---|---|---|---|
| B1 | Resolve `shadow_writes` inconsistency | `FeatureFlagService.java`, `quick-sale-workspace.tsx:243`, `PosDraftService.java:525-529` | Frontend treats shadow as enabled; backend rejects if `enabled` is off |
| B2 | Add sync-status chip to cashier UI | `cashier-pos-layout.tsx` (cart tab area) | `CartSession.syncStatus` exists but not rendered |
| B3 | `clearCartAfterSale` must call `cancelPosDraft` when `draftId` exists | `quick-sale-workspace.tsx:919-935` | Server draft stays pending forever after cashier clears |
| B4 | Guard `onComplete` mid-day disable: if cart has `draftId`, use draft-complete path regardless of current flag | `quick-sale-workspace.tsx:3040` | Currently re-checks `posDraftPersistence` which may have flipped OFF mid-session |
| B5 | `createDraft` silently generates new `clientDraftId` for stale IDs | `PosDraftService.java:84` | Frontend `CartSession.clientDraftId` goes out of sync — no callback to update it |
| B6 | `PosDraftResponse` DTO missing lifecycle fields | `PosDraftResponse` (backend DTO) | `completedAt`, `cancelledBy`, `cancelledAt`, `cancelledReason`, `customerId`, `shiftId` exist on entity but not in API response |

**Acceptance:** With `pos_drafts.enabled=true`, every non-empty cart has `draftId` + `ticketNumber` after sync; payment completes via draft complete; clear cancels server draft; shadow_writes is either fixed or removed; mid-day disable doesn't orphan synced carts.

---

### Phase C — Realtime bridge + admin live UI

**What must change:**

| # | Change | File | Gap |
|---|---|---|---|
| C1 | Add 4 draft event record types + handler methods to `RealtimeBridge` | `RealtimeBridge.java` | No draft events exist |
| C2 | Fire events from `PosDraftService` after each transactional op | `PosDraftService.java` — after create/patch/put/delete/cancel/complete | No event publishing |
| C3 | Add `pos_draft.*` entries to `TYPE_HANDLER_MAP` + `RealtimeClientOptions` | `realtime.ts:141-161`, `realtime.ts:107-129` | No frontend event types |
| C4 | Build `usePosDraftEvents` hook | New: `frontend/hooks/use-pos-draft-events.ts` | No hook exists |
| C5 | Add `GET /api/v1/pos-drafts/{id}/audit` endpoint | `PosDraftController.java` (new method), `PosDraftService.java` (new method) | No audit endpoint |
| C6 | Wire `PendingCartsPage` to WS subscription (upsert/remove rows) | `pending-carts-page.tsx` | Currently REST-only |
| C7 | Build activity timeline in detail drawer | `pending-carts-page.tsx` (detail section) | Only static line list |
| C8 | Resolve actor names in audit log (audit stores `userId`, not `userName`) | `PosDraftService.java` (new `getAuditLog` method using `saleActorNameService`) | Names needed for timeline UI |

**Acceptance:** Second browser on `/sales/pending-carts` updates within ~1s of cashier scan/edit/pay/clear without manual refresh. Detail drawer shows chronological activity timeline with actor name + timestamp.

---

### Phase D — Admin override polish

| # | Change | File | Gap |
|---|---|---|---|
| D1 | Add `scanToCart` field to `PosDraftsFeatureFlagsPatch` DTO | `PosDraftsFeatureFlagsPatch.java` | DTO missing field |
| D2 | Add scan-to-cart toggle to business settings UI | Settings form component | No UI element |
| D3 | Implement mid-day disable policy (per-cart `draftId` snapshot) | `quick-sale-workspace.tsx` | No transition handling |
| D4 | Gate `PosDraftsFeatureFlagsPatch` endpoint behind `business.manage_settings` | `PosDraftController` or settings controller | Cashiers must not be able to flip flags |
| D5 | Default flags for new vs existing businesses | Migration / onboarding script | Not implemented |

**Acceptance:** Admin can toggle live pending carts + scan-to-cart independently. Mid-day OFF doesn't orphan synced carts. Cashiers cannot bypass.

---

### Phase E — Hardening

| # | Change | File | Gap |
|---|---|---|---|
| E1 | Fire draft events on offline replay (so admin sees carts after reconnect) | `pos-draft-sync.ts` → `replayMirroredDraftsToServer` + backend | Events only fire on realtime create, not on replay |
| E2 | OCC conflict resolution: admin cancel vs cashier complete | `PosDraftService.java:completeDraft`, `cancelDraft` | Version check exists but no clear policy on which wins |
| E3 | Load test: many tills → event fan-out volume | `RealtimeBridge.java` | No benchmarks exist |

---

## 13. Data & API (mostly existing)

### Tables (keep)

- `pos_drafts`, `pos_draft_lines`, `pos_draft_audit_log`, `branch_pos_sequences`

### APIs (keep + extend)

| Endpoint | Use | Status |
|---|---|---|
| `POST /api/v1/pos-drafts` | Create on first line | ✅ Exists |
| `PATCH /api/v1/pos-drafts/{id}/lines` | Edits | ✅ Exists |
| `POST /api/v1/pos-drafts/{id}/complete` | Payment | ✅ Exists |
| `POST /api/v1/pos-drafts/{id}/cancel` | Clear / admin void | ✅ Exists |
| `GET /api/v1/pos-drafts` | Initial pending list | ✅ Exists |
| `GET /api/v1/pos-drafts/{id}` | Detail | ✅ Exists |
| `GET /api/v1/pos-drafts/{id}/audit` | **Must add** — activity timeline | ❌ Missing |
| WS `/api/v1/realtime` (channel `pos_drafts`) | **Must add** — draft event types | ❌ Missing |

No new primary tables required for v1.

---

## 14. Edge cases

| Case | Behavior | Implementation status |
|---|---|---|
| Double-scan same SKU | Merge qty on same price line (existing `addLine` merge) | ✅ `quick-sale-workspace.tsx:1961-1991` |
| Price override then rescan | New line or merge rules stay as today; both audited | ✅ Existing behavior |
| Multi-tab carts (max 8) | Each tab = own `clientDraftId` / draft when non-empty | ✅ `cart-session.ts:76` |
| Offline scan | Local cart + IDB mirror; sync when online; admin sees cart after sync (show "delayed" if needed) | ⚠️ Mirror works; admin visibility after replay missing (E1) |
| Complete while admin has drawer open | Event removes from pending; drawer shows completed state + sale link | ❌ No events yet (C1) |
| Two cashiers same branch | Separate drafts; list shows both with cashier name | ✅ Separate `CartSession`s |
| Feature disabled | No auto server create; scan-to-cart still follows its own flag | ⚠️ Mid-day disable not handled (D3) |
| Grocery `GI-*` scan | Existing invoice lock path; may appear as pending invoice, not POS draft (do not conflate) | ✅ `quick-sale-workspace.tsx:1018-1153` handles GI barcodes |
| Cashier clears cart with server draft | Must call `cancelPosDraft` | ❌ `clearCartAfterSale` doesn't cancel (B3) |
| Admin cancels while cashier pays | OCC version conflict — which wins? | ❌ Not resolved (E2) |
| Barcode camera scan on locked till | `usePosBarcodeWedge` already guards against this | ✅ `cashier-pos-layout.tsx:967-976` |

---

## 15. Success metrics

- % of paid sales that had a prior `pos_draft` (target → ~100% when feature on).
- Median time from scan → admin pending upsert (target ≤ 1s).
- Admin page refresh rate drops (manual refresh rarely needed).
- Cancel / clear rate and age-of-pending distribution (ops insight, not a blocker).
- % of cart clears that successfully cancel the server draft (should be 100% when feature on).

---

## 16. Risks & open decisions

| Topic | Recommendation | Needs product call? |
|---|---|---|
| `shadow_writes` | Remove from cashier-facing settings or make backend honor it; **do not leave half-working.** Current: frontend `quick-sale-workspace.tsx:243` treats it as `posDraftPersistence`, backend rejects if `enabled` is off. | Yes |
| Mid-day disable | Leave open pending completable. Must snapshot `draftId` per cart to know which path to use. | Confirm |
| Scan ambiguity | Never auto-add multi-match. Barcode resolution must check count before acting. | Confirm |
| Remote admin cancel while cashier is mid-pay | OCC / complete wins or cancel wins? Prefer: complete with version check; cancel fails if completing (409 conflict). `completeDraft` already checks `expectedVersion`. | Confirm |
| Include dashboard Quick sale (`variant="admin"`) | Yes — `QuickSaleWorkspace` is shared; scan-to-cart and persistence work the same in admin variant. | Confirm |
| Default flags for new businesses | Recommend `enabled` + `ui_visible` + scan-to-cart **on** for new installs; off for existing until opted in. | Yes |
| `pos_draft_audit_log.userId` → name resolution | Audit table stores `userId`, not name. Endpoint must resolve names via `SaleActorNameService`. | No (engineering decision) |
| `PosDraftResponse` missing lifecycle fields | Add `completedAt`, `cancelledBy`, `cancelledAt`, `cancelledReason`, `customerId` to the response DTO for richer admin detail view. | No (engineering decision) |

---

## 17. Acceptance checklist (v1 done when)

### Phase A — Scan-to-cart
- [ ] A1  `pos.scan_to_cart` flag exists in backend + frontend, defaults to `pos_drafts.enabled`.
- [ ] A2  Unique barcode scan adds to cart with no second tap.
- [ ] A3  Zero-match barcode fills search for manual resolution.
- [ ] A4  Multi-match barcode fills search (does **not** auto-add).
- [ ] A5  Special prefix codes (`GI-*`, butcher VW) route to existing handlers first.
- [ ] A6  Scan feedback: silent cart pulse on success, toast on failure.
- [ ] A7  Scan-to-cart respects `pos.scan_to_cart` flag independently of `pos_drafts.enabled`.
- [ ] A8  Toggleable in business settings UI.

### Phase B — Persistence gaps
- [ ] B1  `shadow_writes` inconsistency resolved (fixed or removed from UI).
- [ ] B2  Sync-status chip visible on cashier till (Synced / Syncing / Offline).
- [ ] B3  `clearCartAfterSale` calls `cancelPosDraft` when cart has `draftId`.
- [ ] B4  Mid-day disable: cashier with synced `draftId` can still complete; new tabs go local-only.
- [ ] B5  `createDraft` stale-ID recovery updates frontend `clientDraftId` (or frontend handles it gracefully).
- [ ] B6  `PosDraftResponse` includes `completedAt`, `cancelledBy`, `cancelledAt`.

### Phase C — Realtime + admin live UI
- [ ] C1  Backend publishes `pos_draft.created/updated/cancelled/completed` events via WebSocket.
- [ ] C2  Frontend `RealtimeClient` subscribes to `pos_draft.*` event types.
- [ ] C3  `PendingCartsPage` updates rows live on events (no manual refresh needed).
- [ ] C4  Detail drawer refreshes when `pos_draft.updated` fires for the selected draft.
- [ ] C5  `GET /api/v1/pos-drafts/{id}/audit` endpoint returns audit log with resolved actor names.
- [ ] C6  Activity timeline renders in detail drawer (Added / Qty change / Price override / Removed / Cancelled / Completed).
- [ ] C7  Cancelled/completed drafts removed from Pending tab instantly.
- [ ] C8  Toast notification on payment/cancel events in admin view.

### Phase D — Admin override
- [ ] D1  "Live pending carts" master toggle in settings (sets `enabled` + `ui_visible`).
- [ ] D2  "Scan straight into cart" toggle in settings (sets `pos.scan_to_cart`).
- [ ] D3  Cashiers cannot re-enable via till UI.
- [ ] D4  Feature off: till sells via direct `POST /sales` path (existing fallback works).
- [ ] D5  Default flags: new businesses get `enabled`+`ui_visible`+`scan_to_cart` ON; existing businesses OFF until opted in.

### Phase E — Hardening
- [ ] E1  Offline scan → online replay publishes draft events so admin visibility recovers.
- [ ] E2  OCC conflict: admin cancel fails with 409 if cashier is mid-pay.
- [ ] E3  Grocery / butcher special scans still work end-to-end.
- [ ] E4  Load test: ≥10 simultaneous tills, event fan-out latency ≤ 2s.

---

## 18. Key code references (verified paths)

| Area | Exact path |
|---|---|
| Till workspace | `frontend/components/cashier/quick-sale-workspace.tsx` |
| Scan / layout | `frontend/components/cashier/cashier-pos-layout.tsx` |
| Barcode wedge hook | `frontend/hooks/use-pos-barcode-wedge.ts` |
| Local cart types | `frontend/lib/cart-session.ts` |
| Draft API + flags | `frontend/lib/pos-draft-api.ts` |
| Draft sync | `frontend/lib/pos-draft-sync.ts` |
| Draft IDB store | `frontend/lib/pos-draft-store.ts` |
| Admin UI | `frontend/components/sales/pending-carts-page.tsx` |
| Realtime client | `frontend/lib/realtime.ts` |
| POS events hook | `frontend/hooks/use-pos-events.ts` |
| Cashier capabilities flags | `frontend/lib/pos-cashier-capabilities.ts` |
| Draft service | `backend/src/main/java/zelisline/ub/posdraft/application/PosDraftService.java` |
| Draft controller | `backend/src/main/java/zelisline/ub/posdraft/api/PosDraftController.java` |
| Draft constants | `backend/src/main/java/zelisline/ub/posdraft/PosDraftConstants.java` |
| Audit log repo | `backend/src/main/java/zelisline/ub/posdraft/repository/PosDraftAuditLogRepository.java` |
| Realtime bridge | `backend/src/main/java/zelisline/ub/platform/realtime/RealtimeBridge.java` |
| Feature flags | `backend/src/main/java/zelisline/ub/tenancy/application/FeatureFlagService.java` |
| Feature flags patch DTO | `backend/src/main/java/zelisline/ub/tenancy/api/dto/PosDraftsFeatureFlagsPatch.java` |
| Prior persistence scope | `frontend/docs/CASHIER_CART_PERSISTENCE_SCOPE_REVISED.md` |

---

## 19. Suggested implementation order (with file-level targets)

1. **Phase A — Scan-to-cart** (smallest blast radius, pure cashier UX win)
   - `FeatureFlagService.java` — add `pos.scan_to_cart` constant
   - `pos-cashier-capabilities.ts` — add `scanToCart` to `POS_CASHIER_CAPABILITY_FLAGS`
   - `cashier-pos-layout.tsx:954-964` — replace `applyBarcodeSearch` with resolve→auto-add
   - `cashier-pos-layout.tsx` — add special-code prefix check, scan feedback, `addLine` wiring

2. **Phase B — Fix persistence gaps** (hardens what's already 80% built)
   - `quick-sale-workspace.tsx:919` — fix `clearCartAfterSale` to cancel server draft
   - `quick-sale-workspace.tsx:243` — resolve `shadow_writes` inconsistency
   - `cashier-pos-layout.tsx` — add sync-status chip
   - `quick-sale-workspace.tsx:3040` — guard mid-day disable with per-cart `draftId` check
   - `PosDraftService.java:84` — return new `clientDraftId` to frontend so it can update
   - `PosDraftResponse` DTO — add lifecycle fields

3. **Phase C — Realtime + admin live UI** (core feature; biggest effort)
   - `RealtimeBridge.java` — add 4 draft event handler methods
   - `PosDraftService.java` — inject `RealtimeBridge`, fire events after each op
   - `PosDraftController.java` — add `GET /{id}/audit` endpoint
   - `realtime.ts` — add `pos_draft.*` to `TYPE_HANDLER_MAP` + `RealtimeClientOptions`
   - New: `frontend/hooks/use-pos-draft-events.ts`
   - `pending-carts-page.tsx` — subscribe to WS, upsert/remove rows, activity timeline in drawer

4. **Phase D — Settings UX + rollout defaults**
   - `PosDraftsFeatureFlagsPatch.java` — add `scanToCart`
   - Settings form component — add scan-to-cart toggle, clearer master toggle copy
   - Migration/onboarding — set flags differently for new vs existing businesses

5. **Phase E — Hardening**
   - `pos-draft-sync.ts` — fire events on offline replay
   - `PosDraftService.java:completeDraft` + `cancelDraft` — OCC conflict resolution
   - Load tests
