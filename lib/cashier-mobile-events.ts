/** Cross-chrome events for the cashier mobile app shell. */

export const CASHIER_FOCUS_SELL_EVENT = "ub:cashier-focus-sell";
export const CASHIER_OPEN_CART_EVENT = "ub:cashier-open-cart";
export const CASHIER_OPEN_MORE_EVENT = "ub:cashier-open-more";
export const CASHIER_CART_SUMMARY_EVENT = "ub:cashier-cart-summary";
export const CASHIER_TOOLS_EVENT = "ub:cashier-tools";
export const CASHIER_RUN_TOOL_EVENT = "ub:cashier-run-tool";

export type CashierCartSummaryDetail = {
  itemCount: number;
  total: number;
  currency: string;
  label: string;
};

export type CashierMobileToolId =
  | "add-product"
  | "suppliers"
  | "credit-tabs"
  | "order-pad"
  | "supplier-order"
  | "order-confirm"
  | "airtime"
  | "drawout"
  | "open-shift"
  | "close-shift";

export type CashierMobileTool = {
  id: CashierMobileToolId;
  label: string;
  section: "sale" | "stock" | "shift";
  tone?: "default" | "danger";
};

export function dispatchCashierFocusSell() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CASHIER_FOCUS_SELL_EVENT));
}

export function dispatchCashierOpenCart() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CASHIER_OPEN_CART_EVENT));
}

export function dispatchCashierOpenMore() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CASHIER_OPEN_MORE_EVENT));
}

export function dispatchCashierCartSummary(detail: CashierCartSummaryDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CASHIER_CART_SUMMARY_EVENT, { detail }),
  );
}

export function dispatchCashierTools(tools: CashierMobileTool[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CASHIER_TOOLS_EVENT, { detail: tools }));
}

export function dispatchCashierRunTool(id: CashierMobileToolId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CASHIER_RUN_TOOL_EVENT, { detail: id }));
}
