# Kiosk design system

**World:** the quiet Kenyan counter. Daylight, paper, ink, and one deep green
ledger line. Premium comes from space, restraint, and exact details, not from
ornament.

**Surfaces**

- **Persuade** (platform landing, signup, marketing): editorial serif display,
  generous white space, one decisive image, a single forest action.
- **Operate** (dashboard, cashier, inventory): the same palette and type
  families, but density and scanability lead. Page titles may use the display
  serif; tables, controls, and labels stay in the body sans.

## Palette

| Role | Token | Value |
|---|---|---|
| Ground | `--kiosk-bg` | `#F4F1EA` warm ivory |
| Raised | `--kiosk-elevated` | `#FCFAF5` |
| Panel | `--kiosk-panel` | `#EFEBE2` |
| Ink | `--kiosk-text` | `#121A16` |
| Muted ink | `--kiosk-text-muted` | `#556159` |
| Faint ink | `--kiosk-text-faint` | `#626D66` |
| Accent | `--kiosk-gold` | `#1D4B3B` deep forest |
| Accent hover | `--kiosk-gold-hover` | `#163B2E` |
| Highlight | `--kiosk-highlight` | `#A55237` terracotta, micro-moments only |
| Rule | `--kiosk-border` | `rgba(18,26,22,0.10)` |

The dark surface uses `#0D1713` ground with `#F2EDE1` ink and a pale sage
accent (`#B9D0C0`). Do not introduce a fourth hue; the green carries actions,
the terracotta carries one accent per view at most.

## Type

- **Display:** Cormorant Garamond (`--font-cormorant`). Weight 300–400.
  Landing and page titles only. Italic is the emphasis, not a second family.
- **Body / UI:** Manrope (`--font-manrope`). 15–17px body, 1.65 line height,
  65–75 character measure. Controls and tables use Manrope too.
- **Meta:** Geist Mono (`--font-geist-mono`) for timestamps, labels, receipts,
  and tabular numerals. Never as a decorative "technical" costume.

Three families maximum. Do not introduce Inter, Fraunces, or a script face into
new surfaces.

## Material and shape

- Hairline rules (`1px`, 6–12% ink) do the work that cards usually do.
- Cards only where elevation carries hierarchy. Radius: `2px` for controls and
  surfaces. Pills are reserved for small status chips, never primary buttons.
- Grain: `/public/textures/paper-grain.png` at 4–6% effective opacity on the
  landing ground. Do not use `feTurbulence` or line-grid overlays as texture.
- Shadows are tinted and wide, never a hard offset.

## Motion

- Interactions 180–280ms, `cubic-bezier(0.22, 1, 0.36, 1)`. Entrances may run
  to 600ms, once.
- Content is visible by default. Scroll reveals may translate, never hide the
  page behind `opacity: 0`.
- Respect `prefers-reduced-motion`. No infinite decorative loops.

## Composition rules

- No eyebrow/kicker above a heading. The heading carries its own weight.
- No section numbers unless the sequence itself is information.
- No split-header pattern (big left headline, small explanatory paragraph at
  right) as a default.
- Landing sections use at least four different layout families.
- One action label per intent: `Start free` everywhere for signup, not
  "Get started" / "Start selling" variants.
- Copy is specific and calm. No exclamation marks. Prefer a concrete noun over
  an adjective.

## Operator shell

The dashboard keeps the same materials but changes the density:

- Header fascia: `--op-bg` ivory, hairline bottom rule, forest logo stamp.
  Page title in Cormorant, 1.4–1.7rem; the branch/place line is Manrope 10.5px
  sentence case, muted. No "Aisle" eyebrow.
- Navigation: one line, 44px tall, forest underline on the active tab. Hints
  belong in `title`, not in the visible row.
- Content: `--op-bg` ground, `--op-surface` cards, 2px radius, hairline rules.
  No shadows; no filled warning cards. Attention uses terracotta iconography
  and a hairline row.
- Primary action: one forest button per view. Secondary actions are text or
  hairline outlines.
