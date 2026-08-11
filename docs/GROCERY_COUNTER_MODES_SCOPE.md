# Grocery Counter Modes — Scope (locked)

> **Status:** Approved — implementation in progress  
> **Surface:** `/grocery` (`grocery_clerk`)  
> **Decisions locked:** 2026-08-11

## Modes

| Mode | Behavior | Stock |
|------|----------|-------|
| **Sell** (always on) | Cart → Generate Invoice → cashier | Deduct on pay |
| **Spoils** | Cart → Record spoils | Immediate wastage (`SPOILAGE`) |
| **Stock in** | Pick supplier → Path B receive till | Immediate receive |

Mode switch parks & restores each mode’s cart. Sell never mixes with spoils/stock.

## Admin overrides (default **ON**)

| Setting | JSON path | Default |
|---------|-----------|---------|
| Allow spoils | `inventory.stockLevels.allowSpoilsForGroceryClerk` | `true` |
| Allow stock in | `inventory.receiveStock.allowReceiveForGroceryClerk` | `true` |

Sell has no toggle. If both overrides are off, counter looks like today (no mode switcher).

## Role

Same `grocery_clerk`. Backend delegates `inventory.write` when spoils (or stock-edit) is on; delegates `purchasing.path_b.write` when stock-in is on.

## Out of scope (v1)

Reason picker, batch picker, reverse spoils, stock-take on grocery, new role.
