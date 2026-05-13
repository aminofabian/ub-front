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
