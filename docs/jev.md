# Jev decision helper

Thin [JevAI](https://www.jevai.org) integration — judgment only (no tool execution, no browse).

## Set the key

1. Create a key at [https://www.jevai.org/agent/keys](https://www.jevai.org/agent/keys).
2. Copy `.env.example` → `.env.local` and set `JEV_API_KEY=` (never commit real keys; `.env*` is gitignored except `*.example`).
3. Restart `next dev`. Keep the key server-only — do not use `NEXT_PUBLIC_JEV_API_KEY`.

## When Palmart calls Jev

**Void sale** (`components/sales/void-sale-dialog.tsx`): before `postVoidSale`, the dialog calls `POST /api/jev/tool-guard`, which uses `lib/jev.ts` `toolGuard`.

| Decision | Behavior |
| --- | --- |
| `allow` | Proceed with void |
| `confirm` / `review` | Show guidance; require checkbox + Confirm void |
| `deny` | Block the void |
| key unset | Skip Jev; existing dialog confirmation still applies |

Probabilities / confidence are signals, not authorization.

Reusable presets in `lib/jev.ts`: `toolGuard`, `routeTask`, `checkResearch`, `reviewCompletion`, `routeModel`, `decide`.
