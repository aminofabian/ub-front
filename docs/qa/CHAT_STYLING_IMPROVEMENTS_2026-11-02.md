# Chat styling improvements — 2 November 2026

**Scope:** visual design only. No product, permissions, realtime, or identity work.
**Authority:** `frontend/DESIGN.md`, `docs/qa/CHAT_DESIGN_PASS_2026-10-20.md`, and the
live conversation grammar in `support-chat-ui.tsx` / `.support-chat-theme`.
**Method:** static code audit of every messaging surface under `frontend/`.
Unauthenticated visual QA is still open (see §Verify).

---

## Design read

Operate-mode messaging for shop staff and buyers. Target language: the Oct 20
chat design pass — paper/forest conversation tokens, 16/6 bubble clusters,
capsule composer, circular avatars, Manrope body + Geist Mono meta. Not a
redesign; bring every surface up to that grammar and stop the 2px operator
overrides from flattening it.

---

## Executive verdict

The support-chat family (tenant, guest, SA thread, storefront thread) already
owns a coherent native-like grammar. Four surfaces still sit outside it, and
two cross-cutting CSS bugs undermine the surfaces that already adopted it:

1. **WhatsApp CRM** uses `--conversation-*` without a `.support-chat-theme`
   scope — accent and rule tokens are unset on the thread.
2. **Global 2px radius overrides** (`.tablet-app-root`, `.premium-portal`,
   `.sa-console`, …) flatten `rounded-xl` / `rounded-2xl` panels and cards next
   to surviving 16px bubbles and the 1.35rem capsule. The chat radius
   exception is documented but not enforced in CSS.
3. **Tickets, contact Messages, supplier portal, SokoMind** still speak other
   visual languages (serving tokens, teal/mint theatre, portal cream, tablet
   header leaf).

Fix order: protect the grammar in CSS → patch CRM → unify shared chrome →
bring the four outliers in.

---

## Target grammar (do not invent a new one)

| Element | Spec |
|---|---|
| Theme scope | `.support-chat-theme` (+ `--platform` or shop accent) |
| Paper / panel / ink / muted / rule / accent | `--conversation-*` only |
| Bubble | 16px; clustered corners 6px |
| Composer | `1.35rem` capsule, accent focus ring |
| Panel / list shell | 12–16px radius (exception to operator 2px) |
| Avatar | Circular, 40–44px header / list, 28px in bubble |
| Title | 15px / 600 / −0.01em Manrope |
| Body | 15px / 1.5 |
| Subtitle / preview | 11.5–12px muted |
| Meta / time | Geist Mono ~10–10.5px tabular |
| Unread | Right rail of row, ≥10px |
| Motion | 150–280ms, `cubic-bezier(0.22, 1, 0.36, 1)`; honor `prefers-reduced-motion` |
| Hues | Forest + paper only; terracotta for one micro-moment max. No sky / mint / legacy `#28a745` / `#0f766e` |

---

## P0 — broken or actively wrong look

**Status: all four shipped in pass 1 (2 Nov 2026).**

| ID | Issue | Where | Fix |
|---|---|---|---|
| STY-01 | CRM thread reads `--conversation-accent` / `--conversation-rule` with **no** `.support-chat-theme` scope | `inbox-workspace.tsx` thread `<section>` | Add `support-chat-theme support-chat-theme--platform support-surface` (or hoist tokens to a parent that wraps list + thread) |
| STY-02 | Chat radius exception not enforced; operator scopes force 2px on `rounded-xl`/`rounded-2xl` | `globals.css` (`.tablet-app-root`, `.premium-portal`, `.sa-console`, `.hub-paper`, …) | Opt chat out: e.g. `.support-chat-theme .rounded-xl/.rounded-2xl { border-radius: revert-layer }` **or** named utilities (`.support-radius-panel` = 16px, `-row` = 12px) that overrides cannot match. Document next to the design-pass exception note |
| STY-03 | Guest thread uses `space-y-2.5` **and** cluster `gapClass` — space-y wins, clustering collapses | `guest-support-chat.tsx` | Remove `space-y-*` from the message list; keep only cluster gaps |
| STY-04 | Touch composers / CRM / guest / contact inputs at 12–15px — iOS Safari zooms on focus | CRM, `Composer`, guest intro, contact reply | ≥16px font-size on coarse pointers / mobile inputs |

