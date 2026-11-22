import { request } from "@/lib/api";
import { API_ROUTES } from "@/lib/config";

/** A buyer's approved account as the clerk at a supplier's counter needs it. */
export type CounterTerms = {
  found: boolean;
  accountId: string | null;
  buyerName: string | null;
  businessName: string | null;
  discountPercent: number | null;
  termsDays: number | null;
  creditLimit: number | null;
  creditAvailable: number | null;
  /** The buyer's own prices, by item id. A price here is the price; no discount on top. */
  prices: Record<string, number>;
};

export async function fetchCounterTerms(phone: string): Promise<CounterTerms> {
  return request<CounterTerms>(
    `${API_ROUTES.salesOrders}/counter-terms?phone=${encodeURIComponent(phone.trim())}`,
  );
}

/** The account a counter invoice was priced for, if the clerk picked one. */
export type CounterInvoiceAccount = {
  found: boolean;
  accountId: string | null;
  buyerName: string | null;
  businessName: string | null;
  /** The buyer's phone number, as written on the invoice. */
  buyerPhone: string | null;
};

/** The clerk records the account on the issued invoice. The server re-checks the prices against that account. */
export async function attachCounterInvoiceAccount(
  invoiceId: string,
  accountId: string,
): Promise<CounterInvoiceAccount> {
  return request<CounterInvoiceAccount>(
    `${API_ROUTES.salesOrders}/counter-invoices/${encodeURIComponent(invoiceId)}/account`,
    { method: "PUT", body: { accountId } },
  );
}

export async function fetchCounterInvoiceAccount(invoiceId: string): Promise<CounterInvoiceAccount> {
  return request<CounterInvoiceAccount>(
    `${API_ROUTES.salesOrders}/counter-invoices/${encodeURIComponent(invoiceId)}/account`,
  );
}

/** An owner or admin puts a pending counter invoice on the account the clerk priced it for. */
export async function putCounterInvoiceOnAccount(invoiceId: string): Promise<{ id: string }> {
  return request<{ id: string }>(`${API_ROUTES.salesOrders}/counter-on-account`, {
    method: "POST",
    body: { invoiceId },
  });
}

/**
 * The price this buyer pays for one unit: the buyer's own price when there is one, otherwise the shelf price
 * less the account discount. Without terms it is the shelf price. Same rule as a trade order placed online.
 */
export function counterPriceFor(terms: CounterTerms | null, itemId: string, shelfPrice: number): number {
  if (!terms || !terms.found) return shelfPrice;
  const own = terms.prices?.[itemId];
  if (own != null && Number.isFinite(Number(own))) return Number(own);
  const discount = Number(terms.discountPercent ?? 0);
  if (!(discount > 0)) return shelfPrice;
  return Math.round(shelfPrice * (100 - discount)) / 100;
}
