"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import {
  ArrowRight,
  ChevronLeft,
  Loader2,
  LogOut,
  PlusCircle,
  ScanLine,
  Search,
  ShoppingCart,
  Wallet,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DASHBOARD_SECTION_SURFACE } from "@/components/dashboard-page-ui";
import {
  itemListThumbnailUrl,
  type CategoryTreeNodeRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import { fetchPosShelfPrice } from "@/lib/pos-shelf-price";
import type { CashierPosUiCopy } from "@/lib/cashier-pos-copy";
import { cashierItemPrimaryLabel, isPosPackageSellRow } from "@/lib/cashier-item-display";
import {
  formatShelfPriceLabel,
  shelfPriceToInputString,
  splitShelfPriceDisplay,
} from "@/lib/cashier-shelf-price";
import { usePosEvents } from "@/hooks/use-pos-events";
import { type TopProductRecord } from "@/lib/top-products";
import { cn } from "@/lib/utils";

import {
  CashierProductModal,
  type CashierProductModalSubmit,
} from "./cashier-product-modal";
import {
  CashierCartDrawer,
  type CashierCartDrawerProps,
} from "./cashier-cart-drawer";
import {
  CashierCurrencySuffix,
  CashierDottedLeader,
} from "./cashier-currency-inline";
import { kioskCategoryPillClass } from "./kiosk-listing-styles";
import { BarcodeScanner } from "@/components/barcode-scanner";

const POS_SHIFT_CHIP_CLASS = cn(
  "inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/90 px-2.5 py-1.5 text-xs font-semibold tracking-tight text-foreground shadow-sm",
  "transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-md",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "active:translate-y-0 active:shadow-sm",
);

export type CashierPosShiftLinksProps = {
  branchId: string;
  branchSelected: boolean;
  hasOpenShift: boolean;
  shiftLoading: boolean;
  canOpenShift: boolean;
  canCloseShift: boolean;
  /** Open shift / drawout / close flows in-place (no redirect to Shifts). */
  onShortcut: (action: "new-drawout" | "open-shift" | "close-shift") => void;
};

export type CashierPosLayoutProps = {
  /** Page heading (default: Point of sale). */
  pageTitle?: string;
  /** When true, lifts fixed cart controls above the dashboard mobile bottom nav. */
  embeddedInDashboard?: boolean;
  /** Brand CSS variables on the layout root (POS primary colors). */
  brandTheme?: CSSProperties;
  online: boolean;
  /** Extra offline hint (e.g. draft mirror pending sync). */
  offlineBanner?: string | null;
  currency: string;
  uiCopy: CashierPosUiCopy;
  activeBranchName: string;
  branchesLoading: boolean;
  branchSelected: boolean;
  /** Used to resolve branch-scoped shelf prices in the add-item modal. */
  branchId: string;
  /** Scopes local frequent-item cache pruning when pricing returns "Item not found". */
  businessId?: string | null;
  onStalePosItem?: (itemId: string) => void;
  /** Brand CSS variables for portaled dialogs (must be set on each modal root). */
  dialogBrandTheme: CSSProperties;

  search: string;
  setSearch: (v: string) => void;
  hits: ItemSummaryRecord[];
  searchBanner: string | null;
  topProducts: TopProductRecord[];
  addLine: (
    item: ItemSummaryRecord,
    qty?: number,
    unitPrice?: string,
  ) => boolean;

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
  /** When true, aisle filter stays active after add-to-cart. */
  keepAisleFilter?: boolean;
  onKeepAisleFilterChange?: (keep: boolean) => void;
  /** When set, catalog hits (search / aisle / type-only browse) are limited to this item type. */
  typeFilterId: string | null;
  typeFilterLabel: string | null;
  /** Optional local clear action. If omitted, the type badge is read-only (e.g., driven by the global header). */
  clearTypeFilter?: () => void;
  /** Shift / drawer shortcuts (cashier); opens modals in-place via {@link CashierPosShiftLinksProps.onShortcut}. */
  posShiftLinks: CashierPosShiftLinksProps | null;

  /** Multi-cart tab strip data. */
  cartTabs: {
    id: string;
    label: string;
    itemCount: number;
    grandTotal: number;
  }[];
  activeCartId: string;
  canCreateCart: boolean;
  onCreateCart: () => void;
  onSwitchCart: (id: string) => void;
  onRemoveCart: (id: string) => void;
  /** When true, cart quantity is not capped by on-hand stock. */
  allowNegativeStock?: boolean;

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
    | "cashTenderStr"
    | "setCashTenderStr"
    | "canLookupCustomers"
    | "canManageCustomers"
    | "customerPhoneQuery"
    | "setCustomerPhoneQuery"
    | "customerHits"
    | "customerNoPhoneMatch"
    | "customerRegisterName"
    | "setCustomerRegisterName"
    | "customerSearchBusy"
    | "customerRegisterBusy"
    | "onSearchCustomers"
    | "onRegisterCustomer"
    | "selectedCustomer"
    | "setSelectedCustomer"
    | "onComplete"
    | "canCompleteSale"
    | "loading"
    | "outboxCount"
    | "outboxBusy"
    | "onRetryOutbox"
    | "error"
    | "notice"
    | "canVoid"
    | "lastSale"
    | "lastReceipt"
    | "lastSaleCustomerName"
    | "stkAreaCode"
    | "setStkAreaCode"
    | "stkPhone"
    | "setStkPhone"
    | "stkPushStatus"
    | "stkPushError"
    | "onStkPush"
    | "voidNotes"
    | "setVoidNotes"
    | "onVoidLastSale"
    | "voidLoading"
    | "onDownloadReceiptPdf"
    | "receiptLoading"
    | "onStartNewSale"
  >;
};

function tileShelfLine(
  online: boolean,
  prices: Record<string, string>,
  id: string,
  copy: Pick<CashierPosUiCopy, "tileShelfLoading" | "tileShelfEmpty">,
): string {
  if (!online) return copy.tileShelfEmpty;
  if (!(id in prices)) return copy.tileShelfLoading;
  return prices[id] ? prices[id] : copy.tileShelfEmpty;
}

const KIOSK_TILE_SHELL = cn(
  "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/45 bg-white text-left shadow-sm ring-1 ring-black/[0.02] transition-[box-shadow,border-color,transform] duration-200",
  "hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--pos-primary)_28%,var(--border))] hover:shadow-md hover:ring-[color-mix(in_srgb,var(--pos-primary)_08%,transparent)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_22%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "dark:border-border/50 dark:bg-card dark:ring-white/[0.03]",
);

/** Shelf price on tile: bold amount + small ISO code (clearer than single blended string). */
function KioskTileShelfBadge({ shelfLine }: { shelfLine: string }) {
  const { amount, code } = splitShelfPriceDisplay(shelfLine);
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-1.5 right-1.5 z-[1] max-w-[calc(100%-0.75rem)] truncate rounded-md border border-neutral-300/80 bg-background/95 px-1.5 py-0.5 shadow-md backdrop-blur-[2px] dark:border-neutral-600/60 dark:bg-background/92",
        "inline-flex items-baseline gap-0.5 tabular-nums",
      )}
    >
      {code ? (
        <>
          <span className="text-[11px] font-bold leading-none text-neutral-900 dark:text-neutral-100 sm:text-[12px]">
            {amount}
          </span>
          <span className="text-[7px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-700 dark:text-neutral-300 sm:text-[8px]">
            {code}
          </span>
        </>
      ) : (
        <span className="text-[10px] font-semibold leading-none text-neutral-900 dark:text-neutral-100 sm:text-[11px]">
          {amount}
        </span>
      )}
    </div>
  );
}

