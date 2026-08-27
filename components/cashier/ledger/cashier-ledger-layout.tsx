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
  Camera,
  ClipboardCheck,
  CreditCard,
  LockKeyhole,
  MoreHorizontal,
  PackagePlus,
  PlusCircle,
  Settings2,
  Smartphone,
  Truck,
  Users,
  Wallet,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { useOptionalPosTillLock } from "@/components/auth/pos-till-lock";
import { AirtimeQuickAction } from "@/components/airtime/airtime-quick-action";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { useDashboard } from "@/components/dashboard-provider";
import { TenantOrderDrawer } from "@/components/order/tenant-order-drawer";
import { PosSearchHitList } from "@/components/cashier/pos-search-hit-list";
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
import { POS_CASHIER_CAPABILITY_FLAGS } from "@/lib/pos-cashier-capabilities";
import { fetchPosShelfPrice } from "@/lib/pos-shelf-price";
import {
  formatShelfPriceLabel,
  shelfPriceToInputString,
  splitShelfPriceDisplay,
} from "@/lib/cashier-shelf-price";
import { isPosPackageSellRow } from "@/lib/cashier-item-display";
import { buildStkPhoneNumber, isStkPhoneValid } from "@/lib/stk-phone";
import { tillDeviceDisplayName } from "@/lib/till-device";
import { usePosBarcodeWedge } from "@/hooks/use-pos-barcode-wedge";
import { cn } from "@/lib/utils";

import type { CashierPosLayoutProps } from "../cashier-pos-layout";
import { LedgerBestSellers } from "./ledger-best-sellers";
import { LedgerFunctionBar } from "./ledger-function-bar";
import { LedgerKeypad } from "./ledger-keypad";
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

const MORE_CHIP = cn(
  "inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800",
  "hover:bg-zinc-50",
);

