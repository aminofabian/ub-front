"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Banknote,
  BookOpen,
  Building2,
  Camera,
  CircleHelp,
  Clock,
  CreditCard,
  Lock,
  LockKeyhole,
  LayoutGrid,
  LogOut,
  MapPin,
  MoreHorizontal,
  PlusCircle,
  Receipt,
  RotateCcw,
  ScanLine,
  Settings2,
  ShoppingBag,
  Smartphone,
  Store,
  Table2,
  Trash2,
  UserRound,
  Wallet,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useOptionalPosTillLock } from "@/components/auth/pos-till-lock";
import { AirtimeQuickAction } from "@/components/airtime/airtime-quick-action";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { useDashboard } from "@/components/dashboard-provider";
import { TenantOrderDrawer } from "@/components/order/tenant-order-drawer";
import { OrderPadDrawer } from "@/components/order-pad/order-pad-drawer";
import { PosVariantPicker } from "@/components/cashier/pos-variant-picker";
import { CashierCartDrawer } from "@/components/cashier/cashier-cart-drawer";
import { CashierCreateProductModal } from "@/components/cashier/cashier-create-product-modal";
import { CashierCreditTabsModal } from "@/components/cashier/cashier-credit-tabs-modal";
import { CashierOrderConfirmDrawer } from "@/components/cashier/cashier-order-confirm-drawer";
import { CashierProductModal } from "@/components/cashier/cashier-product-modal";
import { CashierReceiveTillDrawer } from "@/components/cashier/cashier-receive-till-drawer";
import { CashierSuppliersModal } from "@/components/cashier/cashier-suppliers-modal";
import { CashierFirstSaleDrawer } from "@/components/cashier/cashier-first-sale-drawer";
import { PosSaleCompletePanel } from "@/components/cashier/pos-sale-complete-panel";
import { useFeatureFlag } from "@/components/providers/tenant-provider";
import {
  fetchItemById,
  fetchItems,
  logoutRemoteAndRedirectToLogin,
  type ItemSummaryRecord,
} from "@/lib/api";
import type { TopProductRecord } from "@/lib/top-products";
import { APP_ROUTES } from "@/lib/config";
import { POS_CASHIER_CAPABILITY_FLAGS } from "@/lib/pos-cashier-capabilities";
import { fetchPosShelfPrice } from "@/lib/pos-shelf-price";
import {
  formatShelfPriceLabel,
  shelfPriceToInputString,
  splitShelfPriceDisplay,
} from "@/lib/cashier-shelf-price";
import {
  isPosFamilyParent,
  isPosPackageSellRow,
  isPosSellableSku,
} from "@/lib/cashier-item-display";
import { buildStkPhoneNumber, isStkPhoneValid } from "@/lib/stk-phone";
import { tillDeviceDisplayName } from "@/lib/till-device";
import { isBranchLockedRole } from "@/lib/branch-access";
import { ALL_DEPARTMENTS_LABEL } from "@/hooks/use-session-scope";
import { usePosBarcodeWedge } from "@/hooks/use-pos-barcode-wedge";
import { useMediaLg } from "@/hooks/use-media-lg";
import { useMediaMd } from "@/hooks/use-media-md";
import { useCashierTemplate } from "@/hooks/use-cashier-template";
import { CASHIER_TEMPLATES } from "@/lib/cashier-templates";
import type { CashierMobileToolId } from "@/lib/cashier-mobile-events";
import {
  buildCashierTools,
  CASHIER_TOOL_ICONS,
  CASHIER_TOOL_SECTIONS,
} from "../cashier-pos-tools";
import { cn } from "@/lib/utils";

import type { CashierPosLayoutProps } from "../cashier-pos-layout";
import { LedgerBestSellers } from "./ledger-best-sellers";
import { LedgerFunctionBar } from "./ledger-function-bar";
import { LedgerKeypad } from "./ledger-keypad";
import { LedgerTabCustomer } from "./ledger-tab-customer";
import { MORE_ROW, MoreRow, MoreSection } from "./ledger-more-menu";
import { flattenLedgerSearchHits, LedgerSearchHits } from "./ledger-search-hits";
import {
  LedgerSheet,
  type LedgerCellField,
} from "./ledger-sheet";

type LedgerTab = "sale" | "held" | "receipts";
type KeyTarget = "sheet" | "tender";

function looksLikeScannedCode(raw: string): boolean {
  const t = raw.trim();
  if (t.length < 4) return false;
  if (/^GI-/i.test(t)) return true;
  const compact = t.replace(/[\s-]/g, "");
  if (/^\d{4,}$/.test(compact)) return true;
  return !/\s/.test(t) && /\d/.test(t) && /^[A-Za-z0-9._/-]+$/.test(t);
}

function lineTotal(qty: string, price: string): number {
  const q = Number(qty);
  const p = Number(price);
  if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p < 0) return 0;
  return Math.round(q * p * 100) / 100;
}

function appendToAmount(current: string, digit: string): string {
  if (digit === "." && current.includes(".")) return current;
  if (current === "0" && digit !== ".") return digit;
  return `${current}${digit}`;
}

function backspaceAmount(current: string): string {
  return current.slice(0, -1);
}

const CASH_QUICK_AMOUNTS = [50, 100, 200, 500, 1000] as const;

const HEADER_SELECT = cn(
  "h-7 max-w-[9.5rem] rounded-none border border-white/25 bg-card/10 px-2 text-[11px] font-medium",
  "text-inherit outline-none focus-visible:ring-2 focus-visible:ring-white/70",
  "disabled:opacity-50",
);

