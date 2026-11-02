# Chat Phase 2A — one unread source, correct counts

This is the implementation record for the unread/count slice of Phase 2 in
[`CHAT_MESSAGING_AUDIT_2026-10-20.md`](./CHAT_MESSAGING_AUDIT_2026-10-20.md).
It does not yet merge the three Inbox destinations or add the support
permissions; those remain Phase 2B.

## What changed

### 1. One unread provider

`SupportUnreadProvider` (`components/support/support-unread-provider.tsx`) is
mounted once in `app/(dashboard)/layout.tsx`. It owns:

- the `support` realtime listener;
- one 15 s reconciliation poll;
- the platform/storefront counts;
- the contact-form unread count (the `Messages` destination);
- message-id dedupe so reconnects/echoes do not double-count.

`hooks/use-support-unread.tsx` is now a thin re-export. The five previous hook
instances (`app-shell`, `notification-bell`, `notifications-drawer`,
`support-launcher`, `support-unread-watcher`) consume the same context. The
polling load drops from ~10 requests/15 s to 3 requests/15 s per tab, with one
listener instead of five.

If a user lacks `messages.read`, the contact count request fails independently
and the support counts keep reconciling.

### 2. Messages nav badge

The dashboard nav now shows the contact-form unread count on the `Messages`
row, alongside the existing Support badge. Both come from the same provider.
The notifications drawer also has a “New Talk to Us message” row, and the
super-admin `Messages` nav item now carries a 30 s-polled badge via
`useSaContactUnread`.

### 3. Contact unread counts are server-wide

- New endpoints:
  - `GET /api/v1/contact-messages/unread-count` (`messages.read`);
  - `GET /api/v1/super-admin/contact-messages/unread-count` (`sa.inbox.access`).
- `ContactMessageRepository` gained scoped unread counts.
- `ContactMessagesInbox` no longer computes unread from the loaded 50-row page.
  It uses the server count, and the banner/pulse totals use the server
  `totalElements`.
- `ContactMessagesInbox` now supports **Load older messages** with page
  appending. The list still opens on page 0 (50 rows), but older pages are no
  longer unreachable.
- The reply success message is no longer wiped by the refetch that follows a
  send; filter changes clear feedback intentionally.

### 4. CRM badge clears on open

Opening a WhatsApp CRM thread now zeroes that row's `unreadCount` locally after
the detail load (the server GET already marks it read), so the badge no longer
looks stuck until the next list refresh.

### 5. SA badge matches the visible inbox

`SupportService.adminUnreadCount` now skips conversations filtered out by
`visibleInAdminInbox`, so standalone ticket threads that never appear in the
inbox no longer keep the SA badge above zero.

### 6. Duplicate nav row removed

The second `Messages` entry under Reports was removed; the Inbox group is the
one place to reach it.

### 7. Test-only rate-limit fix

`backend/src/test/resources/application-test.properties` raises the public
contact/support rate limits for the test JVM. The integration class submits
more forms than the production 8/min window, which made a later test fail with
429 depending on method order. This does not change production limits.

## Files changed

**Frontend**

- `frontend/components/support/support-unread-provider.tsx` (new)
- `frontend/hooks/use-support-unread.tsx` (re-export)
- `frontend/hooks/use-sa-contact-unread.tsx` (new)
- `frontend/components/super-admin/super-admin-shell.tsx`
- `frontend/components/notifications-drawer.tsx`
- `frontend/app/(dashboard)/layout.tsx`
- `frontend/components/app-shell.tsx`
- `frontend/components/contact/contact-messages-inbox.tsx`
- `frontend/app/(dashboard)/messages/_components/messages-theatre.tsx`
- `frontend/app/(dashboard)/messages/page.tsx`
- `frontend/app/super-admin/(console)/messages/page.tsx`
- `frontend/app/(dashboard)/inbox/_components/inbox-workspace.tsx`
- `frontend/lib/api.ts`
- `frontend/lib/super-admin-api.ts`

**Backend**

- `backend/.../messages/repository/ContactMessageRepository.java`
- `backend/.../messages/application/ContactMessageService.java`
- `backend/.../messages/api/ContactMessagesController.java`
- `backend/.../messages/api/SuperAdminContactMessagesController.java`
- `backend/.../support/application/SupportService.java`
- `backend/src/test/resources/application-test.properties`
- `backend/src/test/java/zelisline/ub/messages/api/ContactMessagesApiIT.java`

## Verification

| Check | Result |
|---|---|
| `bunx tsc --noEmit` | pass |
| ESLint on changed files | 0 errors; only pre-existing warnings |
| Full `bun test` | 1010 pass, 12 pre-existing failures, 1 unrelated Next/Bun DOM error |
| `bun run build` | pass |
| `verify-legacy-safe` | 490 chunks free of parse-fatal syntax |
| `ContactMessagesApiIT` | 9 tests pass (includes new unread-count assertions) |
| `PublicSupportGuestIT` | 3 tests pass |
| `ServingPortalIT` | 5 tests pass |

## Remaining Phase 2 work

- Consolidate the three Inbox destinations (WhatsApp inbox / Messages /
  Support) into one permission-aware Inbox shell.
- Add the support permission split (`support.chat.*`,
  `support.storefront.*`, `support.resolve`).
- Durable notification rows/email fallback for support + buyer replies, with
  exact conversation deep links.
- CRM/contact bubble adoption and the last-message preview the CRM list lacks.
- Screenshot/visual QA (light/dark, 390/1440, three tenant brands).
