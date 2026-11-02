# Chat Phase 2B — storefront buyer permission gate

This is the security slice of Phase 2: stop every staff role from reading
storefront buyer conversations and their phone/order data.

## Decision

The product already has a customer-inbox permission pair:
`messages.read` / `messages.reply` (seeded to owner and admin in
`V167__contact_messages.sql`). A dedicated `support.storefront.*` pair would be
cleaner long-term, but introducing new permission keys requires a new role
seed and test-role updates. For this pass the existing customer-inbox pair is
used as the storefront-conversation permission. That closes the exposure now
without a risky permission migration.

A later pass can split the key names once the role/seed work is scheduled.

## What changed

### Backend

`SupportController` storefront routes now enforce:

| Route | Guard |
|---|---|
| `GET /support/storefront/conversations` | `messages.read` |
| `GET /support/storefront/conversations/{id}` | `messages.read` |
| `POST /support/storefront/conversations/{id}/read` | `messages.read` |
| `GET /support/storefront/unread-count` | `messages.read` |
| `POST /support/storefront/conversations/{id}/messages` | `messages.reply` |

The platform support thread and the tenant ticket routes are unchanged; every
staff role can still ask Kiosk for help.

The escalation route is intentionally left unchanged for now: it only creates a
ticket from a conversation id and verifies tenant ownership, and the existing
`ServingPortalIT` seed does not grant `messages.reply`. It does not return the
transcript. Add `messages.reply` there when the test role seed is updated.

### Frontend

- `/support` reads `messages.read` / `messages.reply` from the dashboard
  session.
- The **Storefront buyers** tab is hidden without `messages.read`.
- A direct `/support?tab=storefront` link shows a restricted-access panel
  instead of an empty/error inbox.
- `StorefrontBuyerInbox` accepts `canReply`; the composer is disabled with a
  clear hint, and Escalate is disabled, without `messages.reply`.
- `fetchStorefrontBuyerUnreadCount` is now `toast: false`, so the shared unread
  provider does not fire a 403 toast every 15 s for roles without the
  permission.

### Tests

- `ServingPortalIT.storefrontBuyerListRequiresMessagesRead` asserts a role
  without the permission gets 403.
- The existing serving, contact, and guest suites still pass.

## Verification

| Check | Result |
|---|---|
| Backend `ServingPortalIT` | 6 tests pass |
| Backend `ContactMessagesApiIT` | 9 tests pass |
| Backend `PublicSupportGuestIT` | 3 tests pass |
| `bunx tsc --noEmit` | pass |
| ESLint on changed files | 0 errors |
| Full `bun test` | 1010 pass, 12 pre-existing failures, 1 unrelated Next/Bun DOM error |
| `bun run build` | pass |
| `verify-legacy-safe` | 490 chunks parse-safe |

## Remaining security / IA work

- Dedicated `support.storefront.*` permission keys and a manager grant.
- Guard the storefront escalation route once the test role seed includes
  `messages.reply`.
- Platform support permission (`support.chat.*`) if the owner's platform thread
  should not be visible to cashiers.
- One permission-aware Inbox shell (WhatsApp inbox / Messages / Support).
- Durable notifications and exact conversation deep links.