function TopSellerTile({
  product,
  onPick,
  shelfLine,
}: {
  product: TopProductRecord;
  onPick: () => void;
  shelfLine: string;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={KIOSK_TILE_SHELL}
      aria-label={`Add ${product.name}, ${shelfLine}`}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 bg-gradient-to-b from-neutral-50/90 to-neutral-100/60 dark:from-muted/30 dark:to-muted/50">
        <span
          className="pointer-events-none absolute left-0 top-0 z-[1] h-full w-0.5 rounded-l-xl bg-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden
        />
        {product.thumbnailUrl ? (
          <Image
            src={product.thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 34vw, (max-width: 1024px) 18vw, 140px"
            className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.04]"
            unoptimized
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-2xl font-bold tracking-tight text-muted-foreground/45"
            aria-hidden
          >
            {product.name.trim().charAt(0).toUpperCase() || "?"}
          </span>
        )}
        <KioskTileShelfBadge shelfLine={shelfLine} />
      </div>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-1.5">
        <p className="line-clamp-2 text-left text-[12px] font-medium leading-snug tracking-normal text-foreground/85 sm:text-[13px] dark:text-foreground/80">
          {product.name}
        </p>
      </div>
    </button>
  );
}

function SearchHitTile({
  item,
  onPick,
  shelfLine,
}: {
  item: ItemSummaryRecord;
  onPick: () => void;
  shelfLine: string;
}) {
  const thumb = itemListThumbnailUrl(item);
  const title = cashierItemPrimaryLabel(item);
  const categoryLabel = item.categoryName?.trim() || "Menu";
  return (
    <button
      type="button"
      onClick={onPick}
      className={KIOSK_TILE_SHELL}
      aria-label={`Add ${title}, ${shelfLine}`}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 bg-gradient-to-b from-neutral-50/90 to-neutral-100/60 dark:from-muted/30 dark:to-muted/50">
        <span
          className="pointer-events-none absolute left-0 top-0 z-[1] h-full w-0.5 rounded-l-xl bg-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden
        />
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            fill
            sizes="(max-width: 640px) 34vw, (max-width: 1024px) 18vw, 140px"
            className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.04]"
            unoptimized
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-2xl font-bold tracking-tight text-muted-foreground/45"
            aria-hidden
          >
            {title.trim().charAt(0).toUpperCase() || "?"}
          </span>
        )}
        <KioskTileShelfBadge shelfLine={shelfLine} />
      </div>
      <div className="flex flex-1 flex-col gap-1 px-2 pb-2 pt-1.5">
        <p className="line-clamp-2 text-left text-[12px] font-bold leading-[1.2] tracking-tight text-neutral-950 dark:text-neutral-50 sm:text-[13px]">
          {title}
        </p>
        <span
          className={cn(
            "max-w-full truncate rounded-md px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide",
            kioskCategoryPillClass(categoryLabel),
          )}
        >
          {categoryLabel}
        </span>
      </div>
    </button>
  );
}

