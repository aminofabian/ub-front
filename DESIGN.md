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

## Brand moments

- **404** (`app/not-found.tsx`): “This shelf is empty.” on the landing paper,
  with Back to the shop, Browse the marketplace, and Get help. The footer
  clears the mobile support launcher.
- **Loading** (`app/loading.tsx`): a quiet Cormorant wordmark, “Opening the
  shop”, and a 1px forest sweep. Sweep is disabled by reduced-motion.
- **Forbidden** (`app/forbidden.tsx`): “This door is locked.” in the same
  editorial frame, with a sign-in action and a way back to the shop.
- **Global error** (`app/global-error.tsx`): self-contained ivory/forest serif
  fallback that still works if the stylesheet fails.
- **OG card** (`app/opengraph-image.tsx`): ivory ground, Cormorant wordmark,
  Manrope description, terracotta kicker, bundled TTF fonts for reliable
  rendering.
- **PWA manifest**: forest theme colour and ivory background instead of the
  old green/white.
- **Motion/accessibility**: one forest keyboard focus treatment, warm
  selection colour, and a global `prefers-reduced-motion` guard.

## Kiosk Premium storefront preset (opt-in)

The premium storefront is a **personality preset**, not a platform override.
It lives in Business → Design → “Start from a mood” as **Kiosk Premium**:

- surface `#F4F1EA`
- sharp edges, solid buttons, cozy density
- new **Kiosk Editorial** font pairing: Cormorant display + Manrope body
  (`kiosk` pairing, mapped to the bundled storefront faces)
- the merchant’s logo, primary colour, copy, products, and chosen theme remain

Selecting it changes only the design draft; nothing is saved until the
merchant presses **Save design**. Verified in the running design studio and
with the “Preview my shop” draft URL.

## Drawers and sheets

- Shared `FormDrawer` and `Dialog` now carry a `premium-portal` token scope
  because Radix portals render outside `.tablet-app-root`.
- Header: ivory paper, hairline rule, Cormorant title, Manrope description,
  square 2px close control. No gradient orbs, no 5px brand rail.
- Panel: paper surface, 2px edges, soft one-direction shadow, 200ms slide.
- Phone bottom sheets: 2px top corners, grabber, full-width forest primary.
- Footer: paper, hairline top, one forest action; secondary actions stay
  quiet.
- `FormDrawerFields`, product creation, supplier guide, catalogue add/edit,
  filter sheets, super-admin panels, floor tape, and till gallery all inherit
  the same tokens.
- Tenant storefront dialogs use the same paper chrome; the merchant's page
  identity remains outside the portal.

## App menu and navigation sheets

- The mobile “More” menu now uses the forest operator accent even when the
  tenant brand is blue; the tenant logo remains next to the user’s initial.
- “Jump to” is a 3-column hairline grid with surface fillers for incomplete
  rows, so no dark empty cell remains.
- The super-admin mobile navigation uses the paper sidebar, forest active
  state, and the same close control.
- Storefront slide-overs (cart/checkout) stay on the merchant’s storefront
  tokens; they are shop UI, not platform chrome.

## More drawers

- Stock tools sheet: uniform paper tiles, hairline borders, forest icons,
  Cormorant “Inventory tools” title; the pastel six-tone palette is gone.
- Cashier draft-conflict and POS session/till-lock modals: paper panel, 2px
  edges, Cormorant titles, forest actions.
- Onboarding catalogue, cashier quantity popover, and Kiosk Guide panel carry
  the same portal and paper tokens.
- Supplier-portal mobile navigation uses the paper sheet and Cormorant
  wordmark.

## Drawer coverage close-out

- Shared `FormDrawer` and `Dialog` cover the form drawers, filters, product
  creation, catalogue, suppliers, super-admin, credits, and campaign panels.
- Custom operator overlays covered: stock tools, cashier draft/conflict and
  POS lock/session panels, onboarding catalogue, quantity popover, Kiosk
  Guide, payroll payslip, grocery invoice/cart, floor tape, till gallery,
  More menu, and super-admin navigation.
