/** Business feature flags: admin can allow cashiers to edit prices / create products / mark weighed at POS. */
export const POS_CASHIER_CAPABILITY_FLAGS = {
  priceEdit: "pos.cashier_price_edit",
  createProduct: "pos.cashier_create_product",
  weighedToggle: "pos.cashier_weighed_toggle",
  /** Owners/admins may upload product photos from the cashier shelf. */
  addPhoto: "pos.cashier_add_photo",
  /**
   * Show supplier Order on the till. Absent defaults to on; set false to hide
   * even when the user has Path A purchasing permission.
   */
  orderPad: "pos.cashier_order_pad",
  /**
   * Show Confirm orders on the till. Absent defaults to on; set false to hide
   * even when the user has Path A purchasing permission.
   */
  orderConfirm: "pos.cashier_order_confirm",
  /**
   * Allow cashiers to record cash drawouts from an open till.
   * Absent / false keeps drawout for owners, admins, and managers only.
   */
  drawout: "pos.cashier_drawout",
  /** Auto-add scanned barcodes straight to cart (skip search) when the
   * barcode resolves to exactly one sellable product. */
  scanToCart: "pos.scan_to_cart",
  /**
   * Search-first hybrid POS catalog (compact list + frequent chips).
   * Absent / false keeps the classic product grid.
   */
  catalogHybrid: "pos.catalog_hybrid",
} as const;

/** How the till presents the product shelf. */
export type PosCatalogMode = "grid" | "hybrid";

export function posCatalogModeFromFlags(
  featureFlags: Record<string, boolean> | null | undefined,
): PosCatalogMode {
  return featureFlags?.[POS_CASHIER_CAPABILITY_FLAGS.catalogHybrid] === true
    ? "hybrid"
    : "grid";
}

/** Roles that sell from the till as a cashier (not owner / admin / manager). */
export function isTillCashierRole(roleKey: string | null | undefined): boolean {
  const key = roleKey?.trim().toLowerCase() ?? "";
  return key === "cashier" || key === "butcher_cashier";
}

/**
 * Owners, admins, and managers may always record drawouts.
 * Cashiers need `pos.cashier_drawout` enabled in till settings.
 */
export function cashierMayRecordDrawout(
  featureFlags: Record<string, boolean> | null | undefined,
  roleKey: string | null | undefined,
): boolean {
  if (!isTillCashierRole(roleKey)) return true;
  return featureFlags?.[POS_CASHIER_CAPABILITY_FLAGS.drawout] === true;
}
