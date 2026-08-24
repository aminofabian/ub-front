# Supplier Order Handoff — Scope

> **Goal:** When a shop sends a purchase order, the connected supplier *receives* it. The PO appears in their portal inbox, a full in-app alert tells them an order has arrived, and the WhatsApp/SMS ping we already send carries the same order code. The shop can also download and share the ticket. No lost order.
>
> **Strategy:** Stop treating “send” as a status flip on the shop side. **Create / send the Path A PO first**, then fan out to the supplier on every channel that already exists (portal inbox, in-app alert, SMS/WhatsApp). Shop-side PDF / WhatsApp is a *copy of a tracked order*, not the order itself. Invert today’s leak: chat without a portal row.

**Status:** In progress (V1 handoff: inbox deep link, Order received alert, unread badge, honest portal send)  
**Date:** 2026-08-24  
**Related:** `MarketplacePurchaseOrderService` · `SupplierPortalOrdersService` · `SupplierPortalEventNotifyService` · `SupplierPortalNotificationsService` · `PathAPurchaseService` · `StockTakeRestockOrderService` · `TenantOrderWorkspace` · `OrderReceivePanel` · `docs/SUPPLIER_PORTAL_README.md` · `backend/docs/SUPPLIER_MARKETPLACE_SCOPE.md` · `docs/NIGHTLY_RESTOCK_DIGEST_SCOPE.md`  
**Product:** Palmart / Kiosk.ke  
**Live surfaces:** [Confirm orders](https://palmart.co.ke/order/receive) · [Supplier orders](https://kiosk.ke/supplier-portal/orders) · [Supplier alerts](https://kiosk.ke/supplier-portal/notifications) · [Public supplier hub](https://kiosk.ke/s/david-mutuku)

---

## Table of Contents

1. [Problem statement](#1-problem-statement)
2. [What already exists](#2-what-already-exists)
3. [Why the current handoff leaks](#3-why-the-current-handoff-leaks)
4. [Core principle — send once, fan out](#4-core-principle--send-once-fan-out)
5. [Locked decisions (V1)](#5-locked-decisions-v1)
6. [Who is “the supplier”](#6-who-is-the-supplier)
7. [The shop flow](#7-the-shop-flow)
8. [The supplier flow](#8-the-supplier-flow)
9. [Sharing the order with the supplier](#9-sharing-the-order-with-the-supplier)
10. [The in-app alert](#10-the-in-app-alert)
11. [Orders inbox UX](#11-orders-inbox-ux)
12. [Shop-side ticket (PDF / WhatsApp)](#12-shop-side-ticket-pdf--whatsapp)
13. [Shop-side feedback loop (V2)](#13-shop-side-feedback-loop-v2)
14. [Data model](#14-data-model)
15. [Surfaces and entry points](#15-surfaces-and-entry-points)
16. [API surface](#16-api-surface)
17. [Files to add and change](#17-files-to-add-and-change)
18. [Build order](#18-build-order)
19. [V1 scope](#19-v1-scope)
20. [V2](#20-v2)
21. [Explicit out of scope (V1)](#21-explicit-out-of-scope-v1)
22. [Measurement](#22-measurement)
23. [Open product decisions](#23-open-product-decisions)
24. [Appendix — flow](#appendix--flow)
25. [Appendix — example](#appendix--example)
26. [Appendix — implementation prompt](#appendix--implementation-prompt)

---

## 1. Problem statement

A shop on Palmart can place a Path A purchase order from Order, Confirm orders, restock convert, or the grocery/cashier Confirm drawer. Today that often produces:

- a `purchase_orders` row with `status = sent`,
- sometimes an SMS/WhatsApp to the supplier’s phone,
- **and nothing the supplier can actually work from in the portal.**

Concrete failure we just hit:

1. Shop sends an order.
2. A message goes out (good — keep that).
3. The supplier opens [https://kiosk.ke/supplier-portal/orders](https://kiosk.ke/supplier-portal/orders) and sees **Take order** (an empty POS pad), not the PO.
4. Alerts (`/supplier-portal/notifications`) either never got a row, or the row’s `Open` link dumps them back on Take order.
5. There is no unread badge on Alerts, so “a full notification that an order has been received” never appears as a product event — only as a chat ping.

The supplier’s job is “an order arrived, here it is, respond or ship.” The portal currently makes them *compose* an order, not *receive* one.

What we want: **send is a handoff, not a status.** The shop’s PO is copied to the supplier on every channel we already own.

---

## 2. What already exists

| Capability | Where | Reuse |
|---|---|---|
| Path A PO create / send | `PathAPurchaseService` · `POST …/purchase-orders/{id}/send` | Status flip only. Does **not** set `sentToSupplierAt`. Do not use this as the portal handoff. |
| Portal send | `MarketplacePurchaseOrderService.sendToSupplier` · `POST …/send-to-supplier` | **The** handoff: `status=sent`, `sentToSupplierAt=now`, line status `pending`, `notifyPoSentAfterCommit`. |
| Portal connected check | `MarketplacePurchaseOrderService.isPortalConnected` | Restock convert already branches on this. Order workspace should too — without swallowing errors. |
| Portal inbox query | `PurchaseOrderRepository.findSupplierPortalInbox` | Requires `sentToSupplierAt IS NOT NULL` and an active marketplace link. |
| Portal orders API | `SupplierPortalOrdersController` `GET/POST /api/v1/supplier-portal/orders` | List / create / respond / ship. Keep. |
| Take-order workspace | `supplier-portal-take-order-workspace.tsx` · `createOrder` auto-accepts | Supplier-originated POs. Keep as a *mode*, not the default landing. |
| Orders page | `frontend/app/(supplier-portal)/supplier-portal/orders/page.tsx` | Client-only `mode: "take" \| "inbox"`. Default `"take"`. No query-string. **This is the UX leak.** |
| In-app notifications | `supplier_portal_notifications` · `SupplierPortalNotificationsService.create` | Types include `supplier.po_sent`. Prefs: `notifyPoInApp` / `notifyPoSms` default **true**. |
| Notify on send | `SupplierPortalEventNotifyService.notifyPoSent` | Title `"New purchase order"`, body `"{shop} sent PO {number}."`, `actionUrl=/supplier-portal/orders`, plus SMS via `CustomerMessageDispatcher`. |
| Alerts UI | `/supplier-portal/notifications` (nav label **Alerts**) | List + prefs. No unread badge. `Open` uses `actionUrl` as-is. |
| Unread count API | `GET /api/v1/supplier-portal/notifications/unread-count` | **Backend exists. Frontend client and shell badge do not.** |
| Shop Order workspace | `tenant-order-workspace.tsx` | After place: `send-to-supplier`, catch → `send`. Silent fallback is a leak. |
| Restock → PO | `StockTakeRestockOrderService.convertToPathAPurchaseOrder` | Portal-connected → `sendToSupplier`; else plain `send`. Correct branch. |
| Shop Confirm / receive | `order-receive-panel.tsx` · `/order/receive` | Confirm → GRN + supplier bill. PDF / WhatsApp share **in progress** (same ticket as `/s/{username}`). |
| Marketplace ticket | `marketplace-order-pdf.ts` (`buildMarketplaceOrderPdf`, `buildWhatsAppOrderUrl`, `orderRef`, `fromName`) | Reuse for shop-side copy. Not a substitute for portal handoff. |
| Supplier phone | `supplier_contacts` + `Supplier.payoutPhone` | Used by shop WhatsApp and by `sendPoSms`. |

**Critical fact:** we already create in-app + SMS notifications on `sendToSupplier`. The product gap is not “invent alerts.” It is (a) not every send path calls `sendToSupplier`, (b) the inbox is hidden behind Take order, (c) the alert is a quiet list row with no badge and a dead deep link.

---

## 3. Why the current handoff leaks

```
TODAY                                         PROPOSED
─────                                         ────────
shop taps Place / Send / Convert              shop taps Place / Send / Convert
   │                                             │
   ├─ create Path A PO                           ├─ create Path A PO
   ├─ send  OR  send-to-supplier (sometimes)     ├─ if portal-connected:
   ├─ maybe SMS                                  │     sendToSupplier (required)
   └─ supplier opens /orders                     │     inbox row + alert + SMS
        sees Take order (empty)                  ├─ else:
        no badge                                 │     send + shop WhatsApp/PDF
                                                 └─ supplier opens /orders?po=
                                                      sees that PO, badge on Alerts
```

Leaks, in order of damage:

1. **`POST …/send` never sets `sentToSupplierAt`.** Inbox query filters it out. A “sent” PO is invisible to the supplier.
2. **Order workspace swallows `send-to-supplier` failure** and falls back to `send`. Connected suppliers can still miss the inbox.
3. **Orders page defaults to Take order.** Inbox is a second mode with no URL. Refresh, notification `Open`, and the live URL all look empty.
4. **Alert `actionUrl` is `/supplier-portal/orders`.** Even if the row exists, Open does not select it.
5. **No unread badge** on Alerts (sidebar, mobile tab, or header). SMS is the only “something happened” signal.
6. **Copy is shop-centric** (`"{shop} sent PO …"`). The supplier asked for “an order has been received.”

---

## 4. Core principle — send once, fan out

One server action owns the handoff: `MarketplacePurchaseOrderService.sendToSupplier`.

After that action commits, the supplier always gets:

| Channel | What they get | Required in V1 |
|---|---|---|
| Portal inbox | The PO, newest first, awaiting response | **Yes** (portal-connected) |
| In-app alert | Unread row + badge: order received, shop, PO, lines, total | **Yes** |
| Deep link | `/supplier-portal/orders?po={id}` opens that PO in inbox | **Yes** |
| SMS / WhatsApp | Existing `sendPoSms` with portal URL including `?po=` | **Yes** (prefs) |
| Shop ticket | PDF + optional shop-initiated WhatsApp on Confirm / Order | **Yes** (shop copy; not the system of record) |

If the supplier is **not** portal-connected, V1 does not invent a portal user. The shop shares the ticket (WhatsApp / PDF) the way `/s/{username}` already does. The PO still exists for Confirm / GRN.

---

## 5. Locked decisions (V1)

| # | Decision |
|---|---|
| D1 | Portal-connected send **must** go through `sendToSupplier`. Plain `send` is only for suppliers with no active marketplace connection. |
| D2 | Order workspace / restock / any future “send this PO” UI must not swallow `send-to-supplier` errors into a silent `send`. If connected and send-to-supplier fails, surface the error; do not hide the PO. |
| D3 | `/supplier-portal/orders` is **inbox-first** when `?po=` or `?inbox=1` is present, and **inbox-first on desktop** whenever there is at least one inbox row. Take order stays a primary action (`New order`), not the only view. |
| D4 | Notification `actionUrl` is `/supplier-portal/orders?po={purchaseOrderId}`. Opening it selects that PO. |
| D5 | Alert title: **“Order received”**. Body includes shop name, PO number, line count, and total when we have it. |
| D6 | Unread count is polled in `SupplierPortalShell` and shown as a badge on **Alerts** (desktop nav + mobile tab). Same API already exists. |
| D7 | SMS/WhatsApp copy keeps working and must include the same `?po=` link. In-app is not a replacement for the ping; it is the full notification. |
| D8 | Shop-side Download PDF / Send on WhatsApp / Copy list on Confirm orders uses the marketplace ticket (`marketplace-order-pdf.ts`), with `orderRef = poNumber` and `fromName = shop`. That is a *copy* for the shop to forward; it does not skip D1. |
| D9 | Supplier-taken orders (`POST /supplier-portal/orders`) already set `sentToSupplierAt`. They stay in the inbox. Do **not** fire “order received” to the supplier who just created it. |
| D10 | No new tables. Reuse `purchase_orders.sent_to_supplier_at`, `supplier_portal_notifications`, existing prefs. |
| D11 | Deep link is the order's primary key (`purchaseOrderId`), not only `poNumber` (numbers can collide across shops). |
| D12 | SMS/WhatsApp bodies never truncate the `?po=` link. Over the 320-char limit, shorten the human prefix (shop name first); the URL is never cut. |
| D13 | One money source of truth on the alert: any shown total is the shop's rounding-aware total (same semantics as the ticket), or omitted. `qty_ordered * unit_estimated_cost` is not a customer-facing total on its own. |
| D14 | No silent double-send: send / share buttons disable while in flight; a re-send against an already-sent PO surfaces "already sent to supplier", never a raw conflict. |
| D15 | Read state is org-level and marked before navigate: one `readAt` shared across the supplier's users; Open marks read first so a failed navigation can't strand the badge. |
| D16 | Notify fan-out failures are observable: `notifyPoSent` failures are logged and counted per `poId`; §22's 100% metrics count *successful* notifies. A connected send that yields zero channels is a counted incident, not a silent catch. |

---

## 6. Who is “the supplier”

| Case | Portal user? | Auto inbox + alert + SMS | Shop PDF / WhatsApp |
|---|---|---|---|
| Local supplier linked to an **active** `marketplace_suppliers` connection | Yes | **Yes** | Yes (optional extra copy) |
| Local supplier, claimed portal, connection inactive / missing | Maybe, but inbox query won’t show the PO | Fix connection, or treat as unconnected | Yes — this is the share |
| Local supplier, never claimed | No | No | **Yes** — only share |
| Supplier-taken order (portal POS) | Yes | Inbox only; no “received” alert | N/A |

`isPortalConnected(businessId, supplierId)` is the gate for D1.

---

## 7. The shop flow

Unchanged jobs: build a cart, place, confirm on arrival.

What changes at **Place / Send / Convert**:

1. Create the Path A PO and lines (as today).
2. If `isPortalConnected` → `sendToSupplier` (must succeed). Toast: `Order {poNumber} sent to {supplier}. They’ll see it in their portal.`
3. Else → `send` + prompt to WhatsApp / download the ticket (Confirm page and Order footer already grow these actions).
4. Confirm orders remains GRN + bill. Share actions sit next to Confirm; they never replace send.

Restock convert already branches on `isPortalConnected`. Keep that. Do not add a second notify path there — `sendToSupplier` is enough.

---

## 8. The supplier flow

1. SMS/WhatsApp: `{shop} sent purchase order {poNumber}. Open https://kiosk.ke/supplier-portal/orders?po={id} to respond.`
2. Open Alerts or the link → unread **Order received** → Open.
3. Land on **Orders inbox** with that PO selected (lines, accept / partial / reject, then ship).
4. Badge on Alerts clears as they mark read (opening the PO from the alert marks that notification read).

Take order remains available as **New order** for when the supplier is physically at the shop.

---

## 9. Sharing the order with the supplier

“Shared with the supplier” means **the system delivered the order to them**, not only that the shop has a PDF.

### 9.1 Automatic (portal-connected) — required

Triggered only from `sendToSupplier` after commit (already `notifyPoSentAfterCommit`):

- Inbox row (already, once `sentToSupplierAt` is set).
- In-app notification (enrich copy + `actionUrl`, D4–D5).
- SMS/WhatsApp (enrich URL with `?po=`, D7).

Do not add a second dispatcher from the frontend. If the shop taps WhatsApp on Confirm, that is an extra human forward, not the automatic share.

### 9.2 Shop-initiated ticket — required for unconnected, optional extra for connected

Confirm orders (and later Order workspace) expose the same three actions as `/s/{username}`:

- Send on WhatsApp (`wa.me` to supplier contact / payout phone)
- Download PDF
- Copy list

Heading includes PO number and shop name (`orderRef`, `fromName` already on `buildMarketplaceOrderText`).

### 9.3 What we do **not** share automatically in V1

- PDF file over WhatsApp Business API (no media template in V1).
- Email.
- Push via Expo / web push to the supplier app (no supplier native app).

---

## 10. The in-app alert

This is the “full notification” the supplier asked for. SMS is a ping; Alerts is the record.

| Field | V1 value |
|---|---|
| `type` | `supplier.po_sent` (existing) |
| `title` | `Order received` |
| `body` | `{shopName} sent {poNumber} · {n} lines · {total}` (total is the shop's rounding-aware total or omitted, D13; never block send on it) |
| `actionUrl` | `/supplier-portal/orders?po={purchaseOrderId}` |
| Prefs | `notifyPoInApp` / `notifyPoSms` (existing, default on) |

**Badge**

- `SupplierPortalShell` polls `GET …/notifications/unread-count` on mount and every ~30s while visible.
- Show a numeric badge on Alerts (desktop Track nav + mobile tab). Cap display at `9+`.
- Clicking Alerts does not auto mark-all-read.

**Optional toast (V1 if cheap):** if the supplier is already in the portal (same JWT session), a sonner toast “Order received from {shop}” with an Open action is allowed. Do not build a websocket for V1 — polling is enough.

**Mark read:** tapping Open marks the notification read *before* navigating — a failed navigation must not strand an unread badge (D15). Read state is org-level: one `readAt` on the row is shared across all of the supplier's users (matches the existing `markRead(marketplaceSupplierId, id)` API), so whoever opens first clears the badge for the team. Opening the PO from inbox does not have to mark it (avoid coupling).

---

## 11. Orders inbox UX

Today `PageMode = "take" | "inbox"` defaults to `"take"`. Change:

| Arrival | View |
|---|---|
| `/supplier-portal/orders` with **no** inbox rows | Take order (current empty state is fine) |
| `/supplier-portal/orders` **with** inbox rows | **Inbox** (list + detail). Header action: New order → take |
| `/supplier-portal/orders?inbox=1` | Inbox even if empty |
| `/supplier-portal/orders?po={id}` | Inbox, `loadOrders`, `openOrder(id)` |
| After take-order `onOrderCreated` | Inbox + that PO (already) |

Keep Take order as the POS pad. Do not merge take-order and inbox into one cluttered screen.

List rows already show `poNumber · status` and “awaiting”. Add a clearer **Received** / **Awaiting you** chip for `!supplierResponseAt` so a newly shared order is obvious.

---

## 12. Shop-side ticket (PDF / WhatsApp)

In progress on `OrderReceivePanel`. V1 must finish and stay consistent:

- Full PO lines (ordered qty), not only open/remaining.
- Filename `order-{poNumber}-{supplier-slug}.pdf`.
- WhatsApp uses supplier primary contact phone, else payout phone; if none, share/download PDF and say so.
- Same actions in the cashier Confirm drawer (embedded `OrderReceivePanel`).
- Order workspace (place) should expose Download PDF the same way as Confirm, in a follow-up slice if timeboxed — Confirm is the page the user named.

---

## 13. Shop-side feedback loop (V2; V1-lite where free)

The supplier's response is the shop's event. Today the shop learns nothing until they open Confirm. None of this is required for the V1 handoff — it defines the direction so V2 starts with the loop this scope opens, not with websockets.

| Signal | V1-lite (free if the DTO already carries it) | V2 |
|---|---|---|
| Supplier responded (accepted / partial / rejected) | Surface `supplier_response_at` and per-line status on the shop PO list / Confirm detail | Shop notification (existing tenant `NotificationService` pattern): `{supplier} responded to PO-{n} · 10 of 12 lines accepted` |
| Supplier shipped / delivered | Existing delivery status on Confirm | Shop notification on ship; "awaiting receipt" surfaced on Confirm |
| Supplier saw the order | — | `purchase_orders.first_opened_at` (new nullable column, set when the supplier opens the `?po=` detail or inbox row); shop sees "Seen by {supplier} · {time}" |
| Shop wants a nudge | — | "Remind supplier" on the shop PO — re-fires the SMS with the same `?po=` link |

Data: `supplier_response_at` already exists; `first_opened_at` is a column, not a table (D10 holds for V1; V2 adds the column).

---

## 14. Data model

**No schema change.**

| Field | Role |
|---|---|
| `purchase_orders.sent_to_supplier_at` | Inbox membership |
| `purchase_orders.supplier_response_at` | Awaiting vs responded |
| `purchase_orders.source` | `marketplace` / `restock` / `manual` — unchanged |
| `supplier_portal_notifications` | Alert rows |
| `supplier_portal_notification_prefs` | In-app / SMS toggles |

There is no stored total on `purchase_orders` — it is computed from lines (and rounded on the shop side). For the alert total, compute with the same line-total semantics as the shop ticket (rounding-aware) or omit it; never show a raw `qty_ordered * unit_estimated_cost` that can contradict the ticket (D13). Skip if lines fail to load; never fail the send.

---

## 15. Surfaces and entry points

| Surface | Change |
|---|---|
| Shop Order (`/order`) | Fail loud if connected and send-to-supplier fails. Toast that it was sent to the portal. |
| Shop Confirm (`/order/receive`) | PDF / WhatsApp / copy (in progress). |
| Cashier Confirm drawer | Same panel. |
| Restock convert | Keep portal branch; inherit richer notify from `sendToSupplier`. |
| Supplier Orders | Inbox-first + `?po=` deep link. |
| Supplier Alerts | Badge, better copy, Open deep-links. |
| Supplier shell | Unread poll. |
| SMS / WhatsApp | URL with `?po=`. |

---

## 16. API surface

No new endpoints required.

| Method | Path | Note |
|---|---|---|
| `POST` | `/api/v1/purchasing/path-a/purchase-orders/{id}/send-to-supplier` | Handoff. Enrich notify only. |
| `POST` | `/api/v1/purchasing/path-a/purchase-orders/{id}/send` | Unconnected only. |
| `GET` | `/api/v1/supplier-portal/orders` | Unchanged query. |
| `GET` | `/api/v1/supplier-portal/notifications` | Unchanged. |
| `GET` | `/api/v1/supplier-portal/notifications/unread-count` | Wire in shell. |
| `POST` | `/api/v1/supplier-portal/notifications/{id}/read` | Call from Alerts Open. |

Optional (only if notify needs total and we refuse to load lines in the notify service): add `lineCount` / `estimatedTotal` to `notifyPoSentAfterCommit`. Prefer computing inside `notifyPoSent`.

---

## 17. Files to add and change

### Backend

| File | Change |
|---|---|
| `SupplierPortalEventNotifyService.java` | Title/body D5; `actionUrl` D4; SMS URL `?po=`; include line count / total when cheap. |
| `MarketplacePurchaseOrderService.java` | Pass `purchaseOrderId` (already) — maybe line count into notify. No new service. |
| `SupplierPortalOrdersService.createOrder` | Confirm it does **not** call `notifyPoSent` (D9). |
| Tests | `SupplierPortalNotifyServiceTest` / new notify tests: copy, URL, no notify on take-order. |

### Frontend — supplier portal

| File | Change |
|---|---|
| `lib/marketplace-api.ts` | `fetchSupplierPortalUnreadCount()`. |
| `supplier-portal-shell.tsx` | Poll unread; badge on Alerts. |
| `supplier-portal/orders/page.tsx` | Read `po` / `inbox` search params; default mode D3; open PO. |
| `supplier-portal/notifications/page.tsx` | Open marks read; copy already from API. |

### Frontend — shop

| File | Change |
|---|---|
| `order-receive-panel.tsx` | Finish ticket actions (in progress). |
| `tenant-order-workspace.tsx` | Stop silent fallback; toast D2. Optionally Download PDF. |

Do **not** duplicate notify from the client.

---

## 18. Build order

1. **Deep link + inbox-first** — orders page reads `?po=` / `?inbox=1`; default inbox when rows exist. Unblocks “I can’t find it.”
2. **Alert copy + actionUrl** — `notifyPoSent` D4–D5, SMS URL with a truncation-safe link (D12). Unblocks "full notification."
3. **Unread badge** — shell poll. Makes Alerts a live surface.
4. **Send path honesty** — Order workspace (and any other silent fallback) respects D1–D2. Unblocks “shared with the supplier.”
5. **Shop ticket** — finish Confirm PDF / WhatsApp / copy (in progress). Unconnected suppliers still get a share.
6. **Tests + verify** — connected send → inbox row + notification + SMS body (URL never truncated); `?po=` opens detail; take-order does not alert; unconnected send does not claim portal delivery.

---

## 19. V1 scope

- One handoff function for portal-connected sends.
- Inbox visible; deep link works.
- Order received alert + badge.
- SMS/WhatsApp URL matches the deep link and survives truncation (D12).
- Shop can download/share the same ticket as the public supplier hub.
- Honest errors when a connected send fails.

---

## 20. V2

Feedback loop first (§13 — it closes the loop this scope opens):
- Shop notification when the supplier responds (accepted / partial / rejected) and ships.
- "Seen by {supplier}" via `first_opened_at` surfaced on the shop PO.
- Shop "Remind supplier" — re-fires the SMS with the same `?po=` link.
- Supplier auto-nudge when a PO has awaited a response for N hours.

Then the rest:
- WebSocket / live toast without polling.
- WhatsApp Business media: attach the PDF.
- Email copy of the PO.
- Supplier push (if/when a supplier app exists).
- Auto-open WhatsApp from the shop on Place (not only Confirm) with the saved PO number.
- Order workspace Download PDF (if not pulled into V1).
- Digest: "3 shops sent orders today."
- Notify retry / dead-letter so fan-out failures (D16) can self-heal.

---

## 21. Explicit out of scope (V1)

- Creating portal users for unconnected suppliers.
- Changing Path A / GRN / invoice posting.
- Two-way WhatsApp (supplier replies in Meta to accept lines).
- Replacing Take order.
- Storefront **shopper** WhatsApp checkout (`docs/WHATSAPP_CHECKOUT_SCOPE.md`) — different persona (customer → shop). This scope is shop → wholesale supplier.
- Redesigning Alerts prefs UI beyond copy that already lists "New PO — in-app / SMS."
- Shop-side feedback loop (response notifications, seen, remind) — §13, V2.

---

## 22. Measurement

| Signal | Success |
|---|---|
| Connected send → inbox row within 1s of commit | 100% of successful `sendToSupplier` |
| Notification row with `?po=` | 100% of successful notify calls (D16) when `notifyPoInApp` |
| Supplier opens `?po=` and sees that PO | Manual + one UI test if we have portal test infra |
| Silent `send` fallback on connected supplier | **Zero** |
| Alerts badge matches unread-count | Visual check |
| SMS body keeps the `?po=` link intact (D12) | Unit test + spot check |

---

## 23. Open product decisions

| # | Question | Default if unset |
|---|---|---|
| P1 | Inbox-first even when empty? | No — Take order if inbox length 0 (D3). |
| P2 | Mark notification read when opening the PO from inbox (not from Alerts)? | No. |
| P3 | Include money total on the SMS? | No — URL + PO number; in-app has total. |
| P4 | Shop Place order auto-opens WhatsApp after save (Order workspace already can)? | Keep current Save & WhatsApp; do not force it. Automatic share is portal + SMS. |

---

## Appendix — flow

```
Shop Place / Restock convert / Send to supplier
        │
        ▼
isPortalConnected?
   │ yes                         │ no
   ▼                             ▼
sendToSupplier                 send (status only)
   │                             │
   ├─ sentToSupplierAt           └─ shop PDF / WhatsApp ticket
   ├─ inbox visible
   ├─ notification “Order received”
   └─ SMS/WA with ?po=
        │
        ▼
Supplier Alerts badge → Open → /orders?po= → respond / ship
```

---

## Appendix — example

Shop **Palmart** sends PO **PO-1042** (12 lines, Ksh 18,400) to **David Mutuku** (portal claimed, connection active).

1. `sendToSupplier` commits.
2. David’s SMS: `Palmart sent purchase order PO-1042. Open https://kiosk.ke/supplier-portal/orders?po=8f2c… to respond.`
3. Alerts badge shows `1`. Row: **Order received** — `Palmart sent PO-1042 · 12 lines · Ksh 18,400`.
4. Open → inbox, PO-1042 selected, lines awaiting accept.
5. Shop can still download `order-PO-1042-david-mutuku.pdf` or forward WhatsApp from Confirm.

If David had no portal connection, steps 2–4 do not happen. Palmart forwards the ticket from Confirm. The PO still shows on `/order/receive` for GRN.

---

## Appendix — implementation prompt

Paste the block below into a new agent session. The agent must treat this file as the spec; do not invent a parallel handoff.

```text
Implement docs/SUPPLIER_ORDER_HANDOFF_SCOPE.md (Supplier Order Handoff V1) in Palmart / Kiosk.ke.

Read that file first. Locked decisions D1–D16 are not optional. Do not add tables, WhatsApp Business media, or shopper checkout.

## Outcome

When a shop sends a Path A purchase order to a portal-connected supplier:
1. The PO appears in the supplier portal inbox (sentToSupplierAt set via sendToSupplier).
2. The supplier gets a full in-app alert: title "Order received", body with shop, PO number, line count, total if cheap, actionUrl `/supplier-portal/orders?po={purchaseOrderId}`.
3. Existing SMS/WhatsApp ping is kept, the URL includes the same `?po=`, and the link is never truncated (D12).
4. `/supplier-portal/orders?po={id}` opens inbox and that PO. `/supplier-portal/orders` is inbox-first when inbox has rows; Take order remains "New order".
5. Alerts (nav + mobile tab) show an unread badge from GET /api/v1/supplier-portal/notifications/unread-count.
6. Shop Confirm orders (`order-receive-panel.tsx`) can Download PDF, Send on WhatsApp, and Copy list using marketplace-order-pdf.ts (orderRef + fromName). That is a copy, not a substitute for sendToSupplier.
7. Tenant Order workspace must NOT catch send-to-supplier failure and silently POST /send for a portal-connected supplier. Surface the error. Unconnected suppliers may still use /send.
8. Supplier-taken orders (POST /supplier-portal/orders) must NOT fire "Order received" to the supplier who created them.

## Current leaks to fix (do not "rebuild notifications")

- PathAPurchaseService.sendPurchaseOrder does not set sentToSupplierAt → invisible to findSupplierPortalInbox.
- tenant-order-workspace.tsx: postPathAPurchaseOrderSendToSupplier then catch → postPathAPurchaseOrderSend.
- orders/page.tsx default mode "take"; no searchParams; notification Open goes to Take order.
- notifyPoSent title/body/actionUrl are weak; SMS URL has no ?po=.
- Unread-count API exists; shell has no client and no badge.
- sendPoSms truncates at 320 chars with the URL appended last — can cut the `?po=` link (D12).
- fetchSupplierPortalUnreadCount does not exist in marketplace-api.ts.

## Key files

Backend: MarketplacePurchaseOrderService, SupplierPortalEventNotifyService, SupplierPortalOrdersService, PurchaseOrderRepository.findSupplierPortalInbox, SupplierPortalNotificationsController.

Frontend: supplier-portal/orders/page.tsx, supplier-portal-shell.tsx, supplier-portal/notifications/page.tsx, lib/marketplace-api.ts, order-receive-panel.tsx, tenant-order-workspace.tsx, marketplace-order-pdf.ts.

Reuse sendToSupplier + notifyPoSentAfterCommit. Enrich notify; do not add a second dispatcher.

## Build order (from the scope)

1. Deep link + inbox-first on orders page.
2. Alert copy + actionUrl + SMS URL (truncation-safe).
3. Unread badge in shell.
4. Send-path honesty in Order workspace.
5. Finish shop ticket on Confirm if not already complete.
6. Tests for notify copy/URL (incl. truncation safety) and no notify on take-order.

Verify: connected send → inbox + notification + SMS URL; ?po= opens detail; take-order no alert; unconnected send does not claim portal delivery. Follow existing UI tokens on supplier portal and Confirm orders. Do not drive-by refactor.
```
