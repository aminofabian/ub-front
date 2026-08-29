/** Route prefixes where the contextual setup strip may appear (not /business — banner lives there). */
export const SETUP_STEP_ROUTE_PREFIXES: Record<string, string[]> = {
  stock_shelf: ["/products"],
  supplier_loop: ["/suppliers", "/supplies"],
  phone_verified: ["/business/settings", "/business/branding"],
  invite_cashier: ["/users"],
  first_sale: ["/cashier", "/shifts"],
  go_live: ["/business/settings", "/business/themes"],
};

export function setupStepMatchesPath(stepKey: string | null | undefined, pathname: string): boolean {
  if (!stepKey) return false;
  const prefixes = SETUP_STEP_ROUTE_PREFIXES[stepKey];
  if (!prefixes?.length) return false;
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
