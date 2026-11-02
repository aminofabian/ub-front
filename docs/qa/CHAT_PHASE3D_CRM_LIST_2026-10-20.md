# Chat Phase 3D — CRM conversation list previews and pagination

The WhatsApp inbox list previously showed only name/phone/time/unread. It now
shows what the customer actually said, and pages beyond the first 40 are
reachable.

## What changed

### Backend

- `CrmDtos.ConversationRow` gained:
  - `lastMessagePreview`
  - `lastMessageType`
  - `lastMessageDirection`
- `CrmMessageRepository.findLatestForConversations(ids)` returns one newest
  message per conversation (created-at with id tiebreaker) so the list does not
  do an N+1 lookup.
- `CrmConversationService.list` resolves the latest messages for the page and
  passes them to `toRow`.
- `CrmConversationService.get` reuses the loaded message list for the detail’s
  preview.
- Preview helper:
  - image → `Photo · caption`
  - audio → `Voice note`
  - video → `Video · caption`
  - document → filename or `Document`
  - sticker → `Sticker`
  - location → `Location`
  - text/other → body, truncated to 120 chars.

### Frontend

- `CrmConversationRow` type carries the three optional preview fields.
- The list row shows `You: …` for outbound messages, otherwise the inbound
  preview; it falls back to the phone number, then “No messages yet”.
- Added a **Load older** button with `(loaded of total)`; the CRM list pages in
  40-row chunks and appends. The list resets to page 0 on filter change or a
  realtime refresh.

### Test

`WhatsAppInboundIngestIT` now asserts the list’s first item has:

- preview `Hello shop`;
- type `text`;
- direction `inbound`.

## Files changed

- `backend/.../crm/api/dto/CrmDtos.java`
- `backend/.../crm/repository/CrmMessageRepository.java`
- `backend/.../crm/application/CrmConversationService.java`
- `backend/src/test/java/zelisline/ub/crm/application/WhatsAppInboundIngestIT.java`
- `frontend/lib/crm.ts`
- `frontend/app/(dashboard)/inbox/_components/inbox-workspace.tsx`

## Verification

| Check | Result |
|---|---|
| Backend `WhatsAppInboundIngestIT` | 2 tests pass |
| `bunx tsc --noEmit` | pass |
| ESLint on changed files | 0 errors |
| Full `bun test` | 1018 pass, 12 pre-existing failures, 1 unrelated Next/Bun DOM error |
| `bun run build` | pass |
| `verify-legacy-safe` | 490 chunks parse-safe |

## Remaining

- Real media download/thumbnails/player/document links.
- Server-side conversation search.
- One Inbox shell, durable notifications.
- Supplier portal per-shop thread UI.
- Visual QA.
