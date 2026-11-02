# Network audit — palmart.co.ke dashboard

**When:** 20 October 2026, signed-in owner session on the live shop.  
**Start:** [https://palmart.co.ke/business](https://palmart.co.ke/business)  
**How:** Chrome network timing on a fresh load of Business, then client-side visits through the Business menu and the main dashboard destinations. Counts below are what the browser actually sent.

This is a cleanup list. The same shell runs on every page, so the first section is the tax you pay on all of them. Later sections are extra waste on a specific screen.

---

## What to fix first

| Priority | What | Live evidence | Why it is waste |
| --- | --- | --- | --- |
| 1 | Support unread polls | **14 + 14** on first paint, **7 + 7** on every later navigation | Seven components each fetch both unread endpoints, and the first paint runs that twice |
| 2 | Staff notifications | **~374 KB decoded / ~41 KB on the wire**, again on every navigation | Full inbox download just to fill a bell, restarted because the effect depends on the route |
| 3 | Realtime reconnect | `/api/v1/realtime/tickets` on every navigation | The socket listener is torn down and opened again when the path changes |
| 4 | Business hub cards mounted more than once | Tills **×4**, airtime and M-Pesa gateways **×2** | Phone, tablet, and desktop copies are all mounted, and the till card fetches twice by itself |
| 5 | Heavy hub payloads | Recent sales **~286 KB** decoded, supplies **~193 KB** decoded | One screen pulls a week of sales and the whole supply list |

After those, the per-page duplicates (payroll, sales, products, customers, support chat) are smaller but real.

---

## 1. Shell tax — every dashboard page

A cold load of `/business` made **250** resource requests (**135** fetches). About **195 KB** transferred, **7.4 MB** decoded. Most of the decoded weight is a handful of JSON responses. Moving to the next page does not drop the shell: client navigations still fired the unread pair, the full notification list, a realtime ticket, and often a client-version check.

### 1.1 Support unread — the loudest duplicate

On the fresh `/business` load:

- `GET /api/v1/support/unread-count` — **24** times over ~30s (14 in the opening burst, then more on the 15s timer)
- `GET /api/v1/support/storefront/unread-count` — **23** times in the same window

Each response is ~11 bytes. The cost is the round trip, times two endpoints, times every subscriber.

A single client navigation (measured with a fetch hook, not the resource-timing buffer) fires **7** of each endpoint. A fresh document fires **14** of each. That matches the code shape on the live bundle:

- Seven mounted callers: `AppShell`, the desktop `NotificationBell`, the phone bell, the tablet fascia bell, `SupportLauncher`, `SupportUnreadWatcher`, and `NotificationsDrawer`. The phone and tablet bells are CSS-hidden (`sm:hidden` / `hidden sm:block`, and the tablet chrome is `2xl:hidden`) but they still mount and poll.
- Each caller used to run its own baseline fetch **and** a fetch whenever `pathname` changes, so the first paint is 7 × 2.
- Each caller also `setInterval`s every **15s**.

The workspace already has the intended fix: `SupportUnreadProvider` in `frontend/app/(dashboard)/layout.tsx`, with `useSupportUnread` only reading context. **That build is not what palmart.co.ke is serving.** The live site still behaves like the old per-component hook.

Even after that provider ships, two things in it will still waste a request:

- The mount effect and the `pathname` effect both call `refresh()` on first paint, so you still get two pairs at startup.
- `refresh()` runs on **every** route change. It only needs to run when entering or leaving `/support` (and on the 15s fallback).

`refresh()` also does not share an in-flight promise, so a pathname change that lands on the 15s tick sends the pair twice.

### 1.2 Notifications inbox downloaded on every page

`GET /api/v1/notifications` on the Business load: **382,546 bytes decoded**, **41,684 bytes** transferred, ~1.1s. The same call fired again on `/business/settings`, on `/business/branding`, and on every client navigation after that (themes, mobile, payments, users, inbox, and the rest).

`RealtimeProvider` hydrates the bell in an effect whose dependency list includes `pathname` (`frontend/components/realtime-provider.tsx`). Changing page refetches the whole inbox and then keeps 50 rows. The REST fallback in `frontend/lib/realtime.ts` also downloads the full list every 30s and throws away history after noting the newest id.

`payloadJson` on each row is why the body is hundreds of kilobytes. The bell needs a short list (id, type, read flag, title), not the full payload of every historical notification.

### 1.3 Realtime socket restarted on navigation

The same provider effect registers the listener and calls `client.connect()`, and it depends on `pathname`. Every route change unregisters and connects again, which shows up as another `GET /api/v1/realtime/tickets`. The login-page guard does not need `pathname` in that dependency list.

### 1.4 Billing status, three times

Cold load: `GET /api/v1/subscription/billing-status` **×3** (~700 bytes decoded each).

Three independent callers, and only the wall shares an in-flight promise:

- `SubscriptionRenewalWall` (`shareInflight`)
- `SubscriptionGraceBanner` (plain fetch)
- `SubscriptionPlanFitBanner` (plain fetch)

One shared read on login is enough until the status actually changes.

### 1.5 Header chips mounted three times

`AppShell` renders `KioskPayHeaderBalance` and `SmsCreditsHeader` for desktop, again inside the tablet header, and again in the More-sheet wallet. CSS hides two of them. Live result on `/business`:

- `GET /api/v1/payments/kiosk-pay` **×2**
- `GET /api/v1/sms-credits/balance` **×2**

`useSmsCreditBalance` fetches on mount and again on `visibilitychange`. It is not a shared store, so each mounted chip is its own subscriber. Render one chip, or one context.

### 1.6 Catalog counts for onboarding, on a shop that is long past onboarding

`GET /api/v1/items/row-type-counts` **×2** on Business and again on Branding.

Both of these call `fetchCatalogListStats` while the dashboard is mounted:

- `OnboardingQuestionnaireProvider`
- `NewMerchantGuideDrawer`

That is a catalog aggregation on every cold load of every page, including Settings.

### 1.7 Till-print polling on pages that are not the till

`CashierTillPrintListener` is mounted for the whole dashboard and polls `GET /api/v1/purchasing/till-prints/pending` every **5 seconds** (immediate call, then the interval). The Business load recorded **7** of these in half a minute. Each body is empty (`decoded` 2 bytes). Poll only while a till is actually registered and the tab is visible, or rely on the socket the listener already subscribes to.

### 1.8 Client version

`GET /api/client-version` on load and again around 30s (`stale-client.ts`). Fine as a single poll. It showed up twice on some navigations when the interval overlapped the route change.

### 1.9 Route guide on every screen, with one label for every Business page

Every navigation calls `GET /api/v1/ai/route-guide`. `sokomind.ts` maps **every** path under `/business` to `surface=business.hub`, so Themes, Domains, Logs, Import, Payroll-adjacent billing, and Pocketing all ask for the hub guide. The `route` query is specific; the surface is not. Cache it per route and stop treating settings screens as the hub.

### 1.10 Link prefetch, twice

Next prefetched the visible shell links twice, with two different `_rsc` cache keys. On the Business load that included `/analytics`, `/products`, `/users`, `/inventory/stock`, `/cashier`, `/store`, `/business/configuration`, `/payments/settings`, `/business/settings`. Each pair is ~2.5 KB on the wire and ~5 KB decoded. Small next to the JSON above, but it is a duplicate on every cold load. Several of the second-wave prefetches took **4+ seconds**.

### 1.11 Analytics

Two `google-analytics.com/g/collect` beacons on load (one config, one page view). Expected, not a bug.

---

## 2. Business hub (`/business`) — page-specific waste

`/overview` client-navigates and lands back on `/business`, and the same duplicates appear again. These are not just a cold-load artifact.

### 2.1 Trusted tills fetched four times

`GET /api/v1/till-devices?branchId=…` **×4**  
`GET /api/v1/till-access-requests?…&status=pending` **×4**

`ManageTillsHubCard` is rendered up to three times in `business-hub-workspace.tsx`: the compact card in the main column, the mobile rail (`xl:hidden`), and the desktop aside (`hidden xl:flex`). Hidden layouts still mount.

Each instance also fetches twice on mount. In `manage-tills-hub-card.tsx` both effects call `refreshCounts()`: one on mount, and a second that runs whenever the drawer is closed. The drawer starts closed, so the second effect runs on mount too. Two mounted cards × two effects = four requests. `ManageTillsDrawer` only fetches when opened, so it is not the extra source.

Keep a single card in the tree. Delete the “refresh when closed” effect.

### 2.2 Airtime and M-Pesa cards, twice

Same responsive double-mount (`AirtimeFloatHubCard` and `ReceiveMpesaSetupCard` in the compact column and in a rail):

- `GET /api/v1/airtime/settings` **×2**
- `GET /api/v1/airtime/orders?limit=5` **×2**
- `GET /api/v1/payments/gateways` **×2**
- `GET /api/v1/payments/gateways/mpesa-custody` **×2**

`/payments/settings` itself fetches each of the gateway endpoints **once**. The duplicate is the hub rendering two copies.

### 2.3 Payloads that are too big for a summary card

From the fresh Business load (decoded / transferred):

| Request | Decoded | On the wire | Note |
| --- | --- | --- | --- |
| `/api/v1/notifications` | 374 KB | 41 KB | Shell. See §1.2 |
| `/api/v1/sales/intelligence/recent-sales?from=…&to=…` (8 days) | 286 KB | 39 KB | Hub “live activity” |
| `/api/v1/purchasing/supplies?branchId=…` | 193 KB | 27 KB | Supplier-bill strip |
| `/api/v1/web-orders?page=0&size=50` | 22 KB | 3.4 KB | Web-order strip |
| `/api/v1/inventory/supply-batches/analytics/dashboard` | 15 KB | 4 KB | Stock-value area |

The hub then fans out one drawouts call per open shift (three of them on this visit). A summary endpoint, or `size` capped to the rows the card shows, would replace the 286 KB and 193 KB downloads.

`/api/v1/finance/pulse` is called for today **and** yesterday. That pair is intentional (comparison), not a duplicate.

`/api/v1/businesses/me` ran once on the hub and **three times** on a cold `/business/settings` load. Settings, themes, and design each fetch the business again even though the dashboard provider already has it.

---

## 3. Business menu, page by page

Shell calls from §1 happened on all of these and are not repeated in the table. “Page calls” are the extra API requests after the shell.

| Page | Page calls | Cleanup |
| --- | --- | --- |
| `/business` | Hub set in §2 | Tills ×4, airtime/gateways ×2, oversized sales and supplies |
| `/business/settings` | `businesses/me` **×3**, `row-type-counts` **×2** | Use the business already in the dashboard provider. Drop the catalog-count fetch (§1.6) |
| `/business/configuration` | `businesses/me`, `branches` | Same business refetch. Branches are already loaded by the shell |
| `/business/branding` | `businesses/me` **×2**, `row-type-counts` **×2**, plus `GET /api/v1/items?page=0&size=24&catalogScope=SKUS_ONLY` (25 KB decoded) | Branding should not need a catalog page or row-type counts. The items call looks like the themes try-on query running on the wrong screen, or a shared preview |
| `/business/themes` | `businesses/me`, items page size 24 (`SKUS_ONLY`), `GET /api/v1/public/businesses/test/catalog/types` | Try-on preview (`storefront-themes-studio.tsx`) loads 24 real SKUs to paint theme cards. The public catalog call used slug `test` — confirm that is this shop’s slug and not a placeholder that survived into production |
| `/business/mobile` | `businesses/me/mobile`, `businesses/me/mobile/publish` | Two endpoints, not duplicates. Fine |
| `/business/domains` | `domains`, `domain-orders` | Fine |
| `/business/promotions` | `notification-campaigns`, `branches` | Branches again, already in the shell |
| `/business/logs` | `audit-events/summary`, `audit-events?page=0&size=50` | Fine |
| `/business/import` | none until the user acts | Fine |
| `/business/design` | `businesses/me` | Another refetch of the business |
| `/business/pocketing` | profit-pocket calendar for the month | Fine |
| `/business/billing/renew` | `subscription/plans`, renewal quote | Fine. Shell also sent `billing-status` and `/api/v1/me` again |
| `/business/integrations/pickup-mtaani` | `integrations/pickup-mtaani` | Fine |
| `/payments/settings` | gateways, gateways/available, mpesa-custody, each **once** | Clean page. Shell still doubled `sms-credits/balance` and `client-version` while landing here |
| `/integrations/easytax` | easytax, easytax branch, branches | Fine |
| `/branches` | `branches?page=0&size=100` | The shell already loaded this list |
| `/users` | users, roles, branches, staff profiles | Fine aside from the shell |
| `/payroll` | summary, runs, and `GET /api/v1/payroll/automation` **×2** | `PayrollAutomationPanel` is mounted twice in `payroll-run-theatre.tsx` (main and the other layout). One fetch |
| `/my-profile` | `payroll/me`, `me/oauth` | Fine |
| `/inbox` | conversations, inbox status, quick replies | Fine |
| `/inbox/settings` | agents, ai-settings, knowledge | Fine |
| `/inbox/automations` | automations, automation runs | Fine |
| `/inbox/broadcasts` | broadcasts | Fine |
| `/messages` | `contact-messages?page=0&size=50` | Fine |
| `/support` | `GET /api/v1/support/conversation` **×7** and `POST /api/v1/support/conversation/read` **×7** on one visit | See §4.6 |

---

## 4. Main destinations linked from the hub

### 4.1 Products — unassigned aisle count twice

`GET /api/v1/aisles/unassigned-count` **×2** on `/products`.

Callers that can both be mounted: `products-workspace.tsx` and `use-department-aisles.ts`. Share one result.

### 4.2 Buying (`/order`) — four status queries

Four separate calls, same resource, different `status`:

- `/api/v1/purchasing/path-a/purchase-orders?status=draft`
- `…?status=sent`
- `…?status=received`
- `…?status=cancelled`

Plus supplies, intelligence dashboard, suppliers, and till-print cashiers. Not byte-identical duplicates, but four round trips for one board. One list (or one counts endpoint) covers it.

### 4.3 Stock — clean

`/inventory/stock` fetched aisles, branches, categories, item types, a page of items, price-status counts, supply-batch analytics, and the count-cycle home. No repeated URL on this visit.

### 4.4 Store — clean

Five calls: store items, settings, movements, and one item plus its pack options. No repeats.

### 4.5 Shifts — overlapping lists

On one open of `/shifts`:

- `GET /api/v1/shifts?branchId=…&page=0&size=50`
- `GET /api/v1/shifts?page=0&size=50` (same page, no branch)
- `GET /api/v1/shifts?branchId=…&status=open&page=0&size=20`
- `GET /api/v1/shifts/current` for **two** branch ids
- one shift-by-id

The unscoped list and the branch list overlap. `current` for a second branch is worth checking: the shell is on a single selected branch.

### 4.6 Sales — the same report with and without a branch

`/sales` fired both of these pairs:

- `recent-sales?from=today&to=today`
- `recent-sales?from=today&to=today&branchId=…`
- `recent-web-order-lines` the same way, with and without `branchId`

`fetchMergedSalesActivity` sends one pair per call. Two calls means the screen fetched once before the branch id existed and again after it did, or two widgets asked independently. Wait for the branch, then fetch once. The no-branch call is the large one (the hub’s 8-day version was 286 KB decoded).

### 4.7 Customers — same tab fetched twice, then again at another page size

For the opened customer:

- `tab-purchases?offset=0&limit=40` **×2**
- `tab-purchases?offset=0&limit=100` **×1**

Plus the customer list and a 500-row spend report (`customer-spend?…&limit=500`). The limit-40 pair is a duplicate. The limit-100 call covers the same first page.

### 4.8 Credit — clean on this visit

Activity summary, outstanding tabs, one statement, one tab page, one payment ledger. No repeated URL.

### 4.9 Expenses — a wide fan-out

`/expenses` issued about **36** API calls in one open. The ones that overlap:

- `GET /api/v1/finance/expenses?from=…&to=…&page=0&size=200`
- the same query with `source=drawer`
- the same query with `source=recurring`

If the unfiltered page already includes `source`, the two filtered lists are extra 200-row downloads. There is also a summary and a P&L for the same range, which is reasonable if they are aggregates rather than copies of the list.

### 4.10 Support chat marks itself read on a loop

`SupportChat` loads the thread on mount (`loadThread`) and then every **5 seconds**, and every successful load calls `markSupportConversationRead()`. One visit to `/support` produced **7** conversation GETs and **7** read POSTs. The 5s poll explains a repeat; it does not by itself explain seven. Combined with the realtime client reconnecting on pathname change (§1.3), the thread is being opened far more than once per visit.

Poll on an interval only while the socket is disconnected, and mark read once when new messages actually arrive.

### 4.11 Cashier and Analytics — do not treat those counts as clean

The crawl reached `/cashier` and recorded no fetches before moving on, then `/analytics` recorded an inflated shell count (49) and duplicates of branches, categories, credit activity, and outstanding tabs. Those analytics numbers are mixed with whatever the cashier screen started late. Re-check `/cashier` and `/analytics` on their own before changing them. Everything before cashier in this pass (products through customers) is a single-page sample.

---

## 5. Suggested order of work

1. **Ship `SupportUnreadProvider`** and then tighten it: one `refresh()` on mount, no refetch on pathname except `/support`, and `shareInflight` around the pair. Mount a single `NotificationBell`.
2. **Stop hydrating `/api/v1/notifications` on pathname.** Fetch once per session, page it, and stop returning full `payloadJson` for the bell. Same for the 30s REST poll.
3. **Remove `pathname` from the realtime connect effect** so tickets and the socket survive navigation.
4. **Render one tills card, one airtime card, one M-Pesa card.** Delete the extra `refreshCounts()` effect. One header chip for Kiosk Pay and one for SMS.
5. **One `fetchSubscriptionBillingStatus`** shared by the wall and both banners.
6. **Skip `fetchCatalogListStats`** once onboarding is completed and the guide is dismissed.
7. **Hub summaries:** cap or replace recent-sales (8 days, 286 KB) and the full supplies list (193 KB).
8. **Page duplicates:** payroll automation panel once; sales activity once after the branch id is known; unassigned-aisle count once; customer tab purchases once; purchase-order statuses in one request; shift lists without the unscoped twin.
9. **Support chat:** don’t mark-read on every 5s refresh.
10. **Till-print pending:** don’t poll every 5s on settings, themes, and inbox.

---

## Pages covered

Cold load: `/business`, `/business/settings`, `/business/branding`.  
Client navigations: configuration, themes, mobile, domains, promotions, logs, import, design, pocketing, billing/renew, payments settings, EasyTax, branches, users, payroll, profile, inbox and its three subpages, messages, support, pickup Mtaani, products, buying, stock, store, shifts, expenses, credit, sales, customers.  
`/overview` redirects to `/business`.  
`/cashier` and `/analytics` were opened but their request lists ran together; they are not used as evidence above.
