# Chat Phase 0 implementation note — 20 October 2026

This is the implementation record for Phase 0 of
[`CHAT_MESSAGING_AUDIT_2026-10-20.md`](./CHAT_MESSAGING_AUDIT_2026-10-20.md).
It covers the P0 security and reliability fixes only. The shared conversation
design system (Phase 1) has not been started.

## What changed

### CHAT-01 — guest thread ownership

- `SupportService.guestStartOrResume` / `guestResume` no longer look up or adopt
  a thread by phone. **The guest token is the only credential.**
- The phone header is still stored as contact metadata on the guest's own
  thread, but it can never open, rotate, or return another thread.
- A new device with no token now starts a new conversation (the intro appears
  again) instead of being handed the old transcript.
- The obsolete `adoptOrRefresh` / `adoptConversation` helpers were removed.
- When a stale token forces a browser-wide guest-id rotation, a
  `ub:guest-identity-changed` event makes the open panel and the launcher
  watcher re-read the identity so their socket channel follows the new id.
- The intro copy now says the chat is kept “on this device” instead of
  promising phone-based recovery.
- `findFirstByConversationTypeAndBusinessIdAndGuestPhone...` replaces the
  single-result phone lookup used by order cards, so duplicate phones no longer
  throw.
- Added `PublicSupportGuestIT`:
  - same phone, different guest id → different conversation;
  - token-less resume with the owner's phone → 401;
  - valid token resume → 200.

**Trade-off:** lost local storage / a new device means no access to the old
thread. The secure follow-up is an SMS OTP recovery flow (the repo already has
the phone-verification/OTP machinery), not a return to phone-as-credential.

### CHAT-02 — ticket request bodies

- `lib/support-api.ts` now passes plain objects to `apiRequest` for
  `createTenantServingTicket` and `replyTenantServingTicket`. The previous
  `JSON.stringify` was stringified again by `apiRequest`.
- Added `lib/support-api.test.ts` pinning the serialized shape.

### CHAT-03 — guest unread while the chat is closed

- Added `GuestUnreadWatcher` at the launcher level (outside `DialogContent`),
  so the badge and chime survive the panel unmounting.
- The watcher resumes the thread for an unread snapshot, keeps the guest socket
  subscribed, filters to the current conversation, ignores the guest's own
  messages, and plays the existing chime.
- The launcher unlocks WebAudio on the first pointer/key interaction.
- Opening the chat still zeroes the badge and marks the thread read.
- No browser push notification yet; badge + chime is the Phase 0 surface.

### CHAT-04 — long `guestId`

- `StartGuestThreadRequest` now validates: type ≤16, slug ≤191, guestId ≤36,
  name ≤120, body ≤4000.
- `GET /threads/me`, `POST /threads/{id}/messages`, and the signature/read
  headers validate guestId ≤36 and token ≤256.
- The unbounded recursive retry on `DataIntegrityViolationException` was
  replaced with a single lookup: if the row now exists, return 409; otherwise
  return 400. No recursion.

### CHAT-05 — synthetic IDs and transaction isolation

- `contact-<messageId>` → the raw message UUID (36 chars).
- `buyer-order-<orderId>` → the raw order UUID (36 chars).
- Public `guestId` is capped at 36, matching `created_by`/`sender_user_id`.
- `ServingTicketService.openFromContact(ContactMessage)` runs in
  `REQUIRES_NEW`, so a ticket-intake failure can no longer poison the public
  contact-form transaction.
- Welcome cards and order cards were deliberately left atomic: committing them
  in `REQUIRES_NEW` could orphan a welcome thread or an order card if the
  registration/checkout transaction later rolls back. The correct long-term fix
  is an after-commit event; that is a Phase 3 item.

### CHAT-06 — resolve

- Added a visible **Resolve** action to the tenant support header and the
  super-admin conversation header.
- `ResolvedBanner` no longer carries a never-wired “Mark resolved” button; it
  now only shows the resolved state + Reopen.
- Sending a new message still reopens automatically on the server.

### CHAT-07 — pending vs sent

- A pending optimistic message now shows a **clock** with
  `aria-label="Sending"`, not the ✓ that means “sent”.
- The single ✓ (sent) appears only after the server acknowledges; ✓✓ remains
  the read receipt.
- “Tap to retry” was shortened to “Retry” (desktop and touch).

### CHAT-08 — failed attachments

- `ChatMessageShape` now carries a local-only `localFile` on optimistic rows.
- The blob preview is no longer revoked on failure; it is revoked only after
  the server confirms.
- Retry passes the original `File` (and any already-uploaded attachment), so a
  failed photo is re-sent instead of deleted.
- Guest chat, storefront buyer chat, tenant support, and the SA inbox all get
  the same retry path. Guest and storefront previously had **no** retry
  affordance; both now render the shared Retry row.

