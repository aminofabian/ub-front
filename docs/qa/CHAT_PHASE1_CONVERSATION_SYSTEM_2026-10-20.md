# Chat Phase 1A — shared conversation system

This is the implementation record for the first slice of Phase 1 in
[`CHAT_MESSAGING_AUDIT_2026-10-20.md`](./CHAT_MESSAGING_AUDIT_2026-10-20.md).
It deliberately stops before the CRM/contact/queue rewrite; the shared
conversation grammar, message text renderer, unread divider, and ticket
adoption are in place.

## What changed

### 1. Kiosk-native conversation tokens

New CSS custom properties scoped to `.support-chat-theme`:

| Token | Light | Dark |
|---|---|---|
| `--conversation-paper` | `#F4F1EA` | `#0D1713` |
| `--conversation-panel` | `#FCFAF5` | `#17241F` |
| `--conversation-ink` | `#121A16` | `#F2EDE1` |
| `--conversation-muted` | `#556159` | `#B9C9BF` |
| `--conversation-rule` | `rgba(18,26,22,.10)` | `rgba(242,237,225,.12)` |
| `--conversation-accent` | `var(--primary)` / platform `#1D4B3B` | same |
| `--conversation-accent-ink` | `var(--primary-foreground)` / platform `#F2EDE1` | same |

Platform support (tenant ↔ Kiosk, SA inbox, visitor chat, tickets) now uses
forest `#1D4B3B` bubbles on paper. Storefront buyer chat keeps the shop's
primary, but `--primary-foreground` and the chat accent ink are now computed
from the brand's luminance (`lib/color-contrast.ts`) instead of always white.

### 2. Bubble presentation

- Radius `0.9rem` with `0.25-0.3rem` tails (was `1.15rem`/`0.45rem`).
- Body `0.9rem / 1.5`, padding `0.65rem 0.85rem 0.5rem`, max width
  `min(28rem, 86%)`.
- No bubble drop shadows; incoming bubbles are paper panels with a hairline.
- Timestamps use Geist Mono at 10px; outgoing time uses a readable mix of the
  accent ink.
- Composer surface uses the conversation paper, not a white gradient.

### 3. `MessageBody` — links, emails, phones

- `lib/message-text.ts` parses plain text into text/url/email/phone segments
  without regex lookbehind or `String.matchAll` (both unsafe for the stated
  Safari/iOS baseline).
- `components/conversations/message-body.tsx` renders the segments; URLs open
  in a new tab, emails use `mailto:`, Kenyan phone numbers use `tel:`.
- Used by every `MessageBubble`, plus CRM, contact messages, and supplier
  messages.
- Tests: `lib/message-text.test.ts` (6 cases).

### 4. New messages divider

- `NewMessagesDivider` in `support-chat-ui.tsx`.
- Each surface computes the first incoming message with `readAt === null`
  **before** it marks the thread read, so the divider marks where the unread
  conversation began:
  - tenant support: `SUPER_ADMIN` messages;
  - SA inbox: `TENANT` or `GUEST` messages;
  - storefront buyer inbox: `GUEST` messages;
  - guest chat: non-`GUEST` messages.

### 5. Touch and accessibility

- Reply is now a visible text action under the last message of a cluster on
  phones; the hover-only circular button is desktop-only.
- Composer hint says “Tap send to send” on phones and “Enter to send …” on
  desktop; contrast raised from 65% to 80%.
- Threads expose `role="log" aria-live="polite" aria-relevant="additions"`.
- Composer textarea has an `aria-label`; typing indicator is `role="status"`.
- `prefers-reduced-motion` disables bubble entrances, ping/pulse, typing dots,
  and highlight flashes inside the conversation theme.

### 6. Ticket adoption

- The tenant ticket thread in `tenant-serving-tickets.tsx` now uses the shared
  `MessageBubble`, `Composer`, `DayDivider`, `getMessageCluster`, and
  `chatDayLabel`. It gains timestamps, left/right alignment, clustering,
  linkified text, the forest/paper theme, and the shared composer states.
- Attachments stay disabled because the tenant ticket endpoint accepts body
  text only; the composer retains draft text if the send fails.
- The SA ticket workspace now carries the platform conversation theme, so the
  same ticket looks consistent on both sides.

### 7. Shared conversation row

- New `components/conversations/conversation-row.tsx`: avatar, name, optional
  phone/badge, 2-line preview, relative time, unread badge or resolved check.
- Adopted in the storefront buyer list and the super-admin queue. Both now use
  the same row anatomy instead of two hand-rolled versions.
- Rows expose `aria-current` and a screen-reader “N unread” label.

## Files changed

- `frontend/app/globals.css`
- `frontend/components/conversations/message-body.tsx` (new)
- `frontend/components/conversations/conversation-row.tsx` (new)
- `frontend/lib/message-text.ts` + `.test.ts` (new)
- `frontend/lib/color-contrast.ts` + `.test.ts` (new)
- `frontend/components/support/support-chat-ui.tsx`
- `frontend/components/support/support-chat.tsx`
- `frontend/components/support/guest-support-chat.tsx`
- `frontend/components/support/storefront-buyer-inbox.tsx`
- `frontend/components/support/sa-support-inbox.tsx`
- `frontend/components/support/tenant-serving-tickets.tsx`
- `frontend/components/super-admin/serving-ticket-workspace.tsx`
- `frontend/lib/storefront-theme.ts`
- `frontend/app/(dashboard)/inbox/_components/inbox-workspace.tsx`
- `frontend/app/(dashboard)/messages/_components/messages-theatre.tsx`
- `frontend/app/(supplier-portal)/supplier-portal/messages/page.tsx`

## Verification

| Check | Result |
|---|---|
| `bunx tsc --noEmit` | pass |
| ESLint on changed chat/conversation files | 0 errors; 2 pre-existing warnings in `sa-support-inbox.tsx` |
| `bun test lib/message-text.test.ts lib/color-contrast.test.ts lib/support-api.test.ts` | 11 pass |
| Full `bun test` | 1001 pass, 12 pre-existing failures, 1 unrelated Next/Bun DOM error |
| `bun run build` (Next.js production build) | pass; `/verify-legacy-safe` reports 490 chunks free of parse-fatal syntax for old iPad Safari |
| `postcss.parse(app/globals.css)` | pass |

**Not run:** a live browser/visual pass. Contrast values are computed; the
forest/paper composition and storefront theme variants still need a real
1440/390 screenshot review, including dark mode and at least three tenant
brand colours.

## Still to do in Phase 1

- Adopt `ConversationRow` in the CRM list (needs a last-message preview from
  the API) and define a compact density for the agent queue.
- CRM and contact-message bubble adoption (they are linkified but still use
  their own row and bubble structures).
- Unify CRM's composer/send states (queued/sent/failed) with the shared model.
- Server-side message search and pagination.
- Screenshot/visual QA and dark-mode review.

## Next

Phase 1B is the queue/list + CRM/contact adoption. Phase 2 from the audit is
the one-inbox/one-unread-truth work; it should follow the visual pass, not
precede it.