- Storefront slide-over chrome uses the merchant’s own palette; only its
  shape and motion were tightened. Merchant checkout sheets keep their
  storefront identity.
- Verified open/close behaviour and no console errors on supplier, product,
  stock tools, and More drawer paths. `tsc --noEmit` exits 0; ESLint has no
  errors on the touched drawer files (remaining warnings are pre-existing
  hook dependency warnings).

## Desktop app

- `DesktopBootShell` now uses the `premium-portal` paper scope: ivory ground
  with a faint forest/terracotta wash, Cormorant title, Manrope message, and
  forest loading dots. The old green radial gradient is gone.
- The first-run `DesktopSetupWizard` uses paper cards, 2px edges, forest
  inputs and buttons, forest tabs, and a Cormorant step title. No `#1f7a3a`
  green remains.
- Main dashboard drawers on desktop inherit the same `FormDrawer`, `Dialog`,
  and `premium-portal` changes as cloud.
- Desktop setup was previewed at 1440 through a temporary harness (removed
  after verification); choose and find-shop steps render with no console
  errors.

## Procurement, catalogue, stock, grocery

- Order, Receive, Records, and Suppliers now sit in a `premium-procurement`
  scope: forest tokens, ivory ground, 2px surfaces, hairline rules, serif
  supplier and empty-state headings.
- Order slip empty state: “Nothing on the slip.” with a 20ch body measure.
- Receive: “No open orders yet.” and “Select an order.” in Cormorant, with a
  forest primary action.
- Records: paper empty state, serif “No today receipts”, forest Walk-in supply.
- Suppliers: serif “Select a supplier”, quiet paper directory, forest actions,
  no dashed empty card.
- Products: shell title corrected to **Products**; the shelf-zone notice is now
  a quiet paper strip with text actions; the detail placeholder is a serif
  “Select a product”.
- Stock levels: restrained filter palette; terracotta only for genuine
  out/low status; paper table and hairlines.
- Grocery: paper chrome, forest accents, serif “Current Sale” and
  “Nothing in this sale.” empty state.
- Verified all seven routes at 1440 with no overflow or console errors;
  supplier selection, stock filtering, and order supplier switching work.

## Cashier / POS

- `premium-cashier` gives the whole till (shelf and ledger templates) forest
  actions, ivory paper, 2px edges, and Manrope/Cormorant hierarchy.
- Both templates verified: Shelf (tile grid + cart rail) and Ledger
  (spreadsheet + keypad). Cart empty state is serif; totals and keypad stay
  dense.
- Cashier dialogs are auto-tagged `cashier-premium-modal` from the route so
  legacy cashier tools inherit paper chrome without per-component edits.
- Shift open/close modal: paper header, Cormorant title, forest denomination
  bar, forest primary action, 2px edges.
- Suppliers/receive-till modal, till settings, add-product, checkout/payment
  sheet, and mobile cart drawer are covered.
- Verified shelf/ledger, shift modal, suppliers modal, add-product, checkout,
  till settings, mobile cart; no console errors or overflow.
- A local QA till and test shift were registered/opened to reach the till.

## Stock manager portal

- The stock manager now gets the grouped desktop rail (Stock / Buying /
  Store / Sales / Setup) instead of a flat 13-icon strip; labels are readable
  and the legacy "Full count" duplicate is removed from the rail.
- The plan-fit upsell is hidden for stock managers; it is an owner decision,
  not a floor task.
- Mobile tabs are now **Count / Stock / Order / Receive / More**, so the two
  counting destinations no longer collide.
- Count in batches is a desktop two-column layout: plan or cycle on paper,
  with "The counting loop" and quick links in a side rail. Mobile keeps one
  column and drops the duplicate page title.
- Batch count is a 4xl paper floor (not a 32rem phone column), with sticky
  batch header, search, filters, shelf groups and Finish batch.
- Daily audit has a paper empty state and compact controls; noisy "no manifest"
  toasts are suppressed in favour of the inline empty copy.
- Restock review has a paper filter card and serif empty state; the hand-rolled
  dashboard hero was replaced with the Cormorant page header.
- Full-count banner now uses 2px edges, paper and forest instead of rounded
  pills.
