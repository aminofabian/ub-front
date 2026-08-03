# Live Pending Carts — Product & Engineering Scope

> **Goal:** Every cashier scan becomes a durable, identifiable cart that admins can watch live — adds, edits, and clears — until payment completes. Admins can turn the whole behavior off.
>
> **Status:** Scope only (not implemented as described here)  
> **Date:** 2026-08-03  
> **Primary surfaces:** Cashier PWA `/cashier`, Admin `/sales/pending-carts`  
> **Foundation:** Existing `pos_drafts` system (V114 + `PosDraftService` + `PendingCartsPage`)  
> **Related:** [`CASHIER_CART_PERSISTENCE_SCOPE_REVISED.md`](./CASHIER_CART_PERSISTENCE_SCOPE_REVISED.md)

---

## 1. One-sentence brief

When a cashier scans a product, it goes straight into the active cart; that cart is assigned a stable ID, persisted as a **pending cart**, streamed to admin in real time (including line edits), and leaves the pending list only when payment completes or the cart is explicitly cleared/cancelled — unless an admin has disabled the feature.

---

## 2. Why this exists

Owners and managers need to see what is being rung up **right now**, not only after payment. Today:

| Capability | Today | Desired |
|---|---|---|
| Scan → cart | Scan fills search; cashier still picks (except some quick-add / butcher paths) | Exact barcode match → add immediately |
| Cart ID while ringing | Local `CartSession.id`; server `draftId` / `ticketNumber` only when drafts sync is on | Every active till cart has a server ID as soon as the first line lands |
| Admin pending view | `/sales/pending-carts` exists; load-on-mount / manual refresh | Live list + live line/audit updates |
| Edit visibility | `pos_draft_audit_log` written server-side; not surfaced live in admin UI | Admin sees qty/price/remove changes as they happen |
| Clear / pay | Payment completes draft → `completed` + till clears; cancel → `cancelled` | Same, but pending list updates instantly; empty clear also drops from live pending |
| Admin override | Feature flags exist; defaults off; shadow-writes semantics inconsistent | Clear admin kill-switch that cashiers cannot bypass |

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
- Admin remote-editing of a cashier’s live cart (watch + cancel only, unless a later phase adds remote void).
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
  → exact unique product match?
       yes → addLine(+1) immediately (merge same item+price)
       no  → keep today’s search / multi-hit / create-product path
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
  → cancel draft (or delete empty local-only before first sync)
  → realtime → admin removes from Pending (Cancelled if it had an ID)

Admin disables feature
  → no new server drafts; no live pending stream required
  → cashier falls back to local-only cart + direct POST /sales
  → existing pending drafts remain recoverable until paid/cancelled (policy below)
