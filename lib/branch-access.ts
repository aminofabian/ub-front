/** Roles that may only work in their assigned branch (no branch switching). */
export function isBranchLockedRole(
  roleKey: string | undefined | null,
): boolean {
  const key = roleKey?.trim().toLowerCase() ?? "";
  return (
    key === "stock_manager" ||
    key === "cashier" ||
    key === "butcher_cashier" ||
    key === "grocery_clerk"
  );
}
