/** A shelf count typed by a person: blank means "not counted", commas are decimals. */
export function parseCountInput(raw: string): number | null {
  const cleaned = raw.trim().replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
