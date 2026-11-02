# Chat & messaging experience audit — 20 October 2026

**Scope:** every conversation surface in the product — tenant ↔ Kiosk support,
visitor ↔ Kiosk support, storefront buyer ↔ tenant staff, tenant ↔ customer on
WhatsApp, the contact-form inbox (tenant and platform), serving tickets,
supplier messages, notifications, and the shared WebSocket/API/database layer.

**Method:** static trace of the actual React, Next.js, Spring, SQL, and
WebSocket code; cross-checked against `PRODUCT.md`, `DESIGN.md`, and the
realtime architecture plan. No source files were modified in this audit.

**Environment / honesty note**

- MySQL was reachable on `127.0.0.1:3306`; the Spring API (`5050`) and the
  Next.js app (`3000`) were **not running**. No authenticated browser session
  was exercised in this pass.
- Every finding is therefore labelled:
  - **[C] code-verified** — the control flow is unambiguous from the source.
  - **[L] logic-reproduced** — derived from a pure render/state rule (for
    example, a prop that is never passed).
  - **[R] runtime hypothesis** — depends on MySQL strict mode, provider
    behaviour, replica topology, or an unexercised integration. Confirm with the
    probes in §7 before treating it as a release blocker.
  - **[D] design weakness** — subjective but argued from the product's own
    design commitments, not personal taste.
- Reproducing the P0s and the regression matrix in §7 is the first task of the
  implementation phase.

---

## Executive verdict

The support-chat family is the strongest messaging work in the product. It has
optimistic sends, retry, typing, read receipts, message clustering, day
dividers, reply quotes, order cards, attachments, sound, unread badges, and a
shared primitive set used by four surfaces. That is a real foundation.

The problem is that it is **an island**. Four other conversation surfaces use
four hand-rolled renderers, four different read models, four different send
models, and four different visual languages. A tenant can see three separate
inboxes in the sidebar (`WhatsApp inbox`, `Messages`, `Support`), each with its
own rules, and on mobile can reach a fourth (`Tickets`) inside Support. A buyer
who uses the storefront contact form and then the storefront chat creates two
unrelated conversations with no shared identity. A supplier message arrives in
`Messages` as an email that cannot be replied to (it is addressed to a `.local`
domain) and never reaches the supplier portal.

On top of that, several trust-critical behaviours are wrong in ways a user will
feel but not be able to name:

- a pending message shows the same ✓ as a delivered one;
- the buyer chat shows no unread badge or chime while the chat is closed,
  because the panel (and its socket listener) unmounts with the dialog;
- the “Mark resolved” control exists in code but is never wired, so no
  conversation can be resolved from the UI;
- a single failed 5-second background poll replaces a healthy thread with an
  error screen;
- the platform support thread shows a permanent green “online” dot whether or
  not anyone is there;
- “usually replies in minutes” is static copy, not a measured fact;
- a guest can reclaim another person's entire transcript by presenting their
  phone number, with no OTP;
- the tenant ticket thread has no timestamps and no live updates, while the
  super-admin view of the same ticket uses the polished chat renderer.

**Audit judgement (not a benchmark):**

| Surface | Score | Why |
|---|---:|---|
| Tenant ↔ Kiosk support chat | 7/10 | Rich mechanics, wrong visual world, false trust signals, no resolve |
| Storefront buyer ↔ tenant chat | 6/10 | Same mechanics; no closed-chat notification; identity is fragile |
| Super-admin support inbox | 7/10 | Best list/queue on the platform; dense and gimmicky in places |
| WhatsApp CRM inbox | 4/10 | Most-used channel; no preview, no media, no auto-scroll, no read clearing |
| Contact-form inbox (`Messages`) | 4/10 | Dossier, not a conversation; fake “live” dot; counts capped at one page |
| Serving tickets | 3/10 | No timestamps, no live updates, different renderer on each side |
| Supplier messages | 2/10 | Flat log, no thread, no working reply path |
| Notifications / unread plumbing | 5/10 | Works, but duplicated five times and deep-links land on the wrong tab |

The gap is not “make it prettier.” It is **make one conversation grammar, make
it truthful, then make it native to Kiosk**. The visual polish follows almost
free once those are true.

---

## 1. System map

### 1.1 Conversation flows that actually exist

| # | Flow | Participants | Where it starts | Backend | Storage | Live transport | Read model | Who can access |
|---|---|---|---|---|---|---|---|---|
| 1 | **Tenant ↔ Kiosk support** (`TENANT`) | Tenant staff ↔ platform team | Signup welcome card, Support page, floating headset | `SupportController` `/api/v1/support`; `SupportService` | `support_conversations`, `support_messages` | `support` WS channel; 5 s REST poll | `guest_last_read_at` for tenant; `admin_last_read_at` for platform | Any authenticated tenant user (no permission key) |
| 2 | **Visitor ↔ Kiosk support** (`VISITOR`) | Anonymous kiosk.ke visitor ↔ platform team | Floating chat on marketing/help/blog pages | `PublicSupportController` `/api/v1/public/support` | same tables (`business_id = 'platform'`) | `support.guest:<guestId>` WS; **no fallback poll** | `guest_last_read_at` / `admin_last_read_at` | Guest token + guestId |
| 3 | **Storefront buyer ↔ tenant staff** (`STOREFRONT`) | Anonymous or signed-in shopper ↔ shop staff | Floating chat on storefront; automatic order card | `PublicSupportController` + `SupportController` storefront routes | same tables (`business_id = tenant`) | `support` channel for staff; guest channel for buyer | `tenant_last_read_at` / `guest_last_read_at` | Any authenticated tenant user; guest token |
| 4 | **Tenant ↔ customer (WhatsApp)** | Shop staff ↔ external customer | Inbound WhatsApp webhook / CRM inbox | `CrmConversationController`, `WhatsAppInboundProcessor` | `crm_conversations`, `crm_messages`, `crm_outbound` | `crm.*` frames on the `notifications` channel; no dedicated poll | Server-side conversation read; UI never zeroes the row | `crm.inbox.read/send/manage` |
| 5 | **Shopper ↔ shop (contact form)** | Shopper ↔ shop staff | Storefront “Talk to Us” modal | `ContactMessagesController` `/api/v1/contact-messages` | `contact_messages`, `contact_message_replies` | None | `GET` marks read | `messages.read` / `messages.reply` |
| 6 | **Visitor ↔ Kiosk (contact form)** | Visitor ↔ platform team | Platform “Talk to Us” / contact page | `PublicContactMessagesController` + SA contact routes | same tables (`scope = PLATFORM`) | None | `GET` marks read | `sa.inbox.access` |
| 7 | **Tenant ↔ Kiosk tickets** | Tenant staff ↔ platform team | Support → Tickets; SA “Turn into ticket” | `SupportController` ticket routes; `ServingTicketService` | `serving_tickets`, `serving_ticket_points`, `serving_ticket_events` + a standalone support conversation | `support.message` events are emitted but **no ticket UI subscribes** | None in the tenant UI | Any authenticated tenant user; SA `sa.serving.access` |
| 8 | **Tenant ↔ supplier** | Supplier ↔ connected shop | Supplier portal → Messages; supplier hub complaint form | `SupplierPortalMessagesController`; `SupplierPortalHubService` | `supplier_portal_messages` + injected `contact_messages` row | None | Manual “Mark read” on the supplier side | `SUPPLIER`; tenant `messages.read` |
| 9 | **System / notifications** | Product ↔ staff | Order events, approvals, low stock, chat unread | `NotificationService`, realtime bridge | `notifications` | `notification.created` frames + 30 s poll | Notification read state | Per-user / per-business |
| 10 | **Staff ↔ staff / admin ↔ admin** | — | — | — | — | — | — | **Does not exist.** There is no peer chat, only notes on CRM conversations. |

“Tenant ↔ shop owner” in the brief maps to #3 when the shop owner is the one
replying, and to #1 when the owner is talking to the platform. There is no
marketplace seller-to-seller chat.

### 1.2 Shared vs drifted implementations

**Shared foundation:** `frontend/components/support/support-chat-ui.tsx`
(1,292 lines) is the only real messaging primitive library:

- `Avatar`, `PlatformAvatar`, `chatTime`, `chatDayLabel`, `listTime`, `DayDivider`
- 2-minute cluster detection, bubble corner logic, `mergeByTimestamp`
- `MessageBubble` with reply quote, attachment, order card, welcome card,
  pending/failed states, ✓/✓✓ ticks
- `Composer` with autosize, emoji, one attachment, Enter-to-send, reply strip
- `TypingBubble`, `LiveStatusPill`, `ResolvedBanner`, `ChatEmptyState`,
  `ChatThreadSurface`

Consumers: tenant support chat, super-admin support inbox, storefront buyer
inbox, guest chat, **and the super-admin serving-ticket workspace**. That last
one is important: the super-admin ticket thread is polished while the tenant
ticket thread is hand-rolled.

**Not shared:** the WhatsApp CRM inbox, contact messages, the tenant ticket
tab, the supplier messages page. Each has its own message row, its own time
format, its own unread treatment, its own composer, its own empty state.

