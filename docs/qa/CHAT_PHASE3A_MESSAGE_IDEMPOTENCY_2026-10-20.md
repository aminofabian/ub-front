# Chat Phase 3A — message idempotency

This is the first reliability slice of Phase 3: a retry after a lost HTTP
response must not create a duplicate chat message.

## What changed

### Database

`V358__support_message_client_id.sql` adds:

- `support_messages.client_message_id VARCHAR(64) NULL`;
- `UNIQUE (conversation_id, client_message_id)`.

Legacy/system rows keep `NULL`; MySQL allows multiple `NULL`s in a unique
index. System cards (welcome/order) are unaffected.

### Backend

- `SendSupportMessageRequest` gained `clientMessageId` (`@Size(max = 64)`).
- `SupportMessage` maps the new column.
- `SupportMessageRepository.findByConversationIdAndClientMessageId`.
- `SupportService.persistMessage` checks for an existing row with the same
  conversation + client id before normalizing/saving and returns that message
  DTO on a retry. The unique index is the final guard for concurrent attempts.
- `StartGuestThreadRequest` also accepts a client id, so the first guest
  message is covered by the same contract.

The pre-check is sequential-retry safe. A true concurrent duplicate still
relies on the unique index; the losing request would need a retry/reload path
in a later pass.

### Frontend

- New `lib/client-id.ts` creates a stable logical-message id.
- `ChatMessageShape` and `ComposerSendPayload` carry `clientMessageId`.
- Tenant support, guest chat, storefront buyer chat, and the SA inbox generate
  the id once, include it in the optimistic row, send it to the API, and reuse
  it when the failed row is retried.
- The guest's first message passes the id through `startGuestThread`, and
  attachment sends pass it through `sendGuestMessage`.
- API clients forward `clientMessageId` in the request body.

A failed send now has the same id on the first attempt and every retry. If the
first request actually committed but the response was lost, the retry returns
the original message instead of creating a second row.

## Files changed

**Backend**

- `backend/src/main/resources/db/migration/V358__support_message_client_id.sql`
- `backend/.../support/domain/SupportMessage.java`
- `backend/.../support/repository/SupportMessageRepository.java`
- `backend/.../support/api/dto/SendSupportMessageRequest.java`
- `backend/.../support/application/SupportService.java`
- `backend/.../support/api/PublicSupportController.java`
- `backend/src/test/java/zelisline/ub/support/api/PublicSupportGuestIT.java`

**Frontend**

- `frontend/lib/client-id.ts` (new)
- `frontend/components/support/support-chat-ui.tsx`
- `frontend/components/support/support-chat.tsx`
- `frontend/components/support/guest-support-chat.tsx`
- `frontend/components/support/storefront-buyer-inbox.tsx`
- `frontend/components/support/sa-support-inbox.tsx`
- `frontend/lib/support-api.ts`
- `frontend/lib/public-support-api.ts`
- `frontend/lib/super-admin-api.ts`

## Verification

| Check | Result |
|---|---|
| Backend `PublicSupportGuestIT` | 4 tests pass, including duplicate client id returns the same message and one row |
| Backend compile | pass |
| `bunx tsc --noEmit` | pass |
| ESLint on changed files | 0 errors (2 pre-existing SA warnings) |
| Full `bun test` | 1010 pass, 12 pre-existing failures, 1 unrelated Next/Bun DOM error |
| `bun run build` | pass |
| `verify-legacy-safe` | 490 chunks parse-safe |

## Remaining reliability work

- Concurrent duplicate race handling (reload on unique-constraint failure).
- Read-on-GET and 5 s read-write churn.
- Cursor pagination and virtualized long threads.
- WebSocket error-frame parsing and catch-up.
- CRM media ingest/render.
- One Inbox shell / durable notifications.
