export const Permission = {
  BusinessManageSettings: "business.manage_settings",
  UsersList: "users.list",
  UsersCreate: "users.create",
  UsersUpdate: "users.update",
  UsersDeactivate: "users.deactivate",
  UsersAssignRole: "users.assign_role",
  CatalogItemsRead: "catalog.items.read",
  CatalogItemsWrite: "catalog.items.write",
  CatalogItemsLinkSuppliers: "catalog.items.link_suppliers",
  PurchasingIntelligenceRead: "purchasing.intelligence.read",
  PurchasingPaymentRead: "purchasing.payment.read",
  PurchasingPaymentWrite: "purchasing.payment.write",
  SuppliersRead: "suppliers.read",
  SuppliersWrite: "suppliers.write",
} as const;

export function hasPermission(
  permissions: string[] | undefined,
  key: string,
): boolean {
  return permissions?.includes(key) ?? false;
}
