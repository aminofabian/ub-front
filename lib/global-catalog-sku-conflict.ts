/** Suggest the next free SKU suffix when the base SKU is taken (e.g. MILK-1L → MILK-1L-2). */
export function suggestRenamedSku(baseSku: string, attempt = 2): string {
  const trimmed = baseSku.trim();
  if (!trimmed) {
    return "";
  }
  const withoutSuffix = trimmed.replace(/-\d+$/, "");
  return `${withoutSuffix}-${attempt}`;
}

export function isSkuConflictStatus(status: string | undefined): boolean {
  return status === "skip_sku_conflict";
}

export function isImportableAdoptStatus(status: string | undefined): boolean {
  return status === "ready" || status === "ready_merge";
}
