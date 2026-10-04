"use client";

import { ChevronDown, FileDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import type { ItemSummaryRecord, ItemsPageResult } from "@/lib/api";
import {
  buildInventoryPriceListPdf,
  inventoryPriceListFilename,
  type InventoryPriceListItem,
  type InventoryPriceListMode,
} from "@/lib/inventory-price-list-pdf";
import { cn } from "@/lib/utils";

const PRICE_LIST_PAGE_SIZE = 200;
const PRICE_LIST_PAGE_CAP = 40;

const CHOICES: readonly {
  mode: InventoryPriceListMode;
  label: string;
  hint: string;
}[] = [
  { mode: "sell", label: "Name and selling price", hint: "Shop copy" },
  { mode: "both", label: "Name, buying and selling", hint: "Staff copy" },
];

type LoadPriceListPage = (
  page: number,
  size: number,
) => Promise<ItemsPageResult<ItemSummaryRecord>>;

type StockPriceListDownloadProps = {
  variant: "bar" | "icon";
  disabled?: boolean;
  currency: string;
  businessName: string;
  branchName?: string;
  scope?: string;
  loadPage: LoadPriceListPage;
};

export function StockPriceListDownload({
  variant,
  disabled,
  currency,
  businessName,
  branchName,
  scope,
  loadPage,
}: StockPriceListDownloadProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<InventoryPriceListMode | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const download = async (mode: InventoryPriceListMode) => {
    setOpen(false);
    setBusy(mode);
    try {
      const items = await collectPriceList(loadPage);
      if (items.length === 0) {
        toast.error("Nothing to print for this view.");
        return;
      }
      const when = new Date();
      downloadBlob(
        buildInventoryPriceListPdf({
          mode,
          businessName,
          branchName,
          scope,
          currency,
          generatedAt: when,
          items,
        }),
        inventoryPriceListFilename(businessName, mode, when),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build the price list.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", variant === "icon" && "shrink-0")}>
      <button
        type="button"
        disabled={disabled || busy !== null}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Download price list"
        onClick={() => setOpen((value) => !value)}
        className={triggerClass(variant, open)}
      >
        <FileDown className={variant === "icon" ? "size-4" : "size-3.5"} aria-hidden />
        {variant === "bar" ? (
          <span>{busy ? "PDF…" : "PDF"}</span>
        ) : null}
        {variant === "bar" ? (
          <ChevronDown
            className={cn("size-3 opacity-60 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        ) : null}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Price list"
          className={cn(
            "absolute top-[calc(100%+4px)] right-0 z-40 w-[15.5rem] overflow-hidden",
            "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white",
            "shadow-[0_12px_32px_-8px_color-mix(in_srgb,var(--order-ink,#15231f)_28%,transparent)]",
          )}
        >
          <p
            className={cn(
              "border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]",
              "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] px-3 py-1.5",
              "text-[9px] font-bold uppercase tracking-[0.14em]",
              "text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]",
            )}
          >
            Print price list
          </p>
          {CHOICES.map((choice) => (
            <button
              key={choice.mode}
              type="button"
              role="menuitem"
              onClick={() => void download(choice.mode)}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left",
                "hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,white)]",
                "focus-visible:outline-none focus-visible:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)]",
              )}
            >
              <span className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--order-ink,#15231f)]">
                {choice.label}
              </span>
              <span className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_50%,transparent)]">
                {choice.hint}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function triggerClass(variant: "bar" | "icon", open: boolean): string {
  if (variant === "icon") {
    return cn(
      "inline-flex size-11 items-center justify-center border-l",
      "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
      "text-[var(--order-ink,#15231f)]",
      "disabled:opacity-50",
      open && "bg-[var(--order-ink,#15231f)] text-white",
    );
  }
  return cn(
    "inline-flex h-7 items-center gap-1 border bg-white px-2",
    "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
    "text-[11px] font-semibold tracking-[-0.01em] text-[var(--order-ink,#15231f)]",
    "hover:border-[var(--pos-primary,#0f766e)] hover:text-[var(--pos-primary,#0f766e)]",
    "focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    open && "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]",
  );
}

async function collectPriceList(loadPage: LoadPriceListPage): Promise<InventoryPriceListItem[]> {
  const items: InventoryPriceListItem[] = [];
  let page = 0;
  let last = false;
  while (!last && page < PRICE_LIST_PAGE_CAP) {
    const result = await loadPage(page, PRICE_LIST_PAGE_SIZE);
    for (const item of result.content) {
      if (item.groupLabelOnly) continue;
      items.push(toPriceListItem(item));
    }
    last = result.last || result.content.length === 0;
    page += 1;
  }
  return items;
}

function toPriceListItem(item: ItemSummaryRecord): InventoryPriceListItem {
  return {
    name: item.name?.trim() || item.sku?.trim() || "Unnamed item",
    category: item.categoryName?.trim() || null,
    buyPrice: money(item.buyingPrice),
    sellPrice: money(item.sellingPrice ?? item.bundlePrice),
  };
}

function money(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
