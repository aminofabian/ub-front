"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import Image from "next/image";
import {
  Camera,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  LogOut,
  Minus,
  PackagePlus,
  Plus,
  PlusCircle,
  ScanLine,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { AirtimeQuickAction } from "@/components/airtime/airtime-quick-action";
import { CashierFirstSaleDrawer } from "@/components/cashier/cashier-first-sale-drawer";
import { CashierQtyControl } from "@/components/cashier/cashier-qty-control";
import { CashierWeighedToggle } from "@/components/cashier/cashier-weighed-toggle";
import { stockTone } from "@/components/cashier/pos-variant-table";
import type { AirtimeCartPayload } from "@/lib/airtime-cart-line";
import { isAirtimeCartLine } from "@/lib/airtime-cart-line";
import {
  fetchItemById,
  itemListThumbnailUrl,
  type CategoryTreeNodeRecord,
  type ItemDetailRecord,
  type ItemSummaryRecord,
} from "@/lib/api";
import {
  cashierItemPrimaryLabel,
  cashierItemTitleParts,
  isPosFamilyParent,
  isPosSellableSku,
} from "@/lib/cashier-item-display";
import {
  formatShelfPriceLabel,
  splitShelfPriceDisplay,
} from "@/lib/cashier-shelf-price";
import { isSellBelowCost } from "@/lib/margin-guard";
import { isPackSellSku } from "@/lib/pack-sell-sku";
import { fetchPosShelfPrices } from "@/lib/pos-shelf-price";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import {
  formatPosStockQty,
  posVariantOptionLabel,
} from "@/lib/pos-catalog-groups";
import type { TopProductRecord } from "@/lib/top-products";
import { CART_STALE_MS, CART_VERY_STALE_MS } from "@/lib/cart-session";
import { cn } from "@/lib/utils";

import type { CashierPosShiftLinksProps } from "./cashier-pos-layout";

const displayFace = {
  fontFamily: 'var(--font-cormorant), Georgia, "Times New Roman", serif',
} as const;

const GROUND =
  "bg-[var(--op-bg,#f4f1ea)] text-[var(--op-ink,#121a16)] selection:bg-[var(--op-accent-soft)]";
const PAPER =
  "rounded-[2px] border border-[var(--op-rule,rgba(18,26,22,0.1))] bg-[var(--op-surface,#fcfaf5)]";
const MUTE = "text-[var(--op-muted,#556159)]";
const TERRACOTTA = "text-[#8f3f2f]";
const CHIP =
  "rounded-[2px] border border-[var(--op-rule,rgba(18,26,22,0.1))] bg-[var(--op-surface,#fcfaf5)]";
const CHIP_ON =
  "rounded-[2px] border border-[var(--op-accent,#1d4b3b)] bg-[var(--op-accent-soft)] text-[var(--op-accent,#1d4b3b)]";
const MARK =
  "rounded-[2px] bg-[var(--op-accent,#1d4b3b)] text-[var(--op-surface,#fcfaf5)]";
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--op-accent,#1d4b3b)]";

export type CounterCartTab = {
  id: string;
  label: string;
  itemCount: number;
  grandTotal: number;
  kind: "held" | "empty" | "open";
  ageMs: number;
  syncStatus?: string;
};

export type CounterLine = {
  key: string;
  itemId: string;
  label: string;
  quantity: string;
  unitPrice: string;
  item: ItemSummaryRecord;
  kind?: "airtime";
};

type PickState = {
  token: number;
  rootId: string;
  activeId: string | null;
  seed: ItemSummaryRecord;
  /** True when the tap already added a sellable SKU. */
  sellSeed: boolean;
};

export type CashierCounterStageProps = {
  clearBottomNav?: boolean;
  pageTitle: string;
  activeBranchName: string;
  branchesLoading: boolean;
  online: boolean;
  offlineBanner?: string | null;
  tillPrinterStatus?: ReactNode;
  toolbarExtras?: ReactNode;
  currency: string;
  search: string;
  setSearch: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchBanner: string | null;
  scanToCartEnabled: boolean;
  onBarcode: (code: string) => void;
  onOpenScanner: () => void;
  catalogHybrid: boolean;
  hits: ItemSummaryRecord[];
  topProducts: TopProductRecord[];
  topProductsLoading?: boolean;
  topProductsTitle?: string;
  alwaysShowTopProducts?: boolean;
  shelfLine: (id: string) => string;
  cartQtyByItem: Map<string, number>;
  justAddedId: string | null;
  onSell: (item: ItemSummaryRecord, shelfLine?: string) => void;
  canBrowseCategories: boolean;
  visibleCategoryTiles: CategoryTreeNodeRecord[];
  categoryBrowseStack: CategoryTreeNodeRecord[];
  setCategoryBrowseStack: Dispatch<SetStateAction<CategoryTreeNodeRecord[]>>;
  applySubtreeFilter: (id: string, label: string) => void;
  clearCategoryFilter: () => void;
  categoryFilterId: string | null;
  categoryFilterLabel: string | null;
  categoryTreeBusy: boolean;
  categoryBrowseParentId: string | null;
  keepAisleFilter?: boolean;
  onKeepAisleFilterChange?: (keep: boolean) => void;
  typeFilterId: string | null;
  typeFilterLabel: string | null;
  clearTypeFilter?: () => void;
  allowAddPhoto?: boolean;
  photoUploadingId?: string | null;
  onOpenPhotoPicker?: (itemId: string, itemName: string) => void;
  branchId: string;
  businessId?: string | null;
  onStalePosItem?: (itemId: string) => void;
  lines: CounterLine[];
  grandTotal: number;
  cartTabs: CounterCartTab[];
  activeCartId: string;
  canCreateCart: boolean;
  onCreateCart: () => void;
  onSwitchCart: (id: string) => void;
  onRemoveCart: (id: string) => void;
  updateLine: (key: string, field: "quantity" | "unitPrice", value: string) => void;
  removeLine: (key: string) => void;
  onCheckout: () => void;
  checkoutLoading: boolean;
  branchSelected: boolean;
  orderError?: string | null;
  tillListening?: boolean;
  allowPriceEdit?: boolean;
  onEditPrice?: (key: string) => void;
  allowWeighedToggle?: boolean;
  weighedToggleBusyItemId?: string | null;
  onToggleWeighed?: (lineKey: string) => void;
  allowClearSale?: boolean;
  allowClearAllSales?: boolean;
  clearableSaleCount?: number;
  onClearSale?: () => void;
  allowCreateProduct?: boolean;
  onCreateProduct?: () => void;
  allowManageSuppliers?: boolean;
  onOpenSuppliers?: () => void;
  allowCreditTabs?: boolean;
  onOpenCreditTabs?: () => void;
  allowOrderPad?: boolean;
  onOpenOrderPad?: () => void;
  allowSupplierOrder?: boolean;
  onOpenSupplierOrder?: () => void;
  allowOrderConfirm?: boolean;
  onOpenOrderConfirm?: () => void;
  allowAirtime?: boolean;
  onAddAirtimeToCart?: (payload: AirtimeCartPayload) => boolean;
  posShiftLinks: CashierPosShiftLinksProps | null;
};

function looksLikeScannedCode(raw: string): boolean {
  const t = raw.trim();
  if (t.length < 4) return false;
  if (/^GI-/i.test(t)) return true;
  const compact = t.replace(/[\s-]/g, "");
  if (/^\d{4,}$/.test(compact)) return true;
  return !/\s/.test(t) && /\d/.test(t) && /^[A-Za-z0-9._/-]+$/.test(t);
}

function topToSummary(product: TopProductRecord): ItemSummaryRecord {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku ?? "",
    thumbnailUrl: product.thumbnailUrl ?? null,
    variantName: product.variantName ?? undefined,
    brand: product.brand ?? undefined,
    size: product.size ?? undefined,
    packageVariant: product.packageVariant,
    packageUnitsPerSale: product.packageUnitsPerSale ?? undefined,
    variantOfItemId: product.variantOfItemId ?? undefined,
    parentName: product.parentName ?? undefined,
    stockQty: product.stockQty ?? undefined,
  };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function buildOptions(detail: ItemDetailRecord): ItemSummaryRecord[] {
  const children = (detail.variants ?? []).filter((v) => v.groupLabelOnly !== true);
  const sorted = [...children].sort((a, b) =>
    posVariantOptionLabel(a).localeCompare(posVariantOptionLabel(b), undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
  if (!isPosSellableSku(detail)) return sorted;
  if (sorted.some((row) => row.id === detail.id)) return sorted;
  if (sorted.length === 0) return [detail];
  return [detail, ...sorted];
}

function optionCaption(item: ItemSummaryRecord, familyName: string): string {
  const label = posVariantOptionLabel(item);
  if (!label || label === familyName) return "Each";
  return label;
}

function lineSubtotal(line: CounterLine): number {
  const q = Number(line.quantity);
  const p = Number(line.unitPrice);
  if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p < 0) return 0;
  return Math.round(q * p * 100) / 100;
}

function PriceReadout({
  line,
  large = false,
}: {
  line: string;
  large?: boolean;
}) {
  const { amount, code } = splitShelfPriceDisplay(line);
  if (!amount) {
    return (
      <span className={cn("tabular-nums", MUTE, large ? "text-[15px]" : "text-[12px]")}>
        {line.trim() || "—"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-baseline gap-1 tabular-nums">
      <span
        className={cn(
          "font-mono font-medium",
          large ? "text-[1.35rem] leading-none" : "text-[13px]",
        )}
      >
        {amount}
      </span>
      {code ? (
        <span className={cn("font-medium opacity-60", large ? "text-[11px]" : "text-[10px]")}>
          {code}
        </span>
      ) : null}
    </span>
  );
}

function Thumb({
  name,
  src,
  className,
}: {
  name: string;
  src: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative block overflow-hidden rounded-[2px] bg-[var(--op-bg,#f4f1ea)]",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={160}
          height={160}
          unoptimized
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          className={cn(
            "flex h-full w-full items-center justify-center text-[15px] font-semibold",
            MUTE,
          )}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}

function InkQty({
  quantity,
  label,
  onCommit,
  onRemove,
}: {
  quantity: string;
  label: string;
  onCommit: (next: string) => void;
  onRemove: () => void;
}) {
  const parsed = Number(quantity);
  const n = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
  const [draft, setDraft] = useState(String(n));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(n));
  }, [n, editing]);

  const commit = (raw: string) => {
    const v = Math.floor(Number(raw));
    if (!Number.isFinite(v) || v <= 0) {
      onRemove();
      return;
    }
    onCommit(String(v));
  };

  const circle = cn(
    "flex size-9 shrink-0 items-center justify-center rounded-[2px] border border-[var(--op-rule,rgba(18,26,22,0.1))] bg-[var(--op-surface,#fcfaf5)] motion-safe:transition-colors motion-safe:duration-200 hover:border-[var(--op-accent,#1d4b3b)]",
    FOCUS,
  );

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        className={circle}
        aria-label={n <= 1 ? `Remove ${label} from the sale` : `One less ${label}`}
        onClick={() => (n <= 1 ? onRemove() : onCommit(String(n - 1)))}
      >
        {n <= 1 ? (
          <Trash2 className="size-3.5" aria-hidden />
        ) : (
          <Minus className="size-3.5" aria-hidden />
        )}
      </button>
      <input
        inputMode="numeric"
        aria-label={`Quantity for ${label}`}
        value={editing ? draft : String(n)}
        onFocus={(e) => {
          setEditing(true);
          setDraft(String(n));
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
        onBlur={() => {
          setEditing(false);
          commit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="w-8 bg-transparent text-center font-mono text-[15px] font-medium tabular-nums outline-none"
      />
      <button
        type="button"
        className={circle}
        aria-label={`One more ${label}`}
        onClick={() => onCommit(String(n + 1))}
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

export function CashierCounterStage(props: CashierCounterStageProps) {
  const {
    clearBottomNav = false,
    pageTitle,
    activeBranchName,
    branchesLoading,
    online,
    offlineBanner,
    tillPrinterStatus,
    toolbarExtras,
    currency,
    search,
    setSearch,
    searchInputRef,
    searchBanner,
    scanToCartEnabled,
    onBarcode,
    onOpenScanner,
    catalogHybrid,
    hits,
    topProducts,
    topProductsLoading = false,
    topProductsTitle = "Best sellers",
    alwaysShowTopProducts = false,
    shelfLine,
    cartQtyByItem,
    justAddedId,
    onSell,
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
    allowAddPhoto = false,
    photoUploadingId = null,
    onOpenPhotoPicker,
    branchId,
    businessId,
    onStalePosItem,
    lines,
    grandTotal,
    cartTabs,
    activeCartId,
    canCreateCart,
    onCreateCart,
    onSwitchCart,
    onRemoveCart,
    updateLine,
    removeLine,
    onCheckout,
    checkoutLoading,
    branchSelected,
    orderError,
    tillListening = false,
    allowPriceEdit = false,
    onEditPrice,
    allowWeighedToggle = false,
    weighedToggleBusyItemId = null,
    onToggleWeighed,
    allowClearSale = true,
    allowClearAllSales = false,
    clearableSaleCount = 0,
    onClearSale,
    allowCreateProduct,
    onCreateProduct,
    allowManageSuppliers,
    onOpenSuppliers,
    allowCreditTabs,
    onOpenCreditTabs,
    allowOrderPad,
    onOpenOrderPad,
    allowSupplierOrder,
    onOpenSupplierOrder,
    allowOrderConfirm,
    onOpenOrderConfirm,
    allowAirtime,
    onAddAirtimeToCart,
    posShiftLinks,
  } = props;

  const [pane, setPane] = useState<"menu" | "build" | "order">("menu");
  const [pick, setPick] = useState<PickState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [detail, setDetail] = useState<ItemDetailRecord | null>(null);
  const [options, setOptions] = useState<ItemSummaryRecord[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [familyPrices, setFamilyPrices] = useState<Record<string, string>>({});
  const soldToken = useRef<number | null>(null);
  const onSellRef = useRef(onSell);
  onSellRef.current = onSell;
  const onStaleRef = useRef(onStalePosItem);
  onStaleRef.current = onStalePosItem;

  const browsing =
    search.trim().length > 0 || categoryFilterId != null || Boolean(typeFilterId?.trim());

  useEffect(() => {
    if (!pick) return;
    const token = pick.token;
    const rootId = pick.rootId;
    if (
      pick.sellSeed &&
      pick.seed.isSellable === true &&
      !pick.seed.variantOfItemId?.trim() &&
      !isPosFamilyParent(pick.seed)
    ) {
      setLoadingFamily(false);
      setFamilyError(null);
      setDetail(null);
      setOptions([pick.seed]);
      setFamilyPrices({});
      return;
    }
    let cancelled = false;
    setLoadingFamily(true);
    setFamilyError(null);
    setOptions([]);
    setFamilyPrices({});
    setDetail(null);

    if (!online) {
      setLoadingFamily(false);
      if (isPosFamilyParent(pick.seed)) {
        setFamilyError("You're offline — go online to load sizes.");
      } else if (!pick.sellSeed && isPosSellableSku(pick.seed)) {
        if (soldToken.current !== token) {
          soldToken.current = token;
          onSellRef.current(pick.seed);
        }
        setOptions([pick.seed]);
      } else if (!pick.sellSeed) {
        setFamilyError("You're offline — go online to load sizes.");
      } else {
        setOptions([pick.seed]);
      }
      return;
    }

    const bid = branchId.trim() || undefined;
    void fetchItemById(rootId, { branchId: bid, toast: false })
      .then((next) => {
        if (cancelled) return;
        setDetail(next);
        const built = buildOptions(next);
        setOptions(built.length > 0 ? built : [pick.seed]);
        setPick((cur) => {
          if (!cur || cur.token !== token) return cur;
          const activeIsOption = built.some((row) => row.id === cur.activeId);
          if (activeIsOption) return cur;
          const inCart = built.find((row) => (cartQtyByItem.get(row.id) ?? 0) > 0);
          const first = inCart ?? built[0];
          return first ? { ...cur, activeId: first.id } : cur;
        });
        if (
          !pick.sellSeed &&
          isPosSellableSku(next) &&
          !isPosFamilyParent(next) &&
          soldToken.current !== token
        ) {
          soldToken.current = token;
          onSellRef.current(next);
        }
        const seeded: Record<string, string> = {};
        for (const row of built) {
          const label = formatShelfPriceLabel(
            row.sellingPrice ?? row.bundlePrice,
            currency,
          );
          if (label) seeded[row.id] = label;
        }
        if (Object.keys(seeded).length > 0) setFamilyPrices(seeded);
        const ids = built.map((row) => row.id);
        if (ids.length === 0) return;
        void fetchPosShelfPrices(ids, bid, {
          businessId,
          onStaleItem: (id) => onStaleRef.current?.(id),
        }).then((byId) => {
          if (cancelled) return;
          setFamilyPrices((prev) => {
            const merged = { ...prev, ...seeded };
            for (const row of built) {
              const resolved = byId[row.id];
              if (!resolved) continue;
              const label = formatShelfPriceLabel(resolved.price, currency);
              if (label) merged[row.id] = label;
            }
            return merged;
          });
        });
      })
      .catch(() => {
        if (cancelled) return;
        setFamilyError("Couldn't load sizes. Check the connection and try again.");
        if (!pick.sellSeed && isPosSellableSku(pick.seed) && soldToken.current !== token) {
          soldToken.current = token;
          onSellRef.current(pick.seed);
        }
        setOptions(isPosSellableSku(pick.seed) ? [pick.seed] : []);
      })
      .finally(() => {
        if (!cancelled) setLoadingFamily(false);
      });

    return () => {
      cancelled = true;
    };
    // cart qty is read once when the family arrives, to preselect a size already on the sale.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- token identifies the pick
  }, [pick?.token, pick?.rootId, attempt, online, branchId, businessId, currency]);

  const openItem = (item: ItemSummaryRecord, sell: boolean) => {
    const parentId = item.variantOfItemId?.trim();
    const rootId = parentId || item.id;
    const knownSku =
      !isPosFamilyParent(item) &&
      (item.isSellable === true || Boolean(parentId));
    const token = (pick?.token ?? 0) + 1;
    if (sell && knownSku) {
      soldToken.current = token;
      onSell(item);
    }
    setPick({
      token,
      rootId,
      activeId: parentId ? item.id : isPosFamilyParent(item) ? null : item.id,
      seed: item,
      sellSeed: sell ? knownSku : true,
    });
    const wantsSizes =
      !sell || Boolean(parentId) || isPosFamilyParent(item) || item.isSellable !== true;
    if (wantsSizes) setPane("build");
  };

  const sellPriced = (item: ItemSummaryRecord, line: string) => {
    const amount = splitShelfPriceDisplay(line).amount;
    onSell(item, amount ? line : undefined);
  };

  const active =
    options.find((row) => row.id === pick?.activeId) ??
    (pick?.activeId && pick.seed.id === pick.activeId ? pick.seed : null) ??
    options[0] ??
    null;
  const familyName =
    detail?.name?.trim() ||
    pick?.seed.parentName?.trim() ||
    (pick ? cashierItemPrimaryLabel(pick.seed) : "");

  const menuHeading = browsing
    ? categoryFilterLabel ||
      typeFilterLabel ||
      (search.trim() ? "Search" : "Items")
    : topProductsTitle;

  const menuItems: ItemSummaryRecord[] = browsing
    ? hits
    : topProducts.map(topToSummary);

  const showMenuEmpty =
    menuItems.length === 0 &&
    (browsing || alwaysShowTopProducts || !topProductsLoading);

  const itemCount = lines.reduce((sum, line) => {
    const q = Number(line.quantity);
    return sum + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);
  const belowCostCount = lines.filter(
    (line) =>
      !isAirtimeCartLine(line) &&
      isSellBelowCost(line.unitPrice, line.item.buyingPrice, {
        clearance: line.item.isClearance === true,
      }),
  ).length;

  const toolClass = cn(
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[2px] border border-[var(--op-rule,rgba(18,26,22,0.1))] bg-[var(--op-surface,#fcfaf5)] px-2.5 text-[12px] font-medium",
    FOCUS,
  );

  const paneClass = (id: "menu" | "build" | "order") =>
    cn(
      "min-h-0 lg:flex lg:min-h-0 lg:flex-col",
      pane === id ? "flex min-h-0 flex-1 flex-col" : "max-lg:hidden",
    );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-2 py-2 md:gap-3 md:px-3 md:py-3",
        GROUND,
        clearBottomNav &&
          "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:pb-3",
      )}
    >
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h1
            className="truncate text-[1.45rem] font-normal leading-none tracking-[-0.02em]"
            style={displayFace}
          >
            {pageTitle}
          </h1>
          <p className={cn("mt-1 truncate text-[12px]", MUTE)}>
            {branchesLoading
              ? "Loading branches…"
              : activeBranchName
                ? activeBranchName
                : "Pick a branch in the top nav"}
          </p>
        </div>
        <div className="ml-auto hidden max-w-full items-center gap-1.5 overflow-x-auto lg:flex">
          {allowCreateProduct && onCreateProduct ? (
            <button type="button" className={toolClass} onClick={onCreateProduct}>
              <PackagePlus className="size-3.5" aria-hidden />
              Add product
            </button>
          ) : null}
          {allowManageSuppliers && onOpenSuppliers ? (
            <button type="button" className={toolClass} onClick={onOpenSuppliers}>
              <Truck className="size-3.5" aria-hidden />
              Suppliers
            </button>
          ) : null}
          {allowCreditTabs && onOpenCreditTabs ? (
            <button type="button" className={toolClass} onClick={onOpenCreditTabs}>
              <Users className="size-3.5" aria-hidden />
              Tabs
            </button>
          ) : null}
          {allowOrderPad && onOpenOrderPad ? (
            <button type="button" className={toolClass} onClick={onOpenOrderPad}>
              <ClipboardList className="size-3.5" aria-hidden />
              Order pad
            </button>
          ) : null}
          {allowSupplierOrder && onOpenSupplierOrder ? (
            <button type="button" className={toolClass} onClick={onOpenSupplierOrder}>
              <ShoppingCart className="size-3.5" aria-hidden />
              Order
            </button>
          ) : null}
          {allowOrderConfirm && onOpenOrderConfirm ? (
            <button type="button" className={toolClass} onClick={onOpenOrderConfirm}>
              <ClipboardCheck className="size-3.5" aria-hidden />
              Confirm
            </button>
          ) : null}
          {allowAirtime ? (
            <AirtimeQuickAction
              triggerClassName={toolClass}
              currency={currency}
              channel="POS"
              onAddToCart={onAddAirtimeToCart}
            />
          ) : null}
          {posShiftLinks?.branchSelected ? (
            <>
              {posShiftLinks.canDrawout && posShiftLinks.hasOpenShift ? (
                <button
                  type="button"
                  className={toolClass}
                  onClick={() => posShiftLinks.onShortcut("new-drawout")}
                >
                  <Wallet className="size-3.5" aria-hidden />
                  Drawout
                </button>
              ) : null}
              {posShiftLinks.canOpenShift && !posShiftLinks.hasOpenShift ? (
                <button
                  type="button"
                  className={toolClass}
                  onClick={() => posShiftLinks.onShortcut("open-shift")}
                >
                  <PlusCircle className="size-3.5" aria-hidden />
                  Open shift
                </button>
              ) : null}
              {posShiftLinks.canCloseShift && posShiftLinks.hasOpenShift ? (
                <button
                  type="button"
                  className={cn(toolClass, TERRACOTTA)}
                  onClick={() => posShiftLinks.onShortcut("close-shift")}
                >
                  <LogOut className="size-3.5" aria-hidden />
                  Close shift
                </button>
              ) : null}
            </>
          ) : null}
        </div>
        {toolbarExtras ? (
          <div className="flex w-full items-center gap-1 overflow-x-auto lg:ml-0 lg:w-auto">
            {toolbarExtras}
          </div>
        ) : null}
      </header>

      {!online || offlineBanner ? (
        <p className={cn("shrink-0 text-[12px] leading-snug", TERRACOTTA)}>
          {!online ? "Offline — scans and new sizes wait until you're back." : null}
          {offlineBanner ? ` ${offlineBanner}` : null}
        </p>
      ) : null}
      {tillPrinterStatus ? (
        <div className="hidden shrink-0 lg:block">{tillPrinterStatus}</div>
      ) : null}

      <div className="flex shrink-0 items-center gap-2">
        <div
          className={cn("flex min-w-0 flex-1 items-center gap-2 px-3", PAPER)}
        >
          <Search className={cn("size-4 shrink-0", MUTE)} aria-hidden />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const q = e.currentTarget.value.trim();
              if (scanToCartEnabled && looksLikeScannedCode(q)) {
                e.preventDefault();
                onBarcode(q);
              }
            }}
            placeholder={
              categoryFilterId
                ? "Search this aisle…"
                : typeFilterId
                  ? "Search this type…"
                  : catalogHybrid
                    ? "Search product, SKU or barcode…"
                    : "Search name, SKU, or scan barcode…"
            }
            className="h-11 min-w-0 flex-1 bg-transparent text-[16px] outline-none caret-[var(--op-accent,#1d4b3b)] placeholder:text-[var(--op-muted,#556159)] md:text-[15px]"
            autoComplete="off"
            enterKeyHint="search"
            aria-label="Search products"
          />
          {search ? (
            <button
              type="button"
              className={cn("flex size-8 items-center justify-center rounded-[2px]", MUTE, FOCUS)}
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className={cn(
            "flex size-11 shrink-0 items-center justify-center",
            PAPER,
            FOCUS,
          )}
          aria-label="Scan barcode with the camera"
          onClick={onOpenScanner}
        >
          <ScanLine className="size-5" />
        </button>
      </div>
      {searchBanner ? (
        <p className={cn("shrink-0 text-[12px]", TERRACOTTA)}>{searchBanner}</p>
      ) : null}

      {canBrowseCategories ? (
        <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto">
          {categoryBrowseStack.length > 0 ? (
            <button
              type="button"
              className={cn(
                "flex size-8 shrink-0 items-center justify-center",
                CHIP,
                FOCUS,
              )}
              aria-label="Back to the previous aisle"
              disabled={!online}
              onClick={() => setCategoryBrowseStack((stack) => stack.slice(0, -1))}
            >
              <ChevronLeft className="size-4" />
            </button>
          ) : null}
          {categoryTreeBusy ? (
            <span className={cn("px-1 text-[12px]", MUTE)}>Loading aisles…</span>
          ) : visibleCategoryTiles.length === 0 ? (
            <span className={cn("px-1 text-[12px]", MUTE)}>
              {online ? "No aisles" : "Go online for aisles"}
            </span>
          ) : (
            visibleCategoryTiles.map((node) => {
              const drillable = (node.children ?? []).some((child) => child.active);
              const active = categoryFilterId === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  disabled={!online}
                  onClick={() => {
                    if (!online) return;
                    applySubtreeFilter(node.id, node.name);
                    if (drillable) {
                      setCategoryBrowseStack((stack) => [...stack, node]);
                    }
                  }}
                  className={cn(
                    "h-8 max-w-[10rem] shrink-0 truncate px-3 text-[12px] font-medium",
                    active ? CHIP_ON : CHIP,
                    "disabled:opacity-40",
                    FOCUS,
                  )}
                >
                  {node.name}
                </button>
              );
            })
          )}
          {categoryBrowseParentId ? (
            <button
              type="button"
              disabled={!online}
              className={cn(
                "h-8 shrink-0 px-3 text-[12px] font-medium disabled:opacity-40",
                CHIP,
                FOCUS,
              )}
              onClick={() => {
                const cur = categoryBrowseStack[categoryBrowseStack.length - 1];
                if (cur) applySubtreeFilter(cur.id, cur.name);
              }}
            >
              All here
            </button>
          ) : null}
          {categoryFilterId ? (
            <button
              type="button"
              className={cn("h-8 shrink-0 px-2 text-[12px] font-semibold", MUTE, FOCUS)}
              onClick={clearCategoryFilter}
            >
              Clear aisle
            </button>
          ) : null}
        </div>
      ) : null}
      {categoryFilterId && onKeepAisleFilterChange ? (
        <label className={cn("flex shrink-0 items-center gap-2 text-[12px]", MUTE)}>
          <input
            type="checkbox"
            className="size-3.5 accent-[var(--op-accent,#1d4b3b)]"
            checked={keepAisleFilter}
            onChange={(e) => onKeepAisleFilterChange(e.target.checked)}
          />
          Keep aisle after add
        </label>
      ) : null}
      {typeFilterId ? (
        <div className="flex shrink-0 items-center gap-2 text-[12px]">
          <span className={cn("px-2.5 py-1 font-medium", CHIP)}>
            Type: {typeFilterLabel ?? typeFilterId}
          </span>
          {clearTypeFilter ? (
            <button type="button" className={cn(MUTE, FOCUS)} onClick={clearTypeFilter}>
              Clear type
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className="grid shrink-0 grid-cols-3 border-b border-[var(--op-rule,rgba(18,26,22,0.1))] lg:hidden"
        role="tablist"
        aria-label="Counter sections"
      >
        {(
          [
            ["menu", "Menu"],
            ["build", "Sizes"],
            ["order", itemCount > 0 ? `Sale · ${itemCount}` : "Sale"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pane === id}
            className={cn(
              "h-10 text-[13px] font-medium",
              pane === id
                ? "text-[var(--op-accent,#1d4b3b)] shadow-[inset_0_-2px_0_var(--op-accent,#1d4b3b)]"
                : MUTE,
              FOCUS,
            )}
            onClick={() => setPane(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.15fr)_minmax(0,0.98fr)]">
        <section className={paneClass("menu")} aria-label="Products">
          <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", PAPER)}>
            <div className="flex items-baseline justify-between gap-2 px-3 pb-1 pt-3">
              <h2 className="truncate text-[15px] font-medium tracking-[-0.02em]">
                {menuHeading}
              </h2>
              {menuItems.length > 0 ? (
                <span className={cn("shrink-0 text-[12px] tabular-nums", MUTE)}>
                  {menuItems.length}
                </span>
              ) : null}
            </div>
            <div className="pos-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              {!browsing && topProductsLoading && menuItems.length === 0 ? (
                <p className={cn("px-2 py-8 text-center text-[13px]", MUTE)}>
                  Loading best sellers…
                </p>
              ) : showMenuEmpty ? (
                <div className="px-3 py-8 text-center">
                  <p
                    className="text-[1.35rem] font-normal leading-none tracking-[-0.02em]"
                    style={displayFace}
                  >
                    {search.trim()
                      ? "Nothing matches that search."
                      : categoryFilterId
                        ? "Nothing in this aisle."
                        : typeFilterId
                          ? "Nothing for this type."
                          : "No best sellers yet."}
                  </p>
                  <p className={cn("mx-auto mt-1 max-w-[16rem] text-[12px] leading-relaxed", MUTE)}>
                    {browsing
                      ? "Try another name, or clear the aisle."
                      : "Search or scan to start a sale."}
                  </p>
                  {!browsing ? (
                    <div className="mt-4">
                      <CashierFirstSaleDrawer
                        trigger={
                          <button
                            type="button"
                            className={cn("text-[13px] font-semibold underline-offset-2 hover:underline", FOCUS)}
                          >
                            How to take a sale
                          </button>
                        }
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <ul
                  className={cn(
                    catalogHybrid ? "flex flex-col gap-1" : "grid grid-cols-2 gap-2",
                  )}
                >
                  {menuItems.map((item, index) => {
                    const title = cashierItemPrimaryLabel(item);
                    const { primary, option } = cashierItemTitleParts(item);
                    const thumb = posTileThumbUrl(item.name, itemListThumbnailUrl(item));
                    const family = isPosFamilyParent(item);
                    const qty = cartQtyByItem.get(item.id) ?? 0;
                    const selected =
                      pick != null &&
                      (item.id === pick.rootId ||
                        item.id === pick.seed.id ||
                        (item.variantOfItemId?.trim() === pick.rootId &&
                          item.id === pick.activeId));
                    const tone = stockTone(item);
                    const rank = !browsing && index < 3 ? index + 1 : null;
                    return (
                      <li key={item.id} className="min-w-0">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => openItem(item, true)}
                            aria-current={selected ? "true" : undefined}
                            aria-label={
                              family
                                ? `Show sizes for ${title}`
                                : qty > 0
                                  ? `${title}, ${qty} in the sale. Add another.`
                                  : `Add ${title}`
                            }
                            className={cn(
                              "flex w-full text-left",
                              catalogHybrid
                                ? "items-center gap-2 rounded-[2px] px-1.5 py-1.5"
                                : "flex-col gap-1.5 rounded-[2px] p-1.5",
                              selected
                                ? "bg-[var(--op-accent-soft)] shadow-[inset_2px_0_0_var(--op-accent,#1d4b3b)]"
                                : "hover:bg-[var(--op-accent-soft)]",
                              FOCUS,
                            )}
                          >
                            <Thumb
                              name={title}
                              src={thumb}
                              className={catalogHybrid ? "size-12 shrink-0" : "aspect-square w-full"}
                            />
                            {rank ? (
                              <span
                                className={cn(
                                  "absolute left-2 top-2 flex size-5 items-center justify-center text-[10px] font-medium",
                                  MARK,
                                )}
                              >
                                {rank}
                              </span>
                            ) : null}
                            {qty > 0 ? (
                              <span
                                className={cn(
                                  "absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center px-1 text-[10px] font-medium tabular-nums",
                                  MARK,
                                )}
                              >
                                {qty > 99 ? "99+" : qty}
                              </span>
                            ) : null}
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 text-[13px] font-semibold leading-tight tracking-[-0.02em]">
                                {primary}
                              </span>
                              {option ? (
                                <span className={cn("mt-0.5 block truncate text-[12px]", MUTE)}>
                                  {option}
                                </span>
                              ) : null}
                              {catalogHybrid && item.sku ? (
                                <span className={cn("mt-0.5 block truncate text-[11px]", MUTE)}>
                                  {item.sku}
                                </span>
                              ) : null}
                              <span className="mt-0.5 flex items-center gap-1.5">
                                {family ? (
                                  <span className={cn("text-[12px] font-medium", MUTE)}>Sizes</span>
                                ) : (
                                  <PriceReadout line={shelfLine(item.id)} />
                                )}
                                {tone ? (
                                  <span className={cn("text-[10px] font-semibold", MUTE)}>
                                    {tone === "out" ? "Out" : "Low"}
                                  </span>
                                ) : null}
                              </span>
                            </span>
                          </button>
                          {allowAddPhoto && onOpenPhotoPicker ? (
                            <button
                              type="button"
                              className={cn(
                                "absolute bottom-2 left-2 flex size-7 items-center justify-center",
                                CHIP,
                                FOCUS,
                              )}
                              aria-label={`Add a photo of ${title}`}
                              disabled={photoUploadingId === item.id}
                              onClick={() => onOpenPhotoPicker(item.id, title)}
                            >
                              {photoUploadingId === item.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Camera className="size-3.5" />
                              )}
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className={paneClass("build")} aria-label="Sizes">
          <div className="pos-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            {!pick ? (
              <div className="flex flex-1 flex-col justify-center px-2 py-10">
                <h2
                  className="text-[1.65rem] font-normal leading-none tracking-[-0.02em]"
                  style={displayFace}
                >
                  Pick a product
                </h2>
                <p className={cn("mt-2 max-w-[18rem] text-[13px] leading-relaxed", MUTE)}>
                  Sizes, flavours, and packs open here. A product with one price adds straight to the sale.
                </p>
              </div>
            ) : (
              <>
                <HeroTicket
                  item={active ?? pick.seed}
                  familyName={familyName}
                  priceLine={
                    active
                      ? familyPrices[active.id] || shelfLine(active.id)
                      : shelfLine(pick.seed.id)
                  }
                  lines={lines.filter(
                    (line) =>
                      line.itemId === (active?.id ?? "") && !isAirtimeCartLine(line),
                  )}
                  loading={loadingFamily && options.length === 0}
                  currency={currency}
                  onAdd={() => {
                    const candidate = active ?? pick.seed;
                    const row =
                      candidate && !isPosFamilyParent(candidate) && isPosSellableSku(candidate)
                        ? candidate
                        : null;
                    if (!row) return;
                    setPick((cur) =>
                      cur ? { ...cur, activeId: row.id, sellSeed: true } : cur,
                    );
                    sellPriced(row, familyPrices[row.id] || shelfLine(row.id));
                  }}
                  onCommit={(key, next) => updateLine(key, "quantity", next)}
                  onRemove={removeLine}
                  updateLine={updateLine}
                />
                {familyError ? (
                  <div className="px-1">
                    <p className={cn("text-[13px]", TERRACOTTA)}>{familyError}</p>
                    <button
                      type="button"
                      className={cn("mt-2 text-[13px] font-semibold", FOCUS)}
                      onClick={() => setAttempt((n) => n + 1)}
                    >
                      Try again
                    </button>
                  </div>
                ) : null}
                {loadingFamily && options.length === 0 ? (
                  <p className={cn("px-1 text-[13px]", MUTE)}>Loading sizes…</p>
                ) : options.length > 1 ? (
                  <ul className="grid grid-cols-2 gap-2" aria-label={`${familyName} sizes`}>
                    {options.map((row) => {
                      const caption = optionCaption(row, familyName);
                      const selected = row.id === (active?.id ?? pick.activeId);
                      const qty = cartQtyByItem.get(row.id) ?? 0;
                      const tone = stockTone(row);
                      const price = familyPrices[row.id] || shelfLine(row.id);
                      const stock = formatPosStockQty(row.stockQty);
                      return (
                        <li key={row.id}>
                          <button
                            type="button"
                            aria-pressed={selected}
                            onClick={() => {
                              setPick((cur) =>
                                cur ? { ...cur, activeId: row.id, sellSeed: true } : cur,
                              );
                              if ((cartQtyByItem.get(row.id) ?? 0) === 0) {
                                sellPriced(row, price);
                              }
                            }}
                            className={cn(
                              "flex h-full w-full flex-col items-start gap-1 px-3 py-3 text-left",
                              selected ? CHIP_ON : PAPER,
                              FOCUS,
                            )}
                            style={
                              justAddedId === row.id && !selected
                                ? { borderColor: "var(--op-accent, #1d4b3b)" }
                                : undefined
                            }
                          >
                            <span className="flex w-full items-start justify-between gap-2">
                              <span className="text-[15px] font-semibold leading-tight tracking-[-0.02em]">
                                {caption}
                              </span>
                              {qty > 0 ? (
                                <span
                                  className={cn(
                                    "flex h-5 min-w-5 items-center justify-center px-1 text-[10px] font-medium tabular-nums",
                                    MARK,
                                  )}
                                >
                                  {qty > 99 ? "99+" : qty}
                                </span>
                              ) : null}
                            </span>
                            <PriceReadout line={price} />
                            {tone === "out" ? (
                              <span className={cn("text-[11px] font-medium", MUTE)}>
                                Out
                              </span>
                            ) : stock ? (
                              <span className={cn("text-[11px]", MUTE)}>
                                {stock} left
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </>
            )}
          </div>
        </section>

        <section className={paneClass("order")} aria-label="Sale">
          <div className="flex min-h-0 flex-1 flex-col">
            {cartTabs.length > 0 ? (
              <div className="mb-2 flex shrink-0 items-center gap-1.5 overflow-x-auto">
                {[...cartTabs]
                  .sort((a, b) => {
                    const rank = (tab: CounterCartTab) => {
                      if (tab.id === activeCartId) return 0;
                      if (tab.kind === "held") return 1;
                      if (tab.kind === "open") return 2;
                      return 3;
                    };
                    const diff = rank(a) - rank(b);
                    if (diff !== 0) return diff;
                    if (a.kind === "held" && b.kind === "held") return b.ageMs - a.ageMs;
                    return 0;
                  })
                  .map((tab) => {
                    const active = tab.id === activeCartId;
                    const stale = tab.kind === "held" && tab.ageMs >= CART_STALE_MS;
                    const veryStale = tab.kind === "held" && tab.ageMs >= CART_VERY_STALE_MS;
                    const role = active
                      ? null
                      : tab.kind === "held"
                        ? veryStale || stale
                          ? "Stale"
                          : "Held"
                        : tab.kind === "empty"
                          ? "Spare"
                          : null;
                    return (
                      <div
                        key={tab.id}
                        className={cn(
                          "flex shrink-0 items-center gap-1 py-1 pl-3 pr-1",
                          active ? CHIP_ON : CHIP,
                        )}
                      >
                        <button
                          type="button"
                          aria-current={active ? "true" : undefined}
                          className={cn("text-[12px] font-semibold", FOCUS)}
                          onClick={() => onSwitchCart(tab.id)}
                        >
                          {role ? `${role} · ${tab.label}` : tab.label}
                          {tab.itemCount > 0 ? ` · ${tab.itemCount}` : ""}
                        </button>
                        {cartTabs.length > 1 ? (
                          <button
                            type="button"
                            className={cn(
                              "flex size-6 items-center justify-center rounded-[2px]",
                              FOCUS,
                            )}
                            aria-label={`Close ${tab.label}`}
                            onClick={() => onRemoveCart(tab.id)}
                          >
                            <X className="size-3" />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                {canCreateCart ? (
                  <button
                    type="button"
                    className={cn(
                      "flex h-8 shrink-0 items-center gap-1 px-3 text-[12px] font-medium",
                      CHIP,
                      FOCUS,
                    )}
                    onClick={onCreateCart}
                  >
                    <Plus className="size-3.5" />
                    New sale
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="pos-scroll min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
              {lines.length === 0 ? (
                <div className="flex h-full min-h-[8rem] flex-col justify-center px-1">
                  <h2
                    className="text-[1.45rem] font-normal leading-none tracking-[-0.02em]"
                    style={displayFace}
                  >
                    Nothing in this sale
                  </h2>
                  <p className={cn("mt-2 text-[13px] leading-relaxed", MUTE)}>
                    Tap a size and it lands here, newest first.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {[...lines].reverse().map((line, index) => (
                    <OrderTicket
                      key={line.key}
                      line={line}
                      front={index === 0}
                      active={line.itemId === pick?.activeId}
                      justAdded={justAddedId === line.itemId}
                      currency={currency}
                      allowPriceEdit={allowPriceEdit}
                      allowWeighedToggle={allowWeighedToggle}
                      weighedBusy={weighedToggleBusyItemId === line.itemId}
                      onEditPrice={onEditPrice}
                      onToggleWeighed={onToggleWeighed}
                      onCommit={(next) => updateLine(line.key, "quantity", next)}
                      onUnitPrice={(next) => updateLine(line.key, "unitPrice", next)}
                      onRemove={() => removeLine(line.key)}
                      onFocus={() => {
                        if (isAirtimeCartLine(line)) return;
                        openItem(line.item, false);
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>

            <div className="shrink-0 pt-2">
              {tillListening ? (
                <p className={cn("mb-2 text-[12px] font-medium", MUTE)}>
                  Listening for an M-Pesa till payment…
                </p>
              ) : null}
              {belowCostCount > 0 ? (
                <p className={cn("mb-2 text-[12px] font-medium", TERRACOTTA)}>
                  {belowCostCount === 1
                    ? "1 line is below cost."
                    : `${belowCostCount} lines are below cost.`}{" "}
                  The sale can still go through.
                </p>
              ) : null}
              {orderError ? (
                <p className={cn("mb-2 text-[12px] font-medium", TERRACOTTA)}>
                  {orderError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={
                  checkoutLoading || lines.length === 0 || !branchSelected || grandTotal <= 0
                }
                onClick={onCheckout}
                className={cn(
                  "flex h-[3.25rem] w-full items-center justify-between rounded-[2px] px-4 text-[15px] font-medium disabled:opacity-40",
                  FOCUS,
                )}
                style={{
                  backgroundColor: "var(--pos-primary)",
                  color: "var(--pos-primary-ink)",
                }}
              >
                <span>{checkoutLoading ? "Recording…" : "Pay"}</span>
                <span className="font-mono tabular-nums">
                  {grandTotal.toFixed(2)} {currency}
                </span>
              </button>
              {allowClearSale &&
              onClearSale &&
              (lines.length > 0 || (allowClearAllSales && clearableSaleCount > 0)) ? (
                <button
                  type="button"
                  className={cn(
                    "mt-1 flex h-10 w-full items-center justify-center text-[13px] font-medium disabled:opacity-40",
                    TERRACOTTA,
                    FOCUS,
                  )}
                  disabled={checkoutLoading}
                  onClick={onClearSale}
                >
                  {allowClearAllSales && clearableSaleCount > 1
                    ? `Clear all sales (${clearableSaleCount})`
                    : "Clear sale"}
                </button>
              ) : null}
              <p className={cn("mt-1 text-center text-[11px] leading-snug", MUTE)}>
                {!branchSelected
                  ? "Pick a branch in the top nav to take payment."
                  : lines.length === 0 || grandTotal <= 0
                    ? "Add a product to take payment."
                    : "Opens cash, M-Pesa, and tab."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function HeroTicket({
  item,
  familyName,
  priceLine,
  lines,
  loading,
  currency,
  onAdd,
  onCommit,
  onRemove,
  updateLine,
}: {
  item: ItemSummaryRecord;
  familyName: string;
  priceLine: string;
  lines: CounterLine[];
  loading: boolean;
  currency: string;
  onAdd: () => void;
  onCommit: (key: string, next: string) => void;
  onRemove: (key: string) => void;
  updateLine: (key: string, field: "quantity" | "unitPrice", value: string) => void;
}) {
  const title = familyName || cashierItemPrimaryLabel(item);
  const caption = optionCaption(item, title);
  const showCaption = caption !== "Each" || Boolean(item.variantOfItemId?.trim());
  const thumb = posTileThumbUrl(item.name, itemListThumbnailUrl(item));
  const single = lines.length === 1 ? lines[0] : null;
  const weighed = single?.item.isWeighed === true;
  const label = cashierItemPrimaryLabel(item);
  const canAdd = isPosSellableSku(item) && !isPosFamilyParent(item);

  return (
    <article className={cn("p-3", PAPER)}>
      <div className="flex gap-3">
        <Thumb name={title} src={thumb} className="size-[4.75rem] shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2
              className="min-w-0 truncate text-[1.5rem] font-normal leading-none tracking-[-0.02em]"
              style={displayFace}
            >
              {title}
            </h2>
            <PriceReadout line={priceLine} large />
          </div>
          {showCaption ? (
            <p className={cn("mt-1 truncate text-[13px]", MUTE)}>{caption}</p>
          ) : null}
          <div className="mt-3">
            {loading ? (
              <span className={cn("inline-flex items-center gap-2 text-[13px]", MUTE)}>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Checking sizes…
              </span>
            ) : lines.length > 1 ? (
              <p className={cn("text-[12px] leading-snug", MUTE)}>
                This size is on more than one line. Change each one in the sale.
              </p>
            ) : single && weighed ? (
              <CashierQtyControl
                quantity={single.quantity}
                itemLabel={label}
                size="sm"
                allowFractions
                unitPrice={single.unitPrice}
                currency={currency}
                onChange={(next) => onCommit(single.key, next)}
                onUnitPriceChange={(next) => updateLine(single.key, "unitPrice", next)}
                onRemove={() => onRemove(single.key)}
              />
            ) : single ? (
              <InkQty
                quantity={single.quantity}
                label={label}
                onCommit={(next) => onCommit(single.key, next)}
                onRemove={() => onRemove(single.key)}
              />
            ) : canAdd ? (
              <button
                type="button"
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-[2px] border border-[var(--op-accent,#1d4b3b)] px-3 text-[13px] font-medium text-[var(--op-accent,#1d4b3b)]",
                  FOCUS,
                )}
                onClick={onAdd}
              >
                <Plus className="size-3.5" aria-hidden />
                Add
              </button>
            ) : (
              <p className={cn("text-[13px]", MUTE)}>Choose a size below.</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function OrderTicket({
  line,
  front,
  active,
  justAdded,
  currency,
  allowPriceEdit,
  allowWeighedToggle,
  weighedBusy,
  onEditPrice,
  onToggleWeighed,
  onCommit,
  onUnitPrice,
  onRemove,
  onFocus,
}: {
  line: CounterLine;
  front: boolean;
  active: boolean;
  justAdded: boolean;
  currency: string;
  allowPriceEdit: boolean;
  allowWeighedToggle: boolean;
  weighedBusy: boolean;
  onEditPrice?: (key: string) => void;
  onToggleWeighed?: (lineKey: string) => void;
  onCommit: (next: string) => void;
  onUnitPrice: (next: string) => void;
  onRemove: () => void;
  onFocus: () => void;
}) {
  const airtime = isAirtimeCartLine(line);
  const { primary, option } = cashierItemTitleParts(line.item);
  const full = line.label || cashierItemPrimaryLabel(line.item);
  const sub = lineSubtotal(line);
  const below =
    !airtime &&
    isSellBelowCost(line.unitPrice, line.item.buyingPrice, {
      clearance: line.item.isClearance === true,
    });
  const thumb = posTileThumbUrl(line.item.name, itemListThumbnailUrl(line.item));
  const weighed = line.item.isWeighed === true;
  const qty = Number(line.quantity);

  return (
    <li
      className={cn("p-3", PAPER, justAdded && front && "animate-pos-line-in")}
      style={
        active || justAdded
          ? { borderColor: "var(--op-accent, #1d4b3b)" }
          : undefined
      }
    >
      <div className="flex gap-3">
        <button
          type="button"
          className={cn("shrink-0", FOCUS)}
          onClick={onFocus}
          aria-label={`Show ${full} with its sizes`}
        >
          <Thumb name={full} src={airtime ? null : thumb} className="size-14" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button type="button" className={cn("min-w-0 text-left", FOCUS)} onClick={onFocus}>
              <span className="block truncate text-[15px] font-semibold leading-tight tracking-[-0.02em]">
                {primary || full}
              </span>
              {option ? (
                <span className={cn("mt-0.5 block truncate text-[12px]", MUTE)}>{option}</span>
              ) : null}
            </button>
            <span
              className={cn(
                "shrink-0 text-right font-mono text-[15px] font-medium tabular-nums",
                below && TERRACOTTA,
              )}
            >
              {sub.toFixed(2)}
              <span className={cn("ml-1 text-[10px] font-medium", MUTE)}>{currency}</span>
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            {!airtime && allowPriceEdit && onEditPrice ? (
              <button
                type="button"
                className={cn(
                  "font-mono text-[12px] font-medium tabular-nums underline-offset-2 hover:underline",
                  below ? TERRACOTTA : MUTE,
                  FOCUS,
                )}
                onClick={() => onEditPrice(line.key)}
              >
                {Number(line.unitPrice).toFixed(2)} each
              </button>
            ) : (
              <span className={cn("font-mono text-[12px] tabular-nums", below ? TERRACOTTA : MUTE)}>
                {Number(line.unitPrice).toFixed(2)}
                {weighed ? " / kg" : " each"}
                {Number.isFinite(qty) && qty !== 1 ? ` · ${qty}` : ""}
              </span>
            )}
            {!airtime &&
            allowWeighedToggle &&
            onToggleWeighed &&
            (!isPackSellSku(line.item) || line.item.isWeighed === true) ? (
              <CashierWeighedToggle
                weighed={line.item.isWeighed === true}
                busy={weighedBusy}
                itemLabel={full}
                onToggle={() => onToggleWeighed(line.key)}
              />
            ) : null}
          </div>
          <div className="mt-2">
            {airtime ? (
              <button
                type="button"
                className={cn("text-[12px] font-medium", TERRACOTTA, FOCUS)}
                onClick={onRemove}
              >
                Remove
              </button>
            ) : weighed ? (
              <CashierQtyControl
                quantity={line.quantity}
                itemLabel={full}
                size="sm"
                allowFractions
                unitPrice={line.unitPrice}
                currency={currency}
                onChange={onCommit}
                onUnitPriceChange={onUnitPrice}
                onRemove={onRemove}
              />
            ) : (
              <InkQty
                quantity={line.quantity}
                label={full}
                onCommit={onCommit}
                onRemove={onRemove}
              />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