---

## P1 — grammar drift (make one conversation product)

### Tokens & CSS

- [x] Dark accent: pale sage `#B9D0C0` (+ dark ink) under `.dark .support-chat-theme--platform` — forest-on-near-black today
- [x] Define or delete dead `.support-chat-theme--shop` (applied in guest + buyer inbox, no CSS)
- [x] Semantic tokens: `--conversation-online`, `-away`, `-danger`, `-warn-wash`, `-note-wash` — kill `emerald-*`, `sky-*`, `amber-*`, `red-600`, `neutral-200` in chat
- [x] Shadow tokens (forest-tinted): replace `rgba(15,23,42,…)`, `rgba(40,167,69,…)`, pure-black launcher/SokoMind shadows
- [x] Replace legacy `#28a745` / `rgba(40,167,69,…)` in `.support-message-flash` and support launchers with accent mix
- [ ] Named type scale — keep 15 / 12 / 11.5 / 10.5 / 10; drop 9, 9.5, 12.5, 13.5
- [x] `.support-time` (Geist Mono) for bubbles, rows, CRM, SokoMind
- [ ] One hairline: `support-rule` / `--conversation-rule` only — stop `/50` `/60` `/70` border soup
- [ ] Dark variants for `avatarTone` hexes
- [ ] Motion tokens matching DESIGN.md; apply to chat transitions (today: mixed `duration-150`, default easing, some `hover:scale-*`)

### Shared components

- [x] **`ConversationRow`** — read conversation tokens (or wrap every list in theme). Match online-dot size/border to headers. Mono time. Unread ≥10px. Dim avatar when resolved
- [x] **`Composer`** — one radius for reply + attachment chips (today 2px chip next to capsule)
- [ ] **`DayDivider` / `NewMessagesDivider` / `ResolvedBanner`** — same case, same tokens (`support-panel` / `support-rule`; no `bg-muted` / `bg-background` leaks)
- [ ] Outgoing attachment washes use `--conversation-accent-ink`, not `--primary-foreground`
- [ ] One `ChatListEmpty` + `ChatListError` (retry) used everywhere
- [ ] One jump-to-latest pill (`rounded-full`, optional count, one shadow) — today four recipes (2px tenant, full guest/SA, icon-only buyer, absent CRM)
- [ ] One segmented-control recipe (buyer vs SA vs CRM disagree)
- [ ] One `ChatShell` for joined list+thread (single border/shadow; no nested double frame)

### Surfaces that partially follow the grammar

| Surface | Gaps |
|---|---|
| **Tenant support** | Jump pill is `rounded-[2px]`; scroll padding unique; welcome prompt chips differ from guest |
| **Guest** | Header/composer fall back to `border-border` / `bg-background`; intro fields are xl (flatten to 2px under portal); launcher shadow legacy green; unread badge black vs primary |
| **Buyer inbox** | Header not `support-chat-header`; list pane unthemed; double border/shadow; no `ResolvedBanner`; icon-only jump; custom empty |
| **SA inbox** | Sky/emerald tab badges (fourth hue); composer often borderless; second presence line still in subtitle; shell height fragile on phone+keyboard; system mono slug |

### Surfaces that diverge (bring onto grammar)

| Surface | What to change |
|---|---|
| **CRM `/inbox`** | Theme scope (STY-01); adopt `MessageBubble` clustering + 15px body + mono time; capsule composer or match it; `ConversationRow` with avatar + right-rail; join list+thread shell; drop red/amber/neutral literals; empty + jump; 16px inputs |
| **Tenant tickets** | Header (avatar/title/status); `ChatThreadSurface` + scroll + skeleton; drop `SERVING_*` / teal `#0f766e` / `bg-white`; capsule + `support-panel` composer |
| **Contact Messages theatre** | Retire `#0f766e`, `#9a2e16`, `#f4f7f5`, `bg-white` islands; kill uppercase eyebrows + decorative SVG pulse cards; one radius family; dark surfaces; stronger unread; short relative times |
| **Supplier portal messages** | Use `sp-*` tokens + either a true bubble thread **or** an honest operator log — not a bare `divide-y` card with `text-2xl` sans heading; empty + error banners |
| **SokoMind** | Drop `animate-ping` + false “Online · replies instantly”; 16/6 bubbles; tokenised colours/shadow; ≥28px feedback hits; shared typing dots; ≥16px input |

