"use client";

import { Plus } from "lucide-react";

import type { ItemSummaryRecord } from "@/lib/api";
import {
  cashierItemPrimaryLabel,
  cashierItemTitleParts,
} from "@/lib/cashier-item-display";
import {
  formatPosStockQty,
  posVariantOptionLabel,
} from "@/lib/pos-catalog-groups";
import { cn } from "@/lib/utils";

export function stockTone(item: ItemSummaryRecord): "out" | "low" | null {
  const raw = item.stockQty;
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return "out";
  if (n < 10) return "low";
  return null;
}

/**
 * One compact POS catalog row (variant or standalone). Shared by the hybrid
 * search list and the variant picker so both surfaces render identical rows.
 */
export function PosVariantRow({
  item,
  shelfLine,
  cartQty,
  justAdded,
  emphasizeSku,
  optionLabel,
  onPick,
}: {
  item: ItemSummaryRecord;
  shelfLine: string;
  cartQty: number;
  justAdded: boolean;
  emphasizeSku?: boolean;
  optionLabel?: string | null;
  onPick: () => void;
}) {
  const sku = item.sku?.trim() || "";
  const { primary, option } = cashierItemTitleParts(item);
  const name = optionLabel ?? (option ? `${primary}` : primary);
  const optionShown = optionLabel ?? option;
  const stock = formatPosStockQty(item.stockQty);
  const tone = stockTone(item);

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={Boolean(item.groupLabelOnly)}
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(5.5rem,8.5rem)_auto] items-start gap-x-2.5 gap-y-0.5 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-2.5 py-2 text-left transition-colors",
        "hover:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,var(--card))]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        cartQty > 0 &&
          "bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_40%,var(--card))]",
        justAdded && "ring-1 ring-inset ring-[var(--pos-primary)]/35",
        tone === "out" && "opacity-70",
      )}
      aria-label={
        cartQty > 0
          ? `${cashierItemPrimaryLabel(item)}, ${cartQty} in cart. Add another.`
          : `Add ${cashierItemPrimaryLabel(item)}`
      }
    >
      <span className="min-w-0">
        <span className="block whitespace-normal break-words text-sm font-medium leading-snug text-foreground">
          {name}
          {optionShown && !optionLabel ? (
            <span className="font-normal text-muted-foreground">
              {" "}
              · {optionShown}
            </span>
          ) : null}
        </span>
        {stock != null ? (
          <span
            className={cn(
              "mt-0.5 block text-[11px] leading-snug",
              tone === "out"
                ? "text-red-700 dark:text-red-400"
                : tone === "low"
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-muted-foreground",
            )}
          >
            Stock {stock}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 pt-0.5 text-right text-sm font-semibold tabular-nums text-foreground">
        {shelfLine}
      </span>
      <span
        className={cn(
          "min-w-0 whitespace-normal break-all pt-0.5 font-mono text-[11px] leading-snug tracking-tight text-zinc-500",
          emphasizeSku && "font-semibold text-foreground",
        )}
      >
        {sku}
      </span>
      <span className="inline-flex shrink-0 items-start justify-end pt-0.5">
        {cartQty > 0 ? (
          <span className="rounded bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
            ×{cartQty}
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)]">
            <Plus className="size-3.5" aria-hidden />
            Add
          </span>
        )}
      </span>
    </button>
  );
}

/** Column labels above variant rows (hidden on xs, matching the rows). */
function PosVariantTableHeader() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(5.5rem,8.5rem)_auto] gap-x-2.5 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
      <span>Item</span>
      <span className="text-right">Price</span>
      <span>SKU</span>
      <span className="sr-only">Add</span>
    </div>
  );
}

export function PosVariantTable({
  variants,
  shelfPrices,
  cartQtyByItem,
  justAddedId,
  onPick,
}: {
  variants: ItemSummaryRecord[];
  shelfPrices: Record<string, string>;
  cartQtyByItem: Map<string, number>;
  justAddedId: string | null;
  onPick: (item: ItemSummaryRecord) => void;
}) {
  return (
    <div>
      <PosVariantTableHeader />
      {variants.map((item) => (
        <PosVariantRow
          key={item.id}
          item={item}
          shelfLine={shelfPrices[item.id] ?? ""}
          cartQty={cartQtyByItem.get(item.id) ?? 0}
          justAdded={justAddedId === item.id}
          emphasizeSku
          optionLabel={posVariantOptionLabel(item)}
          onPick={() => onPick(item)}
        />
      ))}
    </div>
  );
}
