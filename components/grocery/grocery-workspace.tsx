"use client";

/* ═══════════════════════════════════════════════════════════════════════════
 * THE GROCERY COUNTER — same visual language as /order
 *
 * White page, hairline ink borders, rounded-none. Selection is teal border
 * + teal text. Primary CTAs (Scan, Generate) may be teal filled squares.
 * Product image covers ~3/4 of the well (object-contain); price and qty sit
 * under the image, never over it. No cream paper, no offset shadows, no
 * uppercase tracked kickers, no dark filled header.
 * ═══════════════════════════════════════════════════════════════════════════ */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  ScanLine,
  ShoppingBasket,
  X,
  Receipt,
  WifiOff,
  ChevronRight,
  Command,
  MapPin,
  Clock3,
  Keyboard,
  LockKeyhole,
  MonitorSmartphone,
  Camera,
  Loader2,
  ImagePlus,
  ClipboardCheck,
  ClipboardList,
} from "lucide-react";

import { usePosTillLock } from "@/components/auth/pos-till-lock";
import { TenantLogo } from "@/components/brand/tenant-logo";
import { BranchRequiredBanner } from "@/components/branch-required-banner";
import { useDashboard } from "@/components/dashboard-provider";
import { useFeatureFlag, useFeatureFlags } from "@/components/providers/tenant-provider";
import {
  GroceryAppBottomNav,
  GROCERY_TAB_BAR_CLEARANCE,
} from "@/components/grocery/grocery-app-chrome";
import { useSessionBootstrapSnapshot } from "@/hooks/use-session-bootstrap-snapshot";
import { RealtimeConnectionIndicator } from "@/components/realtime-connection-indicator";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { CASHIER_POS_UI_COPY } from "@/lib/cashier-pos-copy";
import { cn } from "@/lib/utils";
import {
  fetchItems,
  fetchRestockActiveRun,
  postStandaloneWastage,
  setPosItemWeighed,
  uploadItemImageFile,
  type ItemSummaryRecord,
  type RestockActiveRunRecord,
  itemListThumbnailUrl,
} from "@/lib/api";
import {
  cashierItemPrimaryLabel,
  posCartLineSuffix,
} from "@/lib/cashier-item-display";
import {
  formatCartQtyValue,
} from "@/components/cashier/cashier-qty-control";
import { CashierReceiveTillDrawer } from "@/components/cashier/cashier-receive-till-drawer";
import { CashierOrderConfirmDrawer } from "@/components/cashier/cashier-order-confirm-drawer";
import { TenantOrderDrawer } from "@/components/order/tenant-order-drawer";
import {
  GroceryModeSwitcher,
  groceryModeTitle,
} from "@/components/grocery/grocery-mode-switcher";
import { GroceryStockInPanel } from "@/components/grocery/grocery-stock-in-panel";
import { GroceryStockEditDialog } from "@/components/grocery/grocery-stock-edit-dialog";
import { GroceryStockEditPanel } from "@/components/grocery/grocery-stock-edit-panel";
import {
  formatShelfPriceLabel,
  splitShelfPriceDisplay,
} from "@/lib/cashier-shelf-price";
import { fetchPosShelfPrice } from "@/lib/pos-shelf-price";
import { POS_CASHIER_CAPABILITY_FLAGS } from "@/lib/pos-cashier-capabilities";
import {
  canGroceryEditMinStock,
  canGroceryEditParLevel,
  canGroceryOrderConfirm,
  canGroceryOrderPad,
  groceryCounterModesAvailable,
  type GroceryCounterMode,
} from "@/lib/grocery-counter-access";
import { hasPermission, Permission } from "@/lib/permissions";
import { itemStockQty } from "@/lib/apply-item-on-hand";
import { BarcodeScanner } from "@/components/barcode-scanner";

import {
  cancelGroceryInvoice,
  createGroceryInvoice,
  fetchGroceryTopProducts,
  GroceryApiError,
  toastCaughtGroceryError,
  type GroceryInvoiceResponse,
  type GroceryTopProduct,
} from "@/lib/grocery-api";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import {
  GROCERY_DRAFT_FLAGS,
  fetchGroceryDraft,
  listGroceryDrafts,
} from "@/lib/grocery-draft-api";
import {
  applyGroceryDraftToLines,
  createGroceryDraftState,
  issueGroceryDraftFromState,
  syncGroceryDraftToServer,
  type GroceryDraftState,
} from "@/lib/grocery-draft-sync";
import { ALL_DEPARTMENTS_LABEL } from "@/hooks/use-session-scope";
import {
  GroceryInvoiceCart,
  type GroceryCartLine,
} from "./grocery-invoice-cart";
import { GroceryDepartmentRail } from "./grocery-department-rail";
import { GroceryInvoiceSuccess } from "./grocery-invoice-success";
import { CounterKeyboard } from "./grocery-qwerty-keyboard";
import {
  GroceryCartTabs,
  GroceryForwardedInvoicesPanel,
  type GroceryCartPanelTab,
} from "./grocery-forwarded-invoices-panel";

// ── Helpers ────────────────────────────────────────────────────────

const SYSTEM_KEYBOARD_STORAGE_KEY = "palmart.grocery.system-keyboard";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function tileShelfLine(
  online: boolean,
  prices: Record<string, string>,
  id: string,
): string {
  if (!online) return CASHIER_POS_UI_COPY.tileShelfEmpty;
  if (!(id in prices)) return CASHIER_POS_UI_COPY.tileShelfLoading;
  return prices[id] || CASHIER_POS_UI_COPY.tileShelfEmpty;
}

// ── Live clock pill ────────────────────────────────────────────────

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  if (!now) return null;
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <span className="hidden items-center gap-1 text-[11px] font-medium tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] sm:inline-flex">
      <Clock3 className="size-3" />
      {time}
    </span>
  );
}

// ── Product Card ───────────────────────────────────────────────────

function ProductCardAddPhotoButton({
  itemId,
  itemName,
  onUploaded,
}: {
  itemId: string;
  itemName: string;
  onUploaded: (imageUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a photo (JPG, PNG, or HEIC).");
      return;
    }
    setUploading(true);
    try {
      const saved = await uploadItemImageFile(itemId, file, {
        altText: itemName,
        primary: true,
      });
      const url = saved.secureUrl?.trim();
      if (!url) {
        toast.error("Upload finished but no image URL was returned.");
        return;
      }
      onUploaded(url);
      toast.success("Photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={uploading}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          inputRef.current?.click();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-1 right-1 z-[3] flex size-7 items-center justify-center rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[var(--order-ink,#15231f)] transition-colors hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,#fff)] disabled:opacity-70"
        aria-label={`Update photo for ${itemName}`}
        title="Update photo"
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Camera className="size-3.5" aria-hidden />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
        }}
      />
    </>
  );
}