---

## P2 — polish

- Bubble avatar `mb-*` inconsistent for text vs cards; welcome `0.9rem` vs order `rounded-2xl` vs bubble 16px — pick one card radius
- Order/welcome cards: drop uppercase micro-eyebrows; use `support-ink` / `support-muted`
- Touch Reply/Copy hit area under clusters (~14px tall) — enlarge
- Emoji popover clipping on ~320px viewports
- Double focus rings (`theme :focus-visible` + per-control rings)
- CRM notes wash has no dark variant
- SA / CRM fixed `dvh` shells vs soft keyboard
- Authenticated visual QA across themes (see below)

---

## Suggested implementation sequence

1. **CSS foundation** — STY-02 radius opt-out + dark accent + semantic/status/shadow tokens + kill `#28a745`
2. **STY-01 + STY-03 + STY-04** — CRM theme scope, guest cluster gaps, 16px mobile inputs
3. **Shared chrome** — `ConversationRow` tokens, jump pill, empty/error, dividers, `ChatShell`
4. **CRM visual parity** — bubbles, composer, rows, shell
5. **Buyer + guest + SA + tenant nits** — headers, borders, badges, jump pills
6. **Tickets → contact theatre → supplier → SokoMind** — outlier adoption

Each step should stay styling-only: same endpoints, same copy intent, no new product chrome.

---

## Pass 1 — shipped 2 November 2026

Steps 1–2 of the sequence, plus the shared-chrome pieces those steps need and
the CRM/guest/buyer surfaces they touch.
Styling only: no endpoint, permission, copy, or behaviour change.

### CSS foundation

- **Radius exception, enforced** (`app/globals.css`, end of file). `.support-chat-theme`
  restores `rounded-2xl → 1rem`, `rounded-xl → 0.75rem`, `rounded-lg → 0.5rem`.
  The selectors sit after every operator scope (`.tablet-app-root`, `.sa-console`,
  `.premium-*`, `.tablet-more-sheet`, `.marketplace-page`), so the 2px flattening
  rules lose the tie instead of the chat panel. The block carries the do-not-copy
  warning next to the exception it protects.
