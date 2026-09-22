/** Margin Guard helpers — till / pocket below-cost detection (catalog buyingPrice). */

export type MarginGuardMode = "warn" | "approve" | "hard";

export function toMoneyNumber(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** True when sell is strictly below a positive reference cost (ignores clearance SKUs). */
export function isSellBelowCost(
  sellPrice: number | string | null | undefined,
  costPrice: number | string | null | undefined,
  opts?: { clearance?: boolean | null },
): boolean {
  if (opts?.clearance === true) return false;
  const sell = toMoneyNumber(sellPrice);
  const cost = toMoneyNumber(costPrice);
  if (sell == null || cost == null || cost <= 0) return false;
  return sell < cost - 0.0005;
}

export function belowCostLossPerUnit(
  sellPrice: number | string | null | undefined,
  costPrice: number | string | null | undefined,
): number | null {
  if (!isSellBelowCost(sellPrice, costPrice)) return null;
  const sell = toMoneyNumber(sellPrice)!;
  const cost = toMoneyNumber(costPrice)!;
  return Math.round((cost - sell) * 100) / 100;
}

export function normalizeMarginGuardMode(
  raw: string | null | undefined,
): MarginGuardMode {
  const m = (raw ?? "warn").trim().toLowerCase();
  if (m === "approve" || m === "hard") return m;
  return "warn";
}

/** Cost Issues deep-link for supply price catch-up. */
export function costIssuesSellsAtLossHref(basePath: string): string {
  const base = basePath.trim() || "/inventory/cost-issues";
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}filter=sells_at_loss`;
}