- Hub data: flat two-column action lists, three-column work strip, hairline
  open-work rows. Keep table density where the task needs it.
- Plan-fit and billing notices: muted terracotta strip, never a full-bleed
  orange sale banner.

## Remaining surfaces

This pass covers the landing page, signup/onboarding modal, and the business
shell/hub. The auth pages, products, inventory, sales, customers, settings, and
storefront still need the same treatment surface by surface.

## Round 2 coverage

- `AppShell` and the dashboard main now inherit Manrope/Cormorant and the
  ivory/forest operator variables. Oxanium is no longer the operator voice.
- Business hub, products, stock, sales, settings, users, customers, analytics,
  inbox, expenses, tax, branches, credits, order, and support pages all share
  the same shell, page-header, surface, and input tokens. No horizontal
  overflow at 1440 or 390; console clean on the checked routes.
- Auth split shell uses the local counter photograph, ivory paper, forest CTA,
  and a 700-class reading measure. The new-business path is a quiet hairline
  row, not a highlighted card.
- Legal notices use the landing world: Cormorant headings, Manrope body, 700px
  measure, paper grain.
- Tenant storefronts intentionally keep their own theme and palette. Do not
  apply the platform chrome over a shop's chosen storefront identity.
- Still open: super-admin console, a few dense page-specific surfaces (order
  pad, inbox threads), and the storefront templates where the tenant has not
  chosen a theme.

## Round 3 coverage

- Super-admin console now uses `OPERATOR_SURFACE_STYLE` and a local
  `sa-console` token set: ivory ground, forest primary, paper sidebar, 2px
  controls. The Oxanium dependency is gone from the console shell.
- Super-admin sign-in is wrapped in the auth-shell tokens so the primary
  button is forest, the card is paper, and the heading is Cormorant.
- The overview's floating pulse cards no longer collide; the empty right
  dossier is now a **Platform pulse** summary with attention, units, active
  tenants, and three hairline shortcuts.
- Public marketplace uses the same paper/forest skin: serif marketplace
  heading, 2px product cards, forest selected states, muted platform logo.
- Tenant storefronts remain tenant-themed. Their colours, banners, and
  template belong to the shop; do not replace them with platform chrome.

## Still open for round 4

- A few dense super-admin theatres still use the shared floating-card
  composition; they are themed but need per-surface composition review.
- Tenant storefront templates where a shop has not chosen a theme; this should
  be an opt-in premium template, not an override.
- Order pad, inbox threads, and other deep work surfaces need a final
  component-level pass.

## Round 4 coverage

- Retired the old mint/teal utility classes across every `.tablet-app-root`
  surface (`#e6f4f0`, `#e7f3ee`, `#d9ede7`, `#0f766e`, and related). The order
  pad now reads as paper, forest, and terracotta instead of blue/mint.
- The business hub, products, stock, sales, settings, users, inbox, order, and
  support routes were rechecked after the utility cleanup; no overflow or
  console errors at 1440.
- Order pad: supplier roster, product cards, stepper, order slip, and disabled
  actions now use the operator palette.
- Tenant storefronts remain merchant-themed. The platform marketplace is the
  premium public storefront surface; a premium tenant storefront should be an
  opt-in template.

## Final verification

A 19-route verification pass (public, tenant, and super-admin) completed with
zero horizontal-overflow or console/API-error failures:

- Public: `/`, `/marketplace`, `/privacy`, `/login/staff`, `/signup`
- Tenant: `/business`, `/products`, `/inventory/stock`, `/sales`,
  `/business/settings`, `/users`, `/customers`, `/analytics`, `/inbox`,
  `/order`, `/support`
- Super-admin: `/super-admin`, `/super-admin/businesses`,
  `/super-admin/platform/subscription`

`tsc --noEmit` exits 0. ESLint has no errors on the changed files. The tenant
storefront remains merchant-themed (`data-store-theme-id="mart"` in the QA
shop, `--storefront-brand` still the merchant's blue); the platform
marketplace is the premium public storefront surface.
