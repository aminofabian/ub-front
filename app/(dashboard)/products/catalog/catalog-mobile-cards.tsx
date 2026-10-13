"use client";

import { Package, Minus, Plus } from "lucide-react";

import type { GlobalCatalogAdoptLine, GlobalProductRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { moneyDraft, parseMoney } from "./catalog-import-sheet";

type CatalogMobileCardsProps = {
  products: GlobalProductRecord[];
  selectedIds: Set<string>;
  overrides: Map<string, GlobalCatalogAdoptLine>;
  categoryName: (categoryId: string | null | undefined) => string;
  departments: { id: string; name: string; depth: number }[];
  suggestedDepartmentId: (product: GlobalProductRecord) => string | undefined;
  currency: string;
  imageSrc: (url?: string | null) => string | null;
  onToggle: (product: GlobalProductRecord) => void;
  onEdit: (productId: string, patch: Partial<GlobalCatalogAdoptLine>) => void;
  onOpenOwned: (itemId: string) => void;
  loading?: boolean;
};

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PRIMARY = "var(--catalog-primary,#0f766e)";
const FIELD =
  "h-11 w-full rounded-none border bg-white px-2.5 text-sm leading-snug outline-none focus-visible:border-[var(--catalog-primary,#0f766e)]";

/**
 * Phone layout for the import sheet. The 7-column spreadsheet is unusable at
 * 390px, so below `lg` each catalog row becomes a card: pick, thumb, name,
 * department, SKU, and touch-sized Buy/Sell controls. The grid version stays
 * for `lg+` (see `CatalogImportSheet`).
 */
export function CatalogMobileCards({
  products,
  selectedIds,
  overrides,
  categoryName,
  departments,
  suggestedDepartmentId,
  currency,
  imageSrc,
  onToggle,
  onEdit,
  onOpenOwned,
  loading,
}: CatalogMobileCardsProps) {
  if (loading) {
    return (
      <ul className="divide-y divide-border border-b">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={`card-sk-${index}`} className="space-y-3 p-3">
            <div className="h-11 animate-pulse rounded-none bg-muted" />
            <div className="h-11 animate-pulse rounded-none bg-muted" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="divide-y divide-border border-b">
      {products.map((product) => {
        const override = overrides.get(product.id);
        const selected = selectedIds.has(product.id);
        const owned = product.alreadyImported;
        const src = imageSrc(product.imageUrl);
        const sku = override?.sku ?? product.skuTemplate ?? "";
        const buy = moneyDraft(
          override?.buyingPrice,
          product.recommendedBuyingPrice,
        );
        const sell = moneyDraft(
          override?.sellingPrice,
          product.recommendedSellingPrice,
        );
        const departmentValue =
          override?.categoryId ?? suggestedDepartmentId(product) ?? "";

        return (
          <li
            key={product.id}
            className={cn(
              "bg-white",
              selected && "bg-[#e8f5ee]",
              owned && "opacity-70",
            )}
          >
            <div className="flex items-start gap-2.5 p-3">
              <label
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center",
                  owned && "opacity-50",
                )}
              >
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--catalog-primary,#0f766e)]"
                  checked={selected}
                  disabled={owned}
                  aria-label={`Select ${product.name}`}
                  onChange={() => onToggle(product)}
                />
              </label>
              {src ? (
                <img
                  src={src}
                  alt=""
                  className="size-12 shrink-0 border border-border object-cover"
                  loading="lazy"
                />
              ) : (
                <span
                  className={cn(
                    "inline-flex size-12 shrink-0 items-center justify-center border bg-muted text-muted-foreground",
                    HAIRLINE,
                  )}
                >
                  <Package className="size-4" aria-hidden />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-[-0.02em]">
                  {product.name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {[product.brand, product.size].filter(Boolean).join(" · ")}
                  {owned && product.adoptedItemId ? (
                    <>
                      {[product.brand, product.size].filter(Boolean).length
                        ? " · "
                        : ""}
                      <button
                        type="button"
                        className="underline underline-offset-2"
                        style={{ color: PRIMARY }}
                        onClick={() => onOpenOwned(product.adoptedItemId!)}
                      >
                        In your catalog
                      </button>
                    </>
                  ) : null}
                </p>
                {product.barcode ? (
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {product.barcode}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2 px-3 pb-3">
              <label className="block">
                <span className="mb-1 block text-[11px] text-muted-foreground">
                  Department
                </span>
                <select
                  className={cn(FIELD, "cursor-pointer py-0")}
                  aria-label={`Department for ${product.name}`}
                  disabled={owned}
                  value={departmentValue}
                  onChange={(event) =>
                    onEdit(product.id, {
                      categoryId: event.target.value ? event.target.value : null,
                    })
                  }
                >
                  <option value="">
                    {categoryName(product.globalCategoryId)}
                  </option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {"\u00a0".repeat(department.depth * 2)}
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] text-muted-foreground">
                  SKU
                </span>
                <input
                  className={cn(FIELD, "font-mono text-xs")}
                  defaultValue={sku}
                  key={sku}
                  disabled={owned}
                  aria-label={`SKU for ${product.name}`}
                  onBlur={(event) => {
                    if (event.currentTarget.value !== sku) {
                      onEdit(product.id, {
                        sku: event.currentTarget.value.trim() || null,
                      });
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <PriceStepper
                  label="Buy"
                  value={buy}
                  currency={currency}
                  disabled={owned}
                  onCommit={(next) => {
                    const parsed = parseMoney(next);
                    onEdit(product.id, {
                      buyingPrice: parsed,
                      openingUnitCost: parsed,
                    });
                  }}
                />
                <PriceStepper
                  label="Sell"
                  value={sell}
                  currency={currency}
                  disabled={owned}
                  onCommit={(next) =>
                    onEdit(product.id, { sellingPrice: parseMoney(next) })
                  }
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PriceStepper({
  label,
  value,
  currency,
  disabled,
  onCommit,
}: {
  label: string;
  value: string;
  currency: string;
  disabled?: boolean;
  onCommit: (next: string) => void;
}) {
  const nudge = (delta: number) => {
    const current = parseMoney(value) ?? 0;
    const next = Math.max(0, current + delta);
    onCommit(String(Number(next.toFixed(2))));
  };

  const stepButton = (delta: number, aria: string, Icon: typeof Minus) => (
    <button
      type="button"
      aria-label={`${aria} ${label} price`}
      disabled={disabled}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center border text-foreground active:bg-muted disabled:opacity-50",
        HAIRLINE,
      )}
      onClick={() => nudge(delta)}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex items-stretch gap-1">
        {stepButton(-1, "Decrease", Minus)}
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{`${label} price in ${currency}`}</span>
          <input
            className={cn(FIELD, "text-center tabular-nums")}
            defaultValue={value}
            key={value}
            disabled={disabled}
            inputMode="decimal"
            onBlur={(event) => {
              if (event.currentTarget.value !== value) {
                onCommit(event.currentTarget.value);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </label>
        {stepButton(1, "Increase", Plus)}
      </div>
    </div>
  );
}
