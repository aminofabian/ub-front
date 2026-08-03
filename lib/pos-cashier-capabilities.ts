/** Business feature flags: admin can allow cashiers to edit prices / create products / mark weighed at POS. */
export const POS_CASHIER_CAPABILITY_FLAGS = {
  priceEdit: "pos.cashier_price_edit",
  createProduct: "pos.cashier_create_product",
  weighedToggle: "pos.cashier_weighed_toggle",
  /** Owners/admins may upload product photos from the cashier shelf. */
  addPhoto: "pos.cashier_add_photo",
  /** Auto-add scanned barcodes straight to cart (skip search) when the
   * barcode resolves to exactly one sellable product. */
  scanToCart: "pos.scan_to_cart",
} as const;
