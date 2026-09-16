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
  /** One plain-language line on what the tool does, for the till menu. */
  hint?: string;
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
  if (sameCartSummary(cashierCartSummary, detail)) return;
  cashierCartSummary = detail;
  cashierCartSummaryListeners.forEach((listener) => listener());
  window.dispatchEvent(
    new CustomEvent(CASHIER_CART_SUMMARY_EVENT, { detail }),
  );
}

/**
 * Published state, not fire-and-forget.
 *
 * Effects run child-first, so the POS surface publishes its tools while the
 * shell's till-menu provider has not attached a listener yet — an event alone
 * loses that first (and often only) payload, and the menu renders empty. A
 * readable store lets a late subscriber pull what was already published.
 */
let cashierTools: CashierMobileTool[] = [];
const cashierToolListeners = new Set<() => void>();
let cashierCartSummary: CashierCartSummaryDetail | null = null;
const cashierCartSummaryListeners = new Set<() => void>();

const EMPTY_TOOLS: CashierMobileTool[] = [];

function sameTools(a: CashierMobileTool[], b: CashierMobileTool[]): boolean {
  return (
    a.length === b.length &&
    a.every((t, i) => {
      const o = b[i];
      return (
        t.id === o.id &&
        t.label === o.label &&
        t.hint === o.hint &&
        t.section === o.section &&
        t.tone === o.tone
      );
    })
  );
}

function sameCartSummary(
  a: CashierCartSummaryDetail | null,
  b: CashierCartSummaryDetail,
): boolean {
  return (
    a != null &&
    a.label === b.label &&
    a.itemCount === b.itemCount &&
    a.total === b.total &&
    a.currency === b.currency
  );
}

export function getCashierTools(): CashierMobileTool[] {
  return cashierTools;
}

/** Stable snapshot for SSR/hydration — never a fresh array. */
export function getCashierToolsServerSnapshot(): CashierMobileTool[] {
  return EMPTY_TOOLS;
}

export function subscribeCashierTools(listener: () => void): () => void {
  cashierToolListeners.add(listener);
  return () => {
    cashierToolListeners.delete(listener);
  };
}

export function getCashierCartSummary(): CashierCartSummaryDetail | null {
  return cashierCartSummary;
}

export function subscribeCashierCartSummary(listener: () => void): () => void {
  cashierCartSummaryListeners.add(listener);
  return () => {
    cashierCartSummaryListeners.delete(listener);
  };
}

export function dispatchCashierTools(tools: CashierMobileTool[]) {
  if (typeof window === "undefined") return;
  const next = Array.isArray(tools) ? tools : EMPTY_TOOLS;
  // Keep the previous reference when nothing changed: subscribers read this
  // through useSyncExternalStore, which loops on an unstable snapshot.
  if (sameTools(cashierTools, next)) return;
  cashierTools = next;
  cashierToolListeners.forEach((listener) => listener());
  window.dispatchEvent(new CustomEvent(CASHIER_TOOLS_EVENT, { detail: next }));
}

export function dispatchCashierRunTool(id: CashierMobileToolId) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CASHIER_RUN_TOOL_EVENT, { detail: id }));
}
