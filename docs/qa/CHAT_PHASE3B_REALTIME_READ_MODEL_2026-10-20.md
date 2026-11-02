# Chat Phase 3B — realtime errors, guest fallback, read model

This closes three reliability gaps from the audit: WebSocket errors were
invisible, guest chat had no fallback when the socket dropped, and `GET`
detail endpoints were mutating read state (with a write every 5 s poll).

## What changed

### 1. WebSocket error frames are parsed

The server sends `{"type":"error","code":…,"message":…}` at the top level, but
the client read `frame.data.code`; the resulting TypeError was swallowed as
“Failed to parse frame”, so `onError` never fired.

- New `lib/realtime-error.ts` parses both the current top-level shape and the
  legacy nested shape.
- `RealtimeClient.dispatch` now reports the error, reauthenticates on `4401`,
  and logs `4403` channel rejections.
- Tests: `lib/realtime-error.test.ts` (3 cases).

### 2. Guest chat has a fallback sync

`guest-support-chat.tsx` previously relied entirely on the socket; a dropped
connection meant no replies until the user reopened the chat.

- Added a 5 s silent `loadThread(true)` poll while the panel is open, paused
  when the tab is hidden, plus a `visibilitychange` catch-up.
- Added a `syncError` bar (“Showing the last synced messages — reconnecting…”)
  with Retry; a failed background sync no longer replaces the thread with an
  error screen.
- Read marking is conditional: only when the payload contains unread staff
  messages, so a healthy poll does not write every 5 s.

### 3. Read state is explicit, not a GET side effect

- `GET /support/storefront/conversations/{id}` no longer calls
  `markStorefrontStaffRead`.
- `GET /super-admin/support/conversations/{id}` no longer calls
  `markAdminRead`.
- The UI calls the explicit read POST when opening a thread:
  - storefront inbox: `markStorefrontBuyerConversationRead`;
  - SA inbox: `markSaSupportConversationRead`.
- Silent polls now detect unread incoming messages and mark read, so realtime-
  down delivery still clears the badge correctly.
- Tenant support and guest chat only call mark-read when unread messages exist.

This removes the write amplification and the “GET changes state” contract
problem while preserving read receipts and unread counts.

## Files changed

- `frontend/lib/realtime-error.ts` + `.test.ts` (new)
- `frontend/lib/realtime.ts`
- `frontend/components/support/guest-support-chat.tsx`
- `frontend/components/support/support-chat.tsx`
- `frontend/components/support/storefront-buyer-inbox.tsx`
- `frontend/components/support/sa-support-inbox.tsx`
- `backend/.../support/api/SupportController.java`
- `backend/.../support/api/SuperAdminSupportController.java`

## Verification

| Check | Result |
|---|---|
| `bun test lib/realtime-error.test.ts` | 3 pass |
| `bunx tsc --noEmit` | pass |
| ESLint on changed files | 0 errors; 2 pre-existing SA warnings |
| Full `bun test` | 1013 pass, 12 pre-existing failures, 1 unrelated Next/Bun DOM error |
| `bun run build` | pass |
| `verify-legacy-safe` | 490 chunks parse-safe |
| Backend `PublicSupportGuestIT` | 4 pass |
| Backend `ServingPortalIT` | 6 pass |
| Backend `ContactMessagesApiIT` | 9 pass |

## Remaining realtime/read work

- Transport-level catch-up with a per-conversation cursor (the server endpoint
  exists; the client still does not send it).
- Concurrent idempotency race: reload the existing message if the unique index
  wins a simultaneous insert.
- Cursor pagination/virtualization for long threads.
- CRM media ingest/render.
- One Inbox shell and durable notifications.
