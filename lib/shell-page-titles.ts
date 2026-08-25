import { APP_ROUTES } from "@/lib/config";

/** Friendly large-title label for the tablet app header from the current path. */
export function shellPageTitle(pathname: string): string {
  const path = pathname.split("?")[0] ?? pathname;

  const exact: Record<string, string> = {
    [APP_ROUTES.overview]: "Overview",
    [APP_ROUTES.businessSettings]: "Settings",
    [APP_ROUTES.businessLogs]: "What happened",
    [APP_ROUTES.businessConfiguration]: "How the shop runs",
    [APP_ROUTES.products]: "Add products",
    [APP_ROUTES.itemTypes]: "Departments",
    [APP_ROUTES.categories]: "Categories",
    [APP_ROUTES.suppliers]: "Suppliers",
    [APP_ROUTES.marketplace]: "Find suppliers",
    [APP_ROUTES.creditsOnTab]: "On tab",
    [APP_ROUTES.customers]: "People on credit",
    [APP_ROUTES.customerPhones]: "Phone numbers",
    [APP_ROUTES.creditsPaymentClaims]: "They say they paid",
    [APP_ROUTES.inventoryStock]: "Stock levels",
    [APP_ROUTES.inventoryRestock]: "Sold out",
    [APP_ROUTES.inventoryValuation]: "What stock is worth",
    [APP_ROUTES.inventoryTransfers]: "Move between shops",
    [APP_ROUTES.inventoryStockTake]: "Full count",
    [APP_ROUTES.inventoryStockTakeDailyAudit]: "Today's count",
    [APP_ROUTES.inventoryStockTakeDailyAuditReview]: "Count review",
    [APP_ROUTES.inventoryStockTakeInvestigations]: "Odd counts",
    [APP_ROUTES.inventoryStockTakeRestock]: "What to buy",
    [APP_ROUTES.inventoryStockTakeRestockOrders]: "Restock orders",
    [APP_ROUTES.inventoryOrderPad]: "Shopping list",
    [APP_ROUTES.inventorySupplyBatches]: "Deliveries",
    [APP_ROUTES.inventoryCostIssues]: "Selling too cheap",
    [APP_ROUTES.purchasingAddSupplies]: "Record delivery",
    [APP_ROUTES.order]: "New order",
    [APP_ROUTES.orderReceive]: "Confirm delivery",
    [APP_ROUTES.purchasingIntelligence]: "Compare suppliers",
    [APP_ROUTES.purchasingApAging]: "Unpaid bills",
    [APP_ROUTES.purchasingRecordPayment]: "Pay bills",
    [APP_ROUTES.pricing]: "Pricing",
    [APP_ROUTES.discounts]: "Discounts",
    [APP_ROUTES.shifts]: "Shifts",
    [APP_ROUTES.sales]: "Sales",
    [APP_ROUTES.salesTransactions]: "Receipts",
    [APP_ROUTES.salesReports]: "Sales reports",
    [APP_ROUTES.salesQuick]: "Quick sale",
    [APP_ROUTES.cashier]: "Cashier",
    [APP_ROUTES.butcher]: "Butcher",
    [APP_ROUTES.butcherProducts]: "Products",
    [APP_ROUTES.butcherAnalytics]: "Analytics",
    [APP_ROUTES.butcherSuppliers]: "Suppliers",
    [APP_ROUTES.grocery]: "Grocery",
    [APP_ROUTES.groceryInvoices]: "Invoices",
    [APP_ROUTES.analytics]: "Trends",
    [APP_ROUTES.analyticsActivity]: "Who did what",
    [APP_ROUTES.analyticsCustomers]: "Shoppers",
    [APP_ROUTES.business]: "Business",
    [APP_ROUTES.businessBranding]: "Branding",
    [APP_ROUTES.businessThemes]: "Themes",
    [APP_ROUTES.businessMobile]: "Store app",
    [APP_ROUTES.users]: "Team",
    [APP_ROUTES.branches]: "Branches",
    [APP_ROUTES.paymentsSettings]: "How you get paid",
    [APP_ROUTES.paymentsDayLedger]: "Today's takings",
    [APP_ROUTES.paymentsKioskPay]: "Kiosk Pay",
    [APP_ROUTES.airtime]: "Airtime",
    [APP_ROUTES.onlineAirtime]: "Online airtime",
    [APP_ROUTES.desktopSettings]: "Desktop",
  };

  if (exact[path]) return exact[path];

  if (path.startsWith(APP_ROUTES.products)) return "Add products";
  if (path.startsWith("/inventory")) return "Stock";
  if (
    path.startsWith("/purchasing") ||
    path.startsWith(APP_ROUTES.purchasingAddSupplies)
  )
    return "Suppliers & bills";
  if (path.startsWith(APP_ROUTES.sales)) return "Sales";
  if (path.startsWith(APP_ROUTES.business)) return "Business";
  if (path.startsWith(APP_ROUTES.grocery)) return "Grocery";
  if (path.startsWith(APP_ROUTES.butcher)) return "Butcher";
  if (path === APP_ROUTES.creditsOnTab) return "On tab";
  if (path.startsWith("/credits")) return "Credit";
  if (path === APP_ROUTES.customerPhones || path.startsWith(`${APP_ROUTES.customerPhones}/`))
    return "Customer phones";
  if (path.startsWith(APP_ROUTES.customers)) return "Credit customers";

  const segment = path.split("/").filter(Boolean).pop();
  if (!segment) return "Home";
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
