# Notification formatting — 2026-10-20

The drawer was rendering raw notification bodies: the full welcome email, a raw
order UUID, and onboarding copy that escaped its two-line clamp. This pass makes
the previews scannable and consistent with the chat design language.

## Rules

- **Structured notification types use payload data, not the authored raw body.**
  Orders, stock, digests, drawouts, and till-access requests are rendered from
  `payload.customerName`, `total`, `orderId`, `itemName`, etc.
- **Order references are short.** Prefer `payload.orderCode`; otherwise use the
  first eight characters of the UUID as `#D03CD100`. Full UUIDs never appear in a
  notification preview.
- **Money is normalised.** A localised `5,00` is treated as `5.00`; a thousands
  separator like `5,000` is removed before `Intl.NumberFormat` runs.
- **Welcome is rewritten for a notification.** Instead of the full welcome
  email, show one sentence:
  `MM Investments is ready. Setup, M-Pesa, storefront, and custom help are free — call 0714 282 874.`
- **Legacy authored copy is sanitised.** HTML tags, Markdown links, emphasis,
  heading markers, repeated whitespace, and UUIDs are cleaned. Long copy is
  truncated to 180 characters at a word boundary.
- **The drawer clamps to two lines.** The body span no longer has a conflicting
  `block` class; `line-clamp-2` now controls the display, and the full body is
  available in the `title` attribute.

## Files

- `frontend/lib/notification-display.ts`
- `frontend/lib/notification-display.test.ts` (new)
- `frontend/components/notifications-drawer.tsx`

The helper also feeds cashier order alerts, storefront realtime toasts, the
storefront notifications panel, the realtime provider, and promotion previews,
so they all receive the same cleaned title/body.

## Tests

`frontend/lib/notification-display.test.ts` covers:

1. A web order with a raw UUID body → formatted name, `KES 5.00`, `#D03CD100`.
2. A raw UUID without payload → still shortened.
3. A welcome email body → one concise, phone-aware sentence.
4. Long onboarding copy → 180-character cap with ellipsis.

## Verification

| Check | Result |
|---|---|
| `bun test lib/notification-display.test.ts` | 4 pass |
| `bunx tsc --noEmit` | pass |
| ESLint on changed files | 0 errors |
| Full `bun test` | 1022 pass, 12 pre-existing failures, 1 unrelated Next/Bun DOM error |
| `bun run build` | pass |
| `verify-legacy-safe` | 515 chunks parse-safe |

## Remaining

- The welcome **email** is still long by design; only the in-app notification is
  condensed.
- Duplicate onboarding steps (`onboarding.sizes_right` and
  `onboarding.lookalike`) remain separate notifications because they are
  separate sequence steps; they are not deduped.
- Notification rows still lack a richer detail view; clicking opens the action
  destination.
