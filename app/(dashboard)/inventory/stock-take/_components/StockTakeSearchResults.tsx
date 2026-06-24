"use client";

import Image from "next/image";
import { CheckCircle2, Clock, Package, Plus, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  itemListThumbnailUrl,
  type ItemSummaryRecord,
  type StockTakeLineRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type LineStatus = "none" | "submitted" | "confirmed";

function stockTakeSearchMeta(item: ItemSummaryRecord) {
  const sku = item.sku?.trim() || "";
  const barcode = item.barcode?.trim() || "";
  const category = item.categoryName?.trim() || "";
  const showBarcode = Boolean(barcode && barcode !== sku);
  return { sku, barcode, category, showBarcode };
}

type StockTakeSearchResultsProps = {
  search: string;
  searching: boolean;
  items: ItemSummaryRecord[];
  checklistLines: StockTakeLineRecord[];
  getLineStatus: (lines: StockTakeLineRecord[], itemId: string) => LineStatus;
  getLineByItemId: (
    lines: StockTakeLineRecord[],
    itemId: string,
  ) => StockTakeLineRecord | undefined;
  formatCountedQty: (line: StockTakeLineRecord | undefined) => string;
  onSelect: (item: ItemSummaryRecord) => void;
  onCreateProduct: () => void;
};

export function StockTakeSearchResults({
  search,
  searching,
  items,
  checklistLines,
  getLineStatus,
  getLineByItemId,
  formatCountedQty,
  onSelect,
  onCreateProduct,
}: StockTakeSearchResultsProps) {
  if (!search.trim() && items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      {items.length > 0 ? (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Search results
          </h3>
          <span className="text-xs tabular-nums text-muted-foreground">
            {items.length} product{items.length === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}

      {searching ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/20 py-8 text-sm text-muted-foreground">
          <span
            className="size-4 animate-pulse rounded-full bg-primary/40"
            aria-hidden
          />
          Searching catalog…
        </div>
      ) : items.length > 0 ? (
        <ul className="max-h-60 space-y-1.5 overflow-auto pr-0.5">
          {items.map((item) => {
            const status = getLineStatus(checklistLines, item.id);
            const existingLine = getLineByItemId(checklistLines, item.id);
            const onChecklist = Boolean(existingLine);
            const thumb = itemListThumbnailUrl(item);
            const { sku, barcode, category, showBarcode } =
              stockTakeSearchMeta(item);
            const isConfirmed = status === "confirmed";

            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={isConfirmed}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-lg border border-border/60 bg-card p-3 text-left shadow-sm transition-all",
                    "hover:border-border hover:bg-accent/30 hover:shadow",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isConfirmed &&
                      "cursor-not-allowed border-border/40 bg-muted/20 opacity-70 shadow-none hover:bg-muted/20",
                  )}
                  onClick={() => onSelect(item)}
                >
                  {thumb ? (
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-md border bg-muted">
                      <Image
                        src={thumb}
                        alt=""
                        width={44}
                        height={44}
                        className="size-full object-cover"
                      />
                    </span>
                  ) : (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-dashed border-muted-foreground/25 bg-muted/40 text-muted-foreground/50">
                      <Package className="size-5" aria-hidden />
                    </span>
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                      {item.name}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {sku ? (
                        <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/50 bg-muted/40 px-2 py-0.5">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            SKU
                          </span>
                          <span className="truncate font-mono text-[11px] text-foreground/90">
                            {sku}
                          </span>
                        </span>
                      ) : null}
                      {showBarcode ? (
                        <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/50 bg-muted/40 px-2 py-0.5">
                          <ScanLine
                            className="size-3 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Barcode
                          </span>
                          <span className="truncate font-mono text-[11px] text-foreground/90">
                            {barcode}
                          </span>
                        </span>
                      ) : null}
                      {category ? (
                        <span className="inline-flex max-w-full items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {category}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <span className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                    {isConfirmed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="size-3" />
                        Confirmed
                      </span>
                    ) : status === "submitted" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                        <Clock className="size-3" />
                        {formatCountedQty(existingLine)} pcs
                      </span>
                    ) : null}
                    {!onChecklist ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        <Plus className="size-3" />
                        Add to list
                      </span>
                    ) : !isConfirmed && status !== "submitted" ? (
                      <span className="text-[11px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        Count →
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="space-y-3 rounded-lg border border-dashed border-border/70 bg-muted/15 px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">No products found</p>
          <p className="text-xs text-muted-foreground">
            Try another name, SKU, or barcode — or add a new product.
          </p>
          <Button variant="outline" size="sm" onClick={onCreateProduct}>
            <Plus className="mr-1 size-3.5" />
            Create &quot;{search.trim()}&quot;
          </Button>
        </div>
      )}
    </section>
  );
}