export function CashierLedgerLayout(props: CashierPosLayoutProps) {
  const {
    brandTheme,
    online,
    offlineBanner,
    currency,
    uiCopy,
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
    allowOrderConfirm = false,
    allowAirtime = false,
    allowNegativeStock = false,
    itemTypes = [],
    preferredItemTypeId = null,
    checkoutDrawerOpen,
    onCheckoutDrawerOpenChange,
    cart,
  } = props;

  const { me, business } = useDashboard();
  const tillLock = useOptionalPosTillLock();
  const tillLocked = tillLock?.locked === true;
  const scanToCartEnabled = useFeatureFlag(POS_CASHIER_CAPABILITY_FLAGS.scanToCart);

  const [tillLabel, setTillLabel] = useState("");
  const [tab, setTab] = useState<LedgerTab>("sale");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<LedgerCellField>("code");
  const [keyTarget, setKeyTarget] = useState<KeyTarget>("sheet");
  const [moreOpen, setMoreOpen] = useState(false);
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
  const [orderConfirmOpen, setOrderConfirmOpen] = useState(false);
  const [variantPicker, setVariantPicker] = useState<{
    parent: ItemSummaryRecord;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBusyRef = useRef(false);
  const parentCheckCache = useRef(new Map<string, boolean>());
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
      if (item.groupLabelOnly) {
        setVariantPicker({ parent: item });
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
          const isParent = detail.groupLabelOnly === true;
          parentCheckCache.current.set(product.id, isParent);
          if (isParent) setVariantPicker({ parent: item });
          else pickItem(item);
        })
        .catch(() => {
          parentCheckCache.current.set(product.id, false);
          pickItem(item);
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
            const sellable = items.filter((row) => !row.groupLabelOnly);
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
    if (hits.length === 1 && !hits[0]?.groupLabelOnly) {
      pickItem(hits[0]!);
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

  const voidLine = useCallback(() => {
    if (!selectedKey) {
      toast.message("Select a line to void");
      return;
    }
    cart.removeLine(selectedKey);
    setSelectedKey(null);
    focusSearch();
  }, [selectedKey, cart, focusSearch]);

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
      cart.payMethod !== "card"
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
  }, [keyTarget, selectedKey, activeField, allowPriceEdit, cart, onLineChange, setSearch]);

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
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('[role="dialog"]')) return;
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
  }, [newSale, holdSale, voidLine, focusSearch, focusPay, recallSale]);

  const payMethods = [
    { id: "cash" as const, label: "Cash", icon: Banknote },
    { id: "mpesa_manual" as const, label: "M-Pesa", icon: Smartphone },
    { id: "card" as const, label: "Card", icon: CreditCard },
  ];

  return (
    <div
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-zinc-100 text-zinc-900"
      style={brandTheme}
    >
      <header className="flex shrink-0 items-center gap-3 bg-[var(--pos-primary)] px-3 py-2 text-[var(--pos-primary-ink,#fff)]">
        <p className="text-sm font-semibold tracking-tight">{shopName} Cashier</p>
        <p className="truncate text-xs opacity-90">
          {[tillLabel, cashierName].filter(Boolean).join(" · ")}
        </p>
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium">
          {online ? <Wifi className="size-3.5" aria-hidden /> : <WifiOff className="size-3.5" aria-hidden />}
          {online ? "Online" : "Offline"}
        </span>
      </header>

      {offlineBanner ? (
        <p className="shrink-0 bg-amber-100 px-3 py-1 text-[11px] text-amber-950">{offlineBanner}</p>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <section className="relative flex min-w-0 flex-1 flex-col gap-2 p-2">
          {tab === "sale" ? (
            <>
              <div className="flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-2 py-1.5">
                <span className="text-[11px] font-semibold text-zinc-400">A2</span>
                <span className="text-[11px] text-zinc-400">fx</span>
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
                      commitEntry();
                    }
                  }}
                  placeholder="Scan barcode or type item code / name"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
                />
              </div>
              <LedgerSheet
                lines={sheetLines}
                entryCode={search}
                selectedKey={selectedKey}
                activeField={activeField}
                allowPriceEdit={allowPriceEdit}
                onSelect={(key, field) => {
                  setSelectedKey(key);
                  setActiveField(field);
                  setKeyTarget("sheet");
                }}
                onEntryCodeChange={setSearch}
                onEntryCommit={commitEntry}
                onLineChange={onLineChange}
              />
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
              {sheetLines.length === 0 && !search.trim() ? (
                <CashierFirstSaleDrawer
                  trigger={
                    <button
                      type="button"
                      className="self-start text-[11px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
                    >
                      How to take your first sale
                    </button>
                  }
                />
              ) : null}
              {search.trim() && hits.length > 0 ? (
                <div className="absolute left-2 top-14 z-20 max-h-[42vh] w-[min(44rem,calc(100%-1rem))] overflow-auto rounded-md border border-zinc-200 bg-white shadow-lg">
                  {searchBanner ? (
                    <p className="px-3 py-1.5 text-[11px] text-zinc-500">{searchBanner}</p>
                  ) : null}
                  <PosSearchHitList
                    hits={hits}
                    shelfPrices={shelfPrices}
                    cartQtyByItem={cartQtyByItem}
                    justAddedId={null}
                    currency={currency}
                    sharedCategoryLabel={null}
                    onPick={pickItem}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {tab === "held" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-auto border border-zinc-300 bg-white">
              {heldTabs.length === 0 ? (
                <p className="p-6 text-sm text-zinc-500">
                  No held sales. F2 parks the current sale so you can start another.
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
                    className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 text-left hover:bg-zinc-50"
                  >
                    <span className="text-sm font-medium">{t.label}</span>
                    <span className="text-sm tabular-nums text-zinc-600">
                      {t.itemCount} · {t.grandTotal.toFixed(2)} {currency}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}

          {tab === "receipts" ? (
            <div className="min-h-0 flex-1 overflow-auto border border-zinc-300 bg-white p-3">
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
                />
              ) : (
                <p className="p-4 text-sm text-zinc-500">
                  Complete a sale to reprint the last receipt here.
                </p>
              )}
            </div>
          ) : null}
        </section>

        <aside className="flex w-[17.5rem] shrink-0 flex-col gap-2 border-l border-zinc-200 bg-white p-3">
          <div>
            <p className="text-[11px] font-medium text-zinc-500">Total due</p>
            <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
              {currency} {cart.payableTotal.toFixed(2)}
            </p>
          </div>
          <LedgerKeypad
            onDigit={applyDigit}
            onBackspace={applyBackspace}
            onClear={applyClear}
            onEnter={applyEnter}
            disabled={tillLocked}
          />
          <label className="space-y-1 text-[11px] font-medium text-zinc-600">
            Tendered ({currency})
            <input
              value={cart.cashTenderStr}
              onFocus={focusPay}
              onChange={(e) => cart.setCashTenderStr(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className="h-9 w-full rounded-md border border-zinc-300 px-2 text-right font-mono text-sm outline-none focus:ring-2 focus:ring-[var(--pos-primary)]"
            />
          </label>
          <p className="text-sm text-zinc-600">
            Change{" "}
            <span className="font-mono font-semibold tabular-nums text-zinc-900">
              {currency} {changeDue.toFixed(2)}
            </span>
          </p>
          <div className="grid gap-1.5">
            {payMethods.map((m) => {
              const Icon = m.icon;
              const active = cart.payMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    cart.setPayMethod(m.id);
                    if (m.id === "cash") focusPay();
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium",
                    active
                      ? "border-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary)_16%,white)]"
                      : "border-zinc-200 bg-white hover:bg-zinc-50",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {m.label}
                </button>
              );
            })}
          </div>
          {cart.payMethod === "mpesa_manual" ? (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                <input
                  value={cart.stkAreaCode}
                  onChange={(e) => cart.setStkAreaCode(e.target.value)}
                  className="h-8 w-14 rounded-md border border-zinc-300 px-1.5 text-xs"
                  aria-label="Area code"
                />
                <input
                  value={cart.stkPhone}
                  onChange={(e) => cart.setStkPhone(e.target.value)}
                  placeholder="7XX XXX XXX"
                  className="h-8 min-w-0 flex-1 rounded-md border border-zinc-300 px-2 text-xs"
                />
              </div>
              <button
                type="button"
                disabled={!online || !isStkPhoneValid(cart.stkAreaCode, cart.stkPhone)}
                onClick={() =>
                  cart.onStkPush(buildStkPhoneNumber(cart.stkAreaCode, cart.stkPhone))
                }
                className="h-8 w-full rounded-md border border-zinc-200 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40"
              >
                {cart.stkPushStatus === "sending" ? "Sending…" : "Send STK"}
              </button>
              {cart.stkPushError ? (
                <p className="text-[11px] text-red-700">{cart.stkPushError}</p>
              ) : null}
            </div>
          ) : null}
          {cart.error ? <p className="text-[11px] text-red-700">{cart.error}</p> : null}
          {cart.notice ? <p className="text-[11px] text-emerald-800">{cart.notice}</p> : null}
          <button
            type="button"
            disabled={!cart.canCompleteSale || cart.loading || tillLocked}
            onClick={() => cart.onComplete()}
            className={cn(
              "mt-auto h-11 rounded-md bg-[var(--pos-primary)] text-sm font-semibold text-[var(--pos-primary-ink,#fff)]",
              "hover:opacity-95 active:scale-[0.99] disabled:opacity-40",
            )}
          >
            {cart.loading ? "Completing…" : "Complete sale"}
          </button>
        </aside>
      </div>

      <footer className="relative flex shrink-0 items-center gap-1 border-t border-zinc-200 bg-zinc-50 px-2 py-1.5">
        <LedgerFunctionBar
          keys={[
            { code: "F1", label: "New sale", onPress: newSale },
            { code: "F2", label: "Hold", onPress: holdSale, disabled: cart.lines.length === 0 },
            { code: "F3", label: "Void line", onPress: voidLine, disabled: !selectedKey },
            { code: "F4", label: "Find item", onPress: focusSearch },
            { code: "F5", label: "Pay", onPress: focusPay },
            {
              code: "F6",
              label: "Recall",
              hint: heldTabs.length ? `(${heldTabs.length})` : "(0)",
              onPress: recallSale,
            },
          ]}
        />
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="ml-1 inline-flex h-10 items-center gap-1 rounded-md border border-zinc-200 bg-zinc-100 px-2.5 text-xs font-medium"
        >
          <MoreHorizontal className="size-4" aria-hidden />
          More
        </button>
        {moreOpen ? (
          <div className="absolute bottom-full right-2 z-30 mb-1 w-72 rounded-md border border-zinc-200 bg-white p-2 shadow-lg">
            <div className="flex flex-wrap gap-1.5">
              {posShiftLinks?.canOpenShift && !posShiftLinks.hasOpenShift ? (
                <button
                  type="button"
                  className={MORE_CHIP}
                  onClick={() => {
                    setMoreOpen(false);
                    posShiftLinks.onShortcut("open-shift");
                  }}
                >
                  <PlusCircle className="size-3.5" aria-hidden /> Open shift
                </button>
              ) : null}
              {posShiftLinks?.canCloseShift && posShiftLinks.hasOpenShift ? (
                <>
                  <button
                    type="button"
                    className={MORE_CHIP}
                    onClick={() => {
                      setMoreOpen(false);
                      posShiftLinks.onShortcut("new-drawout");
                    }}
                  >
                    <Wallet className="size-3.5" aria-hidden /> Drawout
                  </button>
                  <button
                    type="button"
                    className={MORE_CHIP}
                    onClick={() => {
                      setMoreOpen(false);
                      posShiftLinks.onShortcut("close-shift");
                    }}
                  >
                    Close shift
                  </button>
                </>
              ) : null}
              {allowCreditTabs ? (
                <button
                  type="button"
                  className={MORE_CHIP}
                  onClick={() => {
                    setMoreOpen(false);
                    setCreditTabsOpen(true);
                  }}
                >
                  <Users className="size-3.5" aria-hidden /> Credit tabs
                </button>
              ) : null}
              {allowAirtime ? (
                <AirtimeQuickAction
                  triggerClassName={MORE_CHIP}
                  currency={currency}
                  channel="POS"
                  onAddToCart={(payload) => {
                    setMoreOpen(false);
                    return onAddAirtimeToCart?.(payload) ?? false;
                  }}
                />
              ) : null}
              {allowCreateProduct ? (
                <button
                  type="button"
                  className={MORE_CHIP}
                  onClick={() => {
                    setMoreOpen(false);
                    setCreateProductOpen(true);
                  }}
                >
                  <PackagePlus className="size-3.5" aria-hidden /> New product
                </button>
              ) : null}
              {allowCreateSupplier || allowLinkSupplierProducts || allowReceiveSupply ? (
                <button
                  type="button"
                  className={MORE_CHIP}
                  onClick={() => {
                    setMoreOpen(false);
                    setSuppliersOpen(true);
                  }}
                >
                  <Truck className="size-3.5" aria-hidden /> Receive
                </button>
              ) : null}
              {allowOrderPad ? (
                <button
                  type="button"
                  className={MORE_CHIP}
                  onClick={() => {
                    setMoreOpen(false);
                    setOrderPadOpen(true);
                  }}
                >
                  Order
                </button>
              ) : null}
              {allowOrderConfirm ? (
                <button
                  type="button"
                  className={MORE_CHIP}
                  onClick={() => {
                    setMoreOpen(false);
                    setOrderConfirmOpen(true);
                  }}
                >
                  <ClipboardCheck className="size-3.5" aria-hidden /> Confirm
                </button>
              ) : null}
              <button
                type="button"
                className={MORE_CHIP}
                onClick={() => {
                  setMoreOpen(false);
                  setShowScanner(true);
                }}
              >
                <Camera className="size-3.5" aria-hidden /> Camera
              </button>
              <button
                type="button"
                className={MORE_CHIP}
                onClick={() => {
                  setMoreOpen(false);
                  onCheckoutDrawerOpenChange(true);
                }}
              >
                Checkout details
              </button>
              <CashierFirstSaleDrawer
                trigger={
                  <button
                    type="button"
                    className={MORE_CHIP}
                    onClick={() => setMoreOpen(false)}
                  >
                    First sale
                  </button>
                }
              />
              <button
                type="button"
                className={MORE_CHIP}
                onClick={() => {
                  setMoreOpen(false);
                  window.dispatchEvent(new Event("ub:open-till-settings"));
                }}
              >
                <Settings2 className="size-3.5" aria-hidden /> Till settings
              </button>
              <button
                type="button"
                className={MORE_CHIP}
                disabled={tillLocked}
                onClick={() => {
                  setMoreOpen(false);
                  tillLock?.lock({ reason: "manual" });
                }}
              >
                <LockKeyhole className="size-3.5" aria-hidden /> Lock till
              </button>
              <button
                type="button"
                className={MORE_CHIP}
                onClick={() => {
                  setMoreOpen(false);
                  void logoutRemoteAndRedirectToLogin().catch(() => undefined);
                }}
              >
                Log out
              </button>
            </div>
          </div>
        ) : null}
      </footer>

      <nav className="flex shrink-0 border-t border-zinc-200 bg-white text-sm">
        {(
          [
            ["sale", saleLabel],
            ["held", `Held sales${heldTabs.length ? ` (${heldTabs.length})` : ""}`],
            ["receipts", "Receipts"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "px-4 py-2 font-medium",
              tab === id
                ? "border-b-2 border-[var(--pos-primary)] text-zinc-900"
                : "text-zinc-500 hover:text-zinc-800",
            )}
          >
            {label}
          </button>
        ))}
      </nav>

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

      <TenantOrderDrawer
        open={orderPadOpen}
        onOpenChange={setOrderPadOpen}
        onOpenConfirm={
          allowOrderConfirm
            ? () => {
                setOrderPadOpen(false);
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
