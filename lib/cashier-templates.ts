/**
 * Cashier chrome templates. Shelf is the tile POS; ledger is the spreadsheet till.
 * Preference is per device: registered till_devices row wins, else localStorage.
 */

export const CASHIER_TEMPLATE_IDS = ["shelf", "ledger"] as const;

export type CashierTemplateId = (typeof CASHIER_TEMPLATE_IDS)[number];

export const DEFAULT_CASHIER_TEMPLATE_ID: CashierTemplateId = "shelf";

export const CASHIER_TEMPLATE_STORAGE_KEY = "ub.cashierTemplateId";

export const CASHIER_TEMPLATE_CHANGED_EVENT = "ub:cashier-template-changed";

export type CashierTemplateMeta = {
  id: CashierTemplateId;
  name: string;
  blurb: string;
};

export const CASHIER_TEMPLATES: readonly CashierTemplateMeta[] = [
  {
    id: "shelf",
    name: "Shelf",
    blurb: "Picture tiles and a cart rail",
  },
  {
    id: "ledger",
    name: "Ledger",
    blurb: "Spreadsheet till with keypad",
  },
] as const;

export function isCashierTemplateId(value: unknown): value is CashierTemplateId {
  return value === "shelf" || value === "ledger";
}

export function parseCashierTemplateId(raw: unknown): CashierTemplateId {
  if (typeof raw !== "string") {
    return DEFAULT_CASHIER_TEMPLATE_ID;
  }
  const trimmed = raw.trim().toLowerCase();
  return isCashierTemplateId(trimmed) ? trimmed : DEFAULT_CASHIER_TEMPLATE_ID;
}

/**
 * Registered till row wins, then this browser's local pick, then shelf.
 */
export function resolveCashierTemplate(opts: {
  registered?: string | null;
  local?: string | null;
}): CashierTemplateId {
  if (opts.registered != null && opts.registered.trim() !== "") {
    return parseCashierTemplateId(opts.registered);
  }
  if (opts.local != null && opts.local.trim() !== "") {
    return parseCashierTemplateId(opts.local);
  }
  return DEFAULT_CASHIER_TEMPLATE_ID;
}

export function readLocalCashierTemplate(): CashierTemplateId {
  if (typeof window === "undefined") {
    return DEFAULT_CASHIER_TEMPLATE_ID;
  }
  try {
    return parseCashierTemplateId(
      window.localStorage.getItem(CASHIER_TEMPLATE_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_CASHIER_TEMPLATE_ID;
  }
}

export function writeLocalCashierTemplate(id: CashierTemplateId): void {
  if (typeof window === "undefined") {
    return;
  }
  const next = parseCashierTemplateId(id);
  try {
    window.localStorage.setItem(CASHIER_TEMPLATE_STORAGE_KEY, next);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(
    new CustomEvent(CASHIER_TEMPLATE_CHANGED_EVENT, { detail: next }),
  );
}