### CHAT-09 — background poll failure

- `SupportChat` now separates `loadError` (initial load failed) from
  `syncError` (background refresh failed).
- A failed 5-second poll leaves the thread visible and shows a slim
  “Showing the last synced messages — reconnecting…” bar with Retry.
- Polling pauses while the document is hidden; `visibilitychange` still
  triggers an immediate catch-up.

## Files changed

**Frontend**

- `frontend/lib/support-api.ts`
- `frontend/lib/support-api.test.ts` (new)
- `frontend/lib/public-support-api.ts`
- `frontend/components/support/support-chat-ui.tsx`
- `frontend/components/support/support-chat.tsx`
- `frontend/components/support/guest-support-chat.tsx`
- `frontend/components/support/storefront-buyer-inbox.tsx`
- `frontend/components/support/sa-support-inbox.tsx`

**Backend**

- `backend/.../support/application/SupportService.java`
- `backend/.../support/repository/SupportConversationRepository.java`
- `backend/.../support/api/PublicSupportController.java`
- `backend/.../serving/application/ServingTicketService.java`
- `backend/src/test/java/zelisline/ub/support/api/PublicSupportGuestIT.java` (new)

**Docs**

- This note; the audit remains unchanged.

## Verification run

| Check | Result |
|---|---|
| `bun test lib/support-api.test.ts` | 2 pass |
| `bunx tsc --noEmit` | pass |
| `bunx eslint components/support components/contact lib/support-api.ts lib/public-support-api.ts lib/support-api.test.ts` | 0 errors, 2 pre-existing warnings in `sa-support-inbox.tsx` |
| `./gradlew test --tests PublicSupportGuestIT` | pass |
| `./gradlew test --tests ContactMessagesApiIT` | pass |
| `./gradlew test --tests ServingPortalIT` | pass |
| `bun test` (full frontend suite) | 992 pass, 12 failures unrelated to chat (shop-mail-brand, PWA host, inventory access, auth recovery). These were failing before this change set and are not touched by it. |

**Not run:** a live browser session. The Next app and Spring API were not
running during this pass; MySQL was up. The UI changes are type-checked and
linted but need the manual pass below.

## Manual QA still required

1. Storefront buyer: send a photo, kill the network mid-upload, retry; confirm
   the photo is re-sent and the old failed row is replaced.
2. Close the buyer chat; reply from `/support?tab=storefront`; confirm the FAB
   badge increments and the chime plays within 2 s.
3. Open the chat; confirm the badge clears and the thread marks read.
4. Tenant support: resolve from the header; confirm the resolved banner,
   Reopen, and that a new message reopens.
5. Throttle to offline after the thread loads; confirm the thread stays visible
   with the reconnecting bar, not the full error screen.
6. Send a message on a slow connection; confirm the clock → ✓ transition and
   that no ✓ appears while pending.
7. Create/reply to a tenant ticket; confirm 201/200 and an object body in
   DevTools (CHAT-02).
8. New device/no token: confirm the intro appears and a new thread is created;
   confirm an existing device with its token still resumes.

## Known gaps / next

> **Update — 2 November 2026:** the first two items below shipped. See
> [`CHAT_GUEST_IDENTITY_RECOVERY_2026-11-02.md`](./CHAT_GUEST_IDENTITY_RECOVERY_2026-11-02.md):
> OTP recovery (`POST /api/v1/public/support/threads/recover`) and the
> order-card/guest-id thread merge. The remaining gap in that pair is
> checkout-time handoff of the browser's chat guest id, so the card lands in the
> live thread without a manual recovery.

- **OTP recovery** for the token-only identity decision. Without it, clearing
  storage loses the transcript. This is the top follow-up to CHAT-01.
- **Order-card threads** are keyed to the checkout phone, not the browser guest
  id. A buyer who orders and then opens chat for the first time gets a new
  thread; staff see the order card in the older thread. Link order cards to the
  buyer's guest id at checkout, or recover the order thread through OTP, before
  calling this flow finished.
- **`openFromContact` REQUIRES_NEW** can commit an intake ticket if the outer
  contact-form transaction later rolls back. Low likelihood (it is the last
  operation), but an after-commit event is the correct design.
- **Guest unread fetch** currently resumes the full thread just to read
  `unreadCount`. A lightweight summary endpoint should replace it before the
  public launcher sees heavy traffic.
- **Global guest-id rotation** on a stale token can still orphan the same
  browser's threads in other shops. Per-shop guest identity (or the OTP flow)
  is the structural fix.
- **No React component tests** exist in this repo. The watcher, pending clock,
  resolve header, and sync-error bar were verified by typecheck/lint and code
  review only.
- Strict-MySQL execution was not run; the backend tests use H2 in MySQL mode.
- Phase 1 (shared conversation primitives, CRM/contact/ticket adoption) is the
  next design-system pass.
