import type { RestockSuggestionRecord } from "@/lib/api";

export const UNCATEGORISED_KEY = "uncategorised";

export const REASON_LABELS: Record<string, string> = {
  BELOW_MIN: "Below min",
  WILL_STOCK_OUT: "Will stock out",
  FAST_MOVER: "Fast mover",
  STOCKOUT_RECOVERY: "Recovering stock-out",
};

export function formatQty(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

export function toNum(v: number | string | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(
  value: number | string | null | undefined,
  currency = "KES",
): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function slug(value: string): string {
  const s = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-)$/g, "");
  return s || "group";
}

export function deptKey(s: RestockSuggestionRecord): string {
  return s.itemTypeId?.trim() || UNCATEGORISED_KEY;
}

export function deptName(s: RestockSuggestionRecord): string {
  return s.itemTypeName?.trim() || "Uncategorised";
}

export function lineValue(
  s: RestockSuggestionRecord,
  qtyMap: Record<string, string>,
): number {
  const raw = (qtyMap[s.id] ?? "").trim();
  const qty = raw === "" ? toNum(s.suggestedQty) : Number(raw);
  if (!Number.isFinite(qty) || s.unitCost == null) return 0;
  return qty * toNum(s.unitCost);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