**Page shells:** `DASHBOARD_MAX` (Support), `DASHBOARD_MAX_WIDE` + `salesPaper`
(Messages), raw `mx-auto max-w-[1400px]` (WhatsApp inbox), serving “theatre”
tokens (Tickets), `SupplierPortalShell` (supplier). Five siblings, five shells.

### 1.3 Permissions matrix (as implemented)

| Surface | Permission enforced | Gap |
|---|---|---|
| Tenant platform support | none beyond authenticated human | Cashier/stock manager can read the owner's platform thread |
| Tenant storefront buyer threads | none beyond authenticated human | Any staff member can read buyer names, phones, orders and transcripts |
| Super-admin support | `sa.inbox.access` | Consistent with its UI |
| Super-admin contact messages | `sa.inbox.access` | Consistent |
| Super-admin serving tickets | `sa.serving.access` | `sa.inbox.access` can also read ticket conversations through the support endpoints |
| Tenant contact messages | `messages.read` / `messages.reply` | The only chat-adjacent tenant surface correctly gated |
| WhatsApp CRM | `crm.inbox.read/send/manage` | Correct |
| Guest chat | guest token + guestId | Phone acts as a second, unverified credential (see CHAT-01) |
| WebSocket channels | ticket `allowedChannels` only | Arbitrary channel strings accepted at mint; no permission check (CHAT-12) |

### 1.4 Real-time architecture in one paragraph

One `RealtimeClient` per scope (`tenant`, `super-admin`, `guest`). A 60-second
single-use ticket is minted over REST and exchanged for a WebSocket. The client
registers listeners; the channel union is recomputed and any **addition**
forces a teardown and remint. Support frames are fanned out after commit by
`SupportRealtimeBridge` to tenant sessions, platform sessions, or the guest's
channel depending on conversation type. Typing and presence use the same
socket. Read receipts go over REST, then a `support.read` frame flips ticks.
There is **no client-side catch-up**, no replay, no gap detection, and the
30-second REST fallback only polls notifications — support and guest chat are
not covered by it.

---

## 2. What already works

These should be preserved, not rebuilt:

1. **Optimistic send with reconciliation** in the support family. A temp id is
   inserted immediately; the realtime echo and HTTP response are both handled
   without duplicating the row (`support-chat.tsx:377-478`).
2. **Message clustering and day dividers.** 2-minute clusters, corner radii per
   cluster position, avatar only on the last message, “Today / Yesterday /
   weekday / date” dividers (`support-chat-ui.tsx:185-281`).
3. **Read receipts wired end to end.** Message-level `read_at`, read-cursor
   events, and ✓/✓✓ in the bubble (`support-chat-ui.tsx:486-497`,
   `SupportService.markStaffRead/markGuestRead`).
4. **Reply quotes with jump-to-message and highlight** (`support-chat-ui.tsx:290-325`,
   `support-chat.tsx:306-314`).
5. **Order cards and welcome cards** as typed message kinds rather than plain
   text, including a realtime-safe payload.
6. **Focus suppression.** An open thread suppresses toasts/unread increments for
   that conversation (`lib/support-focus.ts`).
7. **Honest connection copy in the tenant header** when the socket is down:
   “Live sync paused — messages still sync automatically.”
8. **Attachment validation on the client**, with size/type errors and a preview
   strip.
9. **Keyboard basics**: Enter sends, Shift+Enter newline, visible focus ring,
   Radix dialog focus trapping.
10. **A serious super-admin queue**: search, status filters, unread rail,
    presence, assignment-adjacent actions, deep links, sound, and a mobile
    master-detail split.

---

## 3. Confirmed defects

Ordered by severity. Each has location, user impact, root cause, fix, scope,
and test. The top items are expanded; the rest are in a compact table.

### CHAT-01 — Any guest transcript can be taken over with a phone number

**[C] Critical · Security / privacy · Backend**

- **Location:** `backend/.../support/application/SupportService.java:749-786`
  (`guestStartOrResume`), `:840-856` (`guestResume`), `:983-997`
  (`adoptConversation`); `PublicSupportController.java:76-98`;
  `frontend/lib/public-support-api.ts:175-182`.
- **Problem:** `X-Guest-Phone` is treated as a credential. If the phone matches
  an existing thread, the server rewrites `guest_id`, mints a new token, and
  returns the **full transcript**, including order cards with the buyer's name,
  phone, lines, and total. No OTP, no email confirmation, no rate-limited
  challenge. The victim's device is silently locked out because the token
  rotates.
- **User impact:** A stranger who knows a buyer's or visitor's phone number can
  read their conversation with a shop (or with Kiosk) and impersonate them.
  For a Kenyan number space this is enumerable, not hypothetical.
- **Root cause:** The product wanted “one continuous thread per person” across
  devices and implemented phone-as-identity without verification.
- **Recommended fix:** Pick one:
  1. **Safest:** token-only continuity. If the token is lost, start a new
     thread; offer “send me a link/OTP to recover” as an explicit flow.
  2. **If phone continuity is required:** send a 6-digit OTP over SMS (reuse
     the existing messaging infrastructure), verify it, then rotate the token.
     Never rotate/return a transcript on a bare phone header.
  Also make `GET /threads/me` return a uniform 404 for both “not found” and
  “wrong credential” to remove the enumeration oracle.
- **Scope:** Backend (support service + public controller), tiny frontend change
  for the OTP step; migration not required.
- **Testing:** Attempt takeover with a valid phone and no token; with a token
  from another guest; with an OTP replay; confirm the victim's token remains
  valid until an explicit recovery. Add a matrix test for
  `(guestId, phone, token, existing thread)`.

### CHAT-02 — Ticket create/reply sends a double-encoded JSON body

**[C] Critical · Functional · Frontend API layer**

- **Location:** `frontend/lib/support-api.ts:243` and `:268` send
  `body: JSON.stringify(...)` into `apiRequest`, which serializes again at
  `frontend/lib/api.ts:2387` (`body: body ? JSON.stringify(body) : undefined`).
- **Problem:** The wire body is a JSON **string literal**
  (`"{\"body\":\"…\"}"`), not an object. Spring's `@RequestBody` cannot bind it
  to `SendSupportMessageRequest` / `TenantCreateTicketRequest`; the expected
  result is a 400 `HttpMessageNotReadableException`. The tenant Tickets tab
  therefore cannot reliably create a ticket or send a reply. The super-admin
  ticket client uses a different client (`saRequest`) that passes the string
  through, so it is unaffected.
- **User impact:** The tenant “Tickets” tab looks functional but fails on the
  two actions that matter. An escalation can be opened by Kiosk and then be
  unrepliable by the shop.
- **Root cause:** Two API clients with different serialization contracts
  (`apiRequest` serializes objects; `saRequest` expects callers to serialize).
  `support-api.ts` copied the `saRequest` style into the `apiRequest` client.
- **Recommended fix:** Pass plain objects in `support-api.ts` (remove both
  `JSON.stringify` calls), then add a request-body assertion test. Separately,
  sweep for the same pattern: `grep "body: JSON.stringify"` inside modules that
  call `apiRequest`. Some of those are direct `fetch` calls and are fine; the
  ones passed to `request` are not.
- **Scope:** Frontend only.
- **Testing:** Unit test that mocks `fetch` and asserts the parsed body is an
  object; E2E: tenant opens a ticket, SA replies, tenant replies, both see it.

### CHAT-03 — Buyer replies are invisible while the chat is closed

**[C] Critical · Product · Frontend**

- **Location:** `frontend/components/support/guest-support-chat.tsx:163-184`
  (Radix `DialogContent`), `:245-263` (panel-level unread state), `:310-313`
  and `:366-367` (unread updates), `:186-227` (launcher badge).
- **Problem:** `GuestSupportLauncher` owns the unread count, but the only code
  that increments it lives inside `GuestSupportPanel`, which is rendered inside
  `DialogContent`. Radix unmounts the content when the dialog is closed. So
  while the chat is closed there is **no realtime listener**, no chime, and no
  unread increment. The badge is effectively always 0. The connection dot is
  also frozen at its last value.
- **User impact:** A shopper asks “Is this in stock?”, closes the chat, and never
  learns that the shop replied. The shop believes it answered. This is the
  single biggest reason the buyer chat will feel unreliable in real use.
- **Root cause:** Chat state and socket subscription live in the panel instead
  of in a persistent provider at the launcher level.
- **Recommended fix:** Move guest conversation state + the realtime listener into
  a `GuestChatProvider` mounted in the launcher (outside the dialog); keep the
  panel as a view. Fetch the unread count on mount and on `visibilitychange`.
  Add a badge, a chime, and a browser `Notification`/in-app toast when the
  dialog is closed. Subscribe the guest socket even when the dialog is closed
  (or disconnect after a grace period and reconcile on open).
- **Scope:** Frontend; no backend change.
- **Testing:** Close the chat, send a staff reply from the dashboard, assert the
  badge increments and the chime plays within 2 s; reopen and assert the thread
  is current and the badge clears.