export function CashierLedgerLayout(props: CashierPosLayoutProps) {
  const {
    brandTheme,
    toolbarExtras,
    online,
    offlineBanner,
    currency,
    uiCopy,
    activeBranchName,
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
    topProductsLoading = false,
    topProductsTitle = "Top 24 best sellers",
    alwaysShowTopProducts = false,
    addLine,
    onAddAirtimeToCart,
    posShiftLinks,
    cartTabs,
    activeCartId,
    canCreateCart,
    onCreateCart,
    onSwitchCart,
    allowPriceEdit = false,
    allowCreateProduct = false,
    allowCreateSupplier = false,
    allowLinkSupplierProducts = false,
    allowReceiveSupply = false,
    allowCreditTabs = false,
    allowOrderPad = false,
    canWriteOrderPad = false,
    allowSupplierOrder = false,
    allowOrderConfirm = false,
    allowClearSale = true,
    allowClearAllSales = false,
    clearableSaleCount = 0,
    allowAirtime = false,
    allowNegativeStock = false,
    itemTypes = [],
    preferredItemTypeId = null,
    checkoutDrawerOpen,
    onCheckoutDrawerOpenChange,
    cart,
  } = props;

  const {
    me,
    business,
    branches,
    setBranchId,
    branchesLoading,
    itemTypes: dashItemTypes,
    itemTypeId,
    setItemTypeId,
    itemTypesLoading,
  } = useDashboard();
  const tillLock = useOptionalPosTillLock();
  const tillLocked = tillLock?.locked === true;
  const scanToCartEnabled = useFeatureFlag(POS_CASHIER_CAPABILITY_FLAGS.scanToCart);
  const roleKey = me?.role?.key?.trim().toLowerCase() ?? "";
  const showOwnerNav = roleKey !== "cashier";
  const branchLocked = isBranchLockedRole(roleKey);
  const currentBranch =
    branches.find((b) => b.id === branchId) ??
    branches.find((b) => b.name === activeBranchName);

  const [tillLabel, setTillLabel] = useState("");
  const [tab, setTab] = useState<LedgerTab>("sale");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<LedgerCellField>("code");
  const [keyTarget, setKeyTarget] = useState<KeyTarget>("sheet");
  const [moreOpen, setMoreOpen] = useState(false);
  /** Phone: the till column slides up as a panel over the line sheet. */
  const [payOpen, setPayOpen] = useState(false);
  const isMd = useMediaMd();
  const isLg = useMediaLg();
  const compactLines = !isMd;
  /**
   * The ledger hides the shelf's bottom nav, so this menu is the only route
   * back — the template switch lives here as well as in the shelf's More sheet.
   */
  const { preferred: templatePreference, setTemplate } =
    useCashierTemplate(branchId);
  /** True between tapping Complete and the request settling — closes the phone panel only on success. */
  const payAttemptRef = useRef(false);
  useEffect(() => {
    if (!payAttemptRef.current || cart.loading) return;
    payAttemptRef.current = false;
    if (!isLg && !cart.error) setPayOpen(false);
  }, [cart.loading, cart.error, isLg]);

  // Escape closes the phone payment panel, matching the sheets elsewhere in the till.
  useEffect(() => {
    if (isLg || !payOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPayOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLg, payOpen]);
  const [firstSaleOpen, setFirstSaleOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [discPctByKey, setDiscPctByKey] = useState<Record<string, string>>({});
  const [priceBaseByKey, setPriceBaseByKey] = useState<Record<string, number>>({});
  const [shelfPrices, setShelfPrices] = useState<Record<string, string>>({});
  const [pickedItem, setPickedItem] = useState<ItemSummaryRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [suppliersOpen, setSuppliersOpen] = useState(false);
  const [receiveTillOpen, setReceiveTillOpen] = useState(false);
  const [receiveTillSupplier, setReceiveTillSupplier] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [creditTabsOpen, setCreditTabsOpen] = useState(false);
  const [orderPadOpen, setOrderPadOpen] = useState(false);
  const [supplierOrderOpen, setSupplierOrderOpen] = useState(false);
  const [orderConfirmOpen, setOrderConfirmOpen] = useState(false);
  const [variantPicker, setVariantPicker] = useState<{
    parent: ItemSummaryRecord;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const barcodeBusyRef = useRef(false);
  const parentCheckCache = useRef(new Map<string, boolean>());

  /**
   * The shelf renders this same list as tiles in its till menu; the ledger
   * renders it as rows, so an action can never exist in one chrome and be
   * missing from the other.
   */
  const tillTools = useMemo(
    () =>
      buildCashierTools({
        allowCreditTabs,
        allowAirtime,
        allowOrderPad,
        allowCreateProduct,
        allowManageSuppliers:
          allowCreateSupplier || allowLinkSupplierProducts || allowReceiveSupply,
        allowSupplierOrder,
        allowOrderConfirm,
        posShiftLinks: posShiftLinks ?? null,
      }),
    [
      allowCreditTabs,
      allowAirtime,
      allowOrderPad,
      allowCreateProduct,
      allowCreateSupplier,
      allowLinkSupplierProducts,
      allowReceiveSupply,
      allowSupplierOrder,
      allowOrderConfirm,
      posShiftLinks,
    ],
  );

  const runTillTool = useCallback(
    (id: CashierMobileToolId) => {
      setMoreOpen(false);
      switch (id) {
        case "add-product":
          setCreateProductOpen(true);
          break;
        case "suppliers":
          setSuppliersOpen(true);
          break;
        case "credit-tabs":
          setCreditTabsOpen(true);
          break;
        case "order-pad":
          setOrderPadOpen(true);
          break;
        case "supplier-order":
          setSupplierOrderOpen(true);
          break;
        case "order-confirm":
          setOrderConfirmOpen(true);
          break;
        case "airtime":
          window.dispatchEvent(new Event("ub:open-airtime"));
          break;
        case "drawout":
          posShiftLinks?.onShortcut("new-drawout");
          break;
        case "open-shift":
          posShiftLinks?.onShortcut("open-shift");
          break;
        case "close-shift":
          posShiftLinks?.onShortcut("close-shift");
          break;
        default:
          break;
      }
    },
    [posShiftLinks],
  );
  const topIdsKey = topProducts.map((p) => p.id).join(",");
  const hitIdsKey = hits.map((h) => h.id).join(",");

  useEffect(() => {
    setTillLabel(tillDeviceDisplayName());
  }, []);

  useEffect(() => {
    if (cart.lastSale) setTab("receipts");
  }, [cart.lastSale]);

  const cashierName = me?.name?.trim() || me?.email?.trim() || "";
  const shopName = business?.name?.trim() || "Palmart";

  const sheetLines = useMemo(
    () =>
      cart.lines.map((line) => ({
        key: line.key,
        code: (line.item.sku || line.item.barcode || "").trim(),
        item: line.label,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discPct: discPctByKey[line.key] ?? "0",
        total: lineTotal(line.quantity, line.unitPrice),
      })),
    [cart.lines, discPctByKey],
  );

  const heldTabs = cartTabs.filter(
    (t) => t.id !== activeCartId && (t.kind === "held" || t.kind === "open"),
  );
  const activeTab = cartTabs.find((t) => t.id === activeCartId);
  const saleIndex = Math.max(1, cartTabs.findIndex((t) => t.id === activeCartId) + 1);
  const saleLabel = activeTab?.label?.startsWith("#")
    ? `Sale ${activeTab.label}`
    : `Sale ${saleIndex}`;

  const tenderNum = Number(cart.cashTenderStr.trim());
  const changeDue =
    cart.payMethod === "cash" &&
    Number.isFinite(tenderNum) &&
    tenderNum >= cart.payableTotal
      ? tenderNum - cart.payableTotal
      : 0;
  const cashShort =
    cart.payMethod === "cash" &&
    Number.isFinite(tenderNum) &&
    cart.payableTotal > 0 &&
    tenderNum < cart.payableTotal;
  const selectedLine = selectedKey
    ? sheetLines.find((l) => l.key === selectedKey)
    : null;
  const keypadTargetLabel =
    keyTarget === "tender"
      ? "cash received"
      : selectedLine && activeField === "qty"
        ? `qty · ${selectedLine.item}`
        : selectedLine && activeField === "price"
          ? `price · ${selectedLine.item}`
          : selectedLine && activeField === "disc"
            ? `discount · ${selectedLine.item}`
            : "find item";
  const keypadEnterLabel =
    keyTarget === "tender"
      ? cart.canCompleteSale
        ? "Pay"
        : "Enter"
      : selectedKey && activeField !== "code"
        ? "Next"
        : "Add";
  const completeIdle = cart.lines.length === 0 && cart.lastSale != null;

  const cartQtyByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cart.lines) {
      const n = Number(line.quantity);
      map.set(line.itemId, (map.get(line.itemId) ?? 0) + (Number.isFinite(n) ? n : 0));
    }
    return map;
  }, [cart.lines]);

  const focusSearch = useCallback(() => {
    setTab("sale");
    setSelectedKey(null);
    setActiveField("code");
    setKeyTarget("sheet");
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const markAdded = useCallback(() => {
    setSearch("");
    focusSearch();
  }, [focusSearch, setSearch]);

  const pickItem = useCallback(
    (item: ItemSummaryRecord, presetShelf?: string) => {
      if (isPosFamilyParent(item)) {
        setVariantPicker({ parent: item });
        return;
      }
      if (!isPosSellableSku(item)) {
        toast.error("This product is not for sale. Choose a size or flavour.");
        return;
      }
      const shelfLine = presetShelf ?? shelfPrices[item.id];
      const shelfAmount = shelfLine
        ? shelfPriceToInputString(splitShelfPriceDisplay(shelfLine).amount)
        : shelfPriceToInputString(item.bundlePrice);
      if (shelfAmount && online && !isPosPackageSellRow(item)) {
        const added = addLine(item, 1, shelfAmount);
        if (added) markAdded();
        return;
      }
      setPickedItem(item);
      setModalOpen(true);
    },
    [addLine, markAdded, online, shelfPrices],
  );

  const pickTopProduct = useCallback(
    (product: TopProductRecord) => {
      const item: ItemSummaryRecord = {
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
        stockQty: product.stockQty ?? undefined,
      };
      if (product.variantOfItemId?.trim()) {
        pickItem(item);
        return;
      }
      const cached = parentCheckCache.current.get(product.id);
      if (cached !== undefined) {
        if (cached) setVariantPicker({ parent: item });
        else pickItem(item);
        return;
      }
      if (!online || !branchId?.trim()) {
        pickItem(item);
        return;
      }
      void fetchItemById(product.id, { branchId: branchId.trim(), toast: false })
        .then((detail) => {
          const isParent = isPosFamilyParent(detail);
          parentCheckCache.current.set(product.id, isParent);
          if (isParent) setVariantPicker({ parent: item });
          else pickItem({ ...item, isSellable: detail.isSellable });
        })
        .catch(() => {
          parentCheckCache.current.delete(product.id);
          toast.error("Could not load this product. Search for a size to sell.");
        });
    },
    [pickItem, online, branchId],
  );

  useEffect(() => {
    if (!online) return;
    const ids = Array.from(
      new Set(
        [...topIdsKey.split(","), ...hitIdsKey.split(",")].filter(Boolean),
      ),
    );
    if (ids.length === 0) return;
    let cancelled = false;
    const bid = branchId?.trim() || undefined;
    const shelfCtx = { businessId, onStaleItem: onStalePosItem };
    void Promise.all(
      ids.map(async (id) => {
        const r = await fetchPosShelfPrice(id, bid, shelfCtx);
        if (!r) return [id, ""] as const;
        return [id, formatShelfPriceLabel(r.price, currency) ?? ""] as const;
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setShelfPrices((prev) => {
        const next = { ...prev };
        for (const [id, v] of pairs) next[id] = v;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [online, topIdsKey, hitIdsKey, branchId, businessId, currency, onStalePosItem]);

  const applyBarcodeSearch = useCallback(
    (code: string) => {
      if (tillLocked) return;
      const trimmed = code.trim();
      if (!trimmed) return;
      if (/^GI-/i.test(trimmed)) {
        setSearch(trimmed);
        focusSearch();
        return;
      }
      if (scanToCartEnabled && online && branchId && !barcodeBusyRef.current) {
        barcodeBusyRef.current = true;
        const bid = branchId.trim();
        void (async () => {
          try {
            const items = await fetchItems(undefined, {
              barcode: trimmed,
              catalogScope: "SKUS_ONLY",
              softAuth: true,
              branchId: bid,
            });
            const sellable = items.filter(isPosSellableSku);
            if (sellable.length === 1) {
              const item = sellable[0]!;
              const sp = await fetchPosShelfPrice(item.id, bid, {
                businessId,
                onStaleItem: onStalePosItem,
              });
              const label = sp ? formatShelfPriceLabel(sp.price, currency) ?? "" : "";
              if (label) setShelfPrices((prev) => ({ ...prev, [item.id]: label }));
              pickItem(item, label);
              return;
            }
            if (sellable.length === 0) toast.error("Barcode not found in catalog");
            setSearch(trimmed);
            focusSearch();
          } catch {
            toast.error("Could not look up barcode");
            setSearch(trimmed);
            focusSearch();
          } finally {
            barcodeBusyRef.current = false;
          }
        })();
        return;
      }
      setSearch(trimmed);
      focusSearch();
    },
    [
      tillLocked,
      scanToCartEnabled,
      online,
      branchId,
      businessId,
      onStalePosItem,
      currency,
      pickItem,
      setSearch,
      focusSearch,
    ],
  );

  usePosBarcodeWedge({
    enabled: !tillLocked && tab === "sale",
    onScan: applyBarcodeSearch,
    searchInputRef,
  });

  const commitEntry = useCallback(() => {
    const q = search.trim();
    if (!q) return;
    if (looksLikeScannedCode(q)) {
      applyBarcodeSearch(q);
      return;
    }
    const sellable = flattenLedgerSearchHits(hits).find(isPosSellableSku);
    if (sellable) {
      pickItem(sellable);
      return;
    }
    if (hits.length === 0) toast.message("No matching item");
  }, [search, hits, applyBarcodeSearch, pickItem]);

  const onLineChange = useCallback(
    (key: string, field: "quantity" | "unitPrice" | "disc", value: string) => {
      if (field === "quantity") {
        cart.updateLine(key, "quantity", value);
        return;
      }
      if (field === "unitPrice") {
        cart.updateLine(key, "unitPrice", value);
        setDiscPctByKey((prev) => ({ ...prev, [key]: "0" }));
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) {
          setPriceBaseByKey((prev) => ({ ...prev, [key]: n }));
        }
        return;
      }
      const line = cart.lines.find((l) => l.key === key);
      if (!line) return;
      const pct = Number(value);
      setDiscPctByKey((prev) => ({ ...prev, [key]: value }));
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) return;
      const current = Number(line.unitPrice);
      if (!Number.isFinite(current) || current < 0) return;
      const base = priceBaseByKey[key] ?? current;
      setPriceBaseByKey((prev) => ({ ...prev, [key]: base }));
      const next = Math.round(base * (1 - pct / 100) * 100) / 100;
      cart.updateLine(key, "unitPrice", next.toFixed(2));
    },
    [cart, priceBaseByKey],
  );

  const voidLine = useCallback(
    (key?: string) => {
      const target = key ?? selectedKey;
      if (!target) {
        toast.message("Select a line to remove");
        return;
      }
      cart.removeLine(target);
      if (selectedKey === target) setSelectedKey(null);
      focusSearch();
    },
    [selectedKey, cart, focusSearch],
  );

  const holdSale = useCallback(() => {
    if (cart.lines.length === 0) {
      toast.message("Nothing to hold");
      return;
    }
    if (!canCreateCart) {
      toast.error("Maximum open sales reached");
      return;
    }
    onCreateCart();
    setTab("sale");
    focusSearch();
  }, [cart.lines.length, canCreateCart, onCreateCart, focusSearch]);

  const recallSale = useCallback(() => {
    const next = heldTabs[0];
    if (!next) {
      toast.message("No held sales");
      setTab("held");
      return;
    }
    onSwitchCart(next.id);
    setTab("sale");
  }, [heldTabs, onSwitchCart]);

  const newSale = useCallback(() => {
    cart.onStartNewSale();
    setDiscPctByKey({});
    setPriceBaseByKey({});
    setTab("sale");
    focusSearch();
  }, [cart, focusSearch]);

  const focusPay = useCallback(() => {
    setTab("sale");
    setKeyTarget("tender");
    if (
      cart.payMethod !== "cash" &&
      cart.payMethod !== "mpesa_manual" &&
      cart.payMethod !== "card" &&
      cart.payMethod !== "customer_credit"
    ) {
      cart.setPayMethod("cash");
    }
  }, [cart]);

  const applyDigit = useCallback(
    (digit: string) => {
      if (keyTarget === "tender") {
        cart.setCashTenderStr(appendToAmount(cart.cashTenderStr || "", digit));
        return;
      }
      if (selectedKey && activeField === "qty") {
        const line = cart.lines.find((l) => l.key === selectedKey);
        if (line) onLineChange(selectedKey, "quantity", appendToAmount(line.quantity, digit));
        return;
      }
      if (selectedKey && activeField === "price" && allowPriceEdit) {
        const line = cart.lines.find((l) => l.key === selectedKey);
        if (line) onLineChange(selectedKey, "unitPrice", appendToAmount(line.unitPrice, digit));
        return;
      }
      if (selectedKey && activeField === "disc" && allowPriceEdit) {
        onLineChange(
          selectedKey,
          "disc",
          appendToAmount(discPctByKey[selectedKey] ?? "0", digit),
        );
        return;
      }
      setSearch(search + digit);
    },
    [keyTarget, selectedKey, activeField, allowPriceEdit, cart, onLineChange, discPctByKey, search, setSearch],
  );

  const applyBackspace = useCallback(() => {
    if (keyTarget === "tender") {
      cart.setCashTenderStr(backspaceAmount(cart.cashTenderStr));
      return;
    }
    if (selectedKey && activeField === "qty") {
      const line = cart.lines.find((l) => l.key === selectedKey);
      if (line) onLineChange(selectedKey, "quantity", backspaceAmount(line.quantity));
      return;
    }
    if (selectedKey && activeField === "price" && allowPriceEdit) {
      const line = cart.lines.find((l) => l.key === selectedKey);
      if (line) onLineChange(selectedKey, "unitPrice", backspaceAmount(line.unitPrice));
      return;
    }
    if (selectedKey && activeField === "disc" && allowPriceEdit) {
      onLineChange(selectedKey, "disc", backspaceAmount(discPctByKey[selectedKey] ?? ""));
      return;
    }
    setSearch(search.slice(0, -1));
  }, [keyTarget, selectedKey, activeField, allowPriceEdit, cart, onLineChange, discPctByKey, search, setSearch]);

  const applyClear = useCallback(() => {
    const clearFieldOnly = () => {
      if (keyTarget === "tender") {
        if (cart.cashTenderStr.trim()) {
          cart.setCashTenderStr("");
          return true;
        }
        return false;
      }
      if (selectedKey && activeField === "qty") {
        const line = cart.lines.find((l) => l.key === selectedKey);
        if (line?.quantity.trim()) {
          onLineChange(selectedKey, "quantity", "");
          return true;
        }
        return false;
      }
      if (selectedKey && activeField === "price" && allowPriceEdit) {
        const line = cart.lines.find((l) => l.key === selectedKey);
        if (line?.unitPrice.trim()) {
          onLineChange(selectedKey, "unitPrice", "");
          return true;
        }
        return false;
      }
      if (selectedKey && activeField === "disc" && allowPriceEdit) {
        const disc = discPctByKey[selectedKey] ?? "0";
        if (disc.trim() && disc.trim() !== "0") {
          onLineChange(selectedKey, "disc", "0");
          return true;
        }
        return false;
      }
      if (search.trim()) {
        setSearch("");
        return true;
      }
      return false;
    };

    // Admin override: when the keypad field is already empty, Clear voids every
    // open till tab. Otherwise it still clears the active field first.
    if (allowClearAllSales && cart.onClearSale) {
      if (clearFieldOnly()) return;
      if (clearableSaleCount > 0 || cart.lines.length > 0) {
        cart.onClearSale();
      }
      return;
    }

    if (keyTarget === "tender") {
      cart.setCashTenderStr("");
      return;
    }
    if (selectedKey && activeField === "qty") {
      onLineChange(selectedKey, "quantity", "");
      return;
    }
    if (selectedKey && activeField === "price" && allowPriceEdit) {
      onLineChange(selectedKey, "unitPrice", "");
      return;
    }
    if (selectedKey && activeField === "disc" && allowPriceEdit) {
      onLineChange(selectedKey, "disc", "0");
      return;
    }
    setSearch("");
  }, [
    allowClearAllSales,
    allowPriceEdit,
    cart,
    clearableSaleCount,
    discPctByKey,
    keyTarget,
    selectedKey,
    activeField,
    onLineChange,
    search,
    setSearch,
  ]);

  const applyEnter = useCallback(() => {
    if (keyTarget === "tender") {
      if (cart.canCompleteSale) cart.onComplete();
      return;
    }
    if (activeField === "code" || !selectedKey) {
      commitEntry();
      return;
    }
    if (activeField === "qty") setActiveField("price");
    else if (activeField === "price") setActiveField(allowPriceEdit ? "disc" : "qty");
    else setActiveField("qty");
  }, [keyTarget, activeField, selectedKey, cart, commitEntry, allowPriceEdit]);

  useEffect(() => {
    if (!moreOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [moreOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('[role="dialog"]')) return;
      if (e.key === "Escape" && moreOpen) {
        e.preventDefault();
        setMoreOpen(false);
        return;
      }
      if (e.key === "F1") {
        e.preventDefault();
        newSale();
      } else if (e.key === "F2") {
        e.preventDefault();
        holdSale();
      } else if (e.key === "F3") {
        e.preventDefault();
        voidLine();
      } else if (e.key === "F4") {
        e.preventDefault();
        focusSearch();
      } else if (e.key === "F5") {
        e.preventDefault();
        focusPay();
      } else if (e.key === "F6") {
        e.preventDefault();
        recallSale();
      } else if (e.key === "F12") {
        e.preventDefault();
        setMoreOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newSale, holdSale, voidLine, focusSearch, focusPay, recallSale, moreOpen]);

  const tabSuspended = Boolean(cart.selectedCustomer?.credit.creditSuspended);
  const captureCustomerSimple =
    Boolean(cart.captureCustomerForCashAndMpesa) &&
    Boolean(cart.canLookupCustomers) &&
    !cart.splitPay &&
    (cart.payMethod === "cash" || cart.payMethod === "mpesa_manual");
  const showCustomerPicker =
    cart.payMethod === "customer_credit" || captureCustomerSimple;
  const payMethods = [
    { id: "cash" as const, label: "Cash", icon: Banknote, disabled: false },
    { id: "mpesa_manual" as const, label: "M-Pesa", icon: Smartphone, disabled: false },
    { id: "card" as const, label: "Card", icon: CreditCard, disabled: false },
    ...(cart.canLookupCustomers
      ? [
          {
            id: "customer_credit" as const,
            label: "Tab",
            icon: UserRound,
            disabled: tabSuspended,
          },
        ]
      : []),
  ];

  return (
    <div
      className="pos-ledger relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[var(--pos-paper,#f1ece3)] text-[var(--pos-ink,#1c1915)] dark:bg-background dark:text-foreground"
      style={brandTheme}
    >
      <header className="flex shrink-0 flex-wrap items-center gap-2 bg-[var(--pos-primary)] px-3 py-1.5 text-[var(--pos-primary-ink,#fff)]">
        <div className="min-w-0">
          <p className="pos-market-section-label truncate text-[1.05rem] leading-none">
            {shopName}
          </p>
          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] opacity-80">
            {[tillLabel, cashierName].filter(Boolean).join(" · ")}
          </p>
        </div>
        {branchLocked ? (
          currentBranch ? (
            <span
              className="inline-flex h-7 max-w-[9.5rem] items-center gap-1 truncate rounded-none border border-white/25 bg-card/10 px-2 text-[11px] font-medium"
              title="Branch switching is disabled for your role"
            >
              <Lock className="size-3 shrink-0" aria-hidden />
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{currentBranch.name}</span>
            </span>
          ) : null
        ) : (
          <select
            className={HEADER_SELECT}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={branchesLoading || branches.length === 0}
            aria-label="Select branch"
          >
            {branches.length === 0 ? (
              <option value="">{branchesLoading ? "Loading…" : "No branches"}</option>
            ) : (
              <>
                {!branchId ? <option value="">Select branch…</option> : null}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </>
            )}
          </select>
        )}
        <select
          className={HEADER_SELECT}
          value={itemTypeId}
          onChange={(e) => setItemTypeId(e.target.value)}
          disabled={itemTypesLoading || dashItemTypes.length === 0}
          aria-label="Select department"
        >
          {dashItemTypes.length === 0 ? (
            <option value="">{itemTypesLoading ? "Loading…" : "No departments"}</option>
          ) : (
            <>
              <option value="">{ALL_DEPARTMENTS_LABEL}</option>
              {dashItemTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                  {t.isDefault ? " ★" : ""}
                </option>
              ))}
            </>
          )}
        </select>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold">
          {online ? <Wifi className="size-3.5" aria-hidden /> : <WifiOff className="size-3.5" aria-hidden />}
          {online ? "Online" : "Offline"}
        </span>
        <button
          type="button"
          disabled={tillLocked}
          onClick={() => tillLock?.lock({ reason: "manual" })}
          className="inline-flex h-7 items-center gap-1 rounded-none border border-white/25 bg-card/10 px-2 text-[11px] font-medium hover:bg-card/20 disabled:opacity-40"
        >
          <LockKeyhole className="size-3.5" aria-hidden />
          Lock
        </button>
      </header>

      {offlineBanner ? (
        <p className="shrink-0 bg-amber-100 px-3 py-1 text-[11px] text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          {offlineBanner}
        </p>
      ) : null}

      {toolbarExtras ? (
        <div className="flex shrink-0 items-center justify-end gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-card px-3 py-1 dark:border-border/40">
          {toolbarExtras}
        </div>
      ) : null}

      <div className={cn("flex min-h-0 flex-1", isLg ? "flex-row" : "flex-col")}>
        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2">
          <div className="relative flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] bg-card px-2.5 py-2 focus-within:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_28%,transparent)] dark:border-border/40">
              <ScanLine className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
              <input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => {
                  setSelectedKey(null);
                  setActiveField("code");
                  setKeyTarget("sheet");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (hits.length > 0) return;
                    commitEntry();
                  }
                }}
                placeholder="Scan barcode or type item name"
                aria-label="Find item"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              />
              {search ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    focusSearch();
                  }}
                  className="flex size-6 items-center justify-center rounded-none text-muted-foreground/70 hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)] hover:text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_80%,transparent)]"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Open camera scanner"
                onClick={() => setShowScanner(true)}
                className="flex size-7 items-center justify-center rounded-none text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)] hover:text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)]"
              >
                <Camera className="size-4" aria-hidden />
              </button>
            </div>
            <nav
              aria-label="Sale views"
              className="flex shrink-0 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)] dark:border-border/40"
            >
              {(
                [
                  ["sale", saleLabel],
                  ["held", heldTabs.length ? `Held (${heldTabs.length})` : "Held"],
                  ["receipts", "Receipt"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={tab === id ? "true" : undefined}
                  className={cn(
                    "relative px-2.5 py-1.5 text-[12px] font-semibold tracking-tight transition-colors",
                    tab === id
                      ? "bg-card text-[var(--pos-ink,#1c1915)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab === id ? (
                    <span
                      className="absolute inset-x-0 top-0 h-[2px] bg-[var(--pos-primary)]"
                      aria-hidden
                    />
                  ) : null}
                  {label}
                </button>
              ))}
            </nav>
            {search.trim() ? (
                <div className="pos-scroll absolute left-0 top-full z-20 mt-1 max-h-[min(56vh,32rem)] w-full overflow-auto border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-card shadow-[0_12px_34px_-14px_color-mix(in_srgb,var(--pos-ink,#1c1915)_45%,transparent)] dark:border-border/40">
                {searchBanner ? (
                  <p className="border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-3 py-1.5 text-[11px] text-muted-foreground">
                    {searchBanner}
                  </p>
                ) : null}
                {hits.length > 0 ? (
                  <LedgerSearchHits
                    hits={hits}
                    shelfPrices={shelfPrices}
                    cartQtyByItem={cartQtyByItem}
                    searchInputRef={searchInputRef}
                    onPick={pickItem}
                  />
                ) : (
                  <p className="px-3 py-3 text-sm text-muted-foreground">
                    No item matches “{search.trim()}”. Press Enter to look up as a
                    barcode.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {tab === "sale" ? (
            <>
              {alwaysShowTopProducts || topProducts.length > 0 ? (
                <LedgerBestSellers
                  products={topProducts}
                  loading={alwaysShowTopProducts && topProductsLoading}
                  title={topProductsTitle}
                  shelfPrices={shelfPrices}
                  cartQtyByItem={cartQtyByItem}
                  disabled={tillLocked}
                  onPick={pickTopProduct}
                />
              ) : null}
              <LedgerSheet
                lines={sheetLines}
                selectedKey={selectedKey}
                activeField={activeField}
                allowPriceEdit={allowPriceEdit}
                compact={compactLines}
                onSelect={(key, field) => {
                  setSelectedKey(key);
                  setActiveField(field);
                  setKeyTarget("sheet");
                }}
                onFocusEntry={focusSearch}
                onVoidLine={(key) => voidLine(key)}
                onLineChange={onLineChange}
              />
            </>
          ) : null}

          {tab === "held" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-card dark:border-border/40">
              {heldTabs.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  No held sales. Hold parks this sale so you can start another.
                </p>
              ) : (
                heldTabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSwitchCart(t.id);
                      setTab("sale");
                    }}
                    className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-4 py-3 text-left hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]"
                  >
                    <span className="text-sm font-medium">{t.label}</span>
                    <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
                      {t.itemCount} · {t.grandTotal.toFixed(2)} {currency}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}

          {tab === "receipts" ? (
            <div className="pos-scroll min-h-0 flex-1 overflow-auto border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-card p-3 dark:border-border/40">
              {cart.lastSale && cart.lastReceipt ? (
                <PosSaleCompletePanel
                  sale={cart.lastSale}
                  receipt={cart.lastReceipt}
                  currency={currency}
                  error={cart.error}
                  canVoid={cart.canVoid}
                  voidNotes={cart.voidNotes}
                  setVoidNotes={cart.setVoidNotes}
                  onVoidLastSale={cart.onVoidLastSale}
                  voidLoading={cart.voidLoading}
                  onDownloadReceiptPdf={cart.onDownloadReceiptPdf}
                  receiptLoading={cart.receiptLoading}
                  onStartNewSale={newSale}
                  receiptPrinter={cart.receiptPrinter}
                  whatsappReceiptEnabled={cart.whatsappReceiptEnabled}
                />
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  Complete a sale to reprint the last receipt here.
                </p>
              )}
            </div>
          ) : null}
        </section>

        {/* Phone: the till column is the second half of the job, so it gets a
            sticky total + pay bar instead of a permanent 19.5rem rail. */}
        {!isLg ? (
          <div className="flex shrink-0 items-stretch gap-2 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--card)_92%,var(--pos-paper,#f1ece3))] px-2 py-2 dark:border-border/40 dark:bg-card">
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {saleLabel} · {cart.lines.length}{" "}
                {cart.lines.length === 1 ? "line" : "lines"}
              </span>
              <span className="pos-market-section-label text-[1.5rem] leading-none tabular-nums">
                {cart.payableTotal.toFixed(2)}
                <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {currency}
                </span>
              </span>
            </div>
            {!completeIdle ? (
              <button
                type="button"
                disabled={cart.lines.length === 0}
                onClick={() => setPayOpen(true)}
                className={cn(
                  "flex min-h-12 shrink-0 items-center gap-1.5 px-4 text-[14px] font-bold tracking-tight",
                  "bg-[var(--pos-primary)] text-[var(--pos-primary-ink,#fff)] disabled:opacity-40",
                )}
              >
                <Wallet className="size-4" aria-hidden />
                Pay
              </button>
            ) : null}
          </div>
        ) : null}

        <aside
          className={cn(
            "flex min-h-0 flex-col",
            isLg
              ? "w-[19.5rem] shrink-0 border-l border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--card)_88%,var(--pos-paper,#f1ece3))] dark:border-border/40 dark:bg-card"
              : cn(
                  "pos-scroll fixed inset-x-0 bottom-0 z-40 flex max-h-[86dvh] flex-col border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[var(--pos-paper,#f1ece3)] shadow-[0_-14px_40px_-18px_color-mix(in_srgb,var(--pos-ink,#1c1915)_45%,transparent)] dark:border-border/40 dark:bg-background",
                  payOpen ? "pos-sheet-in block" : "hidden",
                ),
          )}
          aria-hidden={!isLg && !payOpen}
        >
          {!isLg ? (
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-3 py-2 dark:border-border/40">
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Payment
              </span>
              <button
                type="button"
                onClick={() => setPayOpen(false)}
                aria-label="Close payment panel"
                className="flex size-8 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ) : null}
          <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-3 py-2.5 dark:border-border/40">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {saleLabel}
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] tabular-nums text-muted-foreground/70">
                {cart.lines.length === 0
                  ? "Empty"
                  : `${cart.lines.length} ${cart.lines.length === 1 ? "line" : "lines"}`}
              </p>
            </div>
            <p className="pos-market-section-label mt-0.5 text-[2rem] leading-none tabular-nums">
              {cart.payableTotal.toFixed(2)}
              <span className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {currency}
              </span>
            </p>
          </div>

          <div className="pos-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
          <div
            className={cn(
              "grid gap-1",
              cart.canLookupCustomers ? "grid-cols-4" : "grid-cols-3",
            )}
          >
            {payMethods.map((m) => {
              const Icon = m.icon;
              const active = cart.payMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={m.disabled}
                  title={
                    m.id === "customer_credit" && tabSuspended
                      ? "Tab suspended"
                      : undefined
                  }
                  onClick={() => {
                    if (m.id === "customer_credit") {
                      cart.setSplitPay(false);
                      cart.setCreditChangeToWallet(false);
                      cart.setPayMethod("customer_credit");
                      setKeyTarget("sheet");
                      return;
                    }
                    cart.setPayMethod(m.id);
                    if (m.id === "cash") focusPay();
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-none border px-1 py-2 text-[11px] font-semibold transition-colors",
                    active
                      ? "border-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_16%,var(--card))] text-[var(--pos-ink,#1c1915)]"
                      : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-card text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]",
                    m.disabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {m.label}
                </button>
              );
            })}
          </div>

          {showCustomerPicker ? (
            <LedgerTabCustomer
              online={online}
              currency={currency}
              payableTotal={cart.payableTotal}
              canManageCustomers={cart.canManageCustomers}
              customerPhoneQuery={cart.customerPhoneQuery}
              setCustomerPhoneQuery={cart.setCustomerPhoneQuery}
              customerHits={cart.customerHits}
              customerNoPhoneMatch={cart.customerNoPhoneMatch}
              customerRegisterName={cart.customerRegisterName}
              setCustomerRegisterName={cart.setCustomerRegisterName}
              customerRegisterPhone={cart.customerRegisterPhone}
              setCustomerRegisterPhone={cart.setCustomerRegisterPhone}
              customerSearchBusy={cart.customerSearchBusy}
              customerRegisterBusy={cart.customerRegisterBusy}
              phoneVerificationSent={cart.phoneVerificationSent}
              phoneVerificationCode={cart.phoneVerificationCode}
              setPhoneVerificationCode={cart.setPhoneVerificationCode}
              phoneVerificationCooldownUntil={cart.phoneVerificationCooldownUntil}
              requirePhoneVerificationForNewTabCustomers={
                cart.requirePhoneVerificationForNewTabCustomers
              }
              allowSearchCustomersByName={cart.allowSearchCustomersByName}
              optional={captureCustomerSimple}
              onSearchCustomers={cart.onSearchCustomers}
              onSendPhoneVerification={cart.onSendPhoneVerification}
              onRegisterCustomer={cart.onRegisterCustomer}
              selectedCustomer={cart.selectedCustomer}
              setSelectedCustomer={cart.setSelectedCustomer}
            />
          ) : null}

          {cart.payMethod === "cash" ||
          cart.payMethod === "mpesa_manual" ||
          cart.payMethod === "card" ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-[11px] font-medium text-muted-foreground">
                Received
                <input
                  value={cart.cashTenderStr}
                  onFocus={focusPay}
                  onChange={(e) => cart.setCashTenderStr(e.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                  aria-label={`Amount received in ${currency}`}
                  className={cn(
                    "h-10 w-full rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] px-2 text-right font-mono text-sm outline-none",
                    "focus:ring-2 focus:ring-[var(--pos-primary)]",
                    keyTarget === "tender" && "ring-2 ring-[var(--pos-primary)]",
                  )}
                />
              </label>
              <div className="space-y-1 text-[11px] font-medium text-muted-foreground">
                Change
                <p
                  className={cn(
                    "flex h-10 items-center justify-end rounded-none border px-2 font-mono text-sm tabular-nums",
                    changeDue > 0
                      ? "border-emerald-200 bg-emerald-50 font-semibold text-emerald-900"
                      : cashShort
                        ? "border-amber-200 bg-amber-50 text-amber-950"
                        : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)]",
                  )}
                >
                  {currency} {changeDue.toFixed(2)}
                </p>
              </div>
            </div>
          ) : null}

          {cart.payMethod === "cash" ? (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  focusPay();
                  cart.setCashTenderStr(cart.payableTotal.toFixed(2));
                }}
                className="rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-2 py-1 text-[11px] font-medium text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_80%,transparent)] hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]"
              >
                Exact
              </button>
              {CASH_QUICK_AMOUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    focusPay();
                    cart.setCashTenderStr(n.toFixed(2));
                  }}
                  className="rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-2 py-1 text-[11px] font-semibold tabular-nums text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_80%,transparent)] hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]"
                >
                  {n}
                </button>
              ))}
            </div>
          ) : null}

          {cart.payMethod === "mpesa_manual" ? (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                <input
                  value={cart.stkAreaCode}
                  onChange={(e) => cart.setStkAreaCode(e.target.value)}
                  className="h-8 w-14 rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] px-1.5 text-xs"
                  aria-label="Area code"
                />
                <input
                  value={cart.stkPhone}
                  onChange={(e) => cart.setStkPhone(e.target.value)}
                  placeholder="7XX XXX XXX"
                  className="h-8 min-w-0 flex-1 rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] px-2 text-xs"
                />
              </div>
              <button
                type="button"
                disabled={!online || !isStkPhoneValid(cart.stkAreaCode, cart.stkPhone)}
                onClick={() =>
                  cart.onStkPush(buildStkPhoneNumber(cart.stkAreaCode, cart.stkPhone))
                }
                className="h-8 w-full rounded-none border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] text-xs font-medium hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] disabled:opacity-40"
              >
                {cart.stkPushStatus === "sending" ? "Sending…" : "Send STK"}
              </button>
              {cart.stkPushError ? (
                <p className="text-[11px] text-red-700">{cart.stkPushError}</p>
              ) : null}
            </div>
          ) : null}

          <LedgerKeypad
            onDigit={applyDigit}
            onBackspace={applyBackspace}
            onClear={applyClear}
            onEnter={applyEnter}
            disabled={tillLocked}
            targetLabel={keypadTargetLabel}
            enterLabel={keypadEnterLabel}
            clearHint={
              allowClearAllSales
                ? clearableSaleCount > 1
                  ? `Clear all ${clearableSaleCount} open sales`
                  : "Clear open sale"
                : undefined
            }
          />

          {cart.error ? <p className="text-[11px] text-red-700">{cart.error}</p> : null}
          {cart.notice ? <p className="text-[11px] text-emerald-800">{cart.notice}</p> : null}
          </div>

          <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] p-3 dark:border-border/40">
          {allowClearSale &&
          cart.onClearSale &&
          !completeIdle &&
          (cart.lines.length > 0 ||
            (allowClearAllSales && clearableSaleCount > 0)) ? (
            <button
              type="button"
              disabled={cart.loading || tillLocked}
              onClick={cart.onClearSale}
              className={cn(
                "mb-2 inline-flex h-8 items-center gap-1.5 rounded-none text-[11px] font-semibold text-muted-foreground",
                "hover:text-red-700 disabled:opacity-40",
              )}
            >
              <Trash2 className="size-3" aria-hidden />
              {allowClearAllSales && clearableSaleCount > 1
                ? `Clear all sales (${clearableSaleCount})`
                : "Clear sale"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={
              completeIdle
                ? tillLocked
                : !cart.canCompleteSale || cart.loading || tillLocked
            }
            onClick={() => {
              payAttemptRef.current = true;
              if (completeIdle) newSale();
              else cart.onComplete();
            }}
            className={cn(
              "h-12 w-full rounded-none bg-[var(--pos-primary)] text-sm font-bold tracking-tight text-[var(--pos-primary-ink,#fff)]",
              "hover:opacity-95 active:scale-[0.99] disabled:opacity-40",
            )}
          >
            {cart.loading ? "Completing…" : completeIdle ? "New sale" : "Complete sale"}
          </button>
          </div>
        </aside>
      </div>

      <footer
        ref={moreRef}
        className={cn(
          "relative flex shrink-0 items-center gap-1 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] px-2 py-1.5 dark:border-border/40",
          !isLg && "pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]",
        )}
      >
        {isLg ? (
          <LedgerFunctionBar
            keys={[
              { code: "F1", label: "New", onPress: newSale },
              {
                code: "F2",
                label: "Hold",
                onPress: holdSale,
                disabled: cart.lines.length === 0,
              },
              {
                code: "F3",
                label: "Remove",
                onPress: () => voidLine(),
                disabled: !selectedKey,
              },
              { code: "F4", label: "Find", onPress: focusSearch },
              { code: "F5", label: "Pay", onPress: focusPay },
              {
                code: "F6",
                label: "Recall",
                hint: heldTabs.length ? `${heldTabs.length}` : undefined,
                onPress: recallSale,
                attention: heldTabs.length > 0,
              },
            ]}
          />
        ) : (
          /* Phone: keyboard shortcuts mean nothing on glass, so the per-sale
             actions become full touch targets instead. */
          <div className="flex min-w-0 flex-1 items-stretch gap-1">
            <button
              type="button"
              onClick={newSale}
              className="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-card text-muted-foreground active:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)] dark:border-border/40"
            >
              <PlusCircle className="size-4" aria-hidden />
              <span className="text-[10px] font-semibold">New</span>
            </button>
            <button
              type="button"
              disabled={cart.lines.length === 0}
              onClick={holdSale}
              className="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-card text-muted-foreground active:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)] disabled:opacity-40 dark:border-border/40"
            >
              <Clock className="size-4" aria-hidden />
              <span className="text-[10px] font-semibold">Hold</span>
            </button>
            <button
              type="button"
              disabled={heldTabs.length === 0}
              onClick={recallSale}
              className={cn(
                "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border bg-card text-muted-foreground active:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)] disabled:opacity-40",
                heldTabs.length > 0
                  ? "border-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)] text-[var(--pos-primary)]"
                  : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] dark:border-border/40",
              )}
            >
              <RotateCcw className="size-4" aria-hidden />
              <span className="text-[10px] font-semibold">
                Recall{heldTabs.length > 0 ? ` ${heldTabs.length}` : ""}
              </span>
            </button>
          </div>
        )}
        <LedgerFunctionBar
          keys={[
            { code: "F1", label: "New", onPress: newSale },
            {
              code: "F2",
              label: "Hold",
              onPress: holdSale,
              disabled: cart.lines.length === 0,
            },
            {
              code: "F3",
              label: "Remove",
              onPress: () => voidLine(),
              disabled: !selectedKey,
            },
            { code: "F4", label: "Find", onPress: focusSearch },
            { code: "F5", label: "Pay", onPress: focusPay },
            {
              code: "F6",
              label: "Recall",
              hint: heldTabs.length ? `${heldTabs.length}` : undefined,
              onPress: recallSale,
              attention: heldTabs.length > 0,
            },
          ]}
        />
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          aria-label="Open the till menu"
          className={cn(
            "ml-1 inline-flex h-[2.6rem] shrink-0 items-center gap-1.5 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-card px-2.5 text-[12px] font-semibold tracking-tight hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_5%,transparent)] dark:border-border/40",
            !isLg && "flex-1 justify-center",
          )}
        >
          <MoreHorizontal className="size-4" aria-hidden />
          {isLg ? "More" : "Till menu"}
        </button>
        {moreOpen ? (
          <div className="absolute bottom-full right-2 z-30 mb-1 w-[17.5rem] overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] bg-card shadow-[0_12px_34px_-14px_color-mix(in_srgb,var(--pos-ink,#1c1915)_45%,transparent)] dark:border-border/40">
            <div className="flex items-center justify-between border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-2.5 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                More
              </p>
              <span className="border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] px-1 py-0.5 font-mono text-[9px] font-bold leading-none text-muted-foreground">
                F12
              </span>
            </div>
            <div className="pos-scroll max-h-[min(70vh,28rem)] overflow-y-auto">
              {/* One source of truth for "what this till can do besides
                  selling" — the same list the shelf's till menu renders, so the
                  two templates cannot drift apart. */}
              {CASHIER_TOOL_SECTIONS.map((section) => {
                const items = tillTools.filter((t) => t.section === section.id);
                if (items.length === 0) return null;
                return (
                  <MoreSection key={section.id} label={section.label}>
                    {items.map((tool) =>
                      tool.id === "airtime" ? (
                        <AirtimeQuickAction
                          key={tool.id}
                          triggerClassName={MORE_ROW}
                          currency={currency}
                          channel="POS"
                          onTrigger={() => setMoreOpen(false)}
                          onAddToCart={(payload) => {
                            setMoreOpen(false);
                            return onAddAirtimeToCart?.(payload) ?? false;
                          }}
                        />
                      ) : (
                        <MoreRow
                          key={tool.id}
                          icon={CASHIER_TOOL_ICONS[tool.id]}
                          hint={tool.hint}
                          tone={tool.tone === "danger" ? "leave" : "default"}
                          onClick={() => runTillTool(tool.id)}
                        >
                          {tool.label}
                        </MoreRow>
                      ),
                    )}
                  </MoreSection>
                );
              })}

              <MoreSection label="Till">
                <MoreRow
                  icon={Camera}
                  onClick={() => {
                    setMoreOpen(false);
                    setShowScanner(true);
                  }}
                >
                  Camera scan
                </MoreRow>
                <MoreRow
                  icon={CreditCard}
                  onClick={() => {
                    setMoreOpen(false);
                    onCheckoutDrawerOpenChange(true);
                  }}
                >
                  Checkout details
                </MoreRow>
              </MoreSection>

              {showOwnerNav ? (
                <MoreSection label="Records">
                  <MoreRow
                    icon={BookOpen}
                    href={APP_ROUTES.paymentsDayLedger}
                    onClick={() => setMoreOpen(false)}
                  >
                    Day ledger
                  </MoreRow>
                  <MoreRow
                    icon={ShoppingBag}
                    href={APP_ROUTES.sales}
                    onClick={() => setMoreOpen(false)}
                  >
                    Sales
                  </MoreRow>
                  <MoreRow
                    icon={Building2}
                    href={APP_ROUTES.business}
                    onClick={() => setMoreOpen(false)}
                  >
                    Business
                  </MoreRow>
                  <MoreRow
                    icon={Receipt}
                    onClick={() => {
                      setMoreOpen(false);
                      window.dispatchEvent(new Event("ub:open-receipt-shop"));
                    }}
                  >
                    Receipt details
                  </MoreRow>
                  <MoreRow
                    icon={Store}
                    href={APP_ROUTES.salesQuick}
                    onClick={() => setMoreOpen(false)}
                  >
                    Admin sale
                  </MoreRow>
                </MoreSection>
              ) : null}
              <MoreSection label="Template">
                {CASHIER_TEMPLATES.map((t) => {
                  const current = templatePreference === t.id;
                  return (
                    <MoreRow
                      key={t.id}
                      icon={t.id === "ledger" ? Table2 : LayoutGrid}
                      hint={t.blurb}
                      onClick={() => {
                        setMoreOpen(false);
                        void setTemplate(t.id);
                      }}
                    >
                      {current ? `${t.name} · Current` : t.name}
                    </MoreRow>
                  );
                })}
              </MoreSection>
              <MoreSection label="This till">
                <MoreRow
                  icon={Settings2}
                  onClick={() => {
                    setMoreOpen(false);
                    window.dispatchEvent(new Event("ub:open-till-settings"));
                  }}
                >
                  Till settings
                </MoreRow>
                <MoreRow
                  icon={CircleHelp}
                  onClick={() => {
                    setMoreOpen(false);
                    setFirstSaleOpen(true);
                  }}
                >
                  How to take a sale
                </MoreRow>
                <MoreRow
                  icon={LockKeyhole}
                  disabled={tillLocked}
                  onClick={() => {
                    setMoreOpen(false);
                    tillLock?.lock({ reason: "manual" });
                  }}
                >
                  Lock till
                </MoreRow>
                <MoreRow
                  icon={LogOut}
                  tone="leave"
                  onClick={() => {
                    setMoreOpen(false);
                    void logoutRemoteAndRedirectToLogin().catch(() => undefined);
                  }}
                >
                  Log out
                </MoreRow>
              </MoreSection>
            </div>
          </div>
        ) : null}
      </footer>

      <CashierFirstSaleDrawer
        open={firstSaleOpen}
        onOpenChange={setFirstSaleOpen}
      />

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
          if (!o) {
            setPickedItem(null);
            focusSearch();
          }
        }}
        onSubmit={(payload) => {
          addLine(payload.item, payload.quantity, payload.unitPrice);
          setModalOpen(false);
          setPickedItem(null);
          markAdded();
        }}
        allowNegativeStock={allowNegativeStock}
        allowPriceEdit={allowPriceEdit}
      />

      <PosVariantPicker
        parent={variantPicker?.parent ?? null}
        open={variantPicker !== null}
        onOpenChange={(o) => {
          if (!o) setVariantPicker(null);
        }}
        online={online}
        currency={currency}
        branchId={branchId}
        businessId={businessId}
        onStaleItem={onStalePosItem}
        brandTheme={dialogBrandTheme}
        cartQtyByItem={cartQtyByItem}
        justAddedId={null}
        onPick={pickItem}
      />

      <CashierCreateProductModal
        open={createProductOpen}
        onOpenChange={setCreateProductOpen}
        brandTheme={dialogBrandTheme}
        currency={currency}
        branchId={branchId}
        itemTypes={itemTypes}
        preferredItemTypeId={preferredItemTypeId}
        canLinkSupplier={allowLinkSupplierProducts}
        onCreated={(item, unitPrice) => {
          const added = addLine(item, 1, unitPrice);
          if (added) markAdded();
        }}
      />

      <CashierSuppliersModal
        open={suppliersOpen}
        onOpenChange={setSuppliersOpen}
        brandTheme={dialogBrandTheme}
        canWrite={allowCreateSupplier}
        canLink={allowLinkSupplierProducts}
        canReceive={allowReceiveSupply}
        onReceiveSupply={(supplier) => {
          if (!supplier?.id) return;
          setSuppliersOpen(false);
          setReceiveTillSupplier({ id: supplier.id, name: supplier.name });
          setReceiveTillOpen(true);
        }}
      />

      <CashierReceiveTillDrawer
        open={receiveTillOpen}
        onOpenChange={(o) => {
          setReceiveTillOpen(o);
          if (!o) setReceiveTillSupplier(null);
        }}
        supplierId={receiveTillSupplier?.id ?? null}
        supplierName={receiveTillSupplier?.name ?? null}
      />

      <CashierCreditTabsModal
        open={creditTabsOpen}
        onOpenChange={setCreditTabsOpen}
        brandTheme={dialogBrandTheme}
        currency={currency}
        receiptPrinter={cart.receiptPrinter}
      />

      <OrderPadDrawer
        open={orderPadOpen}
        onOpenChange={setOrderPadOpen}
        branchId={branchId}
        canWrite={canWriteOrderPad}
      />

      <TenantOrderDrawer
        open={supplierOrderOpen}
        onOpenChange={setSupplierOrderOpen}
        onOpenConfirm={
          allowOrderConfirm
            ? () => {
                setSupplierOrderOpen(false);
                setOrderConfirmOpen(true);
              }
            : undefined
        }
      />

      <CashierOrderConfirmDrawer open={orderConfirmOpen} onOpenChange={setOrderConfirmOpen} />

      <CashierCartDrawer
        open={checkoutDrawerOpen}
        onOpenChange={(open) => {
          onCheckoutDrawerOpenChange(open);
          if (!open && cart.lastSale != null && cart.lastReceipt != null) {
            setTab("receipts");
          }
        }}
        online={online}
        currency={currency}
        branchSelected={branchSelected}
        brandTheme={dialogBrandTheme}
        {...cart}
      />

      {showScanner ? (
        <BarcodeScanner
          onScan={(barcode) => {
            applyBarcodeSearch(barcode);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      ) : null}
    </div>
  );
}
