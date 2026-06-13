import { APP_ROUTES } from "@/lib/config";

/** Friendly large-title label for the tablet app header from the current path. */
export function shellPageTitle(pathname: string): string {
  const path = pathname.split("?")[0] ?? pathname;

  const exact: Record<string, string> = {
    [APP_ROUTES.overview]: "Overview",
    [APP_ROUTES.products]: "Products",
    [APP_ROUTES.itemTypes]: "Departments",
    [APP_ROUTES.categories]: "Categories",
    [APP_ROUTES.suppliers]: "Suppliers",
    [APP_ROUTES.customers]: "Customers",
    [APP_ROUTES.inventoryStock]: "Stock",
    [APP_ROUTES.inventoryRestock]: "Out of stock",
    [APP_ROUTES.inventoryValuation]: "Valuation",
    [APP_ROUTES.inventoryTransfers]: "Transfers",
    [APP_ROUTES.inventoryStockTake]: "Stock take",
    [APP_ROUTES.inventorySupplyBatches]: "Supply batches",
    [APP_ROUTES.purchasingAddSupplies]: "Receive supplies",
    [APP_ROUTES.purchasingIntelligence]: "Supplier intel",
    [APP_ROUTES.purchasingApAging]: "AP aging",
    [APP_ROUTES.purchasingRecordPayment]: "Record payment",
    [APP_ROUTES.pricing]: "Pricing",
    [APP_ROUTES.shifts]: "Shifts",
    [APP_ROUTES.sales]: "Sales",
    [APP_ROUTES.salesTransactions]: "Transactions",
    [APP_ROUTES.salesReports]: "Sales reports",
    [APP_ROUTES.salesQuick]: "Quick sale",
    [APP_ROUTES.cashier]: "Cashier",
    [APP_ROUTES.grocery]: "Grocery",
    [APP_ROUTES.groceryInvoices]: "Invoices",
    [APP_ROUTES.analytics]: "Analytics",
    [APP_ROUTES.analyticsActivity]: "Activity",
    [APP_ROUTES.business]: "Settings",
    [APP_ROUTES.businessBranding]: "Branding",
    [APP_ROUTES.users]: "Team",
    [APP_ROUTES.branches]: "Branches",
    [APP_ROUTES.paymentsSettings]: "Payments",
    [APP_ROUTES.desktopSettings]: "Desktop",
  };

  if (exact[path]) return exact[path];

  if (path.startsWith(APP_ROUTES.products)) return "Products";
  if (path.startsWith("/inventory")) return "Inventory";
  if (
    path.startsWith("/purchasing") ||
    path.startsWith(APP_ROUTES.purchasingAddSupplies)
  )
    return "Purchasing";
  if (path.startsWith(APP_ROUTES.sales)) return "Sales";
  if (path.startsWith(APP_ROUTES.business)) return "Business";
  if (path.startsWith(APP_ROUTES.grocery)) return "Grocery";

  const segment = path.split("/").filter(Boolean).pop();
  if (!segment) return "Home";
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
