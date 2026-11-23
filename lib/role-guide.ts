/**
 * Roles in words a shop owner uses. Adding someone starts with the question "what will this person do?",
 * so each role is offered as a job, with the work it can touch read from the role's own permissions.
 * This only describes: the server decides what a role may do.
 */

import { isSupplierBusiness } from "@/lib/business-store-type";
import { Permission } from "@/lib/permissions";

export type GuidedRole = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  permissionKeys?: string[] | null;
};

type Business = Parameters<typeof isSupplierBusiness>[0];

/** The job in one line, for the roles whose job is the same in every shop. Others use the server's line. */
const JOB: Record<string, string> = {
  owner: "A co-owner. Everything, including billing and who else is an owner.",
  admin: "Runs the whole business for you. Everything except billing.",
  manager: "The store manager. Runs the day and looks after the team's work.",
  cashier: "Takes payment at the till.",
  viewer: "Looks at the numbers. Changes nothing.",
  stock_manager: "Receives deliveries and counts stock.",
  grocery_clerk: "A counter clerk. Writes up the customer's order; the cashier takes the payment.",
  supplier_trade_desk: "An order clerk. Answers the orders buyers send and dispatches them.",
  supplier_catalogue: "Keeps your products, their sections and selling prices. No orders or accounts.",
  supplier_accounts: "Decides which buyers get an account and records what they pay.",
};

/** A word of care shown on the roles that can lock an owner out or spend money. */
const CAUTION: Record<string, string> = {
  owner: "Full control. Give this only to someone who owns the business with you.",
  admin: "Can add and remove people and change settings.",
};

/** Areas of work, each named once, in the order an owner cares about. A role has an area if it holds any of its permissions. */
const AREAS: { label: string; supplierLabel?: string; anyOf: string[] }[] = [
  { label: "Billing", anyOf: [Permission.BusinessManageSubscription] },
  { label: "Settings", anyOf: [Permission.BusinessManageSettings] },
  { label: "People and roles", anyOf: [Permission.UsersCreate, Permission.UsersAssignRole] },
  { label: "Online orders", supplierLabel: "Trade orders", anyOf: [Permission.StorefrontOrdersRead] },
  { label: "Customer credit", supplierLabel: "Buyer accounts", anyOf: [Permission.CreditsCustomersWrite] },
  { label: "Selling at the till", anyOf: [Permission.SalesSell] },
  { label: "Counter orders", anyOf: [Permission.GroceryInvoicesCreate] },
  { label: "Taking payment for counter orders", anyOf: [Permission.GroceryInvoicesPay] },
  { label: "Products", anyOf: [Permission.CatalogItemsWrite] },
  { label: "Selling prices", anyOf: [Permission.PricingSellPriceSet] },
  { label: "Stock", anyOf: [Permission.InventoryWrite, Permission.StocktakeRun] },
  { label: "Buying", anyOf: [Permission.PurchasingPathAWrite, Permission.PurchasingPathBWrite] },
  { label: "Refunds", anyOf: [Permission.SalesRefundCreate] },
  { label: "Reports", anyOf: [Permission.SalesIntelligenceRead, Permission.FinanceReportsRead] },
  { label: "Payroll", anyOf: [Permission.PayrollManage] },
];

/** The order roles are offered in: the everyday jobs first, the powerful ones last. Unlisted roles sit in the middle. */
const ORDER = [
  "manager",
  "supplier_trade_desk",
  "grocery_clerk",
  "cashier",
  "supplier_catalogue",
  "supplier_accounts",
  "stock_manager",
];
const LAST = ["viewer", "admin", "owner"];

function rank(key: string): number {
  const first = ORDER.indexOf(key);
  if (first >= 0) return first;
  const last = LAST.indexOf(key);
  return last >= 0 ? 1000 + last : 500;
}

function keyOf(role: { key: string }): string {
  return (role.key ?? "").trim().toLowerCase();
}

/** "buyer" is a customer's account on the online shop, not a job: it is never offered for a member of staff. */
const NOT_STAFF = ["buyer"];

/** Staff roles in the order to offer them. Roles of equal rank keep the order the server gave. */
export function orderRolesForPicker<T extends { key: string }>(roles: readonly T[]): T[] {
  return roles
    .filter((role) => !NOT_STAFF.includes(keyOf(role)))
    .map((role, index) => ({ role, index }))
    .sort((a, b) => rank(keyOf(a.role)) - rank(keyOf(b.role)) || a.index - b.index)
    .map((entry) => entry.role);
}

/** The areas of work a role can touch, read from its permissions. Empty when the permissions are not known. */
export function roleAreas(role: GuidedRole, business: Business): string[] {
  const held = new Set(role.permissionKeys ?? []);
  if (held.size === 0) return [];
  const supplier = isSupplierBusiness(business);
  const has = AREAS.filter((area) => area.anyOf.some((permission) => held.has(permission)));
  // A role that reaches every area is said in a word, not as a list of fifteen.
  if (has.length === AREAS.length) return ["Everything"];
  if (has.length === AREAS.length - 1 && !has.includes(AREAS[0])) return ["Everything except billing"];
  return has.map((area) => (supplier && area.supplierLabel ? area.supplierLabel : area.label));
}

export function roleGuide(
  role: GuidedRole,
  business: Business,
): { job: string; areas: string[]; caution: string | null } {
  const key = keyOf(role);
  return {
    job: JOB[key] ?? role.description?.trim() ?? "",
    areas: roleAreas(role, business),
    caution: CAUTION[key] ?? null,
  };
}
