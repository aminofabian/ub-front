# Chat Phase 3C — supplier reply loop + CRM media fallback

This closes two “message disappears” problems: shop replies to supplier
messages never reached the supplier portal, and WhatsApp media rendered as
blank bubbles.

## 1. Supplier replies now reach the portal

Supplier portal messages create a tenant `ContactMessage` with a synthetic
address like `supplier-portal@<id8>.local`. The tenant inbox could only reply
by email, which bounced.

- `SupplierPortalMessageRepository.findByContactMessageId`.
- `SupplierPortalMessagesService.recordShopReplyForContact(...)` finds the
  original portal message by contact-message id and records a `FROM_SHOP`
  message in the supplier thread.
- `DirectContactReplySender` detects `supplier-portal@…local` and
  `supplier-hub@…local` addresses and routes the reply in-app. If no portal
  message exists, it falls back to the existing email path.
- The tenant still sees a normal reply row (`channel=EMAIL`, `outcome=sent`,
  `detail=supplier-portal`); the supplier sees the shop’s reply in the portal.
- Unit test `DirectContactReplySenderSupplierTest` covers both routing and the
  fallback, and asserts no email is sent for a routed supplier message.

The supplier portal UI is still a flat cross-shop log; a per-shop thread and
attachment support remain Phase 4 work.

## 2. CRM media no longer renders blank

`inbox-workspace.tsx` now renders a media header based on `CrmMessageRow.type`:

- Photo (image caption still renders below it)
- Voice note
- Video
- Document (filename from the stored body)
- Sticker
- Location shared
- “Unsupported message” fallback for unknown/system types

The CRM thread also has stick-to-bottom auto-scroll with a near-bottom check,
so incoming messages no longer land off-screen.

This is a **presentation** fix, not media download: no thumbnail, audio player,
or document link yet. Those require Meta media-id download, storage, and a
proxied URL.

## Files changed

- `backend/.../marketplace/repository/SupplierPortalMessageRepository.java`
- `backend/.../marketplace/application/SupplierPortalMessagesService.java`
- `backend/.../messages/application/DirectContactReplySender.java`
- `backend/src/test/java/zelisline/ub/messages/application/DirectContactReplySenderSupplierTest.java` (new)
- `frontend/app/(dashboard)/inbox/_components/inbox-workspace.tsx`

## Verification

| Check | Result |
|---|---|
| Backend `DirectContactReplySenderSupplierTest` | 2 pass |
| Backend `ContactMessagesApiIT` | 9 pass |
| Backend `PublicSupportGuestIT` | 4 pass |
| `bunx tsc --noEmit` | pass |
| ESLint on changed files | 0 errors |
| Full `bun test` | 1018 pass, 12 pre-existing failures, 1 unrelated Next/Bun DOM error |
| `bun run build` | pass |
| `verify-legacy-safe` | 490 chunks parse-safe |

## Remaining

- Download/store WhatsApp media, thumbnails, audio player, document links.
- Supplier portal per-shop thread UI and attachments.
- CRM conversation-list last-message preview and pagination.
- One Inbox shell / durable notifications.
- Visual QA.
