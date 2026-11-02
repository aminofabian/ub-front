# Dashboard payload trim — bell + hub tape

**When:** 27 October 2026
**Follows:** [NETWORK_AUDIT_BUSINESS_2026-10-20.md](./NETWORK_AUDIT_BUSINESS_2026-10-20.md) §1.2 and §2.3

The audit's two heaviest decoded responses were the staff inbox and the hub's
live-activity tape. Both were fetching more fields than the screen renders. This
pass adds a projection for each, plus the one remaining unbounded caller.

## What changed

### 1. `GET /api/v1/notifications/bell`

New lean list for the bell and the websocket REST fallback:

| field | |
| --- | --- |
| `id`, `type`, `priority`, `readAt`, `createdAt` | row identity / state |
| `title`, `body`, `actionUrl` | resolved copy |

No `payloadJson`. Copy is resolved by `NotificationPresenter`, which was
extracted from `RealtimeBridge` so the websocket frame and the REST row can
never disagree — previously the bridge had a private copy of the title map and
the REST list shipped raw payloads for the client to re-derive the same thing.

The full `GET /api/v1/notifications` is unchanged for callers that render a
row's details.

### 2. `GET /api/v1/sales/intelligence/recent-sales/tape`

Same window and filters as `recent-sales`, projected to the nine fields the tape
paints (`saleId`, `soldAt`, `cashierName`, `paymentMethod`, `paymentMethods`,
`itemName`, `quantity`, `lineTotal`, `profit`, `status`).

Dropped: customer identity (name, id, number, masked hint, phone-verified),
receipt number, SKU, barcode, unit price, channel, M-Pesa verification. The hub
groups lines into sales and shows cashier, tender and total; none of those
fields were read.

`lib/sale-transactions.ts` now takes a structural `SaleLineLike`, so the full
board keeps `RecentSaleRow` typing while the tape groups its lean rows through
the same function.

### 3. Websocket REST fallback was still unbounded

`lib/realtime.ts` polled `GET /api/v1/notifications` with **no limit** every
30 s whenever the socket was down — the one caller the 20 Oct limit never
reached. It now reads `/bell?limit=20`: the fallback only emits rows that
arrived since the last poll.

## What was checked, and what was not changed

- `/api/v1/purchasing/supplies` **already** returns a header-only DTO
  (`PathBSupplyListRow` has no line items) and already honours `limit`. Its
  193 KB was row count, fixed by the existing 120-row cap. No new endpoint.
- `recent-sales` and `supplies` caps are enforced server-side
  (`SalesIntelligenceController`, `PurchasingSuppliesController`), not just by
  the caller.

## Still open (from the same audit)

1. `/expenses` fan-out: the same range fetched three ways (unfiltered 200-row
   list, `source=drawer`, `source=recurring`).
2. `PayrollAutomationPanel` mounted twice in `payroll-run-theatre.tsx`.
3. `businesses/me` refetched on Settings / Branding / Design despite the
   dashboard provider already holding it.
4. The committed `frontend/lib/generated/phase-1-api.ts` is ~2,900 lines behind
   the spec; regenerating it is a separate, noisy change.

## Verification

```
cd backend && ./gradlew compileJava compileTestJava
cd backend && ./gradlew test --tests 'zelisline.ub.notifications.application.NotificationPresenterTest'
cd backend && ./gradlew test --tests 'zelisline.ub.platform.web.OpenApiExportIT' -DexportOpenapi=true
cd frontend && npx tsc --noEmit
cd frontend && bun test
```

Spec regenerated: `docs/openapi/phase-1.yaml` now carries both paths and the
`NotificationBellRow` / `RecentSaleTapeRow` schemas.

`bun test` has 12 pre-existing failures (shop-mail colours, shopper PWA host,
inventory-access links, apex origin, ops log dedupe, 401 backoff flake) that are
unrelated to these files; the suites covering the changed modules pass.