- **Dark platform accent** — pale sage `#B9D0C0` with `#0D1713` ink under
  `.dark .support-chat-theme--platform` (DESIGN.md's dark accent), instead of
  forest on near-black.
- **Status tokens** — `--conversation-online`, `-away`, `-danger`, `-warn-wash`,
  `-note-wash` (light + dark). Every `emerald-*`, `sky-*`, `amber-*`, `red-600`
  literal in the support surfaces, `ConversationRow`, and the CRM inbox now reads
  these tokens. The SA "tenants / visitors" pair keeps its distinction as forest
  vs terracotta rather than a fourth hue.
- **Depth tokens** — `--conversation-shadow`, `-shadow-lift` (ink/forest tinted,
  wide, one direction). Launchers, jump pills, list shells, and the CRM panels
  use them; the `rgba(40,167,69,…)` and `rgba(15,23,42,…)` shadows are gone.
- **Legacy green removed** — `.support-message-flash` now flashes forest.
- **`.support-time`** — Geist Mono + tabular numerals for rows, times, and meta.
- **`.support-chat-theme--shop`** is a defined hook (shop accent from `--primary`
  or the inline brand colour), not a class with no CSS.
- **Coarse-pointer inputs** — conversation `input`/`textarea`/`select` are 16px
  below 640px, so iOS Safari no longer zooms on focus.

### P0 fixes

| ID | Fix |
|---|---|
| STY-01 | CRM list **and** thread now carry `support-chat-theme support-chat-theme--platform`; `--conversation-accent` / `-rule` resolve, so the outgoing WhatsApp bubble is filled again |
| STY-02 | Radius exception above; verified by computed style (16 / 12 / 12 / 16 / 21.6) |
| STY-03 | Guest message list drops `space-y-2.5`; only `getMessageCluster().gapClass` sets rhythm (`mt-1` inside a cluster, `mt-4` between) |
| STY-04 | Chat-scoped 16px inputs on coarse pointers |

### Shared chrome / surface nits

- `ConversationRow`: mono time via `.support-time`, unread badge ≥10px (was 9px),
  online dot on the conversation token with the header's ring colour, resolved
  check in `--conversation-online`.
- Tenant jump-to-latest pill is `rounded-full` with one shadow token (was 2px).
- Guest thread: header, composer, intro fields, quick-prompt chips, jump pill,
  and reconnect bar all move from `border-border` / `bg-background` / `bg-card`
  to `support-rule` / `support-panel` / `support-ink`; the shop's brand now drives
  `--conversation-accent` on the thread, so bubbles and the CTA finally match.
- Buyer inbox: header uses `support-chat-header`, the list pane is themed,
  the shell/list/thread share one hairline, and the chat pane drops its left
  border on desktop (no double frame).
- Support launchers (tenant + guest): theme scope for status tokens, forest-tinted
  depth, inverted (cream-on-forest) unread badge, warm reconnect bar.
- Cards and chips: welcome card joins the order card at 16px, the reply strip is
  12px inside the 1.35rem composer, the order-card tag drops 9.5px → 10px,
  intro placeholders move to full `--conversation-muted` (contrast).

### Verified

Computed style from the built page (temporary harness, real primitives, three
operator scopes, since removed):

| Element | `.tablet-app-root` scope |
|---|---|
| Conversation panel (`rounded-2xl`) | **16px** |
| Conversation row (`rounded-xl`) | **12px** |
| Bubble | **16px** |
| Composer capsule | **21.6px** (1.35rem) |
| Guest intro field | **12px**, 14px text @1440, **16px** @390 |
| Dark platform accent | `#b9d0c0` on `#0d1713` |

Screenshots (`docs/qa/assets/chat-style/`): 1440×1000 and 390×844, light and
dark — `chat-1440-light.png`, `chat-390-light.png`, `chat-1440-dark.png`,
`chat-390-dark.png`. They cover the tenant shell, the SA shell, and a
shop-accent (teal) thread plus intro fields.

`tsc --noEmit` clean, ESLint clean on every changed file, `bun run build` passes.

Two environment notes, not styling defects:

- The dev-only client error reporter (`public/client-error-reporter.js`) paints
  its red banner on every route in this checkout — a Turbopack chunk load
  rejection reproducible on `/`; it was dismissed before the captures.
- Operator scopes stay ivory in dark mode by design (`--op-*` is light-only), so
  the dark captures show a light shell around a dark conversation panel — which
  is the real behaviour a dark-mode page would get.

### Still open

- Step 3 remainder: one `ChatShell`, one `ChatListEmpty`/`ChatListError`, one
  segmented-control recipe, one jump pill (buyer is still icon-only), divider and
  `ResolvedBanner` token pass.
- Step 4: CRM bubbles adopted onto `MessageBubble` clustering (rows/shell/tokens
  are done; the thread still uses its own bubble markup).
- Step 5 nits: SA composer border, second presence line, shell height with a soft
  keyboard; buyer `ResolvedBanner`.
- Step 6: tickets, contact "theatre", supplier portal, SokoMind.
- Type scale (9 / 9.5 / 12.5 / 13.5px still present outside the surfaces touched),
  avatar tone dark variants, motion tokens, emoji-popover clipping at 320px,
  double focus rings.


---

## Verify (authenticated pass still open)

Screenshots light + dark, 390×844 and 1440×1000:

- [ ] `/support` (platform)
- [ ] `/support?tab=storefront`
- [ ] `/support?tab=tickets`
- [ ] `/inbox` (confirm outgoing CRM bubble is filled)
- [ ] `/messages`
- [ ] `/super-admin/support`
- [ ] Guest / storefront launcher dialog
- [ ] Supplier portal messages
- [ ] SokoMind panel

Also:

- [ ] Computed `border-radius` on `ConversationRow`, order card, guest fields, CRM bubble/composer under `.tablet-app-root` / `.premium-portal` / `.sa-console`
- [ ] Guest cluster gaps after removing `space-y`
- [ ] Guest dialog with custom shop accent (bubble vs CTA colour)
- [ ] Three storefront themes × light/dark primary (`readableInkOn`)
- [ ] iOS Safari focus zoom on every composer
- [ ] Soft keyboard vs SA/CRM shell heights
- [ ] `prefers-reduced-motion` on rows, SA entrances, launchers, SokoMind

---

## Out of scope for this doc

Identity/OTP, permissions, realtime catch-up, media download pipelines, inbox IA
merge, and notification deep links. Track those in the product chat phases —
not here.
