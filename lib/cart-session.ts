import type {
  CustomerRecord,
  ItemSummaryRecord,
  SalePaymentMethod,
} from "@/lib/api";

/** Server sync state for persisted POS drafts. */
export type CartSyncStatus = "idle" | "syncing" | "error" | "conflict";

/** Per-cart state that was previously flat in QuickSaleWorkspace. */
export type CartSession = {
  id: string;
  /** Stable idempotency key for draft creation (one per tab). */
  clientDraftId: string;
  /** Server pos_drafts.id — null until first successful sync. */
  draftId: string | null;
  /** Branch-scoped ticket number (Sale #N). */
  ticketNumber: number | null;
  /** Optimistic-lock version from server. */
  version: number;
  syncStatus: CartSyncStatus;
  lastSyncedAt: string | null;
  label: string;
  createdAt: number;
  lines: CartSessionLine[];
  payMethod: SalePaymentMethod;
  mpesaRef: string;
  customerPhoneQuery: string;
  customerHits: CustomerRecord[];
  /** True after a phone search returned zero matches (credit tab flow). */
  customerNoPhoneMatch: boolean;
  /** Name for quick-register when no phone match (credit tab). */
  customerRegisterName: string;
  selectedCustomer: CustomerRecord | null;
  splitPay: boolean;
  cashSplitStr: string;
  mpesaSplitStr: string;
  splitMpesaRef: string;
  /** Amount customer handed over (cash checkout). */
  cashTenderStr: string;
  /** Grocery invoice id when this cart was loaded from a GI-* barcode. */
  groceryInvoiceId?: string;
  /** Grocery invoice barcode when this cart was loaded from a GI-* barcode. */
  groceryBarcode?: string;
  /** STK Push status: idle | sending | sent | failed */
  stkPushStatus: string;
  /** Gateway checkout request ID from STK push */
  stkPushCheckoutId: string;
  /** Last STK push error message */
  stkPushError: string;
  /** M-Pesa prompt phone (cashier STK). */
  stkAreaCode: string;
  stkPhone: string;
};

/** Mirror of CartLine from quick-sale-workspace — keep in sync. */
export type CartSessionLine = {
  key: string;
  /** Server pos_draft_lines.id after sync. */
  serverLineId?: string;
  itemId: string;
  label: string;
  quantity: string;
  unitPrice: string;
  item: ItemSummaryRecord;
};

export const MAX_CARTS = 8;

let cartCounter = 0;

/** New session with the same tab id/label (for resetting after a completed sale). */
export function resetCartSessionKeepingTab(cart: CartSession): CartSession {
  return {
    ...createEmptyCartSession(),
    id: cart.id,
    label: cart.label,
    createdAt: cart.createdAt,
  };
}

export function createEmptyCartSession(): CartSession {
  cartCounter += 1;
  return {
    id: crypto.randomUUID(),
    clientDraftId: crypto.randomUUID(),
    draftId: null,
    ticketNumber: null,
    version: 0,
    syncStatus: "idle",
    lastSyncedAt: null,
    label: `Cart ${cartCounter}`,
    createdAt: Date.now(),
    lines: [],
    payMethod: "cash",
    mpesaRef: "",
    customerPhoneQuery: "",
    customerHits: [],
    customerNoPhoneMatch: false,
    customerRegisterName: "",
    selectedCustomer: null,
    splitPay: false,
    cashSplitStr: "",
    mpesaSplitStr: "",
    splitMpesaRef: "",
    cashTenderStr: "",
    stkPushStatus: "idle",
    stkPushCheckoutId: "",
    stkPushError: "",
    stkAreaCode: "+254",
    stkPhone: "",
  };
}

/** Derive a display label: "#N", "Cart N", or customer name if selected. */
export function cartSessionLabel(cart: CartSession): string {
  if (cart.selectedCustomer?.name?.trim()) {
    return cart.selectedCustomer.name.trim();
  }
  if (cart.ticketNumber != null && cart.ticketNumber > 0) {
    return `#${cart.ticketNumber}`;
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