function ProductCard({
  item,
  shelfLine,
  onPick,
  cartQty = 0,
  cartLineTotal = 0,
  currency,
  showOnHand = false,
  canEditImage = false,
  onImageUploaded,
}: {
  item: ItemSummaryRecord;
  shelfLine: string;
  onPick: () => void;
  cartQty?: number;
  cartLineTotal?: number;
  currency: string;
  showOnHand?: boolean;
  canEditImage?: boolean;
  onImageUploaded?: (itemId: string, imageUrl: string) => void;
}) {
  const thumb = itemListThumbnailUrl(item);
  const title = cashierItemPrimaryLabel(item);
  const { amount } = splitShelfPriceDisplay(shelfLine);
  const hasPrice =
    amount &&
    amount !== CASHIER_POS_UI_COPY.tileShelfEmpty &&
    amount !== CASHIER_POS_UI_COPY.tileShelfLoading;
  const inCart = cartQty > 0;
  const onHand = itemStockQty(item.stockQty);
  // Running total label — only meaningful when we actually know a unit price.
  // If shelf price is still loading/unknown, fall back to showing just the
  // count so we don't render "0 KES" totals.
  const lineTotalLabel =
    inCart && cartLineTotal > 0
      ? formatShelfPriceLabel(cartLineTotal, currency)
      : null;
  const lineTotalSplit = lineTotalLabel
    ? splitShelfPriceDisplay(lineTotalLabel)
    : null;

  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={
        showOnHand
          ? `${title} — ${onHand} on hand. Tap to set quantity.`
          : inCart
            ? `${title} — ${cartQty} in cart. Tap to add another.`
            : `Add ${title} to cart`
      }
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-none border bg-white text-left",
        "transition-[border-color] duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
        "touch-manipulation select-none",
        inCart
          ? "border-[var(--pos-primary,#0f766e)]"
          : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_26%,transparent)]",
      )}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-white">
        {thumb ? (
          <span className="absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2">
            <Image
              src={thumb}
              alt=""
              fill
              sizes="180px"
              className="object-contain object-center"
              unoptimized
              draggable={false}
            />
          </span>
        ) : (
          <span className="absolute left-1/2 top-1/2 flex h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            <ShoppingBasket className="size-7 text-[color-mix(in_srgb,var(--order-ink,#15231f)_22%,transparent)]" />
          </span>
        )}

        {canEditImage && onImageUploaded ? (
          <ProductCardAddPhotoButton
            itemId={item.id}
            itemName={title}
            onUploaded={(url) => onImageUploaded(item.id, url)}
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-2 pb-2 pt-1.5">
        <p className="line-clamp-2 text-[11px] font-medium leading-snug text-[var(--order-ink,#15231f)]">
          {title}
        </p>
        {showOnHand ? (
          <p className="mt-0.5 text-[10px] font-medium tabular-nums text-[var(--pos-primary,#0f766e)]">
            {onHand} on hand
          </p>
        ) : null}

        <div className="mt-1.5 flex min-w-0 items-baseline justify-between gap-2">
          <p
            className={cn(
              "min-w-0 truncate font-heading text-[14px] font-semibold tabular-nums leading-none tracking-[-0.03em]",
              hasPrice
                ? "text-[var(--order-ink,#15231f)]"
                : "font-sans text-[11px] font-medium tracking-normal text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]",
            )}
          >
            {hasPrice ? amount : shelfLine || "—"}
          </p>
          {inCart ? (
            <p className="shrink-0 font-heading text-[12px] font-semibold tabular-nums leading-none tracking-[-0.02em] text-[var(--pos-primary,#0f766e)]">
              {lineTotalSplit ? lineTotalSplit.amount : `×${cartQty}`}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

// ── Main Workspace ─────────────────────────────────────────────────

export function GroceryWorkspace() {
  const {
    me,
    business,
    branches,
    branchId,
    branchesLoading,
    itemTypes,
  } = useDashboard();
  const bootstrap = useSessionBootstrapSnapshot();
  const effectiveMe = me ?? bootstrap.me;
  const { lock: lockCounter, locked: counterLocked } = usePosTillLock();
  const online = useOnlineStatus();
  const currency = business?.currency?.trim() || "KES";
  const cashierName = effectiveMe?.name?.trim() || "";
  const tenantTitle =
    business?.branding?.displayName?.trim() ||
    business?.name?.trim() ||
    "Grocery";
  const primaryColor = business?.branding?.primaryColor;
  const roleKey = effectiveMe?.role?.key?.trim().toLowerCase() ?? "";
  const isOwnerOrAdmin = roleKey === "owner" || roleKey === "admin";
  const canEditProductImages =
    isOwnerOrAdmin &&
    hasPermission(effectiveMe?.permissions, Permission.CatalogItemsWrite);

  // Item browser state
  const [search, setSearch] = useState("");
  const [imageEditMode, setImageEditMode] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<
    string | null
  >(null);
  const [hits, setHits] = useState<ItemSummaryRecord[]>([]);
  const [searchBanner, setSearchBanner] = useState<string | null>(null);
  const [departmentCatalog, setDepartmentCatalog] = useState<
    ItemSummaryRecord[]
  >([]);
  const [departmentCatalogLoading, setDepartmentCatalogLoading] =
    useState(false);
  const [topProducts, setTopProducts] = useState<GroceryTopProduct[]>([]);
  const [topProductsReloadKey, setTopProductsReloadKey] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [tileShelfPrices, setTileShelfPrices] = useState<
    Record<string, string>
  >({});
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  // Device preference: use the OS on-screen keyboard instead of the counter keypad.
  const [useSystemKeyboard, setUseSystemKeyboard] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(SYSTEM_KEYBOARD_STORAGE_KEY) === "1",
  );
  const tileShelfPriceValues = useRef<Record<string, number>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Cart state
  const [lines, setLines] = useState<GroceryCartLine[]>([]);
  const [draftState, setDraftState] = useState<GroceryDraftState>(
    createGroceryDraftState(),
  );
  const [counterMode, setCounterMode] = useState<GroceryCounterMode>("sell");
  const [parkedSell, setParkedSell] = useState<{
    lines: GroceryCartLine[];
    draft: GroceryDraftState;
  } | null>(null);
  const [parkedSpoils, setParkedSpoils] = useState<GroceryCartLine[] | null>(
    null,
  );
  const [receiveTillOpen, setReceiveTillOpen] = useState(false);
  const [receiveTillSupplier, setReceiveTillSupplier] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [orderPadOpen, setOrderPadOpen] = useState(false);
  const [orderConfirmOpen, setOrderConfirmOpen] = useState(false);
  const [stockEditItem, setStockEditItem] = useState<ItemSummaryRecord | null>(
    null,
  );
  const [lastStockEdit, setLastStockEdit] = useState<{
    label: string;
    qty: number;
  } | null>(null);
  const availableModes = useMemo(
    () => groceryCounterModesAvailable(effectiveMe, business),
    [effectiveMe, business],
  );
  const allowGroceryMinStock = useMemo(
    () => canGroceryEditMinStock(effectiveMe, business),
    [effectiveMe, business],
  );
  const allowGroceryParLevel = useMemo(
    () => canGroceryEditParLevel(effectiveMe, business),
    [effectiveMe, business],
  );
  const allowGroceryOrderPad = useMemo(
    () => canGroceryOrderPad(effectiveMe, business),
    [effectiveMe, business],
  );
  const allowGroceryOrderConfirm = useMemo(
    () => canGroceryOrderConfirm(effectiveMe, business),
    [effectiveMe, business],
  );

  useEffect(() => {
    if (!availableModes.includes(counterMode)) {
      setCounterMode("sell");
    }
  }, [availableModes, counterMode]);

  const switchCounterMode = useCallback(
    (next: GroceryCounterMode) => {
      if (next === counterMode) return;
      if (counterMode === "sell") {
        setParkedSell({ lines, draft: draftState });
      } else if (counterMode === "spoils") {
        setParkedSpoils(lines);
      }
      if (next === "sell") {
        const parked = parkedSell;
        setLines(parked?.lines ?? []);
        setDraftState(parked?.draft ?? createGroceryDraftState());
        setParkedSell(null);
      } else if (next === "spoils") {
        setLines(parkedSpoils ?? []);
        setParkedSpoils(null);
      } else {
        // Stock in / edit stock — keep lines parked, clear active cart view.
        setLines([]);
      }
      setShowCartDrawer(false);
      setCounterMode(next);
    },
    [counterMode, lines, draftState, parkedSell, parkedSpoils],
  );
  const draftSyncTimer = useRef<number | null>(null);
  const draftHydratedRef = useRef(false);
  const linesRef = useRef(lines);
  const draftStateRef = useRef(draftState);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    draftStateRef.current = draftState;
  }, [draftState]);

  const groceryDraftsEnabled = useFeatureFlag(GROCERY_DRAFT_FLAGS.enabled);
  const groceryDraftsShadow = useFeatureFlag(GROCERY_DRAFT_FLAGS.shadowWrites);
  const groceryDraftsUi = useFeatureFlag(GROCERY_DRAFT_FLAGS.uiVisible);
  const featureFlags = useFeatureFlags();
  const weighedToggleFlagEnabled =
    featureFlags[POS_CASHIER_CAPABILITY_FLAGS.weighedToggle] !== false;
  const allowWeighedToggle =
    hasPermission(effectiveMe?.permissions, Permission.CatalogItemsWrite) ||
    weighedToggleFlagEnabled;
  const groceryDraftPersistence = groceryDraftsEnabled || groceryDraftsShadow;
  const showCounterNumber = groceryDraftsUi || groceryDraftsEnabled;
  const [cartPulse, setCartPulse] = useState(0);
  const [recentlyAddedKey, setRecentlyAddedKey] = useState<string | null>(null);

  // Quick lookup of how much of each product is already in the cart —
  // both the running quantity and the running line total. Drives the count
  // badge and the in-cart price strip on each product tile so the clerk
  // can tell at a glance "I've already added this one, 3 times, totalling
  // 150 KES". Items can theoretically appear on multiple lines so we sum.
  const lineDataByItem = useMemo(() => {
    const m = new Map<string, { qty: number; total: number }>();
    for (const l of lines) {
      const prev = m.get(l.itemId) ?? { qty: 0, total: 0 };
      m.set(l.itemId, {
        qty: prev.qty + l.quantity,
        total: prev.total + l.quantity * (l.unitPrice ?? 0),
      });
    }
    return m;
  }, [lines]);

  // Invoice generation state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedInvoice, setGeneratedInvoice] =
    useState<GroceryInvoiceResponse | null>(null);
  const [forwardedInvoices, setForwardedInvoices] = useState<
    GroceryInvoiceResponse[]
  >([]);
  const [cartPanelTab, setCartPanelTab] =
    useState<GroceryCartPanelTab>("sale");
  const [voidingForwardedId, setVoidingForwardedId] = useState<string | null>(
    null,
  );
  const canVoidForwarded = hasPermission(
    effectiveMe?.permissions,
    Permission.GroceryInvoicesCancel,
  );

  // ── Derived ──────────────────────────────────────────────────────

  const subtotal = useMemo(() => {
    let t = 0;
    for (const line of lines) {
      t += round2(line.quantity * line.unitPrice);
    }
    return round2(t);
  }, [lines]);

  const grandTotal = subtotal;

  const hasSearch = search.trim().length > 0;
  const showCatalog = !hasSearch;
  const cartItemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const isEmptyCart = lines.length === 0;

  const activeBranchName = useMemo(() => {
    return branches.find((b) => b.id === branchId)?.name?.trim() ?? "";
  }, [branches, branchId]);

  // "Tonight's list" chip — shows when the branch has an actionable digest run.
  const canReviewDigest =
    hasPermission(me?.permissions, Permission.PurchasingPathARead) ||
    hasPermission(me?.permissions, Permission.OrderPadRead);
  const [activeRestockRun, setActiveRestockRun] = useState<RestockActiveRunRecord | null>(null);
  useEffect(() => {
    if (!online || !branchId?.trim()) {
      setActiveRestockRun(null);
      return;
    }
    let cancelled = false;
    fetchRestockActiveRun(branchId.trim())
      .then((r) => {
        if (!cancelled) setActiveRestockRun(r.runId && r.lineCount > 0 ? r : null);
      })
      .catch(() => {
        if (!cancelled) setActiveRestockRun(null);
      });
    return () => {
      cancelled = true;
    };
  }, [online, branchId]);

  const showDepartmentRail = itemTypes.length > 1;

  const selectedDepartment = useMemo(() => {
    if (!selectedDepartmentId) return null;
    return itemTypes.find((t) => t.id === selectedDepartmentId) ?? null;
  }, [itemTypes, selectedDepartmentId]);

  // Departments (item types) the grocery clerk is allowed to invoice from.
  const activeDepartmentLabel = useMemo(() => {
    if (itemTypes.length === 0) return "";
    if (selectedDepartment) return selectedDepartment.label?.trim() || "";
    if (itemTypes.length === 1) return itemTypes[0].label?.trim() || "";
    return ALL_DEPARTMENTS_LABEL;
  }, [itemTypes, selectedDepartment]);

  // Personal top sellers boost items the clerk invoices often to the top of
  // the "All departments" browse list. Department-specific views use plain
  // alphabetical catalog order.
  const browseCatalog = useMemo(() => {
    if (selectedDepartmentId || departmentCatalog.length === 0) {
      return departmentCatalog;
    }
    if (topProducts.length === 0) {
      return departmentCatalog;
    }
    const topRank = new Map(
      topProducts.map((p, index) => [p.id, index] as const),
    );
    return [...departmentCatalog].sort((a, b) => {
      const aRank = topRank.get(a.id);
      const bRank = topRank.get(b.id);
      if (aRank != null && bRank != null) return aRank - bRank;
      if (aRank != null) return -1;
      if (bRank != null) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [departmentCatalog, selectedDepartmentId, topProducts]);

  // ── Effects ──────────────────────────────────────────────────────

  // Browse catalog for the active department filter. "All" omits itemTypeId
  // so the backend returns every product the clerk may invoice across their
  // assigned departments.
  useEffect(() => {
    if (search.trim()) {
      setDepartmentCatalog([]);
      setDepartmentCatalogLoading(false);
      return;
    }
    if (!online) {
      setDepartmentCatalog([]);
      setDepartmentCatalogLoading(false);
      return;
    }
    const bid = branchId?.trim();
    if (!bid) {
      setDepartmentCatalog([]);
      return;
    }
    let cancelled = false;
    setDepartmentCatalogLoading(true);
    const deptId = selectedDepartmentId?.trim();
    fetchItems(undefined, {
      branchId: bid,
      ...(deptId ? { itemTypeId: deptId } : {}),
      page: 0,
      size: 50,
      catalogScope: "SKUS_ONLY",
      sort: [{ property: "name", direction: "asc" }],
      softAuth: true,
    })
      .then((items) => {
        if (cancelled) return;
        const sellable = (items ?? []).filter((r) => r.groupLabelOnly !== true);
        setDepartmentCatalog(sellable);
      })
      .catch(() => {
        if (cancelled) return;
        setDepartmentCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setDepartmentCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [online, branchId, selectedDepartmentId, search]);

  // Server-aggregated top products — used only to rank the "All" browse list.
  useEffect(() => {
    if (!online) return;
    const bid = branchId?.trim();
    if (!bid) {
      setTopProducts([]);
      return;
    }
    let cancelled = false;
    fetchGroceryTopProducts(bid, 20)
      .then((list) => {
        if (cancelled) return;
        setTopProducts(list);
      })
      .catch(() => {
        if (cancelled) return;
        setTopProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [online, branchId, topProductsReloadKey]);

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setHits([]);
      setSearchBanner(null);
      return;
    }
    if (!online) {
      setHits([]);
      setSearchBanner("Offline — search needs network.");
      return;
    }
    const t = window.setTimeout(() => {
      let cancelled = false;
      const bid = branchId?.trim() || undefined;
      const deptId = selectedDepartmentId?.trim() || undefined;
      // When the clerk picks a department on the floating rail we narrow
      // search to that aisle. With no selection the backend still AND-s in
      // every department the role is allowed to invoice from.
      //
      // `catalogScope: "SKUS_ONLY"` asks the backend to skip catalog
      // "group label" rows (parent records that exist only to anchor
      // variant trees in the products page). Without this flag, listing
      // a product like Apple → [Green, Pink] returns both the parent
      // group row *and* each variant SKU, so the POS would show the same
      // product twice. We also drop any `groupLabelOnly` row that slips
      // through, matching how every other sellable-product picker
      // (supplies, stock-take, stock levels) filters its results.
      fetchItems(q, {
        branchId: bid,
        ...(deptId ? { itemTypeId: deptId } : {}),
        page: 0,
        size: 50,
        catalogScope: "SKUS_ONLY",
        softAuth: true,
      })
        .then((items) => {
          if (cancelled) return;
          const sellable = (items ?? []).filter(
            (r) => r.groupLabelOnly !== true,
          );
          setHits(sellable);
          setSearchBanner(sellable.length === 0 ? "No items match." : null);
        })
        .catch(() => {
          if (cancelled) return;
          setHits([]);
          setSearchBanner("Search failed. Try again.");
        });
      return () => {
        cancelled = true;
      };
    }, 250);
    return () => window.clearTimeout(t);
  }, [search, branchId, online, selectedDepartmentId]);

  useEffect(() => {
    if (!online) {
      setTileShelfPrices({});
      return;
    }
    const hitIds = hits.map((h) => h.id);
    const browseIds = browseCatalog.map((i) => i.id);
    const ids = Array.from(new Set([...hitIds, ...browseIds]));
    if (ids.length === 0) {
      setTileShelfPrices({});
      return;
    }
    let cancelled = false;
    const bid = branchId?.trim() || undefined;
    void Promise.all(
      ids.map(async (id) => {
        const r = await fetchPosShelfPrice(id, bid, {});
        if (!r) return [id, "", null] as const;
        const label = formatShelfPriceLabel(r.price, currency);
        if (r.price != null) {
          tileShelfPriceValues.current[id] =
            typeof r.price === "string" ? Number(r.price) : r.price;
        }
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
  }, [online, currency, hits, browseCatalog, branchId]);

  // Clear "recently added" highlight after animation
  useEffect(() => {
    if (!recentlyAddedKey) return;
    const t = window.setTimeout(() => setRecentlyAddedKey(null), 400);
    return () => window.clearTimeout(t);
  }, [recentlyAddedKey]);

  // Keyboard shortcut: ⌘/Ctrl+K focuses search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isCmdK =
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (!isCmdK) return;
      e.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus the search field while the on-screen keyboard is up so the caret
  // (and the teal focus ring) point at where the keys will type.
  useEffect(() => {
    if (keyboardOpen) {
      searchInputRef.current?.focus();
    }
  }, [keyboardOpen]);

  // Remember the keyboard preference for this device.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        SYSTEM_KEYBOARD_STORAGE_KEY,
        useSystemKeyboard ? "1" : "0",
      );
    } catch {
      // storage unavailable — the preference just won't persist
    }
  }, [useSystemKeyboard]);

  // Close the on-screen keyboard when the search is cleared — text goes from
  // non-empty to empty (X button, Clear key, or backspace to the end). Blur so
  // the next tap on the search field re-focuses and re-opens the keyboard.
  const prevSearchRef = useRef(search);
  useEffect(() => {
    const prev = prevSearchRef.current;
    prevSearchRef.current = search;
    if (keyboardOpen && prev.trim() !== "" && search.trim() === "") {
      setKeyboardOpen(false);
      searchInputRef.current?.blur();
    }
  }, [search, keyboardOpen]);

  // ── Draft sync ─────────────────────────────────────────────────────

  function scheduleDraftSync(delayMs = 300) {
    if (counterMode !== "sell" || !groceryDraftPersistence || !online || !branchId) return;
    if (draftSyncTimer.current != null) {
      window.clearTimeout(draftSyncTimer.current);
    }
    setDraftState((prev) =>
      prev.syncStatus === "error" ? prev : { ...prev, syncStatus: "syncing" },
    );
    draftSyncTimer.current = window.setTimeout(async () => {
      const result = await syncGroceryDraftToServer(
        linesRef.current,
        draftStateRef.current,
        branchId,
      );
      setLines(result.lines);
      setDraftState(result.state);
    }, delayMs);
  }

  // ── Cart actions ─────────────────────────────────────────────────

  const addLine = useCallback(
    (item: ItemSummaryRecord) => {
      if (counterMode === "stockIn") {
        toast.message("Pick a supplier in Stock in, then receive on the till.");
        return;
      }
      if (counterMode === "stockEdit") {
        setStockEditItem(item);
        return;
      }
      const weighed = item.isWeighed === true;
      const buying =
        item.buyingPrice != null ? Number(item.buyingPrice) : NaN;
      const unitCost =
        Number.isFinite(buying) && buying > 0 ? buying : undefined;
      const existingIdx = lines.findIndex((l) => l.itemId === item.id);
      if (existingIdx >= 0) {
        const existingKey = lines[existingIdx].key;
        setLines((prev) =>
          prev.map((l, i) => {
            if (i !== existingIdx) return l;
            const nextQty = weighed
              ? Number(formatCartQtyValue(l.quantity + 1))
              : l.quantity + 1;
            return {
              ...l,
              quantity: nextQty,
              isWeighed: weighed || l.isWeighed === true,
              unitCost: l.unitCost ?? unitCost,
            };
          }),
        );
        setRecentlyAddedKey(existingKey);
      } else {
        const newLine: GroceryCartLine = {
          key: crypto.randomUUID(),
          itemId: item.id,
          label:
            `${cashierItemPrimaryLabel(item)}${posCartLineSuffix(item)}`.trim(),
          quantity: 1,
          unitPrice: tileShelfPriceValues.current[item.id] ?? 0,
          unitName: weighed ? "kg" : "",
          isWeighed: weighed,
          unitCost,
        };
        setLines((prev) => [...prev, newLine]);
        setRecentlyAddedKey(newLine.key);
      }
      setCartPulse((n) => n + 1);
      if (counterMode === "sell") {
        scheduleDraftSync();
      }
    },
    [lines, scheduleDraftSync, counterMode],
  );

  const updateLine = useCallback(
    (key: string, field: "quantity" | "unitPrice", value: number) => {
      setLines((prev) =>
        prev.map((l) => {
          if (l.key !== key) return l;
          if (field === "quantity") {
            const weighed = l.isWeighed === true;
            if (weighed) {
              if (!Number.isFinite(value) || value <= 0) return l;
              return { ...l, quantity: Number(formatCartQtyValue(value)) };
            }
            return { ...l, quantity: Math.max(1, Math.round(value)) };
          }
          return { ...l, unitPrice: Math.max(0, value) };
        }),
      );
      scheduleDraftSync();
    },
    [scheduleDraftSync],
  );

  const [weighedToggleBusyItemId, setWeighedToggleBusyItemId] = useState<
    string | null
  >(null);

  const toggleLineWeighed = useCallback(
    async (lineKey: string) => {
      if (!allowWeighedToggle) return;
      if (!online) {
        toast.error("Go online to change weighted selling.");
        return;
      }
      const line = lines.find((l) => l.key === lineKey);
      if (!line) return;
      const next = line.isWeighed !== true;
      setWeighedToggleBusyItemId(line.itemId);
      try {
        const updated = await setPosItemWeighed(line.itemId, next);
        setLines((prev) =>
          prev.map((l) => {
            if (l.itemId !== line.itemId) return l;
            let quantity = l.quantity;
            if (!updated.isWeighed) {
              quantity = Math.max(1, Math.round(l.quantity));
            } else {
              quantity = Number(formatCartQtyValue(l.quantity));
            }
            return {
              ...l,
              quantity,
              isWeighed: updated.isWeighed,
              unitName: updated.isWeighed
                ? "kg"
                : updated.unitType?.trim() || l.unitName,
            };
          }),
        );
        setHits((prev) =>
          prev.map((h) =>
            h.id === line.itemId
              ? {
                  ...h,
                  isWeighed: updated.isWeighed,
                  ...(updated.unitType
                    ? { unitType: updated.unitType }
                    : {}),
                }
              : h,
          ),
        );
        setDepartmentCatalog((prev) =>
          prev.map((h) =>
            h.id === line.itemId
              ? {
                  ...h,
                  isWeighed: updated.isWeighed,
                  ...(updated.unitType
                    ? { unitType: updated.unitType }
                    : {}),
                }
              : h,
          ),
        );
        toast.success(
          updated.isWeighed
            ? "Marked as weighted — tap the scissors to sell a half"
            : "Weighted selling cleared",
        );
        scheduleDraftSync();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not update weighted setting",
        );
      } finally {
        setWeighedToggleBusyItemId(null);
      }
    },
    [allowWeighedToggle, online, lines, scheduleDraftSync],
  );

  const removeLine = useCallback(
    (key: string) => {
      const removed = lines.find((l) => l.key === key);
      setLines((prev) => prev.filter((l) => l.key !== key));
      if (removed?.serverLineId) {
        const serverLineId = removed.serverLineId;
        setDraftState((prev) => ({
          ...prev,
          removedServerLineIds: Array.from(
            new Set([...prev.removedServerLineIds, serverLineId]),
          ),
        }));
      }
      scheduleDraftSync();
    },
    [lines, scheduleDraftSync],
  );

  const beginNewSale = useCallback(() => {
    if (draftSyncTimer.current != null) {
      window.clearTimeout(draftSyncTimer.current);
      draftSyncTimer.current = null;
    }
    setLines([]);
    setGeneratedInvoice(null);
    setError(null);
    setDraftState(createGroceryDraftState());
    setCartPanelTab("sale");
  }, []);

  const clearCart = useCallback(() => {
    beginNewSale();
  }, [beginNewSale]);

  const dismissForwardedInvoice = useCallback((invoiceId: string) => {
    setForwardedInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    setGeneratedInvoice((current) =>
      current?.id === invoiceId ? null : current,
    );
  }, []);

  const viewForwardedInvoice = useCallback((invoice: GroceryInvoiceResponse) => {
    setGeneratedInvoice(invoice);
  }, []);

  const voidForwardedInvoice = useCallback(
    (invoice: GroceryInvoiceResponse) => {
      if (!canVoidForwarded) {
        toast.error("You cannot void this invoice.");
        return;
      }
      showThemedConfirmToast({
        id: `void-forwarded-invoice-${invoice.id}`,
        title: `Void ${invoice.barcodeCode}?`,
        description:
          "This voids the invoice for every till — cashiers will lose the tab and cannot resume it.",
        confirmLabel: "Void invoice",
        confirmVariant: "destructive",
        onConfirm: async () => {
          setVoidingForwardedId(invoice.id);
          try {
            await cancelGroceryInvoice(invoice.id, {
              reason: "Voided from forwarded list",
            });
            dismissForwardedInvoice(invoice.id);
            toast.success(`Invoice ${invoice.barcodeCode} voided`, {
              description: "Cleared from cashiers — it will not return.",
            });
          } catch (e) {
            toastCaughtGroceryError(e, "Could not void invoice");
          } finally {
            setVoidingForwardedId(null);
          }
        },
      });
    },
    [canVoidForwarded, dismissForwardedInvoice],
  );

  // Hydrate active draft on load when draft persistence is enabled.
  useEffect(() => {
    if (!groceryDraftPersistence || !online || !branchId || draftHydratedRef.current) return;
    draftHydratedRef.current = true;
    listGroceryDrafts({
      branchId,
      status: "building",
      createdBy: effectiveMe?.id,
      hoursBack: 48,
    })
      .then(async (list) => {
        if (list.drafts.length === 0) return;
        const mostRecent = list.drafts[0];
        if (!mostRecent) return;
        const draft = await fetchGroceryDraft(mostRecent.id);
        const applied = applyGroceryDraftToLines(lines, draft);
        setLines(applied.lines);
        setDraftState(applied.state);
      })
      .catch(() => {
        // Ignore hydration errors; clerk can continue with a fresh cart.
      });
  }, [groceryDraftPersistence, online, branchId, effectiveMe?.id]);

  // ── Generate invoice ─────────────────────────────────────────────

  const onGenerate = useCallback(async () => {
    const bid = branchId.trim();
    if (!bid) {
      setError("Select a branch first.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one item.");
      return;
    }

    if (counterMode === "spoils") {
      setLoading(true);
      setError(null);
      let ok = 0;
      try {
        const remaining = [...lines];
        while (remaining.length > 0) {
          const line = remaining[0]!;
          const cost =
            line.unitCost != null && line.unitCost > 0
              ? line.unitCost
              : line.unitPrice > 0
                ? line.unitPrice
                : 0.01;
          await postStandaloneWastage({
            branchId: bid,
            itemId: line.itemId,
            quantity: line.quantity,
            unitCost: cost,
            reason: "Grocery counter spoil",
            wastageReason: "SPOILAGE",
          });
          remaining.shift();
          ok += 1;
          setLines([...remaining]);
        }
        setParkedSpoils(null);
        toast.success(ok === 1 ? "Spoil recorded" : `${ok} spoils recorded`, {
          description: "Stock written off as spoilage.",
        });
        setShowCartDrawer(false);
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Could not record spoils";
        const prefix =
          ok > 0
            ? `${ok} recorded, then failed: `
            : "";
        setError(prefix + msg);
        toast.error(prefix + msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    const missingPrices = lines.filter((l) => !l.unitPrice || l.unitPrice <= 0);
    if (missingPrices.length > 0) {
      setError("All items need a price. Tap items in the cart to set prices.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let invoice: GroceryInvoiceResponse;

      if (groceryDraftPersistence) {
        // Ensure any pending sync completes before issuing.
        if (draftSyncTimer.current) {
          window.clearTimeout(draftSyncTimer.current);
          draftSyncTimer.current = null;
        }
        const synced = await syncGroceryDraftToServer(lines, draftState, bid);
        setLines(synced.lines);
        setDraftState(synced.state);

        const issueResult = await issueGroceryDraftFromState(
          synced.lines,
          synced.state,
          { expectedVersion: synced.state.version },
        );
        if (!issueResult.ok) {
          throw new Error(issueResult.message);
        }
        invoice = issueResult.result.invoice;
      } else {
        invoice = await createGroceryInvoice({
          branchId: bid,
          lines: lines.map((l) => ({
            itemId: l.itemId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            unitName: l.unitName || undefined,
          })),
        });
      }

      if (draftSyncTimer.current != null) {
        window.clearTimeout(draftSyncTimer.current);
        draftSyncTimer.current = null;
      }
      setLines([]);
      setDraftState(createGroceryDraftState());
      setParkedSell(null);
      setForwardedInvoices((prev) => {
        if (prev.some((inv) => inv.id === invoice.id)) return prev;
        return [invoice, ...prev];
      });
      setCartPanelTab("forwarded");
      setGeneratedInvoice(invoice);
      // Nudge the server-aggregated top-products to refresh so newly
      // popular items climb the list immediately.
      setTopProductsReloadKey((n) => n + 1);
      toast.success("Invoice created!", {
        description: `Barcode: ${invoice.barcodeCode}`,
        duration: 6_000,
      });
      setShowCartDrawer(false);
    } catch (e) {
      const msg =
        e instanceof GroceryApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Failed to create invoice";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [branchId, lines, groceryDraftPersistence, draftState, counterMode]);

  const onNewInvoice = useCallback(() => {
    beginNewSale();
    setSearch("");
    setHits([]);
  }, [beginNewSale]);

  const applyStockEdit = useCallback(
    (itemId: string, qty: number) => {
      const patch = (list: ItemSummaryRecord[]) =>
        list.map((row) =>
          row.id === itemId ? { ...row, stockQty: qty } : row,
        );
      setDepartmentCatalog(patch);
      setHits(patch);
      const source =
        stockEditItem?.id === itemId
          ? stockEditItem
          : departmentCatalog.find((r) => r.id === itemId) ??
            hits.find((r) => r.id === itemId);
      const label = source
        ? cashierItemPrimaryLabel(source)
        : "Item";
      setLastStockEdit({ label, qty });
      toast.success(`${label} set to ${qty.toLocaleString("en-KE")}.`);
    },
    [departmentCatalog, hits, stockEditItem],
  );

  const applyProductImage = useCallback(
    (itemId: string, imageUrl: string) => {
      const patch = (list: ItemSummaryRecord[]) =>
        list.map((row) =>
          row.id === itemId
            ? { ...row, thumbnailUrl: imageUrl, imageKey: imageUrl }
            : row,
        );
      setDepartmentCatalog(patch);
      setHits(patch);
    },
    [],
  );

  useEffect(() => {
    if (!canEditProductImages && imageEditMode) {
      setImageEditMode(false);
    }
  }, [canEditProductImages, imageEditMode]);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="grocery-app-root relative flex h-[100dvh] min-h-0 w-full flex-col">
      <div
        className={cn(
          "grocery-app-stage grocery-workspace grocery-market-paper relative flex min-h-0 w-full flex-1 flex-col overflow-hidden touch-manipulation",
        )}
        style={
          {
            "--grocery-tab-clearance": GROCERY_TAB_BAR_CLEARANCE,
          } as CSSProperties
        }
      >
      {/* ── App header ── */}
      <header className="relative z-30 shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white pt-[env(safe-area-inset-top,0px)] text-[var(--order-ink,#15231f)]">
        <div className="relative flex items-center justify-between gap-2 px-3 py-1 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white">
              <TenantLogo
                brand={tenantTitle}
                logoUrl={business?.branding?.logoUrl}
                faviconUrl={business?.branding?.faviconUrl}
                primaryColor={primaryColor}
                variant="sidebar-mark"
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-[15px] font-semibold leading-tight tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
                {groceryModeTitle(counterMode)}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
                <span className="truncate font-medium">{tenantTitle}</span>
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">
                    {branchesLoading
                      ? "Loading…"
                      : activeBranchName || "Select branch"}
                  </span>
                </span>
                {activeDepartmentLabel ? (
                  <span className="inline-flex items-center gap-1 border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] pl-2">
                    {activeDepartmentLabel}
                  </span>
                ) : null}
                {activeRestockRun?.runId ? (
                  <Link
                    href={`/inventory/restock-digest/${activeRestockRun.runId}${canReviewDigest ? "" : "/prep"}`}
                    title={`Tonight's list — ${activeRestockRun.lineCount} items`}
                    className="inline-flex max-w-full items-center gap-1 border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] pl-2 font-semibold text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
                  >
                    <ClipboardList className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">Tonight&apos;s list</span>
                    <span className="rounded-none border border-[var(--pos-primary,#0f766e)] px-1 text-[10px] font-bold tabular-nums">
                      {activeRestockRun.lineCount}
                    </span>
                  </Link>
                ) : null}
                {cashierName ? (
                  <span className="hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] pl-2 sm:inline">
                    {cashierName}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
            <GroceryModeSwitcher
              mode={counterMode}
              modes={availableModes}
              onChange={switchCounterMode}
              className="order-2 w-full sm:order-1 sm:w-auto"
            />
            <div className="order-1 flex shrink-0 items-center gap-1 sm:order-2">
            {allowGroceryOrderPad ? (
              <button
                type="button"
                onClick={() => setOrderPadOpen(true)}
                title="Order"
                className="inline-flex h-8 items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 text-[11px] font-semibold text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)] transition-colors hover:text-[var(--order-ink,#15231f)]"
              >
                <ShoppingBasket className="size-3" aria-hidden />
                <span className="hidden min-[420px]:inline">Order</span>
              </button>
            ) : null}
            {allowGroceryOrderConfirm ? (
              <button
                type="button"
                onClick={() => setOrderConfirmOpen(true)}
                title="Confirm orders"
                className="inline-flex h-8 items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 text-[11px] font-semibold text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)] transition-colors hover:text-[var(--order-ink,#15231f)]"
              >
                <ClipboardCheck className="size-3" aria-hidden />
                <span className="hidden min-[420px]:inline">Confirm</span>
              </button>
            ) : null}
            {canEditProductImages ? (
              <button
                type="button"
                onClick={() => setImageEditMode((v) => !v)}
                aria-pressed={imageEditMode}
                title={
                  imageEditMode
                    ? "Turn off photo editing"
                    : "Update product photos"
                }
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-none border bg-white px-2 text-[11px] font-semibold transition-colors",
                  imageEditMode
                    ? "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)] hover:text-[var(--order-ink,#15231f)]",
                )}
              >
                <ImagePlus className="size-3" aria-hidden />
                <span className="hidden min-[420px]:inline">
                  {imageEditMode ? "Photos on" : "Photos"}
                </span>
              </button>
            ) : null}
            <LiveClock />
            <span
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 text-[11px] font-semibold",
                online
                  ? "text-[var(--pos-primary,#0f766e)]"
                  : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  online ? "bg-[var(--pos-primary,#0f766e)]" : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_35%,transparent)]",
                )}
              />
              <span className="hidden min-[380px]:inline">
                {online ? "Online" : "Offline"}
              </span>
            </span>
            <RealtimeConnectionIndicator className="h-8 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0 text-[11px] font-semibold normal-case tracking-normal" />
            <button
              type="button"
              disabled={counterLocked}
              onClick={() => lockCounter({ reason: "manual" })}
              className="inline-flex h-8 items-center gap-1 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 text-[11px] font-semibold text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)] transition-colors hover:text-[var(--order-ink,#15231f)] disabled:opacity-50"
              aria-label="Lock counter"
            >
              <LockKeyhole className="size-3" aria-hidden />
              <span className="hidden min-[380px]:inline">Lock</span>
            </button>
            </div>
          </div>
        </div>
      </header>

      <BranchRequiredBanner />

      {/* ── Error Toast ── */}
      {error && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-none border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive sm:mx-5">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="flex size-7 shrink-0 items-center justify-center rounded-none transition-colors hover:bg-red-200/60 active:scale-90 dark:hover:bg-red-900/40"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Split View ── */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-row">
        {/* ── FIRST COLUMN: Counter QWERTY keyboard (md+) ── */}
        {keyboardOpen && (
          <div className="hidden min-h-0 w-[24rem] shrink-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white md:flex lg:w-[26rem] xl:w-[28rem]">
            <CounterKeyboard
              value={search}
              onChange={setSearch}
              onClose={() => setKeyboardOpen(false)}
              className="border-l-0 border-r-0 shadow-none"
            />
          </div>
        )}
        {/* ── LEFT: Product Browser ── */}
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            keyboardOpen
              ? "md:w-auto lg:w-auto xl:w-auto"
              : "md:w-[58%] md:flex-none lg:w-[60%] xl:w-[62%]",
          )}
        >
          {/* Sticky search */}
          <div className="sticky top-0 z-20 shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-3 py-1.5 sm:px-4">
            <div className="flex items-center gap-1.5">
              <div className="group relative flex h-10 flex-1 items-center gap-2 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white pl-3 pr-1.5 focus-within:border-[var(--pos-primary,#0f766e)] sm:pl-3.5">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="search"
                  inputMode={!useSystemKeyboard && keyboardOpen ? "none" : "search"}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => {
                    if (!useSystemKeyboard) setKeyboardOpen(true);
                  }}
                  placeholder={
                    activeDepartmentLabel
                      ? `Search ${activeDepartmentLabel}, scan barcode…`
                      : "Search products, scan barcode…"
                  }
                  className="h-full flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                  autoComplete="off"
                  aria-label="Search products"
                />
                {/* ⌘K hint */}
                <kbd
                  aria-hidden
                  className="mr-1 hidden h-6 select-none items-center gap-0.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-1.5 text-[10px] font-medium text-muted-foreground md:inline-flex"
                >
                  <Command className="size-3" />K
                </kbd>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="ml-0.5 flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-none bg-[var(--pos-primary,#0f766e)] px-3 text-[12px] font-semibold text-[var(--pos-primary-ink,#fff)] transition-colors hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_88%,#000)]"
                  aria-label="Scan barcode"
                >
                  <ScanLine className="size-[17px]" strokeWidth={2.25} />
                  <span className="hidden md:inline">Scan</span>
                </button>
              </div>
              {!useSystemKeyboard ? (
                <button
                  type="button"
                  onClick={() => setKeyboardOpen((v) => !v)}
                  aria-pressed={keyboardOpen}
                  aria-label={keyboardOpen ? "Close on-screen keyboard" : "Open on-screen keyboard"}
                  className={cn(
                    "flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-none border bg-white px-2.5 text-[12px] font-semibold transition-colors sm:px-3",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
                    "touch-manipulation select-none",
                    keyboardOpen
                      ? "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]"
                      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)] hover:text-[var(--order-ink,#15231f)]",
                  )}
                >
                  <Keyboard className="size-[17px]" strokeWidth={2.25} />
                  <span className="hidden min-[420px]:inline">
                    {keyboardOpen ? "Close" : "Keyboard"}
                  </span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  const next = !useSystemKeyboard;
                  setUseSystemKeyboard(next);
                  if (next) setKeyboardOpen(false);
                }}
                aria-pressed={useSystemKeyboard}
                aria-label={
                  useSystemKeyboard
                    ? "Using the device keyboard — tap to use the counter keypad"
                    : "Use the device's default on-screen keyboard instead"
                }
                title="Use the device's default on-screen keyboard"
                className={cn(
                  "flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-none border bg-white px-2.5 text-[12px] font-semibold transition-colors sm:px-3",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
                  "touch-manipulation select-none",
                  useSystemKeyboard
                    ? "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]"
                    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)] hover:text-[var(--order-ink,#15231f)]",
                )}
              >
                <MonitorSmartphone className="size-[17px]" strokeWidth={2.25} />
                <span className="hidden min-[480px]:inline">
                  {useSystemKeyboard ? "System on" : "System"}
                </span>
              </button>
            </div>
          </div>

          {/* Scrollable Product Area */}
          <div
            className="relative flex min-h-0 flex-1"
            style={{ paddingBottom: `max(1rem, ${GROCERY_TAB_BAR_CLEARANCE})` }}
          >
            {showDepartmentRail ? (
              <div className="pointer-events-none absolute bottom-2 left-2 top-2 z-20 hidden sm:block">
                <GroceryDepartmentRail
                  departments={itemTypes}
                  selectedId={selectedDepartmentId}
                  onSelect={setSelectedDepartmentId}
                  className="h-full max-h-full"
                />
              </div>
            ) : null}

            <div
              className={cn(
                "grocery-scroll-thick relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-2 sm:px-4 md:pb-4",
                showDepartmentRail && "sm:pl-14",
              )}
            >
            {showDepartmentRail ? (
              <div className="mb-3 sm:hidden">
                <GroceryDepartmentRail
                  departments={itemTypes}
                  selectedId={selectedDepartmentId}
                  onSelect={setSelectedDepartmentId}
                  className="w-full max-w-none flex-row flex-wrap justify-start gap-1.5 p-1.5 [&_button]:min-h-9 [&_button]:w-auto [&_button]:min-w-[4.5rem] [&_button]:flex-row [&_button]:px-2.5 [&_button]:py-1.5 [&_button_span]:max-h-none [&_button_span]:text-[10px] [&_button_span]:normal-case [&_button_span]:[writing-mode:horizontal-tb]"
                />
              </div>
            ) : null}

            {/* Top fade for scroll cue */}
            <span
              aria-hidden
              className="pointer-events-none sticky top-0 z-[1] -mb-2 block h-3 w-full bg-gradient-to-b from-white to-transparent"
            />

            {/* Search results */}
            {hasSearch && (
              <section className="mb-6">
                {hits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-none border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_20%,transparent)] py-12 text-center">
                    <Search className="mb-3 size-8 text-muted-foreground/50" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-foreground">
                      {searchBanner ?? "No items match your search."}
                    </p>
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                      Try a different term or use Scan for barcodes.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {hits.map((item) => {
                      const d = lineDataByItem.get(item.id);
                      return (
                        <ProductCard
                          key={item.id}
                          item={item}
                          shelfLine={tileShelfLine(
                            online,
                            tileShelfPrices,
                            item.id,
                          )}
                          onPick={() => addLine(item)}
                          cartQty={d?.qty ?? 0}
                          cartLineTotal={d?.total ?? 0}
                          currency={currency}
                          showOnHand={counterMode === "stockEdit"}
                          canEditImage={imageEditMode}
                          onImageUploaded={applyProductImage}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Catalog browse */}
            {showCatalog && (
              <section className="mb-6">
                {!online ? (
                  <div className="rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-4 py-10 text-center">
                    <WifiOff className="mx-auto mb-2 size-6 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">
                      Offline
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedDepartment
                        ? `Reconnect to load ${activeDepartmentLabel}.`
                        : "Reconnect to load products."}
                    </p>
                  </div>
                ) : browseCatalog.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-none border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_20%,transparent)] py-12 text-center">
                    <ShoppingBasket className="mb-3 size-8 text-muted-foreground/50" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-foreground">
                      {departmentCatalogLoading
                        ? selectedDepartment
                          ? `Loading ${activeDepartmentLabel}…`
                          : "Loading products…"
                        : selectedDepartment
                          ? `No products in ${activeDepartmentLabel}`
                          : "No products available"}
                    </p>
                    {!departmentCatalogLoading && !selectedDepartment ? (
                      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                        Products from your assigned departments will appear here.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {browseCatalog.map((item) => {
                      const d = lineDataByItem.get(item.id);
                      return (
                        <ProductCard
                          key={item.id}
                          item={item}
                          shelfLine={tileShelfLine(
                            online,
                            tileShelfPrices,
                            item.id,
                          )}
                          onPick={() => addLine(item)}
                          cartQty={d?.qty ?? 0}
                          cartLineTotal={d?.total ?? 0}
                          currency={currency}
                          showOnHand={counterMode === "stockEdit"}
                          canEditImage={imageEditMode}
                          onImageUploaded={applyProductImage}
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {keyboardOpen && (
              <div aria-hidden className="h-[23rem] md:hidden" />
            )}

            </div>
          </div>
        </div>

        {/* ── RIGHT: Cart side panel (iPad md+) ── */}
        <aside
          className={cn(
            "hidden shrink-0 flex-col border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white md:flex",
            keyboardOpen
              ? "md:w-[22rem] lg:w-[24rem] xl:w-[26rem]"
              : "md:w-[42%] lg:w-[40%] xl:w-[38%]",
            "relative pb-[var(--grocery-tab-clearance)]",
          )}
        >
          {counterMode === "stockIn" ? (
            <GroceryStockInPanel
              onOpenTill={(supplier) => {
                setReceiveTillSupplier(supplier);
                setReceiveTillOpen(true);
              }}
            />
          ) : counterMode === "stockEdit" ? (
            <GroceryStockEditPanel
              lastLabel={lastStockEdit?.label}
              lastQty={lastStockEdit?.qty}
            />
          ) : (
            <>
              {counterMode === "sell" ? (
                <GroceryCartTabs
                  activeTab={cartPanelTab}
                  onTabChange={setCartPanelTab}
                  forwardedCount={forwardedInvoices.length}
                />
              ) : null}
              {counterMode === "sell" && cartPanelTab !== "sale" ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <GroceryForwardedInvoicesPanel
                    invoices={forwardedInvoices}
                    onDismiss={dismissForwardedInvoice}
                    onViewInvoice={viewForwardedInvoice}
                    onVoidInvoice={voidForwardedInvoice}
                    voidingId={voidingForwardedId}
                    canVoid={canVoidForwarded}
                    currency={currency}
                  />
                </div>
              ) : (
                <GroceryInvoiceCart
                  lines={lines}
                  onUpdateLine={updateLine}
                  onRemoveLine={removeLine}
                  onToggleWeighed={
                    counterMode === "sell" ? toggleLineWeighed : undefined
                  }
                  allowWeighedToggle={
                    counterMode === "sell" && allowWeighedToggle
                  }
                  weighedToggleBusyItemId={weighedToggleBusyItemId}
                  onGenerate={onGenerate}
                  onClearCart={clearCart}
                  loading={loading}
                  subtotal={subtotal}
                  grandTotal={grandTotal}
                  currency={currency}
                  branchName={activeBranchName}
                  cashierName={cashierName}
                  online={online}
                  pulseSignal={cartPulse}
                  recentlyAddedKey={recentlyAddedKey}
                  counterNumber={
                    counterMode === "sell" && showCounterNumber
                      ? draftState.counterNumber
                      : null
                  }
                  syncStatus={
                    counterMode === "sell" && groceryDraftPersistence
                      ? draftState.syncStatus
                      : "idle"
                  }
                  mode={counterMode === "spoils" ? "spoils" : "sell"}
                />
              )}
            </>
          )}
        </aside>
      </div>

      {/* ── Phone: floating cart dock above tab bar ── */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-[var(--grocery-tab-clearance)] sm:px-4 md:hidden",
          keyboardOpen && "hidden",
        )}
        style={
          {
            "--grocery-tab-clearance": GROCERY_TAB_BAR_CLEARANCE,
          } as CSSProperties
        }
      >
        <div className="pointer-events-auto relative mx-auto flex max-w-3xl items-center gap-2">
          {!isEmptyCart && (
            <button
              type="button"
              onClick={() => {
                setCartPanelTab("sale");
                setShowCartDrawer(true);
              }}
              className="flex h-11 flex-1 items-center gap-3 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white pl-3 pr-3"
            >
              <span className="relative flex size-8 shrink-0 items-center justify-center rounded-none border border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]">
                <ShoppingBasket className="size-4" strokeWidth={2.25} />
                <span className="absolute -right-1.5 -top-1.5 flex min-w-[1.1rem] items-center justify-center rounded-none border border-[var(--pos-primary,#0f766e)] bg-white px-1 text-[9px] font-semibold leading-none tabular-nums text-[var(--pos-primary,#0f766e)]">
                  {cartItemCount}
                </span>
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
                  {cartItemCount} item{cartItemCount === 1 ? "" : "s"}
                </p>
                <p className="truncate font-heading text-[14px] font-semibold tabular-nums tracking-[-0.03em] text-[var(--pos-primary,#0f766e)]">
                  {formatShelfPriceLabel(grandTotal, currency) ??
                    `${currency} ${grandTotal.toFixed(2)}`}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          )}

          <button
            type="button"
            onClick={
              isEmptyCart
                ? () => {
                    setCartPanelTab(
                      forwardedInvoices.length > 0 ? "forwarded" : "sale",
                    );
                    setShowCartDrawer(true);
                  }
                : onGenerate
            }
            disabled={loading}
            className={cn(
              "flex h-11 shrink-0 items-center justify-center gap-2 rounded-none px-4 text-[13px] font-semibold sm:px-5",
              "transition-colors active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
              "disabled:pointer-events-none disabled:opacity-50",
              isEmptyCart
                ? "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[var(--order-ink,#15231f)]"
                : "bg-[var(--pos-primary,#0f766e)] text-[var(--pos-primary-ink,#fff)] hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_88%,#000)]",
              isEmptyCart && "flex-1",
            )}
          >
            {loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                <span className="hidden sm:inline">Processing…</span>
              </>
            ) : isEmptyCart ? (
              <>
                <ShoppingBasket className="size-[18px]" strokeWidth={2.25} />
                <span>
                  {forwardedInvoices.length > 0 ? "Forwarded" : "View Cart"}
                </span>
                {forwardedInvoices.length > 0 ? (
                  <span className="rounded-none border border-[var(--pos-primary,#0f766e)] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--pos-primary,#0f766e)]">
                    {forwardedInvoices.length}
                  </span>
                ) : null}
              </>
            ) : (
              <>
                <Receipt className="size-4" strokeWidth={2.25} />
                <span className="hidden sm:inline">Generate Invoice</span>
                <span className="sm:hidden">Generate</span>
                <span className="rounded-none bg-white/20 px-2 py-0.5 text-[11px] font-bold tabular-nums">
                  {cartItemCount}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Counter QWERTY keyboard — phones (floating panel) ── */}
      {keyboardOpen && (
        <div
          className="absolute inset-x-0 bottom-0 z-30 px-3 pb-[calc(var(--grocery-tab-clearance)+0.75rem)] sm:px-4 md:hidden"
          style={
            {
              "--grocery-tab-clearance": GROCERY_TAB_BAR_CLEARANCE,
            } as CSSProperties
          }
        >
          <div className="mx-auto flex h-[22rem] w-full max-w-lg flex-col">
            <CounterKeyboard
              value={search}
              onChange={setSearch}
              onClose={() => setKeyboardOpen(false)}
              className="flex-1"
            />
          </div>
        </div>
      )}

      {/* ── Cart drawer (phones only) ── */}
      {showCartDrawer && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Cart"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
            onClick={() => setShowCartDrawer(false)}
          />

          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 flex max-h-[88vh] flex-col",
              "rounded-t-none border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white",
              "animate-in slide-in-from-bottom duration-300",
              "dark:bg-card",
            )}
          >
            <div className="flex justify-center pt-2 pb-1">
              <div className="h-0.5 w-10 bg-[color-mix(in_srgb,var(--order-ink,#15231f)_22%,transparent)]" />
            </div>

            {counterMode === "stockIn" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <GroceryStockInPanel
                  onOpenTill={(supplier) => {
                    setReceiveTillSupplier(supplier);
                    setReceiveTillOpen(true);
                    setShowCartDrawer(false);
                  }}
                />
              </div>
            ) : counterMode === "stockEdit" ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <GroceryStockEditPanel
                  lastLabel={lastStockEdit?.label}
                  lastQty={lastStockEdit?.qty}
                />
              </div>
            ) : (
              <>
                {counterMode === "sell" ? (
                  <GroceryCartTabs
                    activeTab={cartPanelTab}
                    onTabChange={setCartPanelTab}
                    forwardedCount={forwardedInvoices.length}
                  />
                ) : null}
                {counterMode === "sell" && cartPanelTab !== "sale" ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <GroceryForwardedInvoicesPanel
                      invoices={forwardedInvoices}
                      onDismiss={dismissForwardedInvoice}
                      onViewInvoice={viewForwardedInvoice}
                      onVoidInvoice={voidForwardedInvoice}
                      voidingId={voidingForwardedId}
                      canVoid={canVoidForwarded}
                      currency={currency}
                    />
                    <div className="border-t border-border px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setShowCartDrawer(false)}
                        className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-foreground"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  <GroceryInvoiceCart
                    lines={lines}
                    onUpdateLine={updateLine}
                    onRemoveLine={removeLine}
                    onToggleWeighed={
                      counterMode === "sell" ? toggleLineWeighed : undefined
                    }
                    allowWeighedToggle={
                      counterMode === "sell" && allowWeighedToggle
                    }
                    weighedToggleBusyItemId={weighedToggleBusyItemId}
                    onGenerate={onGenerate}
                    onClearCart={clearCart}
                    loading={loading}
                    subtotal={subtotal}
                    grandTotal={grandTotal}
                    currency={currency}
                    branchName={activeBranchName}
                    cashierName={cashierName}
                    online={online}
                    pulseSignal={cartPulse}
                    recentlyAddedKey={recentlyAddedKey}
                    compact
                    onClose={() => setShowCartDrawer(false)}
                    counterNumber={
                      counterMode === "sell" && showCounterNumber
                        ? draftState.counterNumber
                        : null
                    }
                    syncStatus={
                      counterMode === "sell" && groceryDraftPersistence
                        ? draftState.syncStatus
                        : "idle"
                    }
                    mode={counterMode === "spoils" ? "spoils" : "sell"}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Barcode Scanner Overlay ── */}
      {showScanner && (
        <BarcodeScanner
          onScan={(barcode) => {
            setSearch(barcode);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ── Success Modal ── */}
      {generatedInvoice && (
        <GroceryInvoiceSuccess
          invoice={generatedInvoice}
          onNewInvoice={onNewInvoice}
          onClose={() => setGeneratedInvoice(null)}
          currency={currency}
        />
      )}

      <CashierReceiveTillDrawer
        open={receiveTillOpen}
        onOpenChange={(open) => {
          setReceiveTillOpen(open);
          if (!open) setReceiveTillSupplier(null);
        }}
        supplierId={receiveTillSupplier?.id ?? null}
        supplierName={receiveTillSupplier?.name}
      />

      <TenantOrderDrawer
        open={orderPadOpen}
        onOpenChange={setOrderPadOpen}
        onOpenConfirm={
          allowGroceryOrderConfirm
            ? () => {
                setOrderPadOpen(false);
                setOrderConfirmOpen(true);
              }
            : undefined
        }
      />

      <CashierOrderConfirmDrawer
        open={orderConfirmOpen}
        onOpenChange={setOrderConfirmOpen}
      />

      <GroceryStockEditDialog
        open={stockEditItem != null}
        item={stockEditItem}
        branchId={branchId?.trim() ?? ""}
        allowMinStock={allowGroceryMinStock}
        allowParLevel={allowGroceryParLevel}
        onClose={() => setStockEditItem(null)}
        onSaved={applyStockEdit}
      />

      <GroceryAppBottomNav activeTab="counter" />
      </div>
    </div>
  );
}