### CHAT-04 — Unauthenticated recursion / stack overflow from a long guestId

**[C] High · Availability · Backend**

- **Location:** `SupportService.java:797-805` (catch `DataIntegrityViolationException`
  → recursive `guestStartOrResume`); `support_conversations.created_by CHAR(36)`
  and `support_messages.sender_user_id CHAR(36)` (`V240__support_chat.sql:12,28`);
  `guest_id VARCHAR(64)` (`V241__support_visitor_chat.sql:13`).
- **Problem:** A client-supplied `guestId` longer than 36 characters overflows
  `created_by` on the insert. The insert fails, the catch calls the same method
  with the same arguments, and the loop repeats until `StackOverflowError`.
  No size validation exists on `StartGuestThreadRequest.guestId`.
- **User impact:** One unauthenticated POST can knock over a request thread;
  repeated requests are a cheap denial of service. Under non-strict MySQL the
  insert may truncate instead, producing corrupted identities.
- **Root cause:** Two schema lengths disagree, and the “retry on race” catch
  catches a length error as if it were a duplicate-key race.
- **Recommended fix:** Validate `guestId` to ≤36 characters (or widen the
  columns to 64 consistently); replace the unbounded recursion with a single
  bounded retry that reloads by the unique key and then gives up; log and return
  400.
- **Scope:** Backend + migration if widening.
- **Testing:** POST `/public/support/threads` with 37, 64, and 65-character
  guestIds; assert 400, no recursion, no stack trace, and a clean metric.

### CHAT-05 — Generated guest IDs overflow `CHAR(36)` inside swallowed transactions

**[R] Critical-if-confirmed · Data loss · Backend**

- **Location:** `ServingTicketService.java:290-326` passes
  `"contact-" + message.getId()` (44 chars) as the guest id, then
  `SupportService.postIntakeMessage(..., senderUserId = conversation.getGuestId())
  → SupportMessage.sender_user_id CHAR(36)`. The no-phone order path uses
  `"buyer-order-" + orderId` (48 chars) as `createdBy`
  (`SupportService.java:383-388`). `ContactMessageService.submitPlatform`
  catches the exception **inside** its own `@Transactional`
  (`ContactMessageService.java:47-57`); `postStorefrontOrderCard` does the same
  (`SupportService.java:354-357`).
- **Problem:** Under MySQL/MariaDB strict mode, the insert raises “Data too
  long”. The catch swallows the exception, but the transaction is already
  marked rollback-only, so the caller's commit throws
  `UnexpectedRollbackException`. The public Talk to Us form and the order
  confirmation path can return 500 and lose the row they were trying to save.
- **Why [R]:** Behaviour depends on `sql_mode`. The H2 test profile used by
  `ContactMessagesApiIT` is not a substitute for a strict MySQL run.
- **Recommended fix:** Shorten synthetic IDs (use the raw UUID), widen
  `sender_user_id`/`created_by` to 64, and move best-effort side effects to
  `REQUIRES_NEW` or an after-commit event so a caught failure cannot poison the
  caller. Add a strict-MySQL integration test for both paths.
- **Scope:** Backend + migration.
- **Testing:** Submit the platform contact form with a valid request on strict
  MySQL; assert 200, one `contact_messages` row, one ticket, one intake message.
  Place an order without a phone; assert the order still commits.

### CHAT-06 — “Mark resolved” is dead code; no conversation can be resolved

**[L] High · Functional / trust · Frontend**

- **Location:** `support-chat-ui.tsx:1160-1202` (`ResolvedBanner` renders the
  “Mark resolved” button only when `onResolve` is provided);
  `support-chat.tsx:564` and `sa-support-inbox.tsx:1446,1505` pass only
  `onReopen`. No `onResolve=` exists anywhere in the frontend.
- **Problem:** While a conversation is open, the banner renders `null`. Once it
  is resolved (only possible via the API), “Reopen” appears. So the resolve
  action is unreachable in both the tenant chat and the super-admin inbox.
  The “Resolved” filter in the SA inbox is always empty; storefront resolved
  statuses are likewise unreachable from the UI.
- **User impact:** Threads never close. Queues accumulate, “Open” counts are
  meaningless, and the resolved state cannot be used as a workflow. Storefront
  buyers and tenants see “Reopen” only if someone calls the API manually.
- **Root cause:** A refactor moved the resolve trigger into the banner but the
  call sites were never updated.
- **Recommended fix:** Put “Resolve” in the chat header overflow menu (with a
  confirmation that a new message will reopen it), and keep the resolved banner
  for Reopen. Wire `onResolve` in all four surfaces. Add auto-resolve after N
  days of inactivity as a separate product decision.
- **Scope:** Frontend (UI only; backend endpoints exist).
- **Testing:** Resolve from tenant and SA, assert list status, filter, unread,
  and that a new message reopens.

### CHAT-07 — Pending messages display a “Sent” tick

**[C] High · Trust · Frontend**

- **Location:** `support-chat-ui.tsx:486-497`. The tick is chosen only by
  `readAt`; `pending` only lowers opacity (`:460`).
- **Problem:** A message that has not been acknowledged by the server shows the
  single ✓ that users read as “sent”. If the POST then fails, the same bubble
  flips to “Failed” after the fact. There is no “sending” state at all.
- **User impact:** Users close the app believing a message was delivered. In a
  support context that means waiting for a reply that will never come.
- **Root cause:** The delivery-state model has only two states
  (`readAt` present/absent) and uses `pending` as a visual modifier.
- **Recommended fix:** Introduce an explicit `delivery: "queued" | "sending" |
  "sent" | "read" | "failed"` state. Render a clock while sending, a single
  check only after the server ack, a double check only on a read receipt, and
  an exclamation + retry on failure. Add `aria-label` (“Sending”, “Sent”,
  “Read by Kiosk Support”, “Failed to send”).
- **Scope:** Shared UI + all four support surfaces.
- **Testing:** Throttle the network, assert clock → check transitions; assert a
  failed POST never shows a check.

### CHAT-08 — Failed attachments cannot be retried, and the preview is already broken

**[C] High · Reliability · Frontend**

- **Location:** `support-chat.tsx:469-478` (retry drops the attachment when its
  URL is `#`), `:389-424` (optimistic file uses a local blob URL), `:462`
  (blob URL revoked in `finally`); same pattern in
  `guest-support-chat.tsx:564-568` and `storefront-buyer-inbox.tsx:452-456`.
- **Problem:** If a file upload or the message POST fails, the optimistic row
  keeps `url: "#"` or a revoked `blob:` URL. “Tap to retry” removes the row and
  calls `send` with no body and no attachment; the send guard returns early, so
  the message is silently lost. If the body is non-empty, only the text is
  resent.
- **User impact:** A buyer who sends a photo of a damaged item and hits a flaky
  connection loses the evidence with no indication.
- **Root cause:** The optimistic row stores the preview URL as if it were the
  canonical attachment; there is no separate local-file reference for retry.
- **Recommended fix:** Keep the `File`/upload result alongside the optimistic
  row; retry re-uploads from the file. Show upload progress; on failure show
  “Photo not sent — retry” with the thumbnail still visible. Do not revoke the
  blob URL until the message is confirmed or the row is dismissed.
- **Scope:** Shared composer + send hooks.
- **Testing:** Fail the upload, then the POST; retry each and assert one
  attachment message on the server.

### CHAT-09 — A transient background-poll failure blanks the open thread

**[C] High · Reliability · Frontend**

- **Location:** `support-chat.tsx:163-191` (`loadThread` sets `loadError` even
  for silent loads), `:362-374` (5 s interval), `:578-585` (error screen
  replaces the messages).
- **Problem:** Every 5 seconds the tenant chat refetches the full thread. If one
  request fails (network blip, 502, tab wake), `loadError` is set and the render
  drops the entire conversation for an error panel. A successful next poll
  restores it, but the user sees the thread disappear.
- **User impact:** The chat feels unstable on any imperfect connection, which
  is the normal condition for the target user.
- **Root cause:** `loadError` conflates “initial load failed” with “background
  refresh failed”.
- **Recommended fix:** Keep two states: `initialError` (blocks the thread) and
  `syncError` (a subtle inline banner “Reconnecting — showing the last synced
  messages”). Never replace existing messages on a silent failure. Pause polling
  when `document.hidden`.
- **Scope:** Frontend.
- **Testing:** Mock a 500 on the third poll; assert the thread stays visible and
  a reconnecting banner appears; assert recovery clears it.

### CHAT-10 — No idempotency for chat messages

**[C] High · Reliability · Backend + frontend**

- **Location:** `SupportService.persistMessage:1030-1082` has no
  `clientMessageId`/idempotency key; `SendSupportMessageRequest` has no such
  field; `support-api.ts:98-119` sends none. The client already sends an
  `Idempotency-Key` header on POSTs (`lib/api.ts:1982`), but the backend ignores
  it for support.
- **Problem:** If a POST commits but the response is lost, the client shows
  “Failed”. Retrying creates a second row. The same applies to double-clicks in
  the narrow window before `sending` renders, and to a guest retrying a
  `POST /threads` with a body.
