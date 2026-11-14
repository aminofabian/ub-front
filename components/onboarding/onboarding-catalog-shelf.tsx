"use client";

import { Check, ChevronLeft, Package, Search, X } from "lucide-react";
import type { ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import type {
  GlobalCatalogAdoptProgress,
  GlobalCategoryRecord,
  GlobalProductRecord,
} from "@/lib/api";
import { hapticTap } from "@/lib/haptics";
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
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full shrink-0 items-center rounded-[2px] px-3 py-2 text-left text-[13px] leading-snug touch-manipulation",
        "transition-[background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4B3B] focus-visible:ring-offset-1 focus-visible:ring-offset-[#EFEBE2]",
        active
          ? "bg-[#1D4B3B] font-semibold text-[#F4F1EA]"
          : "font-medium text-[#2A332E] hover:bg-[#E6E1D6] hover:text-[#121A16]",
      )}
      title={hint ?? label}
    >
      <span className="line-clamp-2">{label}</span>
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
      onClick={() => {
        if (!product.alreadyImported) {
          hapticTap(8);
        }
        onToggle();
      }}
      style={{ animationDelay: `${Math.min(index, 24) * 18}ms` }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[2px] border text-left sm:rounded-none",
        "transition-[border-color,background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1",
        "focus-visible:z-[2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4B3B]",
        "motion-safe:active:scale-[0.97] touch-manipulation",
        selected
          ? "z-[1] border-[#1D4B3B] bg-[#E3EBE5] shadow-[inset_0_0_0_1px_#1D4B3B]"
          : "border-[rgba(18,26,22,0.12)] bg-[#FCFAF5] hover:z-[1] hover:border-[rgba(18,26,22,0.4)]",
        product.alreadyImported && "opacity-50",
      )}
    >
      {selected ? (
        <span className="absolute right-1.5 top-1.5 z-[2] flex size-5 items-center justify-center rounded-[2px] bg-[#1D4B3B] text-[#F4F1EA]">
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </span>
      ) : null}
      <div className="relative aspect-square w-full bg-[#EFEBE2]">
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
        <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-[#121A16]">
          {product.name}
        </p>
        <p className="font-mono text-[11px] tabular-nums text-[#2A332E]">
          {price ?? "—"}
          {product.alreadyImported ? " · In shop" : ""}
        </p>
        {product.barcode ? (
          <p className="truncate font-mono text-[10px] text-[#626D66]">
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
  onSelectAllOnShelf?: () => void;
  onClearShelfSelection?: () => void;
  allShelfSelected?: boolean;
  shelfSelectableCount?: number;
  storefrontVisible: boolean;
  onStorefrontVisibleChange: (value: boolean) => void;
  loading?: boolean;
  loadingLabel?: string | null;
  shelfCountLabel: string;
  canAdopt: boolean;
  importing?: boolean;
  importProgress?: GlobalCatalogAdoptProgress | null;
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
  onSelectAllOnShelf,
  onClearShelfSelection,
  allShelfSelected = false,
  shelfSelectableCount = 0,
  storefrontVisible,
  onStorefrontVisibleChange,
  loading = false,
  loadingLabel = null,
  shelfCountLabel,
  canAdopt,
  importing = false,
  importProgress = null,
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
  const importPercent = importProgress
    ? Math.min(100, Math.max(0, importProgress.percent))
    : 0;
  const importDetail =
    importProgress?.message?.trim() ||
    (importProgress
      ? `Importing ${importProgress.processed} of ${importProgress.total}…`
      : null);

  const parentRail = (
    <>
      <p className="shrink-0 border-b border-[rgba(18,26,22,0.1)] px-4 py-3 text-[13px] font-semibold text-[#121A16]">
        Parent
      </p>
      <div className="flex flex-col gap-0.5 overflow-y-auto p-2">
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
      <div className="border-b border-[rgba(18,26,22,0.1)] px-4 py-4">
        <p className="text-balance font-serif text-[1.3rem] font-medium leading-[1.15] text-[#121A16]">
          {selectedCount === 0
            ? "Nothing selected yet"
            : storefrontVisible
              ? `${selectedCount} product${selectedCount === 1 ? "" : "s"} · ready for your storefront`
              : `${selectedCount} product${selectedCount === 1 ? "" : "s"} · in-store only`}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {selectedCount === 0 ? (
          <div className="flex h-full min-h-[10rem] items-center justify-center border border-dashed border-[rgba(18,26,22,0.22)] px-5 py-6 text-center text-[13px] leading-relaxed text-[#556159]">
            Tap shelf products to build your starter catalogue. Drafts stay until
            you import.
          </div>
        ) : (
          <ul className="divide-y divide-dashed divide-[rgba(18,26,22,0.2)]">
            {selectedList.map((product) => (
              <li
                key={product.id}
                className="flex items-center gap-2 py-1 pl-1"
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[13px] font-medium leading-snug text-[#121A16]">
                    {product.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[#556159]">
                    {product.recommendedSellingPrice != null
                      ? formatMoney(product.recommendedSellingPrice, currency)
                      : "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveSelected(product.id)}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-[2px] text-[#626D66] transition-colors hover:text-[#121A16] active:bg-[#EFEBE2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4B3B]"
                  aria-label={`Remove ${product.name}`}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-[rgba(18,26,22,0.1)] px-4 py-4">
        <label className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium text-[#2A332E]">
            Show on online store
          </span>
          <Switch
            checked={storefrontVisible}
            onCheckedChange={onStorefrontVisibleChange}
            disabled={importing}
          />
        </label>
        {errorMessage ? (
          <p className="text-[13px] leading-relaxed text-[#8F3F2F]" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {importNotice ? (
          <p className="text-[13px] leading-relaxed text-[#8F3F2F]" role="status">
            {importNotice}
          </p>
        ) : null}
        {importing && importProgress ? (
          <p className="font-mono text-[12px] tabular-nums text-[#1D4B3B]" role="status">
            {importPercent}% · {importProgress.processed.toLocaleString()} /{" "}
            {importProgress.total.toLocaleString()} products
          </p>
        ) : null}
        <button
          type="button"
          disabled={!canAdopt || selectedCount === 0 || importing}
          onClick={onImport}
          className={cn(
            "flex h-12 w-full items-center justify-center gap-2 rounded-[2px] text-[15px] font-semibold tracking-[-0.01em] transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4B3B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FCFAF5]",
            canAdopt && selectedCount > 0 && !importing
              ? "bg-[#1D4B3B] text-[#F4F1EA] hover:bg-[#163B2E] motion-safe:active:scale-[0.985]"
              : "cursor-not-allowed bg-[#E4DFD3] text-[#626D66]",
          )}
        >
          {importing
            ? importProgress
              ? `Importing… ${importPercent}%`
              : "Importing…"
            : selectedCount > 0
              ? `Import ${selectedCount} product${selectedCount === 1 ? "" : "s"}`
              : "Select products to import"}
        </button>
        {selectedCount > 0 && !importing ? (
          <button
            type="button"
            onClick={onClearSelected}
            className="min-h-9 w-full text-center text-[13px] text-[#556159] underline-offset-4 hover:text-[#121A16] hover:underline"
          >
            Clear selection
          </button>
        ) : null}
      </div>
    </>
  );

  const chipClass = (active: boolean) =>
    cn(
      "shrink-0 rounded-[2px] border px-3.5 py-2.5 text-[13px] font-medium touch-manipulation transition-colors duration-200 motion-safe:active:scale-[0.97]",
      active
        ? "border-[#1D4B3B] bg-[#1D4B3B] text-[#F4F1EA]"
        : "border-[rgba(18,26,22,0.14)] bg-[#FCFAF5] text-[#2A332E]",
    );

  return (
    <div className="kiosk-setup flex h-dvh max-h-dvh min-h-0 flex-col bg-[#F4F1EA] text-[#121A16]">
      <header className="shrink-0 border-b border-[rgba(18,26,22,0.1)] bg-[#F4F1EA]">
        <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-[max(0.65rem,env(safe-area-inset-top))] sm:px-5 lg:py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-[2px] border border-[rgba(18,26,22,0.14)] bg-[#FCFAF5] text-[#121A16] motion-safe:active:scale-95 disabled:opacity-50 lg:hidden"
            aria-label="Close catalogue"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1 lg:pl-0">
            <h2 className="truncate font-serif text-[1.45rem] font-medium leading-tight text-[#121A16] lg:text-[1.75rem]">
              {importing && importProgress
                ? `Importing ${importProgress.processed.toLocaleString()} of ${importProgress.total.toLocaleString()}`
                : "Stock your shelves"}
            </h2>
            {importing ? null : (
              <p className="truncate text-[13px] text-[#556159]">
                Tap products to add them to your shop
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {importing && importProgress ? (
              <span className="font-mono text-sm font-semibold tabular-nums text-[#1D4B3B]">
                {importPercent}%
              </span>
            ) : null}
            {headerExtra}
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="hidden h-10 rounded-[2px] border border-[rgba(18,26,22,0.16)] bg-[#FCFAF5] px-4 text-[13px] font-semibold text-[#121A16] transition-colors hover:border-[rgba(18,26,22,0.4)] disabled:opacity-50 lg:inline-flex lg:items-center"
            >
              Close
            </button>
          </div>
        </div>
        {importing && importProgress ? (
          <div className="space-y-1.5 px-3 pb-3 sm:px-5">
            <div
              className="h-[3px] overflow-hidden bg-[rgba(18,26,22,0.12)]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={importPercent}
              aria-label="Catalogue import progress"
            >
              <div
                className="h-full bg-[#1D4B3B] transition-[width] duration-300 ease-out"
                style={{ width: `${importPercent}%` }}
              />
            </div>
            {importDetail ? (
              <p className="truncate text-[12px] text-[#1D4B3B]" role="status">
                {importDetail}
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-1 flex-col lg:flex-row">
        <aside className="hidden w-[11rem] shrink-0 flex-col border-r border-[rgba(18,26,22,0.1)] bg-[#EFEBE2] xl:w-[12.5rem] lg:flex">
          {parentRail}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="-mx-0 flex gap-1.5 overflow-x-auto overscroll-x-contain border-b border-[rgba(18,26,22,0.1)] bg-[#EFEBE2] px-2 py-2.5 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
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
                className={chipClass(parentFilter.kind === "pack")}
              >
                Suggested
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onParentFilterChange({ kind: "all" })}
              className={chipClass(parentFilter.kind === "all")}
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
                className={chipClass(
                  parentFilter.kind === "category" &&
                    parentFilter.categoryId === cat.id,
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="space-y-2.5 border-b border-[rgba(18,26,22,0.1)] bg-[#F4F1EA] px-3 py-3 sm:px-4">
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#626D66]"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search products or type a barcode…"
                className="h-12 w-full rounded-[2px] border border-[rgba(18,26,22,0.18)] bg-[#FCFAF5] pl-10 pr-3 text-base text-[#121A16] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-[#626D66] focus:border-[#1D4B3B] focus:ring-2 focus:ring-[#1D4B3B]/15 sm:h-11 sm:text-sm"
                enterKeyHint="search"
                autoCapitalize="off"
                autoCorrect="off"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[13px] text-[#556159]">
              <h3 className="font-semibold text-[#121A16]">{shelfCountLabel}</h3>
              <div className="flex items-center gap-3">
                {loading || loadingLabel ? (
                  <span>{loadingLabel ?? "Loading…"}</span>
                ) : null}
                {shelfSelectableCount > 0 && !importing ? (
                  <>
                    <button
                      type="button"
                      onClick={
                        allShelfSelected
                          ? onClearShelfSelection
                          : onSelectAllOnShelf
                      }
                      className="min-h-9 font-semibold text-[#1D4B3B] underline-offset-4 hover:underline active:opacity-70"
                    >
                      {allShelfSelected
                        ? "Deselect all"
                        : `Select all (${shelfSelectableCount})`}
                    </button>
                    {selectedCount > 0 ? (
                      <>
                        <span className="text-[#C9C3B5]" aria-hidden>
                          ·
                        </span>
                        <button
                          type="button"
                          onClick={onClearSelected}
                          className="min-h-9 text-[#556159] underline-offset-4 hover:text-[#121A16] hover:underline active:opacity-70"
                        >
                          Clear selection
                        </button>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-2 pb-24 sm:p-3 lg:pb-3">
            {products.length === 0 && !loading ? (
              <div className="flex h-48 items-center justify-center text-[15px] text-[#556159]">
                No products in this view.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 sm:gap-0 sm:[&>*]:-mb-px sm:[&>*]:-mr-px">
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

        <aside className="hidden w-[min(100%,20rem)] shrink-0 flex-col border-l border-[rgba(18,26,22,0.1)] bg-[#FCFAF5] xl:w-[22rem] lg:flex">
          {manifestBody}
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[rgba(18,26,22,0.1)] bg-[#FCFAF5] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <button
          type="button"
          onClick={() => {
            if (selectedCount === 0) {
              return;
            }
            hapticTap(8);
            onMobileManifestOpenChange(true);
          }}
          className={cn(
            "flex h-12 w-full items-center justify-between rounded-[2px] px-4 text-[15px] font-semibold transition-[background-color,transform] duration-200 touch-manipulation motion-safe:active:scale-[0.99]",
            selectedCount > 0
              ? "bg-[#1D4B3B] text-[#F4F1EA]"
              : "border border-[rgba(18,26,22,0.14)] bg-[#FCFAF5] text-[#556159]",
          )}
        >
          <span>
            {selectedCount > 0 ? "Review selection" : "Tap products to add them"}
          </span>
          {selectedCount > 0 ? (
            <span className="font-mono text-[13px] tabular-nums">{selectedCount} selected</span>
          ) : null}
        </button>
      </div>

      {mobileManifestOpen ? (
        <div className="fixed inset-0 z-20 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#0D1713]/45"
            aria-label="Close selection"
            onClick={() => onMobileManifestOpenChange(false)}
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[min(92dvh,40rem)] flex-col rounded-t-[2px] bg-[#FCFAF5] shadow-[0_-18px_44px_-22px_rgba(13,23,19,0.35)] motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-250">
            <div className="flex shrink-0 flex-col items-center pt-2">
              <span className="h-1 w-10 rounded-full bg-[#C9C3B5]" aria-hidden />
            </div>
            <div className="flex items-center justify-between px-4 pb-2 pt-1">
              <button
                type="button"
                onClick={() => onMobileManifestOpenChange(false)}
                className="inline-flex size-11 items-center justify-center rounded-[2px] border border-[rgba(18,26,22,0.14)] text-[#121A16] motion-safe:active:scale-95"
                aria-label="Back to shelf"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <p className="text-[15px] font-semibold text-[#121A16]">Your selection</p>
              <span className="size-11" aria-hidden />
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]">
              {manifestBody}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
