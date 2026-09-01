/**
 * Order workspace templates. Shelf is the tile grid; ledger is a spreadsheet list.
 * Preference is per browser (localStorage).
 */

export const ORDER_TEMPLATE_IDS = ["shelf", "ledger"] as const;

export type OrderTemplateId = (typeof ORDER_TEMPLATE_IDS)[number];

export const DEFAULT_ORDER_TEMPLATE_ID: OrderTemplateId = "shelf";

export const ORDER_TEMPLATE_STORAGE_KEY = "ub.orderTemplateId";

export const ORDER_TEMPLATE_CHANGED_EVENT = "ub:order-template-changed";

export type OrderTemplateMeta = {
  id: OrderTemplateId;
  name: string;
  blurb: string;
};

export const ORDER_TEMPLATES: readonly OrderTemplateMeta[] = [
  {
    id: "shelf",
    name: "Shelf",
    blurb: "Picture tiles on a product grid",
  },
  {
    id: "ledger",
    name: "Ledger",
    blurb: "Spreadsheet list for dense catalogs",
  },
] as const;

export function isOrderTemplateId(value: unknown): value is OrderTemplateId {
  return value === "shelf" || value === "ledger";
}

export function parseOrderTemplateId(raw: unknown): OrderTemplateId {
  if (typeof raw !== "string") {
    return DEFAULT_ORDER_TEMPLATE_ID;
  }
  const trimmed = raw.trim().toLowerCase();
  return isOrderTemplateId(trimmed) ? trimmed : DEFAULT_ORDER_TEMPLATE_ID;
}

export function readLocalOrderTemplate(): OrderTemplateId {
  if (typeof window === "undefined") {
    return DEFAULT_ORDER_TEMPLATE_ID;
  }
  try {
    return parseOrderTemplateId(
      window.localStorage.getItem(ORDER_TEMPLATE_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_ORDER_TEMPLATE_ID;
  }
}

export function writeLocalOrderTemplate(id: OrderTemplateId): void {
  if (typeof window === "undefined") {
    return;
  }
  const next = parseOrderTemplateId(id);
  try {
    window.localStorage.setItem(ORDER_TEMPLATE_STORAGE_KEY, next);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(
    new CustomEvent(ORDER_TEMPLATE_CHANGED_EVENT, { detail: next }),
  );
}
