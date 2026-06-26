/** Suggest the next free SKU suffix when the base SKU is taken (e.g. MILK-1L → MILK-1L-2). */
export function suggestRenamedSku(baseSku: string, attempt = 2): string {
  const trimmed = baseSku.trim();
  if (!trimmed) {
    return "";
  }
  const withoutSuffix = trimmed.replace(/-\d+$/, "");
  return `${withoutSuffix}-${attempt}`;
}

/** Pick a unique renamed SKU not present in {@code taken} (mutates the set). */
export function allocateRenamedSkuAvoiding(
  baseSku: string,
  taken: Set<string>,
): string | null {
  const root = baseSku.trim().replace(/-\d+$/, "");
  if (!root) {
    return null;
  }
  for (let attempt = 2; attempt <= 99; attempt++) {
    const candidate = `${root}-${attempt}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
  return null;
}

export function isSkuConflictStatus(status: string | undefined): boolean {
  return status === "skip_sku_conflict";
}

export function isImportableAdoptStatus(status: string | undefined): boolean {
  return status === "ready" || status === "ready_merge";
}

export function isSkippablePreviewStatus(status: string | undefined): boolean {
  return (
    status === "skip_already_imported" ||
    status === "skip_sku_conflict" ||
    status === "skip_barcode_conflict"
  );
}

export function isUnresolvedSkuConflict(
  status: string | undefined,
  onSkuConflict: string | null | undefined,
  excluded: boolean,
): boolean {
  return isSkuConflictStatus(status) && !excluded && onSkuConflict == null;
}