- **User impact:** Duplicate messages, duplicate replies, and confusing
  “failed” messages that actually arrived.
- **Root cause:** The support module predates the platform's idempotency
  convention (CRM and payments already implement it).
- **Recommended fix:** Add `clientMessageId` to the send DTO, unique per
  conversation. On retry, return the existing message (200) instead of creating
  a new one. Echo it in the realtime frame so optimistic reconciliation can
  match by client id, not just by server id.
- **Scope:** Backend + DB unique index + frontend send/retry.
- **Testing:** Send with the same client id twice; assert one row and the same
  response. Simulate a lost response; assert retry does not duplicate.

### CHAT-11 — Buyer PII and platform support are readable by every staff role

**[C] High · Security / privacy · Backend**

- **Location:** `SupportController.java` has no `@PreAuthorize`; the only gate
  is `/api/**` authenticated (`SecurityConfig.java:227`). Contrast
  `ContactMessagesController.java:37,71` (`messages.read/reply`). The support
  nav is allowed for `stock_manager` and other restricted roles
  (`app-shell.tsx:660-675`).
- **Problem:** A cashier or stock manager can open `/support`, read every
  storefront buyer conversation (name, phone, order cards), read the owner's
  platform support thread, and send messages as “Shop staff”. There is no
  `support.*` permission in `lib/permissions.ts`.
- **User impact:** Customer PII is exposed to staff who have no operational
  reason to see it; a junior employee can speak to Kiosk on behalf of the shop.
- **Root cause:** Support was added before the permission model was extended;
  the route was treated as a utility page for everyone.
- **Recommended fix:** Add `support.chat.read/reply` (platform thread, available
  to all roles if desired) and `support.storefront.read/reply` (manager/owner by
  default). Resolve requires `support.chat.resolve`. Enforce on the controller
  and hide tabs/nav by permission. Keep the platform help chat available where
  “everyone can ask for help” is intentional.
- **Scope:** Backend + permission seed + frontend gates.
- **Testing:** Cashier token: platform thread 200, storefront list 403; manager:
  both 200. UI hides the storefront tab.

### CHAT-12 — Every server WebSocket error is silently discarded

**[C] High · Reliability / diagnosability · Frontend + backend**

- **Location:** server sends `{"type":"error","code":…,"message":…}` at
  `RealtimeWebSocketHandler.java:491-502`; the client reads
  `frame.data.code` / `frame.data.message` at `lib/realtime.ts:789-795`.
  `data` is undefined, so the access throws inside the `onmessage` try/catch and
  is logged as “Failed to parse frame” (`:723-731`).
- **Problem:** 4401 (reauth), 4403 (forbidden channel), 4400, and 4429
  (rate/size limits) never reach `onError`. The client cannot distinguish a
  rejected subscription from corrupt JSON. The “reconnect on 4401” branch is
  unreachable.
- **User impact:** When permissions change or a channel is refused, the socket
  looks healthy while messages silently stop. Reconnection/backoff behaves
  incorrectly.
- **Root cause:** The error envelope was changed on the server without updating
  the client parser.
- **Recommended fix:** Parse both top-level and nested shapes, add a typed
  `RealtimeError`, and add a contract test shared by both sides. Log the error
  code and route 4401/4403 to the correct recovery path.
- **Scope:** Frontend; backend contract test.
- **Testing:** Force a 4403 subscribe and a 4401 reauth; assert the client
  surfaces the code and recovers.

### CHAT-13 — No catch-up; guest chat has no fallback at all

**[C] High · Reliability · Frontend**

- **Location:** `lib/realtime.ts:797-802` ignores `catch-up.overflow`; the client
  never sends `{op:"catch-up", lastEventId}` though the server implements it
  (`RealtimeWebSocketHandler.java:392-437`); REST fallback only polls
  notifications (`realtime.ts:989-1004`). `guest-support-chat.tsx` has no
  interval.
- **Problem:** Frames during a reconnect are lost. Tenant, SA, and storefront
  views recover through their own 5 s poll; the **guest** has no poll, so a
  buyer/visitor who drops for 30 seconds can miss a reply until they reopen the
  chat. The support views' recovery is accidental, not contractual.
- **User impact:** “I replied but they never got it” and “the message just
  appeared hours later.”
- **Root cause:** The realtime plan specified catch-up; only the server half was
  built.
- **Recommended fix:** Either implement client catch-up with a per-conversation
  `lastEventId`/cursor, or make every conversation view use a shared
  `useConversationSync` hook with a 5 s visible-tab poll and a
  `visibilitychange` catch-up. Do not ship guest chat without a fallback.
- **Scope:** Frontend + a server cursor for support messages (message `createdAt`
  + id is sufficient).
- **Testing:** Kill the socket, send 3 messages, reconnect; assert all 3 appear
  once, in order, without a manual reload.

### CHAT-14 — Tickets have no live updates, no timestamps, and two different renderers

**[C] High · Functional / consistency**

- **Location:** tenant `tenant-serving-tickets.tsx:44-64,250-282` (no realtime,
  no polling, no timestamps, hand-rolled bubbles); super-admin
  `serving-ticket-workspace.tsx:30-36,229-247` (shared `MessageBubble` +
  `Composer`, still no polling); `ServingTicketService` emits
  `support.message` frames, but no ticket component subscribes.
- **Problem:** A tenant reply appears on the SA side only after a manual reload,
  and vice versa. The tenant ticket thread has no timestamps at all. The same
  conversation looks different depending on which side you are on. Escalating a
  chat into a ticket is visible to SA (linked ticket chip) but invisible to the
  tenant, who keeps typing in the chat while the agent answers in the ticket.
- **User impact:** Tickets feel like a different, older product. Tenants cannot
  tell whether their reply was received.
- **Root cause:** Tickets were built as a worklist, not a conversation; the
  support message model was reused on the server but not in the tenant UI.