export function CashierPosLayout(props: CashierPosLayoutProps) {
  const {
    pageTitle = "Point of sale",
    embeddedInDashboard = false,
    brandTheme,
    online,
    offlineBanner,
    currency,
    uiCopy,
    activeBranchName,
    branchesLoading,
    branchSelected,
    branchId,
    businessId,
    onStalePosItem,
    dialogBrandTheme,
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
    keepAisleFilter = false,
    onKeepAisleFilterChange,
    typeFilterId,
    typeFilterLabel,
    clearTypeFilter,
    posShiftLinks,
    cartTabs,
    activeCartId,
    canCreateCart,
    onCreateCart,
    onSwitchCart,
    onRemoveCart,
    allowNegativeStock = false,
    cart,
  } = props;

  const [pickedItem, setPickedItem] = useState<ItemSummaryRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pulseCart, setPulseCart] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [tileShelfPrices, setTileShelfPrices] = useState<
    Record<string, string>
  >({});

  const hitIdsKey = useMemo(
    () =>
      [...hits]
        .map((h) => h.id)
        .sort()
        .join(","),
    [hits],
  );
  const topIdsKey = useMemo(
    () =>
      [...topProducts]
        .map((p) => p.id)
        .sort()
        .join(","),
    [topProducts],
  );

  const hasSearch =
    search.trim().length > 0 ||
    categoryFilterId != null ||
    typeFilterId != null;
  const showCatalog = !hasSearch;

  const handlePickItem = (item: ItemSummaryRecord) => {
    if (item.groupLabelOnly) {
      return;
    }
    const shelfLine = tileShelfPrices[item.id];
    const shelfAmount = shelfLine
      ? shelfPriceToInputString(splitShelfPriceDisplay(shelfLine).amount)
      : "";
    const canQuickAdd =
      Boolean(shelfAmount) && online && !isPosPackageSellRow(item);
    if (canQuickAdd) {
      const added = addLine(item, 1, shelfAmount);
      if (added) {
        setPulseCart(true);
        setDrawerOpen(true);
      }
      return;
    }
    setPickedItem(item);
    setModalOpen(true);
  };

  const handleAddFromModal = (payload: CashierProductModalSubmit) => {
    const added = addLine(payload.item, payload.quantity, payload.unitPrice);
    setModalOpen(false);
    setPickedItem(null);
    if (added) {
      setPulseCart(true);
      setDrawerOpen(true);
    }
  };

  useEffect(() => {
    if (!pulseCart) return;
    const t = window.setTimeout(() => setPulseCart(false), 700);
    return () => window.clearTimeout(t);
  }, [pulseCart]);

  useEffect(() => {
    if (cart.notice || cart.error) {
      setDrawerOpen(true);
    }
  }, [cart.notice, cart.error]);

  useEffect(() => {
    if (!online) {
      setTileShelfPrices({});
      return;
    }
    const fromHits = hitIdsKey ? hitIdsKey.split(",") : [];
    const fromTop = topIdsKey ? topIdsKey.split(",") : [];
    const ids = Array.from(new Set([...fromHits, ...fromTop]));
    if (ids.length === 0) {
      setTileShelfPrices({});
      return;
    }
    let cancelled = false;
    const bid = branchId?.trim() || undefined;
    const shelfCtx = { businessId, onStaleItem: onStalePosItem };
    void Promise.all(
      ids.map(async (id) => {
        const r = await fetchPosShelfPrice(id, bid, shelfCtx);
        if (!r) {
          return [id, ""] as const;
        }
        const label = formatShelfPriceLabel(r.price, currency);
        return [id, label ?? ""] as const;
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setTileShelfPrices((prev) => {
        const next = { ...prev };
        for (const [id, v] of pairs) {
          next[id] = v;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [
    online,
    branchId,
    businessId,
    currency,
    hitIdsKey,
    topIdsKey,
    onStalePosItem,
  ]);

  usePosEvents({
    onPriceChanged: (frame) => {
      const itemId = String(frame.data.itemId ?? "");
      if (!itemId || !online) return;
      const bid = branchId?.trim() || undefined;
      void fetchPosShelfPrice(itemId, bid, {
        businessId,
        onStaleItem: onStalePosItem,
      }).then((r) => {
        if (!r) return;
        const label = formatShelfPriceLabel(r.price, currency);
        setTileShelfPrices((prev) => ({
          ...prev,
          [itemId]: label ?? "",
        }));
      });
    },
  });

  const cartFabBottomClass = embeddedInDashboard
    ? "bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-6"
    : "bottom-4 sm:bottom-6";

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-3xl space-y-4 px-3 pb-28 sm:max-w-4xl sm:space-y-5 sm:px-5",
        embeddedInDashboard && "max-w-none px-0 sm:px-1",
        "bg-neutral-50/95 dark:bg-background",
      )}
      style={brandTheme}
    >
      <section
        className={cn(DASHBOARD_SECTION_SURFACE, "border-border/50 shadow-sm")}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              <span>{pageTitle}</span>
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--pos-primary)] opacity-75"
                aria-hidden
              />
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {branchesLoading ? (
                "Loading branches…"
              ) : activeBranchName ? (
                <>
                  Selling at{" "}
                  <span className="font-medium text-foreground">
                    {activeBranchName}
                  </span>
                  <span className="opacity-70"> · change in top nav</span>
                </>
              ) : (
                <span className="text-amber-800 dark:text-amber-200">
                  Pick a branch in the top nav to start.
                </span>
              )}
            </p>
          </div>
          {!online ? (
            <div className="flex max-w-xs shrink-0 flex-col items-end gap-1">
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                {uiCopy.offlinePill}
              </span>
              {offlineBanner ? (
                <span className="text-right text-[10px] leading-snug text-amber-800 dark:text-amber-200">
                  {offlineBanner}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {posShiftLinks ? (
          <div className="mt-6 border-t border-border/40 pt-6">
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Shift & drawer
              </p>
              {!posShiftLinks.branchSelected ? (
                <p className="text-xs text-muted-foreground">
                  Pick a branch in the top nav to open shift tools.
                </p>
              ) : posShiftLinks.shiftLoading ? (
                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2
                    className="size-3.5 animate-spin shrink-0"
                    aria-hidden
                  />
                  Checking shift for this register…
                </span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {posShiftLinks.canCloseShift && posShiftLinks.hasOpenShift ? (
                    <button
                      type="button"
                      onClick={() => posShiftLinks.onShortcut("new-drawout")}
                      className={POS_SHIFT_CHIP_CLASS}
                    >
                      <Wallet
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      New cash drawout
                      <ArrowRight
                        className="size-3 shrink-0 text-muted-foreground opacity-60"
                        aria-hidden
                      />
                    </button>
                  ) : null}
                  {posShiftLinks.canOpenShift && !posShiftLinks.hasOpenShift ? (
                    <button
                      type="button"
                      onClick={() => posShiftLinks.onShortcut("open-shift")}
                      className={POS_SHIFT_CHIP_CLASS}
                    >
                      <PlusCircle
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      Open new shift
                      <ArrowRight
                        className="size-3 shrink-0 text-muted-foreground opacity-60"
                        aria-hidden
                      />
                    </button>
                  ) : null}
                  {posShiftLinks.canCloseShift && posShiftLinks.hasOpenShift ? (
                    <button
                      type="button"
                      onClick={() => posShiftLinks.onShortcut("close-shift")}
                      className={cn(
                        POS_SHIFT_CHIP_CLASS,
                        "border-destructive/25 hover:border-destructive/40",
                      )}
                    >
                      <LogOut
                        className="size-3.5 shrink-0 text-destructive/80"
                        aria-hidden
                      />
                      Close shift
                      <ArrowRight
                        className="size-3 shrink-0 text-muted-foreground opacity-60"
                        aria-hidden
                      />
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {/* ── Multi-cart tabs ─────────────────────────────────────── */}
      {cartTabs.length > 0 ? (
        <div className="sticky top-[3.5rem] z-21 -mx-1 sm:-mx-0">
          <div
            className={cn(
              "flex items-center gap-1 overflow-x-auto px-2 py-1.5",
              "bg-gradient-to-b from-background via-background/98 to-background/90",
              "supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur-sm",
              "border-b border-border/30",
            )}
          >
            {cartTabs.map((tab) => {
              const isActive = tab.id === activeCartId;
              const hasItems = tab.itemCount > 0;
              return (
                <div
                  key={tab.id}
                  className={cn(
                    "group relative flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                    isActive
                      ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--pos-primary)_18%,transparent)]"
                      : "border-border/45 bg-card/70 hover:border-border hover:bg-card",
                  )}
                >
                  <button
                    type="button"
                    className="flex items-center gap-1.5 outline-none"
                    onClick={() => onSwitchCart(tab.id)}
                  >
                    <span
                      className={cn(
                        "max-w-[8rem] truncate leading-tight",
                        isActive
                          ? "text-[var(--pos-primary)]"
                          : "text-foreground",
                      )}
                    >
                      {tab.label}
                    </span>
                    {hasItems ? (
                      <span
                        className={cn(
                          "inline-flex size-4 items-center justify-center rounded-full text-[9px] font-bold tabular-nums leading-none",
                          isActive
                            ? "bg-[var(--pos-primary)] text-[var(--pos-primary-ink)]"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {tab.itemCount > 99 ? "99+" : tab.itemCount}
                      </span>
                    ) : null}
                  </button>
                  {!isActive && (
                    <button
                      type="button"
                      className="ml-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Close ${tab.label}`}
                      onClick={() => onRemoveCart(tab.id)}
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              );
            })}
            {canCreateCart ? (
              <button
                type="button"
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-border/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all",
                  "hover:border-[var(--pos-primary)] hover:text-[var(--pos-primary)] hover:bg-[color-mix(in_srgb,var(--pos-primary)_6%,transparent)]",
                )}
                onClick={onCreateCart}
                aria-label="New cart"
              >
                <PlusCircle className="size-3.5" />
                <span>New</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="sticky top-[3.5rem] z-20 -mx-1 sm:-mx-0">
        <section
          className={cn(
            DASHBOARD_SECTION_SURFACE,
            "border-border/50 p-2.5 shadow-sm supports-[backdrop-filter]:bg-card/92 supports-[backdrop-filter]:backdrop-blur-md sm:p-3",
          )}
        >
          <div
            className={cn(
              "group flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/90 pl-3 pr-1 shadow-sm transition-colors",
              "focus-within:border-[color-mix(in_srgb,var(--pos-primary)_30%,var(--border))] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pos-primary)_12%,transparent)]",
              "dark:bg-card/80",
            )}
          >
            <Search
              className="size-[1.125rem] shrink-0 text-muted-foreground/80"
              aria-hidden
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="shrink-0 rounded-md p-1 text-muted-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Scan barcode with phone camera"
              title="Scan barcode with camera"
            >
              <ScanLine className="size-[1.125rem]" />
            </button>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                categoryFilterId
                  ? "Search within this aisle…"
                  : typeFilterId
                    ? "Search within this type…"
                    : "Search by name, SKU or scan barcode…"
              }
              className="h-10 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/60 sm:h-11 sm:text-[15px]"
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
            <p className="mt-2 px-0.5 text-[11px] text-amber-800 dark:text-amber-200">
              {searchBanner}
            </p>
          ) : null}
          {categoryFilterId ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 px-0.5 text-xs">
              <span className="rounded-full bg-[color-mix(in_srgb,var(--pos-primary)_12%,transparent)] px-2.5 py-0.5 font-medium text-[var(--pos-primary)]">
                Aisle: {categoryFilterLabel ?? categoryFilterId}
              </span>
              <button
                type="button"
                onClick={clearCategoryFilter}
                className="text-muted-foreground underline-offset-2 hover:underline"
              >
                Clear aisle
              </button>
              {onKeepAisleFilterChange ? (
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-muted-foreground">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border-border accent-[var(--pos-primary)]"
                    checked={keepAisleFilter}
                    onChange={(e) => onKeepAisleFilterChange(e.target.checked)}
                  />
                  Keep aisle after add
                </label>
              ) : null}
            </div>
          ) : null}
          {typeFilterId ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 px-0.5 text-xs">
              <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium text-foreground">
                Type: {typeFilterLabel ?? typeFilterId}
              </span>
              {clearTypeFilter ? (
                <button
                  type="button"
                  onClick={clearTypeFilter}
                  className="text-muted-foreground underline-offset-2 hover:underline"
                >
                  Clear type
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      {hasSearch ? (
        <section
          className={cn(
            DASHBOARD_SECTION_SURFACE,
            "space-y-2 border-border/50 p-3 sm:space-y-2.5 sm:p-4",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold tracking-tight text-foreground sm:text-sm">
              {search.trim()
                ? "Search results"
                : categoryFilterId
                  ? "Aisle items"
                  : typeFilterId
                    ? "Type items"
                    : "Items"}
            </h3>
            {hits.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                {hits.length} match{hits.length === 1 ? "" : "es"}
              </span>
            ) : null}
          </div>
          {hits.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/50 bg-muted/10 py-7 text-center text-xs text-muted-foreground sm:py-8">
              {search.trim()
                ? "No items match your search."
                : categoryFilterId
                  ? "No items in this aisle."
                  : typeFilterId
                    ? "No items for this type."
                    : "No items."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5">
              {hits.map((item) => (
                <SearchHitTile
                  key={item.id}
                  item={item}
                  shelfLine={tileShelfLine(
                    online,
                    tileShelfPrices,
                    item.id,
                    uiCopy,
                  )}
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
          className="space-y-2.5 rounded-xl border border-border/50 bg-card p-3 shadow-sm ring-1 ring-black/[0.02] dark:border-border/50 dark:ring-white/[0.03] sm:p-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-xs font-bold leading-none text-[var(--pos-primary)]"
              >
                ★
              </span>
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold leading-none tracking-tight sm:text-sm">
                  Top sellers
                </h3>
                <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground">
                  Tap · ranked on this register
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5">
            {topProducts.map((p) => (
              <TopSellerTile
                key={p.id}
                product={p}
                shelfLine={tileShelfLine(online, tileShelfPrices, p.id, uiCopy)}
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
        <section
          className={cn(
            DASHBOARD_SECTION_SURFACE,
            "space-y-2 border-border/50 p-3 sm:p-4",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[13px] font-semibold tracking-tight text-foreground sm:text-sm">
              Browse aisles
            </h3>
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
                    const cur =
                      categoryBrowseStack[categoryBrowseStack.length - 1];
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
            <p className="rounded-2xl border border-dashed border-border/50 bg-muted/10 py-8 text-center text-xs text-muted-foreground">
              No active aisles.
            </p>
          ) : (
            <div className="-mx-1 overflow-x-auto px-1 pb-0.5 sm:-mx-1.5 sm:px-1.5">
              <div className="flex gap-2 sm:gap-2.5">
                {visibleCategoryTiles.map((node) => {
                  const thumb = node.thumbnailUrl?.trim();
                  const kids = (node.children ?? []).filter((c) => c.active);
                  const drillable = kids.length > 0;
                  const countLabel = drillable
                    ? `${kids.length} sub${kids.length === 1 ? "" : "s"}`
                    : node.childCount > 0
                      ? `${node.childCount} item${node.childCount === 1 ? "" : "s"}`
                      : "";
                  return (
                    <button
                      key={node.id}
                      type="button"
                      disabled={!online}
                      className={cn(
                        "flex w-[5.75rem] shrink-0 flex-col items-center gap-1 rounded-xl border border-border/45 bg-white p-1.5 text-center text-[10px] shadow-sm ring-1 ring-black/[0.02] transition-[box-shadow,border-color,transform] duration-200",
                        "hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--pos-primary)_22%,var(--border))] hover:shadow-md disabled:opacity-50",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_22%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        "dark:border-border/50 dark:bg-card dark:ring-white/[0.03]",
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
                      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/35 bg-neutral-50/90 dark:bg-muted/40">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            width={44}
                            height={44}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <span
                            className="text-sm font-bold text-muted-foreground/70"
                            aria-hidden
                          >
                            {node.name.trim().charAt(0).toUpperCase() || "?"}
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-2 min-h-[2rem] w-full text-[10px] font-semibold leading-[1.15] text-foreground">
                        {node.name}
                      </span>
                      {countLabel ? (
                        <span className="text-[9px] font-medium tabular-nums leading-none text-muted-foreground">
                          {countLabel}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {/* ── Stacked cart buttons (bottom-right) ─────────────────── */}
      <div
        className={cn(
          "fixed left-1/2 z-30 flex -translate-x-1/2 flex-col-reverse items-stretch gap-2",
          cartFabBottomClass,
          "sm:left-auto sm:right-6 sm:translate-x-0 sm:items-end",
        )}
      >
        {[...cartTabs].reverse().map((tab) => {
          const isActive = tab.id === activeCartId;
          const hasItems = tab.itemCount > 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (!isActive) onSwitchCart(tab.id);
                setDrawerOpen(true);
              }}
              className={cn(
                "flex items-center gap-2.5 rounded-2xl px-3.5 py-2 shadow-lg transition-all duration-200",
                "hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive
                  ? "z-30 scale-100 opacity-100"
                  : "z-20 scale-[0.94] opacity-85 hover:opacity-100",
                pulseCart &&
                  isActive &&
                  "ring-[3px] ring-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)] ring-offset-2 ring-offset-neutral-50 dark:ring-offset-background",
              )}
              style={{
                backgroundColor: isActive
                  ? "var(--pos-primary)"
                  : "color-mix(in srgb, var(--pos-primary) 65%, var(--muted-foreground))",
                color: "var(--pos-primary-ink)",
                boxShadow: isActive
                  ? "0 4px 6px -1px color-mix(in srgb, var(--pos-primary) 18%, transparent), 0 12px 28px -8px color-mix(in srgb, var(--pos-primary) 32%, transparent)"
                  : "0 2px 4px -1px color-mix(in srgb, var(--pos-primary) 12%, transparent), 0 6px 14px -6px color-mix(in srgb, var(--pos-primary) 20%, transparent)",
              }}
              aria-label={`${isActive ? "Open" : "Switch to"} ${tab.label}${hasItems ? ` · ${tab.grandTotal.toFixed(2)}` : ""}`}
            >
              <span className="relative inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--pos-primary-ink)_12%,transparent)] sm:size-8 sm:rounded-full">
                <ShoppingCart className="size-3.5 sm:size-4" />
                {hasItems ? (
                  <span
                    className="absolute -right-1 -top-1 inline-flex size-4 items-center justify-center rounded-full text-[9px] font-bold shadow sm:size-5 sm:text-[10px]"
                    style={{
                      backgroundColor: "var(--pos-primary-ink)",
                      color: "var(--pos-primary)",
                    }}
                  >
                    {tab.itemCount > 99 ? "99+" : tab.itemCount}
                  </span>
                ) : null}
              </span>
              <span className="flex min-w-[7rem] flex-col items-stretch leading-none">
                <span className="max-w-[10rem] truncate text-[10px] font-medium uppercase tracking-wide opacity-80">
                  {hasItems ? tab.label : `${tab.label} · empty`}
                </span>
                {hasItems ? (
                  <span className="mt-0.5 flex items-end gap-1">
                    <CashierDottedLeader onPrimary />
                    <span className="inline-flex shrink-0 items-baseline gap-0.5 text-sm font-semibold tabular-nums">
                      <span>{tab.grandTotal.toFixed(2)}</span>
                      <CashierCurrencySuffix code={currency} onPrimary />
                    </span>
                  </span>
                ) : (
                  <span className="mt-0.5 text-[10px] opacity-60">
                    No items
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <CashierProductModal
        item={pickedItem}
        open={modalOpen}
        currency={currency}
        uiCopy={uiCopy}
        branchId={branchId}
        businessId={businessId}
        onStaleItem={onStalePosItem}
        online={online}
        brandTheme={dialogBrandTheme}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) setPickedItem(null);
        }}
        onSubmit={handleAddFromModal}
        allowNegativeStock={allowNegativeStock}
      />

      <CashierCartDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (
            !open &&
            cart.lastSale != null &&
            cart.lastReceipt != null
          ) {
            cart.onStartNewSale();
          }
        }}
        online={online}
        currency={currency}
        branchSelected={branchSelected}
        brandTheme={dialogBrandTheme}
        {...cart}
      />

      {showScanner && (
        <BarcodeScanner
          onScan={(barcode) => {
            setSearch(barcode);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
