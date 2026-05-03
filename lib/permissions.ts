export const Permission = {
  BusinessManageSettings: "business.manage_settings",
  UsersList: "users.list",
  UsersCreate: "users.create",
  UsersUpdate: "users.update",
  UsersDeactivate: "users.deactivate",
  UsersAssignRole: "users.assign_role",
  CatalogItemsRead: "catalog.items.read",
  CatalogItemsWrite: "catalog.items.write",
  CatalogCategoriesWrite: "catalog.categories.write",
  CatalogItemsLinkSuppliers: "catalog.items.link_suppliers",
  PurchasingIntelligenceRead: "purchasing.intelligence.read",
  PurchasingPaymentRead: "purchasing.payment.read",
  PurchasingPaymentWrite: "purchasing.payment.write",
  SuppliersRead: "suppliers.read",
  SuppliersWrite: "suppliers.write",
  InventoryRead: "inventory.read",
  InventoryTransfer: "inventory.transfer",
  StocktakeRead: "stocktake.read",
  StocktakeRun: "stocktake.run",
  StocktakeApprove: "stocktake.approve",
  PricingRead: "pricing.read",
  PricingSellPriceSet: "pricing.sell_price.set",
  PricingRulesManage: "pricing.rules.manage",
  ShiftsOpen: "shifts.open",
  ShiftsClose: "shifts.close",
  ShiftsRead: "shifts.read",
  SalesSell: "sales.sell",
  SalesVoidOwn: "sales.void.own",
  SalesVoidAny: "sales.void.any",
  SalesRefundCreate: "sales.refund.create",
} as const;

export function hasPermission(
  permissions: string[] | undefined,
  key: string,
): boolean {
  return permissions?.includes(key) ?? false;
}
