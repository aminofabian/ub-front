# Chat design pass — premium native-like messaging

This pass treats the conversation surfaces as one product: Kiosk's paper,
forest, and ink palette, with the interaction grammar of a native messaging
app. It preserves every existing permission, endpoint, and flow. No decorative
controls were added.

## Direction

The incumbent Kiosk world is the quiet Kenyan counter: paper, ink, hairline
rules, one deep green. That still holds. What changed is the **chat surface
grammar**:

- Conversation headers are compact sans, not editorial display serif.
- Avatars are circular, not stamped squares.
- Bubbles are 16px, with 6px corners where a grouped message meets its
  neighbour.
- The composer is a single soft capsule, not a boxed form.
- Panels and cards use a 12–16px radius; operator tables and controls outside
  chat keep the 2px Kiosk convention.
- Unread counts live in the right rail of a conversation row, the way native
  inboxes do, not on top of the avatar.
- Motion is short and purposeful. Infinite pings, auto-advancing carousels, and
  false "online/usually replies" claims are gone.

This is a deliberate, scoped exception to the 2px control rule for conversation
surfaces. It is recorded here so the exception does not become drift.

## System

### Typography

| Role | Treatment |
|---|---|
| Conversation title | 15px / 600 / -0.01em, sans |
| Subtitle, preview | 11.5–12px, muted ink |
| Bubble body | 15px / 1.5 |
| Sender name | 12px / 500, muted |
| Time, delivery | 10px tabular, inside the bubble |

Display serif remains for page titles, not conversation identity. Chat empty
states use 15–17px sans headings.

### Shape and surface

- Panels: `rounded-2xl`, hairline border, paper/panel fill.
- Bubbles: `16px`; grouped `6px` on the touching side.
- Composer: `1.35rem` capsule, hairline border, focus ring from the accent.
- Icon buttons: circular, 28–36px.
- Avatars: 40–44px in headers/lists, 28px in bubbles.
- Skeletons use the same rhythm as real rows and bubbles.

### Colour

- Outgoing: forest `--conversation-accent`, cream ink.
- Incoming: raised panel, ink text, hairline border.
- Timestamps: tuned to the surface (cream at 78% on forest, muted ink on paper).
- Avatar tones are forest, sand, sage, and a clay tint; no solid terracotta
  avatars.
- Media labels invert correctly on outgoing bubbles.

### Interaction

- Copy and reply are available on hover on desktop, and as quiet text actions
  under the last message of a cluster on touch.
- Copy has a clipboard fallback and a visible “Copied” state.
- Composer sends on Enter on a fine pointer; on a coarse pointer Enter inserts a
  newline and the send button is the action. IME composition is respected.
- The composer auto-grows to 140–144px.
- Dialog/headers respect safe-area insets; threads use `overscroll-contain`.
- Focus rings, text selection, caret colour, and scrollbar thumbs are themed
  from the conversation tokens.
- `prefers-reduced-motion` disables entrances, typing dots, highlights, and
  smooth scroll.

## Surface-by-surface

### Tenant support

- Header: circular Kiosk mark with a connection dot, 15px title, "Platform
  team", Resolve, sound.
- Removed the permanent green dot and “usually replies in minutes”.
- Welcome card compacted to: greeting, one sentence of scope, four common asks,
  contact line. It keeps the shop name but stops reading like a landing page.
- Empty state: soft life-buoy circle, one heading, one sentence, quiet prompt
  rows.
- Card is a 16px panel.

### Guest chat

- Removed the gradient header and radial intro wash; the panel is paper.
- Intro heading is 17px sans; fields are clean capsules; no inset-shadow
  imitation.
- Thread has a skeleton, safe-area composer, and a quiet reconnect bar.
- Launcher no longer pulses indefinitely.
- Removed the false “Usually replies in minutes” line.

### Storefront buyer inbox

- Header: 40px avatar with connection dot, buyer name, `Storefront chat · phone`
  in the subtitle, Chevron back, Escalate to Kiosk (Escalate on mobile).
- Removed the redundant “Storefront” badge on every row.
- Search is a capsule; Open/All is a segmented capsule.
- List uses 44px avatars, one-line previews, right-rail unread counts, and
  skeleton loading.
- 403/restricted behavior is unchanged.

### Super-admin support

- Header now leads with avatar, name, presence, type, and phone/slug.
- Ticket/split actions moved into a real overflow menu; Resolve stays primary.
- Linked-ticket state lives in the menu, not as a third header button.
- Presence no longer has a pinging dot.
- The auto-advancing “waiting replies” carousel is now a static row of up to six
  unread chips with tenant/visitor counts. No timers, no hidden content.
- Removed per-row type badges and the second presence line; the tab and the
  avatar dot carry that information.
- Reconnecting is surfaced in the subtitle.

### WhatsApp CRM

- The conversation pane now uses the same paper/forest theme as support.
- Header: circular contact avatar, 15px name, phone/assigned subtitle,
  circular assign/unassign actions.
- Thread has day dividers, rounded outgoing/incoming bubbles, and media labels
  that invert on forest.
- Auto-scroll still respects a user who has scrolled up.
- Composer is a capsule with a circular send button and auto-growing textarea;
  AI draft, M-Pesa, quick replies, tags, and notes are preserved but restyled.
- List filters are a segmented capsule; rows are rounded with a right-rail
  unread count; pagination remains.

### Tickets

- Ticket list uses rounded rows, circular number stamps, and a softer active
  state.
- Shared bubbles, day dividers, and composer; empty state typography matches.
- “Palmart” copy is now Kiosk.

## Shared components

- `ConversationRow` now owns avatar, one-line preview, right-rail time/unread,
  online dot, resolved check, and focus ring. Badge/footer props were removed.
- `ConversationListSkeleton` and `ChatThreadSkeleton`.
- `MessageBubble`: cluster-aware corners, hover/touch Reply + Copy, copied
  status, no layout-shifting controls.
- `Composer`: capsule, no keyboard hint, coarse-pointer newline behavior,
  accessible send state.
- `DropdownMenu`: new Radix-based paper popover for real overflow actions.
- `Avatar` / `PlatformAvatar`: circular.

## Verification

- `bunx tsc --noEmit`: pass.
- ESLint on all changed chat files: 0 errors, 0 warnings.
- Full `bun test`: 1018 pass, 12 pre-existing failures, 1 unrelated Next/Bun DOM
  error.
- `bun run build`: pass.
- `verify-legacy-safe`: 515 chunks parse-safe for old iPad Safari.
- A temporary, unauthenticated visual harness rendered the real primitives at
  390×844 (mobile emulation) and 1440×1000. It confirmed no horizontal overflow
  at 390, composer visibility, bubble wrapping, row hierarchy, and desktop
  spacing. The harness was removed; no QA route ships.
- Not yet done: authenticated screenshots of `/support`, `/support?tab=storefront`,
  `/super-admin`, and `/inbox` with production data, plus dark mode and the
  three tenant themes. Those need a signed-in session and seeded conversations.

## Limits

- No conversation-details panel was added: there is no shared-media/participant
  API to back it, so a button would be decorative.
- CRM media remains a typed preview, not a thumbnail/player/document link.
- One Inbox shell, durable notifications, and the supplier portal thread UI are
  still open.
- The chat radius exception is intentional; do not copy it onto tables,
  inventory, or settings without a surface-level decision.
