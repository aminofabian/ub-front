/** Checks for a row of medicine stock typed in by hand (Pharmacy, Add stock). */

export type MedicineStockRow = { quantity: string; unitCost: string; lotNumber: string; expiryDate: string };

export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** What is wrong with a row someone started filling in, or null when it can be saved. */
export function medicineStockRowProblem(row: MedicineStockRow, today: string): string | null {
  const qty = Number(row.quantity);
  if (!row.quantity.trim() || !Number.isFinite(qty) || qty <= 0) return "Enter how many.";
  if (row.unitCost.trim() && (!Number.isFinite(Number(row.unitCost)) || Number(row.unitCost) < 0)) {
    return "The cost must be a number.";
  }
  if (!row.lotNumber.trim()) return "Enter the lot number printed on the pack.";
  if (!row.expiryDate) return "Enter the expiry date printed on the pack.";
  if (row.expiryDate < today) return "This has already expired. Do not put it on the shelf.";
  return null;
}
