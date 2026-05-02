export const Permission = {
  BusinessManageSettings: "business.manage_settings",
  UsersList: "users.list",
  UsersCreate: "users.create",
  UsersUpdate: "users.update",
  UsersDeactivate: "users.deactivate",
  UsersAssignRole: "users.assign_role",
  CatalogItemsRead: "catalog.items.read",
  CatalogItemsWrite: "catalog.items.write",
} as const;

export function hasPermission(
  permissions: string[] | undefined,
  key: string,
): boolean {
  return permissions?.includes(key) ?? false;
}