- **Recommended fix:** Make the tenant ticket thread use the shared
  `MessageBubble`/`Composer`/`DayDivider`; add a 5 s poll or reuse the support
  channel with the ticket conversation id; add a system message in the chat
  when a ticket is created (“Kiosk opened ticket #123”) with a link to it; add a
  notification row for ticket replies.
- **Scope:** Frontend + ticket notification hook.
- **Testing:** Reply from each side; assert it appears within 5 s, with
  timestamps and read state; assert the chat shows the escalation.

### CHAT-15 — Unread counts are wrong or stale in three surfaces

**[C] High · Trust**

- **Locations:**
  - Contact messages: `fetchContactMessages` asks for `size=50` (`lib/api.ts:15411-15414`);
    `contact-messages-inbox.tsx:59-71` drops `totalElements` and
    `:135-138` computes unread from the loaded page; `messages-theatre.tsx:141-145`
    shows `{rows.length}` as the total. With >50 messages the banner, filter
    count, and “unread” are all understated.
  - CRM: opening a thread does not zero the row (`inbox-workspace.tsx:168-177`);
    the badge only changes on the next list reload.
  - SA support: `adminUnreadCount` counts standalone ticket conversations that
    `visibleInAdminInbox` hides (`SupportService.java:708-717` vs `:914-920`),
    so the badge can never reach zero.
- **User impact:** Staff stop trusting badges, then stop using them. A “0
  unread” state can coexist with unanswered buyers.
- **Root cause:** Unread is computed ad hoc per surface, sometimes from a page,
  sometimes from a different filter than the list.
- **Recommended fix:** One unread contract: one grouped count query per
  business, one source of truth per tab, one shared `UnreadProvider`. Fix the
  contact page to load/aggregate all pages or return a server count. Fix the SA
  count to use the same filter as the list. Zero the CRM row locally on open.
- **Scope:** Backend query + frontend state.
- **Testing:** Seed 120 contact messages (60 unread); assert badge = 60 and the
  list can reach all 120. Resolve a ticket thread; assert the SA badge drops.

### CHAT-16 — Five copies of the unread hook on every dashboard page

**[C] Medium · Performance / consistency · Frontend**

- **Location:** `useSupportUnread` is instantiated at
  `app-shell.tsx:1455`, `notification-bell.tsx:16`,
  `notifications-drawer.tsx:65`, `support-launcher.tsx:45`, and
  `support-unread-watcher.tsx:24`. Each owns a listener on `support` and a 15 s
  interval that fetches two endpoints (`use-support-unread.tsx:53-56`).
- **Impact:** ~10 REST calls per 15 s per tab (~40/min), five redundant
  listeners, five counters that can disagree, and no message-id dedupe on
  increments.
- **Recommended fix:** A single `SupportUnreadProvider` in the dashboard layout;
  derive the bell, nav badge, launcher badge, and title from it. Dedupe by
  `messageId`. Keep one 30 s reconciliation poll, not five 15 s ones.
- **Scope:** Frontend.
- **Testing:** Count network requests on a dashboard page; assert ≤2 unread
  calls per interval and identical badges everywhere.

### CHAT-17 — Supplier messages are a dead-end

**[C] High · Functional · Backend**

- **Location:** `SupplierPortalMessagesService.java:58-96` creates a
  `ContactMessage` with `email = "supplier-portal@<id8>.local"` and no phone,
  then stores a `supplier_portal_messages` row. The tenant sees it in
  `Messages`; the only enabled reply channel is EMAIL; `DirectContactReplySender.java:52-59`
  sends to that `.local` address. There is no inbound email ingest and no
  tenant-facing supplier thread UI.
- **Problem:** The shop's reply never reaches the supplier portal. The supplier
  sees its own sent message, can mark it read, but cannot receive an answer.
  The hub complaint form has the same shape (`supplier-hub@…local`).
- **User impact:** Suppliers and shops believe they are messaging; they are
  writing into a form that bounces.
- **Root cause:** A contact-inbox row was used as a transport for an in-app
  supplier thread that was never built.
- **Recommended fix:** Build a real supplier thread (or route the reply through
  a `supplier_portal_messages` row with a `FROM_SHOP` direction and deliver it
  in the portal). At minimum, disable email for synthetic addresses and show
  “Reply in the supplier portal” instead.
- **Scope:** Backend + supplier/tenant UI.
- **Testing:** Shop replies; supplier sees the reply within one load; no email
  to `.local`; sender attribution is correct.

### CHAT-18 — WhatsApp media renders as a blank bubble

**[C] High · Functional · Frontend**

- **Location:** `inbox-workspace.tsx:440-455` renders only `m.body` and
  `m.status`; `CrmMessageRow.type` is ignored. Inbound image captions can be
  null and documents store only a filename
  (`WhatsAppInboundProcessor.java:254-259`).
- **Problem:** A customer sends a photo, voice note, or sticker; the shop sees
  an empty bubble with “delivered 3m”. There is no thumbnail, player, download,
  or “unsupported message” label. Outbound attachments are not supported
  either.
- **User impact:** In a Kenyan shop, photos and voice notes are normal
  commerce (“is this the right one?”, “here is the receipt”). Losing them makes
  the WhatsApp inbox unusable for a large share of real conversations.
- **Root cause:** The CRM UI was built for text-only MVP; the ingest layer
  never downloaded media.
- **Recommended fix:** Persist media metadata + a proxied URL on ingest; render
  image thumbnails with a lightbox, audio with a player, documents with a
  download row, and a clear “Unsupported message type” fallback for
  stickers/locations/reactions. Add outbound image/document upload.
- **Scope:** Backend media ingest + frontend renderer.
- **Testing:** Send image/voice/document from a test WhatsApp number; assert
  thumbnail/player/file row, not a blank bubble.

### CHAT-19 — Attachment URL allowlist can be bypassed

**[C] Medium · Security · Backend**

- **Location:** `SupportService.java:1126-1137`. Cloudinary URLs are accepted
  if `lower.contains(".cloudinary.com/")`, and the R2 base is a prefix check.
  `contentType` and `bytes` are client-supplied.
- **Problem:** `https://attacker.example/.cloudinary.com/x` passes the
  substring check. An attacker with a Cloudinary account can host arbitrary
  files and label them as images. Support attachments are public CDN URLs with
  no expiry or authorization.
- **User impact:** Phishing/tracking content can be injected into a staff chat;
  a buyer's uploaded document is readable by anyone with the URL.
- **Recommended fix:** Parse the URL and require the host to be exactly
  `res.cloudinary.com` or end with `.cloudinary.com` **and** the path to start
  with the expected `ub/support/` folder; validate type/size server-side (or
  drop the legacy Cloudinary path in favor of the already-validated R2 upload);
  consider signed, expiring URLs.
- **Scope:** Backend.
- **Testing:** Try `https://evil.test/.cloudinary.com/a.png`, a non-image
  labelled `image/png`, and an oversized file; all must 400.

### CHAT-20 — Unbounded history, N+1 unread, and no pagination

**[C] Medium · Performance · Backend**

- **Location:** `SupportService.toDetail:1281-1289` loads every message;
  `SupportMessageRepository` has no pageable query; `storefrontStaffUnreadCount`
  loops every conversation with a COUNT (`:552-560`); `toAdminDto` does a
  business lookup per row (`:1300-1326`); `adminUnreadCount` scans `findAll()`
  (`:708-717`); the SA list performs the unread scan twice.
- **Impact:** A 5,000-message thread is one giant JSON + one giant DOM; the SA
  list is O(conversations) queries. This will degrade as the platform grows.
- **Recommended fix:** Cursor pagination (`before`/`after`, 50 messages), batch
  unread counts with one `GROUP BY`, batch business names, and virtualize the
  thread. Keep the jump-to-bottom behavior when loading older pages.
- **Scope:** Backend + frontend.
- **Testing:** Seed 1,000 messages; assert first paint < 300 ms, scroll-to-top
  loads older messages, and queries per list request are constant.

### 3.1 Compact defect register

| ID | Pri | Location | Problem / impact | Root cause | Fix | Scope | Test |
|---|---|---|---|---|---|---|---|
| CHAT-21 | P1 | `app/(dashboard)/support/page.tsx`; `app-shell.tsx:221-249,535` | Three sibling inboxes + a duplicate `Messages` nav row; users cannot tell where a message will land | Surfaces grew independently | One “Inbox” destination with tabs (Customers / Storefront / Kiosk / Forms / Tickets), permission-aware; remove duplicate nav row | Frontend IA | 5-user findability test; route matrix |
| CHAT-22 | P1 | `support/page.tsx:43`, `storefront-buyer-inbox.tsx:648`, `tenant-serving-tickets.tsx:121` | “Palmart” used for the platform in tenant copy; violates PRODUCT.md (“Palmart is a shop on Kiosk”) | Copy drift | One brand name: “Kiosk Support” / “Kiosk”; rewrite “Break into 1, 2, 3…” and “Turn into ticket” | Copy + frontend | Snapshot/grep for Palmart in tenant surfaces |
| CHAT-23 | P1 | `SupportController.java:124-134`; `SuperAdminSupportController.java:58-63`; `support-chat.tsx:163-191` | `GET` detail marks read; every 5 s poll writes a conversation row; unread returned is pre-read and stale | Read-on-GET + polling | `POST /read` with `lastReadMessageId`; idempotent; no writes on GET; no poll writes when nothing changed | Backend + frontend | Count writes over 60 s with a thread open (expect 0 after first read) |
| CHAT-24 | P1 | `app/globals.css:271-311`; `lib/storefront-theme.ts:132-134` | White on `#28a745` = 3.13:1; 78% white time = 2.48:1; storefront always uses white on any merchant primary | WhatsApp-green token + fixed on-primary | Use forest `#1D4B3B` (9.9:1) or a contrast-checked token; compute on-primary per brand; raise body to 14.5-15 px | Design tokens | axe + manual ratio check on default and 3 brand colors |
| CHAT-25 | P1 | `support-chat-ui.tsx:441-454,1071-1100` | Reply is hover-only (unusable on touch) and overlaps the bubble; “Enter to send” shown on phones; no IME guard | Desktop-first interaction | Long-press/ellipsis menu on touch; hover menu outside the bubble; hide keyboard hint below `sm`; check `isComposing` | Shared UI | Touch + keyboard + IME test |
| CHAT-26 | P1 | `support-chat.tsx:518-532` | Permanent green “online” dot and static “usually replies in minutes” even when the socket is down or nobody is staffing | Decorative trust signal | Drive dot from real staff presence; replace with measured “Typically replies in ~X min” or omit; never show “online” for a queue | Frontend + presence | Force offline/staff-off; assert no false claim |
| CHAT-27 | P1 | `support-chat-ui.tsx:483-485` | URLs, phone numbers, order codes and emails are plain text | No renderer | Linkify http(s)/mailto/tel and order codes; external links `target=_blank rel=noopener`; keep text as fallback | Shared UI | Golden tests for 5 link shapes |
| CHAT-28 | P2 | `support-chat-ui.tsx:329-512`; `:514-609` | Sender name + avatar + time on every cluster; 360 px bubble on desktop; welcome card is a 5-paragraph marketing email | WhatsApp imitation + onboarding copy in chat | Names only in multi-party; time once per cluster; max-width `min(68ch, 76%)`; 2-3 line welcome + prompts | Shared UI | Visual review at 390/768/1440 |
| CHAT-29 | P2 | `support-chat.tsx:614-646`; `guest-support-chat.tsx:786-812` | No “New messages” divider; jump-to-latest says “Latest”/“N new” in one surface, “New messages” in SA, icon-only in storefront | Drift | One `NewMessagesDivider` + one jump pill with count, all surfaces | Shared UI | Scroll-up + incoming message test |
| CHAT-30 | P2 | `support-unread-watcher.tsx:85-103`; `notifications-drawer.tsx:218` | Toast “Open” always routes to `/support` (platform tab); storefront notification lands on the wrong tab; title base goes stale | Deep link not carrying conversation context | Use `supportPageHref({tab, conversationId})`; include `c` in notification payloads; re-read base title on route change | Frontend | Click each notification type; assert exact thread |
| CHAT-31 | P2 | `support-chat-ui.tsx:483-497,1063-1077`; thread containers | No `role="log"`/`aria-live`; textarea has placeholder only; no reduced-motion handling; reply/reactions not keyboard-reachable | A11y not part of primitive contract | Add live region, labels, focus management, `prefers-reduced-motion`, 44 px targets, visible pending/read text | Shared UI | axe + NVDA/VoiceOver + keyboard-only pass |
| CHAT-32 | P2 | support family | No message-body search, copy, edit/delete, internal note, or assignment | Scope gaps | At least copy, internal note, search (server-side), assignment + “X is replying”; edit/delete as a later product decision | Product + backend | Feature matrix |
| CHAT-33 | P2 | `contact-messages-inbox.tsx:150-171`; `messages-theatre.tsx:505-511` | Reply success feedback is wiped by the refetch; a refetch failure reports “Reply failed” after a successful send; `stub` is shown as “Sent”; email replies are not ingested | One try block + no inbound email | Separate send result from refresh; persistent success toast; label stub/dev; ingest inbound email or state the channel is one-way | Frontend + backend | Simulate send OK/refresh fail; inspect outcome |
| CHAT-34 | P2 | `supplier-portal/messages/page.tsx:100-168` | Flat cross-shop log; no thread, no reply-to, manual mark-read, no loading state | Notice board, not chat | Per-shop thread + reply-to + unread + realtime; or relabel as “Notices” | Frontend + backend | Supplier with 3 shops |
| CHAT-35 | P3 | `mobile/apps/*` | No native chat; signed-in shopper identity is not used by storefront chat | Web-only implementation | Add “Chat with shop” to Shopper app using the same guest API; link guest thread to shopper account when signed in | Mobile + backend | App review |
| CHAT-36 | P3 | `SupportService.postPlatformWelcome`; `postStorefrontOrderCard` | Welcome card inflates unread and pollutes SA inbox; order card is rendered as the buyer's own message | System events modeled as user messages | Mark welcome/system messages non-unread; filter “has tenant message” in SA; render order card in a system lane or label it “Order placed” | Backend + UI | New shop + new order |

---

## 4. Design weaknesses and polish

These are not defects; they are why the product does not yet feel premium.

### 4.1 The chat is a WhatsApp skin inside a Kiosk product

`DESIGN.md` defines a specific world: warm ivory ground, forest ink, Cormorant
display, Manrope body, 2 px radii, hairline rules, “premium from restraint.”
The chat instead uses bright WhatsApp green (`#28a745`), a gray-blue wallpaper
(`#e9ecef`), 18 px bubbles with drop shadows, gradient headers, pill badges, and
infinite ping/pulse loops. It is not ugly; it is **foreign**. A user moving from
the dashboard’s paper surfaces into Support crosses a visual border.

The premium move is not another chat clone. It is a **conversation surface that
belongs to Kiosk**: paper ground, forest outgoing bubbles, warm ivory incoming
cards with a hairline, mono timestamps, one accent, no decorative loops. That
will feel calmer and more expensive than the WhatsApp imitation, and it will
stop the chat from fighting tenant themes.

### 4.2 Truth signals are weaker than the visuals

A premium messaging product is trusted because its small signals are exact.
Here:

- pending looks sent;
- “online” is permanent;
- “usually replies in minutes” is static;
- “Live” has a ping animation even when the socket is reconnecting;
- a failed background poll blanks the thread;
- a closed buyer chat has no badge;
- the “Mark resolved” button is dead;
- a ticket reply has no timestamp.

Users forgive plain visuals; they do not forgive signals that lie. Fixing these
will do more for “premium” than any gradient.

### 4.3 Metadata overload in 1:1 conversations

Every incoming cluster carries a sender name in emerald 11 px, an avatar, a time
inside the bubble, and a read tick on the other side. In a 1:1 support thread
there is one counterpart; repeating their name on every cluster is database
metadata, not conversation. The buyer chat repeats the buyer's name in a 1:1
view; the storefront buyer sees the shop name plus individual staff names.

Recommended: names only when the thread has more than one distinct sender on a
side; one timestamp per cluster, outside the bubble in mono 11 px; avatars at
the top of a cluster (not bottom with a 20 px gap); show a full timestamp on
hover/long-press.

### 4.4 The welcome card reads like an email, not a chat

`WelcomeCardBubble` is five paragraphs of marketing copy inside a chat bubble,
with a signature, a phone, an email, and a bullet list. It is the first thing a
new tenant sees, and it occupies more space than the rest of the conversation.
It also counts as unread and becomes the last-message preview, so the SA inbox
fills with “welcome” threads that no human has touched.

Recommended: a compact system card (2 lines + 3 prompts), non-unread, with
“Start a conversation” actions; create the thread lazily on the tenant's first
message, or label it “Welcome from Kiosk” in the list and exclude it from
“waiting”.

### 4.5 The composer is busier than the conversation

Paperclip + emoji + send + a permanent “Enter to send · Shift+Enter for new
line · Attach files” line. On a phone, that line describes a keyboard that is
not there. The emoji picker has exactly 10 emoji and no search. Attachments are
one file, no paste, no drag-and-drop, no camera, no voice note, no progress.

Recommended: one `+` menu (Photo, File, Camera, Voice note), emoji inside it or
a searchable picker; the hint only on `sm+` and only until the first message;
image preview with progress and cancel; paste/drag on desktop; voice notes are
especially important for this market.

### 4.6 The super-admin inbox is a cockpit with a carousel

The SA inbox is the most capable list: tabs, search, status filters, presence,
unread rail, online-only, deep links. It is also visually loud: gradient header,
three stacked filter rows, per-tab animated counts, a presence line per row, an
auto-advancing “Waiting replies” carousel every 3.8 s, and a pulsing rail. The
carousel duplicates the list and moves while an agent is reading it. It is the
clearest example of “premium” being confused with “animated”.

Recommended: replace the carousel with a pinned “Needs reply” group or a sort
toggle; drop the pulse; keep one unread signal per row; let the list breathe.
Keep the density — agents need it — but reduce the number of competing signals.

### 4.7 Five time formats and five empty states

- Support: `HH:mm` + Today/Yesterday/weekday/date.
- CRM: `now` / `5m` / `3h` / locale date, no day dividers.
- Contact: full `toLocaleString()`.
- Tickets: no time at all.
- Supplier: `day month, HH:mm`.

Empty states are equally divergent: a marketing “Inbox pulse” collage, a
“No messages yet” line, a “Say hello” prompt card, “Pick a number”, “No
messages yet.” again. One time grammar and one empty-state component are cheap
wins.

### 4.8 Mobile is a second-class citizen

- Reply is hover-only, so touch users cannot discover it.
- The keyboard hint is desktop-only advice shown on phones.
- The dashboard support FAB is hidden below `2xl`; users must find “More”, then
  Support. That is a deliberate density choice, but it means the help entry is
  the least discoverable on the device where shoppers and shopkeepers actually
  work.
- The guest chat dialog is full-height but has no `visualViewport` handling; the
  composer can sit under the keyboard on iOS.
- Back affordances differ: chevron, rotated arrow, “← Inbox”, “← Tickets”.

Recommended: one mobile conversation shell: 56 px header with back chevron,
title, status; full-height thread; sticky composer with safe-area; long-press
message menu; tests on a real iPhone/Android keyboard, not just DevTools.

### 4.9 Accessibility details

Measured: white on `#28a745` is **3.13:1**; the 78% white timestamp is **2.48:1**.
Both fail WCAG AA for normal text. There is no `aria-live` region for new
messages, no label on the composer textarea, no `role="log"`, no reduced-motion
handling for bubble entrances or ping/pulse, and the reply action is not
keyboard-reachable without hovering. The day divider has a separator role,
which is good. Fixing the contrast and the live region is a day of work and
changes how the product feels to every screen-reader user.

### 4.10 Current vs recommended — examples

| Moment | Current | Recommended |
|---|---|---|
| Sending a message | Bubble appears at 70% opacity with a ✓ | Bubble appears with a clock and “Sending…”; ✓ only after server ack |
| Server ack | Same ✓ as before | ✓ with “Sent” label; ✓✓ with “Read by Kiosk Support” |
| Send fails | “Failed” text inside the bubble, “Tap to retry” below | Red exclamation, “Not sent — Retry”, keeps text **and** attachment; offers Copy |
| Chat closed, reply arrives | No badge, no sound (guest) | Badge on the FAB, chime, in-app toast, browser notification if permitted |
| Five-second poll fails | Whole thread replaced by “Try again” | Thread stays; subtle “Reconnecting — last synced 12 s ago” |
| Open conversation | No way to resolve | Header ⋯ → “Resolve”; banner offers Reopen |
| Link in a message | Plain text | Tappable link; phone opens dialer; order code opens order |
| New messages while scrolled up | “Latest” / “New messages” / icon depending on surface | One pill: “3 new ↓” |
| WhatsApp inbox row | Name, phone, time, count — no preview | Avatar, name, last message (2 lines), relative time, unread dot |
| Ticket reply | No timestamp, no live update | Timestamp, delivery state, appears within 5 s on both sides |
| Supplier reply | Email sent to `.local` | In-portal thread; no email to a fake address |

---

## 5. Premium messaging design specification

This is the target for the implementation phase. It deliberately fits Kiosk's
existing world rather than copying WhatsApp.

### 5.1 Principles

1. **One grammar, three densities.** The same message anatomy at Comfortable
   (buyer/support), Compact (agent queues), and Inline (ticket/context) density.
2. **Calm by default.** One accent, hairline rules, no decorative loops, no
   gradients behind text.
3. **Truth before decoration.** Every visual state maps to a real server or
   client state. If we do not know it, we do not show it.
4. **The shop speaks as the shop.** Storefront chat uses the tenant's palette
   and name, with a contrast guard; platform support speaks as Kiosk.
5. **The conversation is the content.** Metadata recedes; messages and the
   composer dominate.
6. **Mobile is the primary surface.** Hover is never the only path to an action.

### 5.2 Tokens

| Token | Value | Use |
|---|---|---|
| `--conversation-ground` | `#F4F1EA` (paper) | thread background |
| `--conversation-panel` | `#FCFAF5` | incoming bubble, composer |
| `--conversation-ink` | `#121A16` | body |
| `--conversation-muted` | `#556159` | timestamps, meta |
| `--conversation-rule` | `rgba(18,26,22,0.10)` | hairlines, incoming border |
| `--conversation-accent` | `#1D4B3B` (forest) | outgoing bubble, send, focus |
| `--conversation-accent-ink` | `#F2EDE1` | text on forest (9.9:1) |
| `--conversation-alert` | `#A55237` (terracotta) | failed state, one per view |
| `--conversation-radius` | `12px` (tail corner `4px`) | bubbles; not 18 px |
| `--conversation-shadow` | none | use a hairline; shadows only for floating UI |

Storefront override: keep `--conversation-accent` = tenant primary, but compute
`--conversation-accent-ink` from luminance (white or ink) and reject brand colors
that cannot reach 4.5:1 for body text. Do not use a fixed white on primary.

### 5.3 Message anatomy

```
[avatar 24px, top-aligned]  [sender name 11px, only if multi-party]
                            [bubble: max-width min(68ch, 76%)]
                              body 14.5px / 1.55, pre-wrap, linkified
                              [attachment: image full-bleed inside radius]
                              [reply quote above body]
                            [meta 11px mono, outside/below, right:
                             time · delivery icon · "Read"]
```

- Cluster gap: `2px`; group gap: `14px`; day divider: `24px` vertical.
- Outgoing: forest fill, `--conversation-accent-ink`, right aligned, tail bottom
  right. Incoming: panel fill + 1px rule, left aligned, tail bottom left.
- Maximum width: `min(68ch, 76%)` on desktop; `88%` on mobile.
- No sender name/avatar in a 1:1 thread with one counterpart; show a team avatar
  and “Kiosk Support” once in the header.
- Timestamps: `HH:mm` on the last message of a cluster; full date/time on
  hover/long-press; `Today/Yesterday/…` dividers.
- System events (resolved, assigned, ticket created, order placed) use a
  centered 11 px hairline chip, not a bubble.

### 5.4 Delivery and conversation states

| State | Visual | A11y label |
|---|---|---|
| `queued` | clock, “Queued” | “Queued — will send when online” |
| `sending` | clock, subtle pulse | “Sending” |
| `sent` | single check | “Sent” |
| `read` | double check | “Read by {name}” |
| `failed` | terracotta exclamation + Retry/Copy | “Not sent. Retry.” |

Conversation: `open` / `waiting on shop` / `waiting on customer` / `resolved`
(derive “waiting” from the last sender; do not add a new DB status yet).
Resolution is a header action plus a banner; a new message reopens. Show
“Resolved by {name} · {time}” as a system chip.

### 5.5 Conversation list

- 64 px row: 40 px avatar, name, 2-line preview, relative time, unread dot/count,
  resolved check.
- Sort: last message desc; pinned “Needs reply” group for agents, not a carousel.
- Search: server-side across name, phone, message text; debounce 250 ms.
- Filters: Open / Waiting / Resolved / All; preserve selection and scroll.
- Empty: one sentence + one action (“No buyer chats yet — share your storefront
  link”), not a collage.
- Loading: skeleton rows, not a spinner.
- Keyboard: ↑/↓ to move, Enter to open, `/` to search (agent queue).

### 5.6 Composer

- 48 px min height, grows to 160 px, 14.5 px/1.5.
- `+` menu: Photo, File, Camera, Voice note. Drag/drop and paste on desktop.
- Reply strip: one line, author + preview, `Esc` cancels.
- Send: 36 px forest circle; disabled state is visibly inert; spinner while
  sending; no permanent keyboard hint on touch.
- Character count appears at 3,800/4,000; hard stop at 4,000 with a clear
  message.
- Enter sends; Shift+Enter newline; `isComposing` guard; `Esc` cancels reply.
- Attachment preview: thumbnail + name + size + progress + cancel.
- Offline: banner “You're offline — messages will send when you're back”;
  queue in memory (or IndexedDB for buyers); one retry path.

### 5.7 States

- **Loading:** 3 skeleton bubbles + header skeleton; no layout shift.
- **Empty:** one heading, one sentence, up to 3 prompts (support/guest), no
  marketing card.
- **Error:** inline, preserves content, one “Try again” action, no full-screen
  replacement after the first load.
- **Closed/resolved:** banner + disabled composer with “Reopen to reply”; for
  guests, “Send a message to reopen”.
- **Offline:** subtle status bar, never a modal.

### 5.8 Motion

- 160–240 ms, `cubic-bezier(0.22, 1, 0.36, 1)`.
- Bubble entrance: 8 px rise + fade, once, only for new messages (not on
  re-render).
- Typing dots: 1.2 s subtle; no bounce.
- No infinite ping/pulse; no auto-advancing carousel.
- Respect `prefers-reduced-motion` everywhere.

### 5.9 Accessibility acceptance criteria

- Body text ≥ 4.5:1; timestamps ≥ 4.5:1 (or ≥ 3:1 for 14 px+).
- Incoming messages announced via `role="log" aria-live="polite"`; the
  composer has an `aria-label`; send/attach/emoji/reply buttons have names.
- Full keyboard path: focus thread, reply, send, retry, resolve.
- 44×44 px touch targets; no hover-only actions.
- Status is never color-only (icon + text).
- `prefers-reduced-motion` disables entrances, dots, pulse.

---

## 6. Implementation roadmap

The sequence follows the brief: audit → design system → shared components →
flow-specific fixes → regression → polish. Effort assumes one senior frontend +
one backend engineer familiar with the codebase.

### Phase 0 — Stop the bleeding (1–2 days)

| Item | IDs |
|---|---|
| Guest phone takeover fix / OTP decision | CHAT-01 |
| Ticket body serialization | CHAT-02 |
| Guest unread provider + closed-chat notifications | CHAT-03 |
| GuestId validation + bounded retry | CHAT-04 |
| Synthetic ID length + transaction boundaries (verify on strict MySQL) | CHAT-05 |
| Resolve action in header | CHAT-06 |
| Pending/sent/read state model | CHAT-07 |

**Exit criteria:** no security takeover path, ticket create/reply works, buyer
gets a badge/chime when closed, resolve is reachable, pending never shows sent.

### Phase 1 — One conversation contract (3–5 days)

- Define `Conversation`, `Message`, `Participant`, `DeliveryState`,
  `ConversationContext` view models in `frontend/components/conversations/`.
- Extract `MessageBubble`, `Thread`, `Composer`, `ConversationList`,
  `ConversationHeader`, `DayDivider`, `NewMessagesDivider`, `TypingIndicator`,
  `EmptyState`, `ErrorState` from `support-chat-ui.tsx`.
- Adopt the contract in the support family and **both** ticket surfaces; delete
  the tenant ticket renderer.
- Fix reply-on-touch, linkify, contrast, labels, reduced motion, poll failure,
  failed attachments, unread divider.
- IDs: CHAT-08, 09, 14, 19, 23, 24, 25, 27, 28, 29, 31.

**Exit criteria:** four support surfaces + both ticket surfaces share one
renderer; visual diff is intentional, not accidental.

### Phase 2 — One inbox, one unread truth (3–4 days)

- Consolidate nav: “Inbox” with tabs (Customers / Storefront / Kiosk / Forms /
  Tickets), permission-aware; remove duplicate Messages nav entry.
- Single `UnreadProvider`; delete four of five hook instances.
- Fix contact pagination/counts, CRM read clearing, SA ticket-thread count.
- Add durable notifications for support/buyer replies + exact deep links.
- Add permissions `support.chat.*`, `support.storefront.*`, `support.resolve`.
- IDs: CHAT-11, 15, 16, 21, 26, 30, 33, 36.

**Exit criteria:** one badge source, correct counts, every notification opens
the exact thread, cashier cannot read buyer PII.

### Phase 3 — Reliability and scale (3–5 days)

- Message `clientMessageId` + unique constraint + retry returns existing row.
- Cursor pagination + virtualized thread + grouped unread query.
- Explicit read endpoint with `lastReadMessageId`; no GET writes; no poll writes.
- WS: parse error frames, validate channels, prune on reauth, add catch-up or a
  shared polling contract; guest fallback.
- Fix CRM media rendering and auto-scroll; supplier thread delivery.
- IDs: CHAT-10, 12, 13, 17, 18, 20, 23.

**Exit criteria:** 1,000-message thread loads fast; reconnect loses nothing;
retry never duplicates; media renders; supplier gets the reply.

### Phase 4 — Premium polish (3–5 days)

- Apply the token set, bubble anatomy, list anatomy, composer, empty/loading/
  error states, motion, mobile shell.
- Remove the WhatsApp wallpaper, gradients, ping loops, and carousel.
- Add copy pass (Kiosk, not Palmart; calm, specific).
- IDs: CHAT-22, 28, 29, 32, 34, 35 + all [D] items.

**Exit criteria:** design review against `DESIGN.md`; no “foreign surface”
moment when moving from dashboard to Support.

### Phase 5 — Regression and rollout (2–3 days)

- Run the full matrix in §7 on desktop, iPhone, Android, and a slow 3G profile.
- Feature-flag the new inbox shell; keep old routes redirecting.
- Add metrics: send success rate, p95 delivery latency, reconnect rate, unread
  accuracy, first-response time, resolution time.
- Canary one tenant, then the platform team, then all tenants.

---

## 7. Test plan and regression matrix

### 7.1 Reproduce the P0s first

1. **Guest takeover:** `POST /api/v1/public/support/threads` with
   `X-Guest-Phone: <existing buyer phone>`, a new `guestId`, `type=STOREFRONT`,
   the shop slug. Expect (current) full transcript + token. Fix must return 401
   without an OTP.
2. **Ticket body:** in DevTools, create a ticket from `/support?tab=tickets`;
   inspect the request payload; it is a quoted string. Expect 400. Fix must be
   an object and 201.
3. **Guest badge:** open a storefront, send a message, close the chat; reply as
   staff; assert no badge/current, badge/recommended within 2 s.
4. **Resolve:** open `/support`; confirm no resolve control; call
   `POST /conversation/resolve`; confirm “Reopen” appears. Fix must expose it.
5. **Pending tick:** throttle to 3G, send; observe ✓ while the request is in
   flight. Fix must show a clock.
6. **Poll failure:** block `/support/conversation` after load; wait 5 s; observe
   the thread replaced by an error. Fix must keep the thread.
7. **Strict MySQL:** run the contact-form and no-phone order probes on a strict
   MySQL instance; check for 500/UnexpectedRollbackException.

### 7.2 Regression matrix

| Area | Case | Desktop | Mobile | Notes |
|---|---|---|---|---|
| Tenant ↔ Kiosk | send/receive/read/typing/reply/attachment/order card | ✓ | ✓ | both roles |
| Tenant ↔ Kiosk | resolve/reopen + new message reopens | ✓ | ✓ | SA and tenant |
| Visitor ↔ Kiosk | start/resume/closed badge/reconnect/OTP | ✓ | ✓ | no token |
| Buyer ↔ Tenant | first message, order card, reply, closed badge | ✓ | ✓ | guest + signed-in |
| Buyer ↔ Tenant | two tabs, same guest, read sync | ✓ | ✓ | focus suppression |
| WhatsApp CRM | text, image, voice, document, status, assign, notes | ✓ | ✓ | media |
| Contact form | submit, list >50, unread, reply, queued/failed | ✓ | ✓ | both scopes |
| Tickets | create/reply/tick point/live update | ✓ | ✓ | both sides |
| Supplier | send from portal, shop reply, read | ✓ | — | no `.local` |
| Permissions | cashier vs manager vs owner vs SA agent | ✓ | — | API + UI |
| Realtime | kill socket, send 3, reconnect | ✓ | ✓ | no loss/dupes |
| Realtime | refresh token, role change, logout | ✓ | ✓ | socket closes |
| Realtime | error frame 4403/4401 | ✓ | — | visible |
| Stress | 1,000-message thread, 100 conversations | ✓ | ✓ | p95 |
| A11y | keyboard only, screen reader, contrast | ✓ | ✓ | axe 0 critical |
| Visual | 390/768/1440, light/dark, 3 tenant themes | ✓ | ✓ | no overflow |

### 7.3 Automated tests to add

- **Backend unit:** guest token matrix; phone takeover denial; ID length;
  attachment URL allowlist; unread/mark-read; resolve/reopen; bridge fan-out
  with a fake `SessionRegistry`; error frame shape.
- **Backend integration (strict MySQL):** contact form → ticket → intake;
  no-phone order; cross-tenant storefront/ticket access; ticket create/reply.
- **Frontend unit:** `apiRequest` body serialization; `mergeByTimestamp`;
  cluster logic; delivery-state renderer; linkify.
- **E2E (Playwright):** the matrix above; closed-chat badge; reconnect;
  resolve; permission gates; mobile keyboard.
- **Load:** 1,000 messages, 100 conversations, 50 concurrent agents; measure
  query count and p95.

---

## 8. Open product questions

1. Is a buyer's phone the identity, or should a signed-in shopper account own
   the thread? Today the storefront chat ignores the shopper session and asks
   for a phone, even when the user is signed in.
2. Should platform support chat and the platform contact form be one queue?
   Today they are `/super-admin/support` and `/super-admin/messages`.
3. Should storefront contact-form messages and storefront chat be one customer
   timeline? Today they are `/messages` and `/support?tab=storefront`, with no
   shared identity beyond a phone that the form does not collect.
4. Is Kiosk support staffed continuously? If not, remove “usually replies in
   minutes” and set expectations by hours/day.
5. What is the retention policy for buyer transcripts, order cards, and
   attachments? There is none in code.
6. Should tickets appear in the SA support inbox, or remain a separate queue?
   Today ticket conversations are hidden from the inbox but counted in its
   badge.
7. Is “Palmart” intentional in tenant-facing ticket copy? `PRODUCT.md` says the
   product is Kiosk and Palmart is a tenant. It reads as a brand bug.

---

## 9. Appendix — primary files and what they own

| File | Role |
|---|---|
| `frontend/components/support/support-chat-ui.tsx` | shared bubbles, composer, avatars, time, typing, order/welcome cards, merge |
| `frontend/components/support/support-chat.tsx` | tenant ↔ platform thread, polling, realtime, send/retry |
| `frontend/components/support/guest-support-chat.tsx` | visitor + buyer panel, intro, guest socket, unread |
| `frontend/components/support/storefront-buyer-inbox.tsx` | tenant staff buyer inbox, list + thread, escalation |
| `frontend/components/support/sa-support-inbox.tsx` | super-admin queue, presence, unread rail, tickets |
| `frontend/components/support/support-launcher.tsx` | tenant floating drawer |
| `frontend/components/support/platform-support-launcher.tsx` | apex visitor launcher |
| `frontend/components/support/storefront-support-launcher.tsx` | buyer launcher |
| `frontend/components/support/tenant-serving-tickets.tsx` | tenant ticket tab (hand-rolled) |
| `frontend/components/super-admin/serving-ticket-workspace.tsx` | SA ticket thread (shared primitives) |
| `frontend/components/contact/contact-messages-inbox.tsx` | contact inbox state machine |
| `frontend/app/(dashboard)/messages/_components/messages-theatre.tsx` | contact inbox UI |
| `frontend/app/(dashboard)/inbox/_components/inbox-workspace.tsx` | WhatsApp CRM inbox |
| `frontend/app/(supplier-portal)/supplier-portal/messages/page.tsx` | supplier messages |
| `frontend/lib/support-api.ts`, `public-support-api.ts`, `super-admin-api.ts`, `crm.ts` | chat APIs (three serialization styles) |
| `frontend/lib/realtime.ts` | WS client, ticket, listeners, polling |
| `frontend/hooks/use-support-unread.tsx`, `use-sa-support-unread.tsx` | unread counters |
| `frontend/lib/support-focus.ts`, `support-sound.ts`, `support-open.ts` | focus, chime, deep links |
| `backend/.../support/application/SupportService.java` | single writer, guest tokens, read cursors, ticket conversations |
| `backend/.../support/application/SupportRealtimeBridge.java` | fan-out by conversation type |
| `backend/.../support/application/SupportTypingService.java`, `SupportPresenceService.java` | typing, presence |
| `backend/.../support/api/SupportController.java`, `PublicSupportController.java`, `SuperAdminSupportController.java` | endpoints and guards |
| `backend/.../messages/application/ContactMessageService.java`, `DirectContactReplySender.java` | contact form + replies |
| `backend/.../supplier*/SupplierPortalMessagesService.java` | supplier messages |
| `backend/.../serving/application/ServingTicketService.java` | tickets + standalone conversations |
| `backend/.../platform/realtime/*` | ticket, handshake, session registry, error frames |
| `backend/src/main/resources/db/migration/V240-V245,V276` | support schema |

**Nothing in this audit was committed or modified except this report.**