```

---

## 6. Cart identity & lifecycle

### Identifiers (keep existing model)

| ID | Role |
|---|---|
| `CartSession.id` | Local tab identity (multi-cart UI) |
| `clientDraftId` | Idempotent create key → unique `(business_id, client_draft_id)` |
| `pos_drafts.id` | Server pending cart UUID (admin primary key) |
| `ticket_number` | Human-readable per-branch sequence (“Sale #47”) |
| `sale_id` | Set only on payment complete |

**Rule:** With the feature **enabled**, the first successful line add must create (or attach) a server draft before or immediately after the local add. Prefer: optimistic local add + debounced sync (already in `pos-draft-sync.ts`), with a visible “syncing / synced / offline” state so admins don’t see a ghost delay without explanation.

**Empty carts:** Do not create a server draft for an empty tab. Creating a new empty tab after payment does not appear in pending until the first item is added.

### Status machine (unchanged semantics, clearer product language)

| Status | Meaning | In live “Pending” list? |
|---|---|---|
| `pending` | Open till cart | **Yes** |
| `completed` | Payment finished; linked to `sales` | No (history tab only) |
| `cancelled` | Cleared / voided by cashier or admin | No (history tab only) |

**“Cleared” product language:**

- **Clear empty / discard before first sync** → nothing to show admin.
- **Clear / cancel after server draft exists** → `CANCEL` audit + `cancelled` → drop from live pending.
- **Payment complete** → `COMPLETE` + `completed` → drop from live pending.
- Never hard-delete draft headers (audit retention); soft-remove from the live list only.

---

## 7. Scan-to-cart

### Target UX

1. Wedge or camera emits a barcode.
2. If till is locked / modal open / payment drawer blocking wedge → keep current guards.
3. Resolve barcode against catalog (branch-scoped, same APIs as search).
4. **Exactly one sellable match** → `addLine(item, 1, shelfPrice)` immediately; brief cart pulse; refocus for next scan.
5. **Zero matches** → keep search filled; optional “not found / create product” affordance (existing flags).
6. **Multiple matches** → do **not** auto-add; show search hits for cashier choice (ambiguous barcodes).
7. Special codes (`GI-*`, butcher VW, etc.) keep their existing handlers and take precedence.

### Configuration

| Flag (proposed) | Default | Purpose |
|---|---|---|
| `pos.scan_to_cart` | `true` when drafts enabled, else `false` | Admin can force search-only scanning |

Alternatively fold into POS drafts settings UI as a checkbox: **“Add scanned items straight to cart”**.

### Non-goals for v1

- Auto-add from fuzzy name search (only barcode / exact code paths).
- Auto-open weighed / package modal on scan when price is unknown — if shelf price missing, open the existing product modal instead of guessing.

---

## 8. Realtime admin visibility

### As-is gap

- Realtime bridge already emits `sale.completed`, `payment.confirmed`, etc.
- Audit type constants exist: `pos_draft.created|updated|cancelled|completed`.
- **No** draft events are published to the WS bridge today.
- Admin page is REST + manual refresh; till pending panel polls ~30s.

### Proposed events (channel: `pos` or dedicated `pos_drafts`)

| Event | When | Payload (minimal) |
|---|---|---|
| `pos_draft.created` | First sync create | `draftId`, `ticketNumber`, `branchId`, `cashierId`, `cashierName`, `lineCount`, `grandTotal`, `updatedAt`, `version` |
| `pos_draft.updated` | Line add/update/remove / totals change | Same summary + optional `changeType` |
| `pos_draft.cancelled` | Cancel/clear | `draftId`, `ticketNumber`, `branchId` |
| `pos_draft.completed` | Payment success | `draftId`, `saleId`, `ticketNumber`, `branchId` |

**Admin client behavior (`PendingCartsPage`):**

- Subscribe while page is mounted (and online).
- On `created` / `updated` → upsert row in Pending list; if detail drawer open for that id → refetch detail (or patch lines from event if payload includes them).
- On `cancelled` / `completed` → remove from Pending tab instantly; optionally toast (“Ticket #47 paid” / “Ticket #47 cancelled”).
- Keep REST initial load + reconnect resync (same pattern as `frontend/lib/realtime.ts` poll fallback).

**Detail drawer — activity:**

- Expose `GET /api/v1/pos-drafts/{id}/audit` (if not already public) returning `pos_draft_audit_log` entries.
- Render timeline: Added / Qty 1→3 / Price override / Removed / Cancelled / Completed, with actor name + timestamp.
- Live updates: on `pos_draft.updated`, append or refetch audit.

### Latency target

- Admin sees a new scan within **~1s** under normal LAN/WAN (sync debounce + WS). Document expected debounce (e.g. 300–500ms) so product expectations are clear.

---

## 9. Admin override (feature control)

Reuse and tighten existing flags rather than inventing a parallel system.

| Flag | Role in this feature |
|---|---||
| `pos_drafts.enabled` | **Master switch.** Server accepts draft create/patch/complete only when on. Cashier uses draft complete path only when on. |
| `pos_drafts.ui_visible` | Show “Pending sales” nav + till Pending panel + admin live UI chrome. |
| `pos_drafts.shadow_writes` | Deprecate or fix: either remove from UI, or make backend honor it for write-only shadowing **without** changing cashier checkout path. Today UI and backend disagree — **must resolve in this work**. |
| `pos_drafts.offline_mirror` | Keep for offline queue behavior. |
| `pos.scan_to_cart` (new or settings boolean) | Scan auto-add independent of whether admin wants live monitoring. |

### Override UX (Business settings → POS drafts)

- Toggle: **Live pending carts** → sets `enabled` + `ui_visible` together (with advanced expand for granular flags).
- Toggle: **Scan straight into cart**.
- Copy: “When off, cashiers keep a local cart only; admins will not see live pending tickets. Existing open tickets stay listed until paid or cancelled.”

### Policy when admin turns the feature OFF mid-day

**Recommended default:**

1. Stop creating **new** drafts.
2. Open `pending` drafts remain visible to admin (read + cancel + complete still allowed) so money isn’t stuck.
3. Cashiers with an already-synced `draftId` may still complete that draft; new tabs go local-only / direct sale.
4. Optional hard kill (phase 2): force-cancel all pending — not default.

Cashiers must **not** be able to re-enable via till UI.

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

- Scan-to-cart feedback: pulse / toast only on failure (not found, ambiguous, offline sync fail).
- Show ticket number on the active cart once server ID exists (when `ui_visible`).
- Sync chip: Synced / Syncing / Offline (queued).
- Clear cart → confirm if lines exist → cancel server draft when present.
- Payment success → existing `clearCartAfterSale`; ensure pending panels refresh via realtime (not only local refresh).

### Admin (`/sales/pending-carts`)

- Default tab: **Pending** — live.
- Columns: Ticket #, Cashier, Branch, Lines, Total, Age / Last activity, Sync freshness.
- Row click → detail: lines + live activity timeline.
- Actions: Cancel (permissioned), Open linked sale when completed.
- Stale indicator (already uses ~30 min concept) — keep; realtime does not remove need for “idle too long” highlighting.
- Empty state: “No open carts on this branch.”

### Settings

- POS drafts section already exists (`settings-pos-drafts` in business settings forms) — extend with scan-to-cart + clearer master toggle copy.

---

## 12. Technical plan (phased)

### Phase A — Scan-to-cart

**Files (likely):**

- `frontend/components/cashier/cashier-pos-layout.tsx` — replace search-only `applyBarcodeSearch` with resolve → auto-add path
- `frontend/hooks/use-pos-barcode-wedge.ts` — unchanged contract if possible
- Catalog lookup helper (reuse `fetchItems` / barcode exact match)

**Acceptance:** Unique barcode scan adds without a second tap; ambiguous/missing does not.

### Phase B — Persistence always-on when feature enabled

**Files (likely):**

- `frontend/lib/pos-draft-sync.ts`, `quick-sale-workspace.tsx`
- Backend gate cleanup in `PosDraftService` + `FeatureFlagService`
- Fix `shadow_writes` inconsistency

**Acceptance:** With `pos_drafts.enabled=true`, every non-empty cart has `draftId` + `ticketNumber` after sync; payment completes via draft complete; clear cancels draft.

### Phase C — Realtime bridge + admin live UI

**Backend:**

- Publish draft lifecycle events from `PosDraftService` via `RealtimeBridge`
- Optional: audit list endpoint if missing

**Frontend:**

- `usePosEvents` / new `usePosDraftEvents` hook
- `pending-carts-page.tsx` subscribe + upsert/remove
- Detail activity timeline from audit log

**Acceptance:** Second browser on `/sales/pending-carts` updates within ~1s of cashier scan/edit/pay/clear without manual refresh.

### Phase D — Admin override polish

- Settings UX + copy
- Mid-day disable policy
- Feature-flag tests (backend + frontend visibility)

### Phase E — Hardening

- Offline: IDB mirror already exists — verify scan-to-cart still works offline and catches up
- Conflict / OCC (`version`) — admin view should not break on concurrent patches
- Load test: many tills → event fan-out volume

---

## 13. Data & API (mostly existing)

### Tables (keep)

- `pos_drafts`, `pos_draft_lines`, `pos_draft_audit_log`, `branch_pos_sequences`

### APIs (keep + extend)

| Endpoint | Use |
|---|---|
| `POST /api/v1/pos-drafts` | Create on first line |
| `PATCH /api/v1/pos-drafts/{id}` | Edits |
| `POST /api/v1/pos-drafts/{id}/complete` | Payment |
| `POST /api/v1/pos-drafts/{id}/cancel` | Clear / admin void |
| `GET /api/v1/pos-drafts` | Initial pending list |
| `GET /api/v1/pos-drafts/{id}` | Detail |
| `GET /api/v1/pos-drafts/{id}/audit` | **Add if missing** — activity timeline |
| WS `/api/v1/realtime` | **Add** draft event types |

No new primary tables required for v1.

---

## 14. Edge cases

| Case | Behavior |
|---|---|
| Double-scan same SKU | Merge qty on same price line (existing `addLine` merge) |
| Price override then rescan | New line or merge rules stay as today; both audited |
| Multi-tab carts (max 8) | Each tab = own `clientDraftId` / draft when non-empty |
| Offline scan | Local cart + IDB mirror; sync when online; admin sees cart after sync (show “delayed” if needed) |
| Complete while admin has drawer open | Event removes from pending; drawer shows completed state + sale link |
| Two cashiers same branch | Separate drafts; list shows both with cashier name |
| Feature disabled | No auto server create; scan-to-cart still follows its own flag |
| Grocery `GI-*` scan | Existing invoice lock path; may appear as pending invoice, not POS draft (do not conflate) |

---

## 15. Success metrics

- % of paid sales that had a prior `pos_draft` (target → ~100% when feature on).
- Median time from scan → admin pending upsert.
- Admin page refresh rate drops (manual refresh rarely needed).
- Cancel / clear rate and age-of-pending distribution (ops insight, not a blocker).

---

## 16. Risks & open decisions

| Topic | Recommendation | Needs product call? |
|---|---|---|
| `shadow_writes` | Remove from cashier-facing settings or make backend honor it; do not leave half-working | Yes |
| Mid-day disable | Leave open pending completable | Confirm |
| Scan ambiguity | Never auto-add multi-match | Confirm |
| Remote admin cancel while cashier is mid-pay | OCC / complete wins or cancel wins? Prefer: complete with version check; cancel fails if completing | Confirm |
| Include dashboard Quick sale (`variant="admin"`) | Yes — same workspace | Confirm |
| Default flags for new businesses | Recommend `enabled` + `ui_visible` + scan-to-cart **on** for new installs; off for existing until opted in | Yes |

---

## 17. Acceptance checklist (v1 done when)

- [ ] Unique barcode scan adds to cart with no second tap.
- [ ] Every non-empty cart gets a server ID + ticket while feature is on.
- [ ] Admin Pending list updates live on add / edit / pay / clear.
- [ ] Admin can open a cart and see line edits in an activity timeline.
- [ ] Payment complete removes cart from Pending and links `sale_id`.
- [ ] Clear/cancel removes cart from Pending.
- [ ] Admin can disable live pending carts in settings; cashiers cannot override.
- [ ] With feature off, till still sells via existing direct sale path.
- [ ] Grocery / butcher special scans still work.
- [ ] Offline scan does not lose lines; sync recovers draft + admin visibility.

---

## 18. Key code references

| Area | Path |
|---|---|
| Till workspace | `frontend/components/cashier/quick-sale-workspace.tsx` |
| Scan / layout | `frontend/components/cashier/cashier-pos-layout.tsx` |
| Local cart types | `frontend/lib/cart-session.ts` |
| Draft API + flags | `frontend/lib/pos-draft-api.ts` |
| Draft sync | `frontend/lib/pos-draft-sync.ts` |
| Admin UI | `frontend/components/sales/pending-carts-page.tsx` |
| Realtime client | `frontend/lib/realtime.ts`, `frontend/hooks/use-pos-events.ts` |
| Schema | `backend/.../db/migration/V114__pos_drafts.sql` |
| Service | `backend/.../posdraft/application/PosDraftService.java` |
| Realtime fan-out | `backend/.../platform/realtime/RealtimeBridge.java` |
| Flags | `backend/.../FeatureFlagService.java` |
| Prior persistence scope | `frontend/docs/CASHIER_CART_PERSISTENCE_SCOPE_REVISED.md` |

---

## 19. Suggested implementation order

1. **Phase A** scan-to-cart (immediate cashier win; small blast radius).
2. **Phase B** flag/semantics + “always persist when on”.
3. **Phase C** realtime events + admin live list + audit timeline.
4. **Phase D** settings override polish + rollout defaults.
5. **Phase E** offline / conflict hardening.

Estimated shape: A–B are mostly frontend + small backend gates; C is the core of “show me pending in real-time”; D is product/settings; E is production readiness.
