/**
 * Stock status filters, defined once and shared by every breakpoint.
 *
 * The bar used to inline eight buttons per breakpoint, which meant the desktop
 * and phone strip could drift (they had drifted: different order, different
 * labels, a different subset visible). These two groups are the real taxonomy —
 * how much stock is on the shelf, and whether the pricing is sound — and each
 * label says what it means instead of relying on a two-letter abbreviation.
 */

export type StockStatusFilter =
  | "all"
  | "in_stock"
  | "low"
  | "out"
  | "loss"
  | "poor_margin"
  | "no_buy"
  | "no_sell";

/** Keys on the `stockCounts` object computed in the page. */
export type StockCountKey =
  | "total"
  | "inStock"
  | "low"
  | "out"
  | "loss"
  | "poorMargin"
  | "noBuy"
  | "noSell";

export type StockStatusTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "loss";

export type StockStatusOption = {
  key: StockStatusFilter;
  /** Full label — what the operator reads. */
  label: string;
  /** Terse label for a narrow strip. */
  shortLabel: string;
  /** Explains the filter; used as the tooltip and the accessible name. */
  hint: string;
  countKey: StockCountKey;
  tone: StockStatusTone;
};

/** How much stock is on the shelf. */
export const STOCK_LEVEL_FILTERS: readonly StockStatusOption[] = [
  {
    key: "all",
    label: "All items",
    shortLabel: "All",
    hint: "Every item at this branch",
    countKey: "total",
    tone: "default",
  },
  {
    key: "in_stock",
    label: "In stock",
    shortLabel: "In",
    hint: "On hand and above the reorder level",
    countKey: "inStock",
    tone: "success",
  },
  {
    key: "low",
    label: "Low stock",
    shortLabel: "Low",
    hint: "On hand but at or below the reorder level",
    countKey: "low",
    tone: "warning",
  },
  {
    key: "out",
    label: "Out of stock",
    shortLabel: "Out",
    hint: "Nothing left on the shelf",
    countKey: "out",
    tone: "danger",
  },
];

/** Pricing that is losing money or is still missing. */
export const STOCK_PRICING_FILTERS: readonly StockStatusOption[] = [
  {
    key: "loss",
    label: "Selling below cost",
    shortLabel: "Loss",
    hint: "Sell price is lower than the buy price",
    countKey: "loss",
    tone: "loss",
  },
  {
    key: "poor_margin",
    label: "Thin margin",
    shortLabel: "Margin",
    hint: "Margin under 15%",
    countKey: "poorMargin",
    tone: "warning",
  },
  {
    key: "no_buy",
    label: "No buy price",
    shortLabel: "No buy",
    hint: "Missing a buying price",
    countKey: "noBuy",
    tone: "default",
  },
  {
    key: "no_sell",
    label: "No sell price",
    shortLabel: "No sell",
    hint: "Missing a selling price",
    countKey: "noSell",
    tone: "default",
  },
];

export const STOCK_STATUS_FILTERS: readonly StockStatusOption[] = [
  ...STOCK_LEVEL_FILTERS,
  ...STOCK_PRICING_FILTERS,
];

export const STOCK_STATUS_GROUPS: readonly {
  id: "level" | "pricing";
  label: string;
  hint: string;
  options: readonly StockStatusOption[];
}[] = [
  {
    id: "level",
    label: "Stock level",
    hint: "How much is on the shelf",
    options: STOCK_LEVEL_FILTERS,
  },
  {
    id: "pricing",
    label: "Pricing",
    hint: "Buy and sell prices that need attention",
    options: STOCK_PRICING_FILTERS,
  },
];

export function stockStatusOption(
  key: StockStatusFilter,
): StockStatusOption | undefined {
  return STOCK_STATUS_FILTERS.find((o) => o.key === key);
}

/** Filters that are hidden behind the phone's Filters panel. */
export const STOCK_ATTENTION_FILTERS: readonly StockStatusOption[] =
  STOCK_PRICING_FILTERS;

/** Plain-language description of what a filter is currently showing. */
export function describeStockFilter(key: StockStatusFilter): string {
  switch (key) {
    case "loss":
      return "Showing items selling below cost";
    case "poor_margin":
      return "Showing items with a thin margin";
    case "no_buy":
      return "Showing items with no buy price";
    case "no_sell":
      return "Showing items with no sell price";
    default:
      return "";
  }
}
