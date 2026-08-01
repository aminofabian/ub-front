"use client";

import { Check, Package, Search, X } from "lucide-react";
import type { ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import type { GlobalCategoryRecord, GlobalProductRecord } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type CatalogParentFilter =
  | { kind: "all" }
  | { kind: "pack"; packId: string; packName: string }
  | { kind: "category"; categoryId: string };

function imageSrc(url?: string | null): string | null {
  const trimmed = url?.trim();
  if (!trimmed || trimmed.startsWith("/api/media/")) {
    return null;
  }
  return trimmed;
}

function ParentButton({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden border px-1",
        "text-center text-[10px] font-semibold leading-tight transition touch-manipulation",
        active
          ? "border-[#0D9488] bg-[#0D9488] text-white"
          : "border-[#E5E7EB] bg-[#FAFAF8] text-[#1F2937] hover:border-[#D1D5DB] hover:bg-white",
      )}
      title={hint ?? label}
    >
      <span className="line-clamp-3">{label}</span>
    </button>
  );
}

function ProductTile({
  product,
  selected,
  currency,
  index,
  onToggle,
}: {
  product: GlobalProductRecord;
  selected: boolean;
  currency: string;
  index: number;
  onToggle: () => void;
}) {
  const src = imageSrc(product.imageUrl);
  const price =
    product.recommendedSellingPrice != null
      ? formatMoney(product.recommendedSellingPrice, currency)
      : null;

  return (
    <button
      type="button"
      onClick={onToggle}
      style={{ animationDelay: `${Math.min(index, 24) * 18}ms` }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden border bg-[#FCFAF6] text-left",
        "transition-[border-color,background-color,box-shadow,transform] duration-150",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1",
        "hover:z-[1] hover:border-[#CBD5E1] hover:bg-white hover:shadow-[2px_2px_0_0_rgba(15,23,42,0.08)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]/40",
        selected
          ? "border-[#0D9488] bg-[#F0FDFA] shadow-[inset_0_0_0_1px_#0D9488]"
          : "border-[#E8E4DC]",
        product.alreadyImported && "opacity-50",
      )}
    >
      {selected ? (
        <span className="absolute right-1.5 top-1.5 z-[2] flex size-5 items-center justify-center rounded-full bg-[#0D9488] text-white">
          <Check className="size-3" aria-hidden />
        </span>
      ) : null}
      <div className="relative aspect-square w-full bg-[#F3F0EA]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="size-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[#C4C0B6]">
            <Package className="size-7" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-[#1F2937]">
          {product.name}
        </p>
        <p className="text-[10px] tabular-nums text-[#6B7280]">
          {price ?? "—"}
          {product.alreadyImported ? " · In shop" : ""}
        </p>
        {product.barcode ? (
          <p className="truncate font-mono text-[9px] text-[#9CA3AF]">
            {product.barcode}
          </p>
        ) : null}
      </div>
    </button>
  );
}

export type OnboardingCatalogShelfProps = {
  currency: string;
  categories: GlobalCategoryRecord[];
  packFilter: { packId: string; packName: string } | null;
  parentFilter: CatalogParentFilter;
  onParentFilterChange: (filter: CatalogParentFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
  products: GlobalProductRecord[];
  selected: Map<string, GlobalProductRecord>;
  onToggleProduct: (product: GlobalProductRecord) => void;
  onRemoveSelected: (productId: string) => void;
  onClearSelected: () => void;
  storefrontVisible: boolean;
  onStorefrontVisibleChange: (value: boolean) => void;
  loading?: boolean;
  shelfCountLabel: string;
  canAdopt: boolean;
  importing?: boolean;
  importProgressLabel?: string | null;
  /** Non-blocking note (e.g. lines skipped by preview) shown near the import button. */
  importNotice?: string | null;
  errorMessage?: string | null;
  onImport: () => void;
  onClose: () => void;
  mobileManifestOpen: boolean;
  onMobileManifestOpenChange: (open: boolean) => void;
  headerExtra?: ReactNode;
};

export function OnboardingCatalogShelf({
  currency,
  categories,
  packFilter,
  parentFilter,
  onParentFilterChange,
  search,
  onSearchChange,
  products,
  selected,
  onToggleProduct,
  onRemoveSelected,
  onClearSelected,
  storefrontVisible,
  onStorefrontVisibleChange,
  loading = false,
  shelfCountLabel,
  canAdopt,
  importing = false,
  importProgressLabel = null,
  importNotice = null,
  errorMessage = null,
  onImport,
  onClose,
  mobileManifestOpen,
  onMobileManifestOpenChange,
  headerExtra,
}: OnboardingCatalogShelfProps) {
  const selectedList = [...selected.values()];
  const selectedCount = selectedList.length;

  const parentRail = (
    <>
      <div className="flex h-8 shrink-0 items-center justify-center bg-[#0D9488] px-1.5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-white">
        Parent
      </div>
      <div className="flex flex-col gap-1.5 overflow-y-auto p-1.5">
        {packFilter ? (
          <ParentButton
            active={parentFilter.kind === "pack"}
            label="Suggested"
            hint={packFilter.packName}
            onClick={() =>
              onParentFilterChange({
                kind: "pack",
                packId: packFilter.packId,
                packName: packFilter.packName,
              })
            }
          />
        ) : null}
        <ParentButton
          active={parentFilter.kind === "all"}
          label="All"
          onClick={() => onParentFilterChange({ kind: "all" })}
        />
        {categories.map((cat) => (
          <ParentButton
            key={cat.id}
            active={
              parentFilter.kind === "category" &&
              parentFilter.categoryId === cat.id
            }
            label={cat.name}
            onClick={() =>
              onParentFilterChange({
                kind: "category",
                categoryId: cat.id,
              })
            }
          />
        ))}
      </div>
    </>
  );

  const manifestBody = (
    <>
      <div className="border-b border-[#E8E4DC] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0D9488]">
          Manifest
        </p>
        <p className="mt-1 text-sm font-semibold text-[#1F2937]">
          {selectedCount === 0
            ? "Nothing selected yet"
            : storefrontVisible
              ? `${selectedCount} product${selectedCount === 1 ? "" : "s"} · ready for your storefront`
              : `${selectedCount} product${selectedCount === 1 ? "" : "s"} · in-store only`}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {selectedCount === 0 ? (
          <div className="flex h-full min-h-[10rem] items-center justify-center rounded-xl border border-dashed border-[#D6D3CB] bg-[#FCFAF6] px-4 py-6 text-center text-xs leading-relaxed text-[#6B7280]">
            Tap shelf products to build your starter catalogue. Drafts stay until
            you import.
          </div>
        ) : (
          <ul className="space-y-1.5">
            {selectedList.map((product) => (
              <li
                key={product.id}
                className="flex items-start gap-2 rounded-lg border border-[#E8E4DC] bg-white px-2.5 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-medium text-[#1F2937]">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-[10px] tabular-nums text-[#6B7280]">
                    {product.recommendedSellingPrice != null
                      ? formatMoney(product.recommendedSellingPrice, currency)
                      : "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveSelected(product.id)}
                  className="mt-0.5 shrink-0 text-[#9CA3AF] hover:text-[#374151]"
                  aria-label={`Remove ${product.name}`}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-[#E8E4DC] px-4 py-3">
        <label className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-[#374151]">
            Show on online store
          </span>
          <Switch
            checked={storefrontVisible}
            onCheckedChange={onStorefrontVisibleChange}
            disabled={importing}
          />
        </label>
        {errorMessage ? (
          <p className="text-xs text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {importNotice ? (
          <p className="text-xs text-amber-700" role="status">
            {importNotice}
          </p>
        ) : null}
        {importProgressLabel ? (
          <p className="text-xs text-[#0F766E]">{importProgressLabel}</p>
        ) : null}
        <button
          type="button"
          disabled={!canAdopt || selectedCount === 0 || importing}
          onClick={onImport}
          className={cn(
            "flex h-11 w-full items-center justify-center gap-2 rounded-none text-sm font-semibold transition",
            canAdopt && selectedCount > 0 && !importing
              ? "bg-[#0D9488] text-white hover:bg-[#0F766E]"
              : "cursor-not-allowed bg-[#E5E7EB] text-white",
          )}
        >
          {importing
            ? "Importing…"
            : selectedCount > 0
              ? `Import ${selectedCount} product${selectedCount === 1 ? "" : "s"}`
              : "Select products to import"}
        </button>
        {selectedCount > 0 && !importing ? (
          <button
            type="button"
            onClick={onClearSelected}
            className="w-full text-center text-xs text-[#6B7280] hover:underline"
          >
            Clear selection
          </button>
        ) : null}
      </div>
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#F7F4EE] text-[#1F2937]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E8E4DC] bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0D9488]">
            Starter catalogue
          </p>
          <h2 className="truncate text-base font-semibold tracking-tight">
            Stock your shelves
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headerExtra}
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </header>

      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        <aside className="hidden w-[6.75rem] shrink-0 flex-col border-r border-[#E8E4DC] bg-[#F3F0EA] xl:w-[7.5rem] lg:flex">
          {parentRail}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex gap-1.5 overflow-x-auto border-b border-[#E8E4DC] bg-[#F3F0EA] p-2 lg:hidden">
            {packFilter ? (
              <button
                type="button"
                onClick={() =>
                  onParentFilterChange({
                    kind: "pack",
                    packId: packFilter.packId,
                    packName: packFilter.packName,
                  })
                }
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
                  parentFilter.kind === "pack"
                    ? "bg-[#0D9488] text-white"
                    : "bg-white text-[#374151] ring-1 ring-[#E5E7EB]",
                )}
              >
                Suggested
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onParentFilterChange({ kind: "all" })}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
                parentFilter.kind === "all"
                  ? "bg-[#0D9488] text-white"
                  : "bg-white text-[#374151] ring-1 ring-[#E5E7EB]",
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  onParentFilterChange({
                    kind: "category",
                    categoryId: cat.id,
                  })
                }
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
                  parentFilter.kind === "category" &&
                    parentFilter.categoryId === cat.id
                    ? "bg-[#0D9488] text-white"
                    : "bg-white text-[#374151] ring-1 ring-[#E5E7EB]",
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="space-y-2 border-b border-[#E8E4DC] bg-white px-3 py-2.5 sm:px-4">
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Find a product or scan barcode…"
                className="h-10 w-full rounded-none border border-[#E5E7EB] bg-[#FCFAF6] pl-10 pr-3 text-sm outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/15"
              />
            </label>
            <div className="flex items-center justify-between gap-2 text-xs text-[#6B7280]">
              <h3 className="font-semibold text-[#1F2937]">{shelfCountLabel}</h3>
              {loading ? <span>Loading…</span> : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 pb-20 sm:p-3 lg:pb-3">
            {products.length === 0 && !loading ? (
              <div className="flex h-48 items-center justify-center text-sm text-[#6B7280]">
                No products in this view.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-px bg-[#E8E4DC] sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                {products.map((product, index) => (
                  <ProductTile
                    key={product.id}
                    product={product}
                    selected={selected.has(product.id)}
                    currency={currency}
                    index={index}
                    onToggle={() => onToggleProduct(product)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="hidden w-[min(100%,20rem)] shrink-0 flex-col border-l border-[#E8E4DC] bg-white xl:w-[22rem] lg:flex">
          {manifestBody}
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#E8E4DC] bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <button
          type="button"
          onClick={() => onMobileManifestOpenChange(true)}
          className="flex h-12 w-full items-center justify-between rounded-none bg-[#0D9488] px-4 text-sm font-semibold text-white"
        >
          <span>Manifest</span>
          <span className="tabular-nums">{selectedCount} selected</span>
        </button>
      </div>

      {mobileManifestOpen ? (
        <div className="fixed inset-0 z-20 flex flex-col bg-white lg:hidden">
          <div className="flex items-center justify-between border-b border-[#E8E4DC] px-4 py-3">
            <p className="text-sm font-semibold">Manifest</p>
            <button
              type="button"
              onClick={() => onMobileManifestOpenChange(false)}
              className="text-xs font-medium text-[#6B7280]"
            >
              Back to shelf
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{manifestBody}</div>
        </div>
      ) : null}
    </div>
  );
}
