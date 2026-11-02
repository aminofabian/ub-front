# Guest identity recovery — OTP transcripts and order-card thread merge

**Date:** 2 November 2026
**Slices:** CHAT-01 follow-up (guest OTP recovery) and the order-card ↔ guest identity gap.
**Status:** shipped — backend + storefront/visitor chat UI + tests.

---

## The two bugs this closes

1. **Clearing storage lost the transcript.** After Phase 0, a guest token was the
   only credential that opened a thread (correct — a phone number must not open
   someone else's chat). The cost was that a buyer who cleared their browser, or
   opened the shop on a second device, could never see their history again: the
   chat simply started over.
2. **One buyer, two threads.** Checkout posts the order card into a thread keyed
   by the checkout phone (`buyer-phone-<digits>`), while the buyer's floating
   storefront chat lives under a random browser guest id. Staff saw two halves of
   the same person, and the buyer never saw the order card or the staff replies
   written against it.

Both are the same missing piece: a **verified** way for a phone to re-anchor a
browser to its existing threads.

---

## What shipped

### API

`POST /api/v1/public/support/threads/recover`

```json
{
  "type": "STOREFRONT" | "VISITOR",
  "businessSlug": "palmart",
  "guestId": "<this browser's guest id>",
  "phone": "0712 345 678",
  "phoneVerificationToken": "<single-use token from the shopper identify flow>"
}
```

Returns `GuestThreadDto` — the merged conversation, its messages, and a **freshly
minted guest token** (always present, unlike resume).

The verification token comes from the existing platform identification flow, so
no new OTP machinery was written:

1. `POST /api/v1/public/shopper/auth/identify/send-code` `{ phone }`
2. `POST /api/v1/public/shopper/auth/identify/verify-code` `{ phone, code }` →
   `phoneVerificationToken`
3. `POST /api/v1/public/support/threads/recover` (consumes the token)

`phoneVerificationToken` is consumed by
`ShopperIdentifyService.consumeVerifiedPhone(...)`, so a recovery credential is
single-use and short-lived. A typed phone still opens nothing: without the token
the endpoint answers `400`.

### Merge semantics (`SupportService.guestRecover`)

- Every thread for the verified phone in that `(type, business)` — plus the
  browser's own thread — is folded into the **most recently active phone thread**.
- Messages are **moved with their timestamps** (no copy, no duplication), and
  colliding `client_message_id` idempotency keys are cleared on the absorbed side
  first so the unique index cannot reject the move.
- Read watermarks (`guest_`, `tenant_`, `admin_last_read_at`) keep the **later**
  timestamp; the surviving thread's preview/`last_message_at` is recomputed from
  its real newest message. Merging never invents unread state.
- The emptied shells are deleted **before** the survivor adopts the browser's
  `guest_id` (the `(type, business, guest_id)` unique key stays satisfied).
- The survivor is re-bound to this browser's guest id and a new token is minted,
  which rotates the previous device out — recovery is "one device at a time", the
  same rule creation already used.
- If the phone has no thread but this browser does, the browser's thread is
  simply stamped with the verified number (the "chatted before ever ordering"
  case) and given a fresh token.

### Order-card linking is now phone-form tolerant

`ensureStorefrontThreadForOrder` used to match the checkout phone as an exact
string. `0712…`, `254712…`, `+254712…` were three different buyers. It now
matches through `KenyanPhoneForms.lookupCandidates(...)` plus the `+`-prefixed
forms, so a checkout whose phone format differs from the stored thread finds the
same conversation instead of splitting it. Recovery uses the same candidate
lookup.

### UI (visitor + storefront chat, one component, both surfaces)

- Intro sheet: **"Changed device or cleared your browser? Recover your chat"** →
  phone → 4-digit code → the transcript comes back.
- Empty-thread state: **"Ordered before? Recover your earlier chat"**, for the
  buyer who ordered, opened chat afterwards, and landed in a fresh thread.
- The recovery sheet is protected from the 5-second background sync: a poll that
  finds the thread must not close the sheet while a code is being typed.
- Failures are shown in place using the API's problem detail ("Incorrect
  verification code", "No chat found for this number yet").

---

## Files

| Layer | File |
|---|---|
| API | `backend/.../support/api/PublicSupportController.java` (`/threads/recover`, request record) |
| Flow | `backend/.../support/application/GuestThreadRecoveryService.java` (one transaction: consume OTP token + merge, so a miss never burns the token) |
| Service | `backend/.../support/application/SupportService.java` (`guestRecover`, `mergeThreadInto`, `phoneLookupCandidates`, `firstStorefrontThreadForPhone`) |
| Repos | `SupportConversationRepository.findAllByGuestPhoneIn`, `SupportMessageRepository.reassignConversation` / `findClientMessageIds` / `clearClientMessageIds` / `findTopByConversationIdOrderByCreatedAtDesc` |
| Identity | `backend/.../storefront/application/ShopperIdentifyService.java` (`consumeVerifiedPhone`) |
| Client | `frontend/lib/public-support-api.ts` (`sendGuestRecoveryCode`, `verifyGuestRecoveryCode`, `recoverGuestThread`) |
| UI | `frontend/components/support/guest-support-chat.tsx` |
| Tests | `backend/.../support/api/PublicSupportGuestIT.java`, `frontend/lib/public-support-recovery.test.ts` |
| Contract | `docs/openapi/phase-1.yaml` (new path + `RecoverGuestThreadRequest`; regenerate the TS client with `bun run codegen`) |

No migration: no new columns. The merge reuses `guest_phone`
(`idx_support_conv_guest_phone`, V243) and the existing unique keys from V241.

---

## Verification

- `./gradlew test --tests PublicSupportGuestIT` — 7 tests, 0 failures. New cases:
  - recovery without a verified token is rejected (`400`);
  - an unknown number creates nothing (`404`) and does **not** burn the
    single-use verification token (a retry with the same token is still `404`,
    not `400`);
  - recovery merges the order thread and the buyer's thread: both message bodies
    survive on one conversation, the absorbed shell is gone, the browser id opens
    the merged thread with the new token, and **both** superseded credentials
    open nothing.
- `./gradlew test` for `ShopperIdentifyServiceTest` + `ServingPortalIT` — green.
- `bun test lib/public-support*` — 7 tests, 0 failures.
- `tsc --noEmit` and `eslint` on the changed frontend files — clean.

---

## Honest gaps / next

- **Messaging must be configured.** `identify/send-code` returns `400` with an
  explicit message when neither SMS nor WhatsApp is set up for the platform. The
  chat shows that message verbatim; it is an operator setup issue, not a silent
  failure.
- **Checkout-time guest handoff is not done.** A buyer who chats *before*
  ordering still gets the order card in a phone-keyed thread, because checkout
  does not send the browser's chat guest id. Recovery reconciles it, but the
  root-cause fix is to pass the chat guest id through checkout so the card lands
  in the live thread in the first place.
- **Recovery is manual.** There is no automatic "this browser probably belongs to
  this phone" prompt on open; the visitor opts in.
- **No peer-device sync.** Recovering on device B rotates device A's token out.
  Continuing on two devices at once needs per-device credentials, which is a
  larger identity model (and probably the signed-in shopper account).
- **The idempotency race (concurrent duplicate `client_message_id`) is still
  unhandled**: `persistNewMessage` relies on the unique index but does not yet
  catch the violation and return the existing row. That is the other P0 still
  open in the chat family.
- **Unified Inbox shell** (WhatsApp / Storefront / Messages / Support / Tickets in
  one permission-aware surface) is untouched and remains the next slice.
