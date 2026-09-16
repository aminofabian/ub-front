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
 * Precedence: an explicit pick on this device wins, then the registered till
 * row, then shelf.
 *
 * The local value is only ever written by a person tapping a template (or by
 * the admin panel on the device where they change it), so it means "this
 * browser was deliberately set to X". The registered row is that named till's
 * default, and applies on any device that has not been given an explicit pick.
 */
export function resolveCashierTemplate(opts: {
  registered?: string | null;
  local?: string | null;
}): CashierTemplateId {
  if (opts.local != null && opts.local.trim() !== "") {
    return parseCashierTemplateId(opts.local);
  }
  if (opts.registered != null && opts.registered.trim() !== "") {
    return parseCashierTemplateId(opts.registered);
  }
  return DEFAULT_CASHIER_TEMPLATE_ID;
}

export function readLocalCashierTemplate(): CashierTemplateId {
  return readLocalCashierTemplateOrNull() ?? DEFAULT_CASHIER_TEMPLATE_ID;
}

/** The device's explicit pick, or null when it has never been set. */
export function readLocalCashierTemplateOrNull(): CashierTemplateId | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(CASHIER_TEMPLATE_STORAGE_KEY);
    const t = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    return isCashierTemplateId(t) ? t : null;
  } catch {
    return null;
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

/**
 * Drop this device's explicit pick so the registered till's template applies
 * again. Also removes any stale value that is not a known id.
 */
export function clearLocalCashierTemplate(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(CASHIER_TEMPLATE_STORAGE_KEY);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(CASHIER_TEMPLATE_CHANGED_EVENT));
}
