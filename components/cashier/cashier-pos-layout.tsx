"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  Plus,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  itemListThumbnailUrl,
  type CategoryTreeNodeRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import { tileHue, type TopProductRecord } from "@/lib/top-products";
import { cn } from "@/lib/utils";

import {
  CashierProductModal,
  type CashierProductModalSubmit,
} from "./cashier-product-modal";
import {
  CashierCartDrawer,
  type CashierCartDrawerProps,
} from "./cashier-cart-drawer";

export type CashierPosLayoutProps = {
  online: boolean;
  currency: string;
  activeBranchName: string;
  branchesLoading: boolean;
  branchSelected: boolean;

  search: string;
  setSearch: (v: string) => void;
  hits: ItemSummaryRecord[];
  searchBanner: string | null;
  topProducts: TopProductRecord[];
  addLine: (item: ItemSummaryRecord, qty?: number, unitPrice?: string) => void;

  canBrowseCategories: boolean;
  categoryRoots: CategoryTreeNodeRecord[];
  visibleCategoryTiles: CategoryTreeNodeRecord[];
  categoryBrowseStack: CategoryTreeNodeRecord[];
  setCategoryBrowseStack: React.Dispatch<
    React.SetStateAction<CategoryTreeNodeRecord[]>
  >;
  applySubtreeFilter: (id: string, label: string) => void;
  clearCategoryFilter: () => void;
  categoryFilterId: string | null;
  categoryFilterLabel: string | null;
  categoryTreeBusy: boolean;
  categoryBrowseParentId: string | null;

  cart: Pick<
    CashierCartDrawerProps,
    | "lines"
    | "grandTotal"
    | "removeLine"
    | "updateLine"
    | "payMethod"
    | "setPayMethod"
    | "mpesaRef"
    | "setMpesaRef"
    | "splitPay"
    | "setSplitPay"
    | "cashSplitStr"
    | "setCashSplitStr"
    | "mpesaSplitStr"
    | "setMpesaSplitStr"
    | "splitMpesaRef"
    | "setSplitMpesaRef"
    | "canLookupCustomers"
    | "customerPhoneQuery"
    | "setCustomerPhoneQuery"
    | "customerHits"
    | "customerSearchBusy"
    | "onSearchCustomers"
    | "selectedCustomer"
    | "setSelectedCustomer"
    | "onComplete"
    | "loading"
    | "outboxCount"
    | "outboxBusy"
    | "onRetryOutbox"
    | "error"
    | "notice"
    | "canVoid"
    | "lastSale"
    | "lastSaleCustomerName"
    | "voidNotes"
    | "setVoidNotes"
    | "onVoidLastSale"
    | "voidLoading"
    | "onDownloadReceiptPdf"
    | "receiptLoading"
  >;
};

function TopSellerTile({
  product,
  rank,
  onPick,
}: {
  product: TopProductRecord;
  rank: number;
  onPick: () => void;
}) {
  const hue = tileHue(product.id);
  const sold = product.count;
  const qtyLabel =
    product.qty >= 100
      ? `${Math.round(product.qty)}`
      : product.qty.toFixed(product.qty >= 10 ? 0 : 1);
  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        backgroundImage: `linear-gradient(135deg, hsl(${hue} 80% 94%), hsl(${(hue + 35) % 360} 78% 84%))`,
      }}
      className={cn(
        "group relative flex h-[7.75rem] flex-col justify-between overflow-hidden rounded-2xl",
        "border border-white/60 p-3 text-left shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/40 blur-2xl transition-opacity group-hover:opacity-90"
      />
      <div className="relative flex items-start justify-between gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm backdrop-blur"
          style={{ color: `hsl(${hue} 65% 28%)` }}
        >
          {rank === 0 ? "★ Top" : `#${rank + 1}`}
        </span>
        {product.thumbnailUrl ? (
          <span className="relative h-9 w-9 overflow-hidden rounded-md border border-white/70 bg-white/85 shadow-sm">
            <Image
              src={product.thumbnailUrl}
              alt=""
              width={36}
              height={36}
              className="h-full w-full object-cover"
              unoptimized
            />
          </span>
        ) : (
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/50 bg-white/60 text-sm font-bold shadow-sm"
            style={{ color: `hsl(${hue} 65% 28%)` }}
            aria-hidden
          >
            {product.name.trim().charAt(0).toUpperCase() || "?"}
          </span>
        )}
      </div>
      <div className="relative space-y-0.5">
        <p
          className="line-clamp-2 text-[13px] font-semibold leading-snug"
          style={{ color: `hsl(${hue} 65% 28%)` }}
        >
          {product.name}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-foreground/60">
          {product.sku ? product.sku : "no sku"}
        </p>
        <p className="text-[10px] font-medium text-foreground/70">
          {sold > 0 ? `Sold ×${sold} · qty ${qtyLabel}` : "Suggested pick"}
        </p>
      </div>
    </button>
  );
}

