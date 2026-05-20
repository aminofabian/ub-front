import type {
  CustomerRecord,
  ItemSummaryRecord,
  SalePaymentMethod,
} from "@/lib/api";

/** Per-cart state that was previously flat in QuickSaleWorkspace. */
export type CartSession = {
  id: string;
  label: string;
  createdAt: number;
  lines: CartSessionLine[];
  payMethod: SalePaymentMethod;
  mpesaRef: string;
  customerPhoneQuery: string;
  customerHits: CustomerRecord[];
  selectedCustomer: CustomerRecord | null;
  splitPay: boolean;
  cashSplitStr: string;
  mpesaSplitStr: string;
  splitMpesaRef: string;
  /** Amount customer handed over (cash checkout). */
  cashTenderStr: string;
  /** STK Push status: idle | sending | sent | failed */
  stkPushStatus: string;
  /** Gateway checkout request ID from STK push */
  stkPushCheckoutId: string;
  /** Last STK push error message */
  stkPushError: string;
};

/** Mirror of CartLine from quick-sale-workspace — keep in sync. */
export type CartSessionLine = {
  key: string;
  itemId: string;
  label: string;
  quantity: string;
  unitPrice: string;
  item: ItemSummaryRecord;
};

export const MAX_CARTS = 8;

let cartCounter = 0;

export function createEmptyCartSession(): CartSession {
  cartCounter += 1;
  return {
    id: crypto.randomUUID(),
    label: `Cart ${cartCounter}`,
    createdAt: Date.now(),
    lines: [],
    payMethod: "cash",
    mpesaRef: "",
    customerPhoneQuery: "",
    customerHits: [],
    selectedCustomer: null,
    splitPay: false,
    cashSplitStr: "",
    mpesaSplitStr: "",
    splitMpesaRef: "",
    cashTenderStr: "",
    stkPushStatus: "idle",
    stkPushCheckoutId: "",
    stkPushError: "",
  };
}

/** Derive a display label: "Cart N" or customer name if selected. */
export function cartSessionLabel(cart: CartSession): string {
  if (cart.selectedCustomer?.name?.trim()) {
    return cart.selectedCustomer.name.trim();
  }
  return cart.label;
}

/** Total item count across all lines in the cart. */
export function cartSessionItemCount(cart: CartSession): number {
  let total = 0;
  for (const line of cart.lines) {
    const q = Number(line.quantity);
    if (Number.isFinite(q) && q > 0) total += q;
  }
  return total;
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseMoney(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return roundMoney2(n);
}

/** Grand total for a cart session (sum of qty × unitPrice across all lines). */
export function cartSessionGrandTotal(cart: CartSession): number {
  let t = 0;
  for (const line of cart.lines) {
    const q = Number(line.quantity);
    const p = parseMoney(line.unitPrice);
    if (Number.isFinite(q) && q > 0 && p != null) {
      t += roundMoney2(q * p);
    }
  }
  return roundMoney2(t);
}
