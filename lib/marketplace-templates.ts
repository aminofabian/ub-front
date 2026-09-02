/**
 * Public marketplace catalogue templates. Shelf is the picture tile grid;
 * ledger is a dense spreadsheet list. Preference is per browser (localStorage).
 */

export const MARKETPLACE_TEMPLATE_IDS = ["shelf", "ledger"] as const;

export type MarketplaceTemplateId = (typeof MARKETPLACE_TEMPLATE_IDS)[number];

export const DEFAULT_MARKETPLACE_TEMPLATE_ID: MarketplaceTemplateId = "shelf";

export const MARKETPLACE_TEMPLATE_STORAGE_KEY = "ub.marketplaceTemplateId";

export const MARKETPLACE_TEMPLATE_CHANGED_EVENT = "ub:marketplace-template-changed";

export type MarketplaceTemplateMeta = {
  id: MarketplaceTemplateId;
  name: string;
  blurb: string;
};

export const MARKETPLACE_TEMPLATES: readonly MarketplaceTemplateMeta[] = [
  {
    id: "shelf",
    name: "Shelf",
    blurb: "Picture tiles on a product grid",
  },
  {
    id: "ledger",
    name: "Ledger",
    blurb: "Spreadsheet list for dense catalogues",
  },
] as const;

export function isMarketplaceTemplateId(
  value: unknown,
): value is MarketplaceTemplateId {
  return value === "shelf" || value === "ledger";
}

export function parseMarketplaceTemplateId(raw: unknown): MarketplaceTemplateId {
  if (typeof raw !== "string") {
    return DEFAULT_MARKETPLACE_TEMPLATE_ID;
  }
  const trimmed = raw.trim().toLowerCase();
  return isMarketplaceTemplateId(trimmed)
    ? trimmed
    : DEFAULT_MARKETPLACE_TEMPLATE_ID;
}

export function readLocalMarketplaceTemplate(): MarketplaceTemplateId {
  if (typeof window === "undefined") {
    return DEFAULT_MARKETPLACE_TEMPLATE_ID;
  }
  try {
    return parseMarketplaceTemplateId(
      window.localStorage.getItem(MARKETPLACE_TEMPLATE_STORAGE_KEY),
    );
  } catch {
    return DEFAULT_MARKETPLACE_TEMPLATE_ID;
  }
}

export function writeLocalMarketplaceTemplate(id: MarketplaceTemplateId): void {
  if (typeof window === "undefined") {
    return;
  }
  const next = parseMarketplaceTemplateId(id);
  try {
    window.localStorage.setItem(MARKETPLACE_TEMPLATE_STORAGE_KEY, next);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(
    new CustomEvent(MARKETPLACE_TEMPLATE_CHANGED_EVENT, { detail: next }),
  );
}
