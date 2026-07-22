# Inventory integrity gaps

Independent of Store Stock v1 (which only surfaces existing branch on-hand as “in store”).
These pre-existing movement/batch bugs can make branch on-hand diverge from physical reality and undermine trust in any number we label store stock.

## Gaps

### 1. Return to supplier — no movement path

There is no formal return-to-supplier flow that decrements `inventory_batches` / writes `stock_movements`. Stock sent back to a supplier can remain on-hand in the system.

**Expected:** Outbound movement (new type or `adjustment`/`wastage`-class) that reduces active batch remaining and appends an audit row.

### 2. Transfer cancel — source batch not restored

`InventoryTransferService.cancelLine` zeroes the destination `in_transit` batch and writes an `adjustment` movement claiming stock returned, but does not restore source `quantity_remaining`.

**Expected:** Cancel restores source batch qty (and movement trail) so branch on-hand matches pre-transfer state.

### 3. Oversell — movement without batch decrement

Sales that oversell can write a `sale` movement with `batch_id = null` and stop decrementing batches for the shortage. Sale is logged; stock is not reduced for that portion.

**Expected:** Either block oversell when policy disallows negative stock, or consistently write down batches / record an explicit oversell adjustment so on-hand matches sold qty.

### 4. Path B reverse/delete — erases audit trail

Path B reverse/delete adjusts `currentStock` and deletes batches / receipt-wastage movements instead of posting compensating movements.

**Expected:** Reversals append compensating movements (and restore or deplete batches accordingly) rather than deleting history.

## Out of scope for Store Stock v1

Do not expand the store-stock labeling work to fix these. Track and fix as a dedicated inventory-integrity effort.

## Suggested acceptance (when fixed)

- Every qty-changing inventory op either updates active batches + appends a durable `stock_movements` row, or is explicitly documented as non-qty (e.g. cost-only rewrite).
- Branch on-hand (`SUM(quantity_remaining)` for active batches) matches physical expectations after receipt, sale, transfer send/receive/cancel, wastage, refund restock, and return-to-supplier.
- Movement history for an item/branch remains reconstructable (no hard-delete of qty movements on reverse).