function SearchHitTile({
  item,
  onPick,
}: {
  item: ItemSummaryRecord;
  onPick: () => void;
}) {
  const thumb = itemListThumbnailUrl(item);
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors",
        "hover:border-primary/40 hover:bg-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
      )}
    >
      {thumb ? (
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
          <Image
            src={thumb}
            alt=""
            width={48}
            height={48}
            className="h-full w-full object-cover"
            unoptimized
          />
        </span>
      ) : (
        <span
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-base font-bold text-muted-foreground"
          aria-hidden
        >
          {item.name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-sm font-medium">{item.name}</span>
        <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
          {item.sku || "no sku"}
        </span>
      </span>
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-foreground">
        <Plus className="size-3.5" />
      </span>
    </button>
  );
}

export function CashierPosLayout(props: CashierPosLayoutProps) {
  const {
    online,
    currency,
    activeBranchName,
    branchesLoading,
    branchSelected,
    search,
    setSearch,
    hits,
    searchBanner,
    topProducts,
    addLine,
    canBrowseCategories,
    visibleCategoryTiles,
    categoryBrowseStack,
    setCategoryBrowseStack,
    applySubtreeFilter,
    clearCategoryFilter,
    categoryFilterId,
    categoryFilterLabel,
    categoryTreeBusy,
    categoryBrowseParentId,
    cart,
  } = props;

  const [pickedItem, setPickedItem] = useState<ItemSummaryRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pulseCart, setPulseCart] = useState(false);

  const cartItemCount = useMemo(() => {
    let total = 0;
    for (const line of cart.lines) {
      const q = Number(line.quantity);
      if (Number.isFinite(q) && q > 0) total += q;
    }
    return total;
  }, [cart.lines]);

  const grandTotal = cart.grandTotal;
  const hasSearch = search.trim().length > 0 || categoryFilterId != null;
  const showCatalog = !hasSearch;

  const handlePickItem = (item: ItemSummaryRecord) => {
    setPickedItem(item);
    setModalOpen(true);
  };

  const handleAddFromModal = (payload: CashierProductModalSubmit) => {
    addLine(payload.item, payload.quantity, payload.unitPrice);
    setModalOpen(false);
    setPickedItem(null);
    setPulseCart(true);
  };

  useEffect(() => {
    if (!pulseCart) return;
    const t = window.setTimeout(() => setPulseCart(false), 700);
    return () => window.clearTimeout(t);
  }, [pulseCart]);

  useEffect(() => {
    if (cart.notice || cart.error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- surface sale results in the drawer.
      setDrawerOpen(true);
    }
  }, [cart.notice, cart.error]);

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold leading-tight">Point of sale</h2>
            <p className="text-xs text-muted-foreground">
              {branchesLoading ? (
                "Loading branches…"
              ) : activeBranchName ? (
                <>
                  Selling at <span className="font-medium text-foreground">{activeBranchName}</span>
                  <span className="opacity-70"> · change in top nav</span>
                </>
              ) : (
                <span className="text-amber-800">
                  Pick a branch in the top nav to start.
                </span>
              )}
            </p>
          </div>
          {!online ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
              Offline
            </span>
          ) : null}
        </div>
      </header>

      <div className="sticky top-[3.5rem] z-20 -mx-3 sm:-mx-4">
        <div className="bg-background/85 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4">
          <div
            className={cn(
              "group flex items-center gap-2 rounded-2xl border bg-card pl-3 pr-1 shadow-md transition-all",
              "border-primary/15 ring-2 ring-primary/5",
              "focus-within:border-primary/50 focus-within:ring-primary/30",
            )}
          >
            <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                categoryFilterId
                  ? "Search within this aisle…"
                  : "Search by name or SKU…"
              }
              className="h-12 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
              autoComplete="off"
              aria-label="Search products"
            />
            {search ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="text-muted-foreground"
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
          {searchBanner ? (
            <p className="mt-1 px-1 text-[11px] text-amber-800">{searchBanner}</p>
          ) : null}
          {categoryFilterId ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 px-1 text-xs">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
                Aisle: {categoryFilterLabel ?? categoryFilterId}
              </span>
              <button
                type="button"
                onClick={clearCategoryFilter}
                className="text-muted-foreground underline-offset-2 hover:underline"
              >
                Clear filter
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {hasSearch ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {search.trim() ? "Search results" : "Aisle items"}
            </h3>
            {hits.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                {hits.length} match{hits.length === 1 ? "" : "es"}
              </span>
            ) : null}
          </div>
          {hits.length === 0 ? (
            <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
              {search.trim()
                ? "No items match your search."
                : "No items in this aisle."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {hits.map((item) => (
                <SearchHitTile
                  key={item.id}
                  item={item}
                  onPick={() => handlePickItem(item)}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {showCatalog && topProducts.length > 0 ? (
        <section
          aria-label="Top selling products"
          className="space-y-3 rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50 p-4 shadow-sm dark:border-amber-200/20 dark:from-amber-950/20 dark:via-rose-950/20 dark:to-sky-950/20"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-base font-bold leading-none text-amber-700 dark:text-amber-300"
              >
                ★
              </span>
              <div>
                <h3 className="text-sm font-semibold leading-tight">Top sellers</h3>
                <p className="text-[11px] text-muted-foreground">
                  Tap to pick · ranked by recent sales on this device
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {topProducts.map((p, idx) => (
              <TopSellerTile
                key={p.id}
                product={p}
                rank={idx}
                onPick={() =>
                  handlePickItem({
                    id: p.id,
                    name: p.name,
                    sku: p.sku ?? "",
                    thumbnailUrl: p.thumbnailUrl ?? null,
                  })
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {showCatalog && canBrowseCategories ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Browse aisles</h3>
            <div className="flex items-center gap-2">
              {categoryBrowseStack.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  disabled={!online}
                  onClick={() => setCategoryBrowseStack((s) => s.slice(0, -1))}
                >
                  <ChevronLeft className="size-3.5" />
                  Back
                </Button>
              ) : null}
              {categoryBrowseParentId ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!online}
                  onClick={() => {
                    const cur = categoryBrowseStack[categoryBrowseStack.length - 1];
                    applySubtreeFilter(cur.id, cur.name);
                  }}
                >
                  Items here + subs
                </Button>
              ) : null}
            </div>
          </div>
          {!online ? (
            <p className="text-xs text-muted-foreground">
              Go online to load the aisle tree.
            </p>
          ) : categoryTreeBusy ? (
            <p className="text-xs text-muted-foreground">Loading aisles…</p>
          ) : visibleCategoryTiles.length === 0 ? (
            <p className="rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">
              No active aisles.
            </p>
          ) : (
            <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4">
              <div className="flex gap-2">
                {visibleCategoryTiles.map((node) => {
                  const thumb = node.thumbnailUrl?.trim();
                  const kids = (node.children ?? []).filter((c) => c.active);
                  const drillable = kids.length > 0;
                  const hue = tileHue(node.id);
                  return (
                    <button
                      key={node.id}
                      type="button"
                      disabled={!online}
                      style={{
                        backgroundImage: `linear-gradient(160deg, hsl(${hue} 65% 96%), hsl(${(hue + 30) % 360} 70% 88%))`,
                      }}
                      className={cn(
                        "flex w-[8.5rem] shrink-0 flex-col gap-2 rounded-2xl border border-white/60 p-3 text-left text-xs shadow-sm transition-all",
                        "hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50",
                      )}
                      onClick={() => {
                        if (!online) return;
                        if (drillable) {
                          setCategoryBrowseStack((s) => [...s, node]);
                          return;
                        }
                        applySubtreeFilter(node.id, node.name);
                      }}
                    >
                      <span className="relative mx-auto h-16 w-full overflow-hidden rounded-lg border border-white/70 bg-white/70">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            width={120}
                            height={64}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <span
                            className="flex h-full w-full items-center justify-center text-2xl font-bold"
                            style={{ color: `hsl(${hue} 60% 32%)` }}
                            aria-hidden
                          >
                            {node.name.trim().charAt(0).toUpperCase() || "?"}
                          </span>
                        )}
                      </span>
                      <span
                        className="line-clamp-2 font-semibold leading-tight"
                        style={{ color: `hsl(${hue} 60% 28%)` }}
                      >
                        {node.name}
                      </span>
                      <span className="text-[10px] text-foreground/60">
                        {drillable ? `${kids.length} subs · open` : "Tap for items"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className={cn(
          "fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full",
          "bg-foreground px-5 py-3 text-background shadow-lg shadow-black/20 transition-all",
          "hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          "sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0",
          pulseCart && "ring-4 ring-emerald-300/60",
        )}
        aria-label={`Open cart with ${cart.lines.length} line${cart.lines.length === 1 ? "" : "s"}`}
      >
        <span className="relative inline-flex size-8 items-center justify-center rounded-full bg-background/15">
          <ShoppingCart className="size-4" />
          {cart.lines.length > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-bold text-emerald-950 shadow">
              {cart.lines.length > 99 ? "99+" : cart.lines.length}
            </span>
          ) : null}
        </span>
        <span className="flex flex-col items-start leading-none">
          <span className="text-[10px] uppercase tracking-wide text-background/70">
            {cart.lines.length === 0
              ? "Cart empty"
              : `${cartItemCount.toFixed(0)} item${cartItemCount === 1 ? "" : "s"}`}
          </span>
          <span className="text-base font-semibold tabular-nums">
            {grandTotal.toFixed(2)} {currency}
          </span>
        </span>
      </button>

      <CashierProductModal
        item={pickedItem}
        open={modalOpen}
        currency={currency}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) setPickedItem(null);
        }}
        onSubmit={handleAddFromModal}
      />

      <CashierCartDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        online={online}
        currency={currency}
        branchSelected={branchSelected}
        {...cart}
      />
    </div>
  );
}
