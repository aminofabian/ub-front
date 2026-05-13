"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Image from "next/image";

import {
  DashboardAccessDenied,
  DashboardFeedback,
  DASHBOARD_SECTION_SURFACE,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { CASHIER_POS_UI_COPY } from "@/lib/cashier-pos-copy";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  fetchCategoryTree,
  fetchCurrentShift,
  fetchCustomerById,
  fetchCustomers,
  fetchItems,
  fetchSaleReceiptPdf,
  itemListThumbnailUrl,
  postVoidSale,
  tryPostSaleWithRetries,
  type CategoryTreeNodeRecord,
  type CustomerRecord,
  type ItemSummaryRecord,
  type PostSalePayload,
  type SalePaymentMethod,
  type SaleRecord,
  type ShiftRecord,
} from "@/lib/api";
import { posBrandThemeStyle } from "@/lib/brand-theme";
import {
  readCachedItemsSearch,
  writeCachedItemsSearch,
} from "@/lib/catalog-search-cache";
import { nextIdempotencyKey } from "@/lib/idempotency-key";
import { hasPermission, Permission } from "@/lib/permissions";
import {
  countPendingSales,
  enqueuePendingSale,
  flushSaleOutbox,
  isSaleOutboxSupported,
} from "@/lib/sale-outbox";
import {
  getTopProducts,
  recordSaleLines,
  type TopProductRecord,
} from "@/lib/top-products";
import {
  cashierItemPrimaryLabel,
  posCartLineSuffix,
  posSearchItemDetailLine,
} from "@/lib/cashier-item-display";
import {
  createEmptyCartSession,
  cartSessionLabel,
  cartSessionItemCount,
  cartSessionGrandTotal,
  MAX_CARTS,
  type CartSession,
} from "@/lib/cart-session";
import { CashierPosLayout } from "./cashier-pos-layout";
import { usePosCatalogItemType } from "@/components/cashier-shell";
import {
  CloseShiftModal,
  DrawoutModal,
  OpenShiftModal,
} from "@/components/shifts/shift-action-modals";


function payMethodNeedsCustomer(method: SalePaymentMethod): boolean {
  return (
    method === "customer_credit" ||
    method === "customer_wallet" ||
    method === "loyalty_redeem"
  );
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseQty(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

function parseMoney(raw: string): number | null {
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return roundMoney2(n);
}

function isSaleVoided(sale: SaleRecord): boolean {
  const v = sale.voidedAt;
  return v != null && String(v).length > 0;
}

export type QuickSaleWorkspaceVariant = "admin" | "cashier";

type QuickSaleWorkspaceProps = {
  variant?: QuickSaleWorkspaceVariant;
};

export function QuickSaleWorkspace({
  variant = "admin",
}: QuickSaleWorkspaceProps) {
  const {
    me,
    business,
    branches,
    branchId,
    setBranchId,
    branchesLoading,
    itemTypes,
  } = useDashboard();
  const online = useOnlineStatus();
  const posCatalog = usePosCatalogItemType();
  const posItemTypeId = posCatalog?.posItemTypeId?.trim() || null;
  const canSell = hasPermission(me?.permissions, Permission.SalesSell);
  const canBrowseCategories = hasPermission(
    me?.permissions,
    Permission.CatalogItemsRead,
  );
  const canLookupCustomers = hasPermission(
    me?.permissions,
    Permission.CreditsCustomersRead,
  );
  const canVoid =
    hasPermission(me?.permissions, Permission.SalesVoidAny) ||
    hasPermission(me?.permissions, Permission.SalesVoidOwn);

  const [topProducts, setTopProducts] = useState<TopProductRecord[]>([]);
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<ItemSummaryRecord[]>([]);
  const [searchBanner, setSearchBanner] = useState<string | null>(null);
  const [categoryRoots, setCategoryRoots] = useState<CategoryTreeNodeRecord[]>(
    [],
  );
  const [categoryBrowseStack, setCategoryBrowseStack] = useState<
    CategoryTreeNodeRecord[]
  >([]);
  const [categoryFilterId, setCategoryFilterId] = useState<string | null>(null);
  const [categoryFilterLabel, setCategoryFilterLabel] = useState<string | null>(
    null,
  );
  const [categoryTreeBusy, setCategoryTreeBusy] = useState(false);

  // ── Multi-cart state ──────────────────────────────────────────────
  const [carts, setCarts] = useState<CartSession[]>(() => [
    createEmptyCartSession(),
  ]);
  const [activeCartId, setActiveCartId] = useState<string>(carts[0].id);

  const activeCart = useMemo(
    () => carts.find((c) => c.id === activeCartId) ?? carts[0],
    [carts, activeCartId],
  );

  /** Update the active cart in-place within the carts array. */
  const updateActiveCart = useCallback(
    (patch: Partial<CartSession> | ((prev: CartSession) => CartSession)) => {
      setCarts((prev) =>
        prev.map((c) => {
          if (c.id !== activeCartId) return c;
          if (typeof patch === "function") return patch(c);
          return { ...c, ...patch };
        }),
      );
    },
    [activeCartId],
  );

  // Derived helpers that mirror old flat state for the rest of the code
  const lines = activeCart.lines;
  const payMethod = activeCart.payMethod;
  const mpesaRef = activeCart.mpesaRef;
  const customerPhoneQuery = activeCart.customerPhoneQuery;
  const customerHits = activeCart.customerHits;
  const selectedCustomer = activeCart.selectedCustomer;
  const splitPay = activeCart.splitPay;
  const cashSplitStr = activeCart.cashSplitStr;
  const mpesaSplitStr = activeCart.mpesaSplitStr;
  const splitMpesaRef = activeCart.splitMpesaRef;
  // customerSearchBusy stays local (not per-cart)
  const [customerSearchBusy, setCustomerSearchBusy] = useState(false);

  const setPayMethod = useCallback(
    (m: SalePaymentMethod) => updateActiveCart({ payMethod: m }),
    [updateActiveCart],
  );
  const setMpesaRef = useCallback(
    (s: string) => updateActiveCart({ mpesaRef: s }),
    [updateActiveCart],
  );
  const setCustomerPhoneQuery = useCallback(
    (s: string) => updateActiveCart({ customerPhoneQuery: s }),
    [updateActiveCart],
  );
  const setCustomerHits = useCallback(
    (h: CustomerRecord[]) => updateActiveCart({ customerHits: h }),
    [updateActiveCart],
  );
  const setSelectedCustomer = useCallback(
    (c: CustomerRecord | null) => updateActiveCart({ selectedCustomer: c }),
    [updateActiveCart],
  );
  const setSplitPay = useCallback(
    (b: boolean) => updateActiveCart({ splitPay: b }),
    [updateActiveCart],
  );
  const setCashSplitStr = useCallback(
    (s: string) => updateActiveCart({ cashSplitStr: s }),
    [updateActiveCart],
  );
  const setMpesaSplitStr = useCallback(
    (s: string) => updateActiveCart({ mpesaSplitStr: s }),
    [updateActiveCart],
  );
  const setSplitMpesaRef = useCallback(
    (s: string) => updateActiveCart({ splitMpesaRef: s }),
    [updateActiveCart],
  );

  // ── Cart management ───────────────────────────────────────────────

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [voidLoading, setVoidLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [outboxCount, setOutboxCount] = useState(0);
  const [outboxBusy, setOutboxBusy] = useState(false);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
  const [lastSaleCustomerName, setLastSaleCustomerName] = useState<
    string | null
  >(null);
  const [voidNotes, setVoidNotes] = useState("");

  const createCart = useCallback(() => {
    setCarts((prev) => {
      if (prev.length >= MAX_CARTS) return prev;
      const fresh = createEmptyCartSession();
      setActiveCartId(fresh.id);
      return [...prev, fresh];
    });
  }, []);

  const switchCart = useCallback((id: string) => {
    setActiveCartId(id);
    setError("");
    setNotice("");
  }, []);

  const removeCart = useCallback(
    (id: string) => {
      setCarts((prev) => {
        if (prev.length <= 1) return prev; // never remove last
        const filtered = prev.filter((c) => c.id !== id);
        if (id === activeCartId) {
          setActiveCartId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeCartId],
  );

  const refreshOutbox = useCallback(async () => {
    if (!isSaleOutboxSupported()) {
      setOutboxCount(0);
      return;
    }
    try {
      setOutboxCount(await countPendingSales());
    } catch {
      setOutboxCount(0);
    }
  }, []);

  const onSearchCustomers = useCallback(async () => {
    const q = customerPhoneQuery.trim();
    if (!q) {
      setCustomerHits([]);
      return;
    }
    if (!online) {
      setError("Go online to search customers.");
      return;
    }
    setCustomerSearchBusy(true);
    setError("");
    try {
      const rows = await fetchCustomers(q);
      setCustomerHits(rows);
      setNotice(rows.length === 0 ? "No customers match that phone." : "");
    } catch (e) {
      setCustomerHits([]);
      setError(e instanceof Error ? e.message : "Customer search failed.");
    } finally {
      setCustomerSearchBusy(false);
    }
  }, [customerPhoneQuery, online, setCustomerHits]);

  const refreshTopProducts = useCallback(() => {
    setTopProducts(getTopProducts(business?.id ?? null, 8));
  }, [business?.id]);

  useEffect(() => {
    if (!canSell) {
      return;
    }

    refreshTopProducts();
  }, [canSell, refreshTopProducts]);

  useEffect(() => {
    if (!canSell || !canBrowseCategories || !online) {
      return;
    }
    let cancelled = false;
    const spin = window.setTimeout(() => {
      if (!cancelled) {
        setCategoryTreeBusy(true);
      }
    }, 0);
    fetchCategoryTree()
      .then((tree) => {
        if (!cancelled) {
          setCategoryRoots(tree.filter((n) => n.active));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategoryRoots([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCategoryTreeBusy(false);
        }
      });
    return () => {
      window.clearTimeout(spin);
      cancelled = true;
    };
  }, [canSell, canBrowseCategories, online]);

  useEffect(() => {
    if (!canSell) {
      return;
    }
    queueMicrotask(() => {
      void refreshOutbox();
    });
  }, [canSell, refreshOutbox]);

  useEffect(() => {
    if (!canSell || !online) {
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await flushSaleOutbox();
      if (cancelled) {
        return;
      }
      await refreshOutbox();
      if (r.status === "blocked") {
        setError(`Queued sale blocked: ${r.message}`);
        setNotice("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canSell, online, refreshOutbox]);

  useEffect(() => {
    const id = lastSale?.customerId?.trim();
    if (!id || !online || !canLookupCustomers) {
      queueMicrotask(() => setLastSaleCustomerName(null));
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setLastSaleCustomerName(null);
      }
    });
    void fetchCustomerById(id)
      .then((c) => {
        if (!cancelled) {
          setLastSaleCustomerName(c.name);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLastSaleCustomerName(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lastSale?.customerId, online, canLookupCustomers]);

  useEffect(() => {
    if (!canSell) {
      return;
    }
    const q = search.trim();
    const cat = categoryFilterId?.trim();
    const typ = posItemTypeId ?? "";
    if (!q && !cat && !typ) {
      const t0 = window.setTimeout(() => {
        setHits([]);
        setSearchBanner(null);
      }, 0);
      return () => window.clearTimeout(t0);
    }
    const t = window.setTimeout(() => {
      if (!online) {
        if (!q && (cat || typ)) {
          setHits([]);
          setSearchBanner("Offline — aisle or type browsing needs network.");
          return;
        }
        const cached = readCachedItemsSearch(q);
        setHits(cached?.items ?? []);
        if (!cached) {
          setSearchBanner("Offline — no cached search for this query yet.");
        } else if (cached.stale) {
          setSearchBanner(
            "Offline — cached catalog results (may be outdated).",
          );
        } else {
          setSearchBanner("Offline — cached catalog results.");
        }
        return;
      }
      fetchItems(q || undefined, {
        ...(cat ? { categoryId: cat, includeCategoryDescendants: true } : {}),
        ...(typ ? { itemTypeId: typ } : {}),
        ...(branchId?.trim() ? { branchId: branchId.trim() } : {}),
      })
        .then((items) => {
          setHits(items);
          if (q) {
            writeCachedItemsSearch(q, items);
          }
          setSearchBanner(null);
        })
        .catch(() => {
          if (!q) {
            setHits([]);
            setSearchBanner(
              cat
                ? "Could not load items for this aisle."
                : typ
                  ? "Could not load items for this type."
                  : "Could not load catalog.",
            );
            return;
          }
          const cached = readCachedItemsSearch(q);
          setHits(cached?.items ?? []);
          setSearchBanner(
            cached
              ? "Could not reach API — showing cached catalog results."
              : "Could not reach API and no cache for this search.",
          );
        });
    }, 320);
    return () => window.clearTimeout(t);
  }, [canSell, search, online, categoryFilterId, branchId, posItemTypeId]);

  const visibleCategoryTiles = useMemo(() => {
    if (categoryBrowseStack.length === 0) {
      return categoryRoots;
    }
    const parent = categoryBrowseStack[categoryBrowseStack.length - 1];
    return (parent.children ?? []).filter((c) => c.active);
  }, [categoryRoots, categoryBrowseStack]);

  const applySubtreeFilter = useCallback((id: string, label: string) => {
    setCategoryFilterId(id);
    setCategoryFilterLabel(label);
  }, []);

  const clearCategoryFilter = useCallback(() => {
    setCategoryFilterId(null);
    setCategoryFilterLabel(null);
    setHits([]);
    setSearchBanner(null);
  }, []);

  const categoryBrowseParentId =
    categoryBrowseStack.length > 0
      ? categoryBrowseStack[categoryBrowseStack.length - 1].id
      : null;

  const typeFilterLabel = useMemo(() => {
    if (!posItemTypeId) return null;
    return itemTypes.find((t) => t.id === posItemTypeId)?.label ?? null;
  }, [posItemTypeId, itemTypes]);

  const clearPosTypeFilter = useCallback(() => {
    posCatalog?.setPosItemTypeId(null);
  }, [posCatalog]);

  const grandTotal = useMemo(() => {
    let t = 0;
    for (const line of lines) {
      const q = parseQty(line.quantity);
      const p = parseMoney(line.unitPrice);
      if (q != null && p != null) {
        t += roundMoney2(q * p);
      }
    }
    return roundMoney2(t);
  }, [lines]);

  const addLine = useCallback(
    (item: ItemSummaryRecord, qty: number = 1, unitPrice: string = "") => {
      const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
      updateActiveCart((cart) => ({
        ...cart,
        lines: [
          ...cart.lines,
          {
            key: crypto.randomUUID(),
            itemId: item.id,
            label:
              `${cashierItemPrimaryLabel(item)}${posCartLineSuffix(item)}`.trim(),
            quantity: String(safeQty),
            unitPrice: unitPrice ?? "",
            item,
          },
        ],
      }));
      setSearch("");
      setHits([]);
    },
    [updateActiveCart],
  );

  const removeLine = useCallback(
    (key: string) => {
      updateActiveCart((cart) => ({
        ...cart,
        lines: cart.lines.filter((l) => l.key !== key),
      }));
    },
    [updateActiveCart],
  );

  const updateLine = useCallback(
    (key: string, field: "quantity" | "unitPrice", value: string) => {
      updateActiveCart((cart) => ({
        ...cart,
        lines: cart.lines.map((l) =>
          l.key === key ? { ...l, [field]: value } : l,
        ),
      }));
    },
    [updateActiveCart],
  );

  const onRetryOutbox = useCallback(async () => {
    if (!online) {
      setError("Go online to sync queued sales.");
      return;
    }
    setError("");
    setOutboxBusy(true);
    try {
      const r = await flushSaleOutbox();
      await refreshOutbox();
      if (r.status === "blocked") {
        setError(r.message);
      }
    } finally {
      setOutboxBusy(false);
    }
  }, [online, refreshOutbox]);

  const onComplete = useCallback(async () => {
    const bid = branchId.trim();
    if (!bid) {
      setError("Choose a branch.");
      setNotice("");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one line.");
      setNotice("");
      return;
    }
    const payloadLines: {
      itemId: string;
      quantity: number;
      unitPrice: number;
    }[] = [];
    for (const line of lines) {
      const q = parseQty(line.quantity);
      const p = parseMoney(line.unitPrice);
      if (p == null || q == null) {
        setError("Each line needs a positive quantity and valid unit price.");
        setNotice("");
        return;
      }
      if (p < 0) {
        setError("Unit price cannot be negative.");
        setNotice("");
        return;
      }
      payloadLines.push({ itemId: line.itemId, quantity: q, unitPrice: p });
    }
    if (grandTotal <= 0) {
      setError("Grand total must be positive.");
      setNotice("");
      return;
    }

    const offlineEarly = typeof navigator !== "undefined" && !navigator.onLine;
    if (offlineEarly && payMethodNeedsCustomer(payMethod)) {
      setError(
        "Store wallet, loyalty redemption, and customer tab require an online connection.",
      );
      setNotice("");
      return;
    }
    if (!splitPay && payMethodNeedsCustomer(payMethod)) {
      if (!selectedCustomer) {
        setError("Find and select a customer for this payment type.");
        setNotice("");
        return;
      }
    }
    if (!splitPay && payMethod === "mpesa_manual" && !mpesaRef.trim()) {
      setError("Enter an M-Pesa reference for manual M-Pesa sales.");
      setNotice("");
      return;
    }
    if (splitPay) {
      const c = parseMoney(cashSplitStr);
      const m = parseMoney(mpesaSplitStr);
      if (c == null || m == null || c <= 0 || m <= 0) {
        setError("Split tender needs positive cash and M-Pesa amounts.");
        setNotice("");
        return;
      }
      if (!splitMpesaRef.trim()) {
        setError("Enter the M-Pesa reference for the split.");
        setNotice("");
        return;
      }
      const sum = roundMoney2(c + m);
      if (Math.abs(sum - grandTotal) > 0.001) {
        setError(
          `Split amounts (${sum.toFixed(2)}) must equal cart total (${grandTotal.toFixed(2)}).`,
        );
        setNotice("");
        return;
      }
    }

    const payments = splitPay
      ? [
          { method: "cash" as const, amount: parseMoney(cashSplitStr)! },
          {
            method: "mpesa_manual" as const,
            amount: parseMoney(mpesaSplitStr)!,
            reference: splitMpesaRef.trim(),
          },
        ]
      : [
          {
            method: payMethod,
            amount: grandTotal,
            reference: payMethod === "mpesa_manual" ? mpesaRef.trim() : null,
          },
        ];

    const idem = nextIdempotencyKey();
    const salePayload: PostSalePayload = {
      branchId: bid,
      ...(payMethodNeedsCustomer(payMethod) && selectedCustomer
        ? { customerId: selectedCustomer.id }
        : {}),
      lines: payloadLines,
      payments,
      clientSoldAt: new Date().toISOString(),
    };

    const linesSnapshot = lines.map((line) => ({
      item: line.item,
      qty: parseQty(line.quantity) ?? 1,
    }));

    const recordTopSellers = () => {
      recordSaleLines(business?.id ?? null, linesSnapshot);
      refreshTopProducts();
    };

    const clearCartUi = () => {
      setCarts((prev) => {
        const rest = prev.filter((c) => c.id !== activeCartId);
        if (rest.length === 0) {
          // Last cart — replace with a fresh empty one
          const fresh = createEmptyCartSession();
          setActiveCartId(fresh.id);
          return [fresh];
        }
        setActiveCartId(rest[0].id);
        return rest;
      });
    };

    setError("");
    setNotice("");

    const offlineNow = typeof navigator !== "undefined" && !navigator.onLine;
    if (offlineNow) {
      if (payMethodNeedsCustomer(payMethod)) {
        setError(
          "Store wallet, loyalty redemption, and customer tab sales cannot be queued offline.",
        );
        return;
      }
      if (!isSaleOutboxSupported()) {
        setError(
          "This browser cannot queue offline sales (IndexedDB unavailable).",
        );
        return;
      }
      setLoading(true);
      try {
        await enqueuePendingSale(idem, salePayload);
        recordTopSellers();
        clearCartUi();
        setVoidNotes("");
        await refreshOutbox();
        setNotice(
          `Offline: sale queued on this device with idempotency key ${idem.slice(0, 12)}… It will post when you are online with an open shift.`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not queue sale.");
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      await fetchCurrentShift(bid);
    } catch (e) {
      setLoading(false);
      const msg = e instanceof Error ? e.message : "No open shift.";
      setError(
        /not\s*found|404|no open shift/i.test(msg)
          ? "Open a shift for this branch on the Shifts page before selling."
          : msg,
      );
      return;
    }

    try {
      const result = await tryPostSaleWithRetries(salePayload, idem);
      if (result.ok) {
        setLastSale(result.sale);
        setVoidNotes("");
        recordTopSellers();
        clearCartUi();
        setNotice(
          `Sale ${result.sale.id} recorded. Grand total ${grandTotal.toFixed(2)}${business?.currency?.trim() ? ` ${business.currency.trim()}` : ""}.`,
        );
        await refreshOutbox();
        const drain = await flushSaleOutbox();
        await refreshOutbox();
        if (drain.status === "blocked") {
          setError(`Earlier queued sale blocked: ${drain.message}`);
        }
        return;
      }

      const msg = result.message || "Sale failed.";
      if (
        payMethod === "customer_wallet" &&
        /wallet|insufficient|balance/i.test(msg)
      ) {
        setError("Wallet payment rejected: insufficient wallet balance.");
        return;
      }
      if (
        payMethod === "loyalty_redeem" &&
        /loyalty|points|redeem|cap/i.test(msg)
      ) {
        setError(
          "Loyalty redemption rejected: check points balance and redemption cap.",
        );
        return;
      }

      if (result.status === 0 || result.status >= 500) {
        if (!isSaleOutboxSupported()) {
          setError(result.message);
          return;
        }
        try {
          await enqueuePendingSale(idem, salePayload);
          recordTopSellers();
          clearCartUi();
          setVoidNotes("");
          await refreshOutbox();
          setNotice(
            "Server unreachable after retries; sale saved to this device. It will sync when the network and shift are available.",
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not queue sale.");
        }
        return;
      }

      setError(result.message);
    } finally {
      setLoading(false);
    }
  }, [
    branchId,
    lines,
    grandTotal,
    payMethod,
    mpesaRef,
    splitPay,
    cashSplitStr,
    mpesaSplitStr,
    splitMpesaRef,
    selectedCustomer,
    business,
    refreshOutbox,
    refreshTopProducts,
    activeCartId,
  ]);

  const onVoidLastSale = useCallback(async () => {
    if (!lastSale || isSaleVoided(lastSale) || !canVoid) {
      return;
    }
    setError("");
    setVoidLoading(true);
    try {
      const updated = await postVoidSale(lastSale.id, {
        notes: voidNotes || null,
      });
      setLastSale(updated);
      setVoidNotes("");
      setNotice(
        `Sale ${updated.id} voided. Same-shift reversal applied to stock, ledger, and drawer (cash).`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Void failed.");
    } finally {
      setVoidLoading(false);
    }
  }, [lastSale, canVoid, voidNotes]);

  const onDownloadReceiptPdf = useCallback(async () => {
    if (!lastSale) {
      return;
    }
    setError("");
    setReceiptLoading(true);
    try {
      const blob = await fetchSaleReceiptPdf(lastSale.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${lastSale.id}.pdf`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download receipt.");
    } finally {
      setReceiptLoading(false);
    }
  }, [lastSale]);

  const isCashier = variant === "cashier";
  const heading = isCashier ? "Cashier" : "Quick sale";
  const activeBranchName = useMemo(
    () => branches.find((b) => b.id === branchId)?.name ?? "",
    [branches, branchId],
  );

  const canOpenShift = hasPermission(me?.permissions, Permission.ShiftsOpen);
  const canCloseShift = hasPermission(me?.permissions, Permission.ShiftsClose);
  const showPosShiftLinks = isCashier && (canOpenShift || canCloseShift);

  const [branchOpenShift, setBranchOpenShift] = useState<ShiftRecord | null>(
    null,
  );
  const [branchShiftLoading, setBranchShiftLoading] = useState(false);
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [drawoutModal, setDrawoutModal] = useState(false);

  const refetchBranchOpenShift = useCallback(() => {
    if (!branchId?.trim() || !online) {
      setBranchOpenShift(null);
      setBranchShiftLoading(false);
      return;
    }
    setBranchShiftLoading(true);
    void fetchCurrentShift(branchId.trim())
      .then((s) => {
        setBranchOpenShift(s.status === "open" ? s : null);
      })
      .catch(() => {
        setBranchOpenShift(null);
      })
      .finally(() => {
        setBranchShiftLoading(false);
      });
  }, [branchId, online]);

  useEffect(() => {
    if (!showPosShiftLinks || !branchId?.trim()) {
      setBranchOpenShift(null);
      setBranchShiftLoading(false);
      return;
    }
    if (!online) {
      setBranchShiftLoading(false);
      return;
    }
    refetchBranchOpenShift();
  }, [showPosShiftLinks, branchId, online, refetchBranchOpenShift]);

  const dialogBrandTheme = useMemo(
    () => posBrandThemeStyle(business?.branding ?? null),
    [business?.branding],
  );

  const onPosShiftShortcut = useCallback(
    (action: "new-drawout" | "open-shift" | "close-shift") => {
      setError("");
      if (action === "open-shift") {
        setOpenShiftModal(true);
        return;
      }
      if (!branchOpenShift) {
        setError("No open shift for this register.");
        return;
      }
      if (action === "close-shift") {
        setCloseShiftModal(true);
      } else {
        setDrawoutModal(true);
      }
    },
    [branchOpenShift],
  );

  const currency = business?.currency?.trim() ?? "";
  const branchSelected = Boolean(
    branchId && branches.some((b) => b.id === branchId),
  );

  if (!canSell) {
    if (!isCashier) {
      return (
        <DashboardAccessDenied
          title={heading}
          description={
            <>
              You need <code className="text-xs">{Permission.SalesSell}</code>{" "}
              to record POS sales.
            </>
          }
          backHref={APP_ROUTES.business}
          backLabel="Business settings"
        />
      );
    }
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
        <section className={DASHBOARD_SECTION_SURFACE}>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {heading}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            You need <code className="text-xs">{Permission.SalesSell}</code> to
            record POS sales.
          </p>
        </section>
      </div>
    );
  }

  if (isCashier) {
    return (
      <>
        <CashierPosLayout
          online={online}
          currency={currency}
          uiCopy={CASHIER_POS_UI_COPY}
          activeBranchName={activeBranchName}
          branchesLoading={branchesLoading}
          branchSelected={branchSelected}
          branchId={branchId}
          dialogBrandTheme={dialogBrandTheme}
          search={search}
          setSearch={setSearch}
          hits={hits}
          searchBanner={searchBanner}
          topProducts={topProducts}
          addLine={addLine}
          canBrowseCategories={canBrowseCategories}
          categoryRoots={categoryRoots}
          visibleCategoryTiles={visibleCategoryTiles}
          categoryBrowseStack={categoryBrowseStack}
          setCategoryBrowseStack={setCategoryBrowseStack}
          applySubtreeFilter={applySubtreeFilter}
          clearCategoryFilter={clearCategoryFilter}
          categoryFilterId={categoryFilterId}
          categoryFilterLabel={categoryFilterLabel}
          categoryTreeBusy={categoryTreeBusy}
          categoryBrowseParentId={categoryBrowseParentId}
          typeFilterId={posItemTypeId}
          typeFilterLabel={typeFilterLabel}
          clearTypeFilter={clearPosTypeFilter}
          posShiftLinks={
            showPosShiftLinks
              ? {
                  branchId: branchId ?? "",
                  branchSelected,
                  hasOpenShift: branchOpenShift != null,
                  shiftLoading: branchShiftLoading,
                  canOpenShift,
                  canCloseShift,
                  onShortcut: onPosShiftShortcut,
                }
              : null
          }
          cartTabs={carts.map((c) => ({
            grandTotal: cartSessionGrandTotal(c),
            id: c.id,
            label: cartSessionLabel(c),
            itemCount: cartSessionItemCount(c),
          }))}
          activeCartId={activeCartId}
          canCreateCart={carts.length < MAX_CARTS}
          onCreateCart={createCart}
          onSwitchCart={switchCart}
          onRemoveCart={removeCart}
          cart={{
            lines,
            grandTotal,
            removeLine,
            updateLine,
            payMethod,
            setPayMethod,
            mpesaRef,
            setMpesaRef,
            splitPay,
            setSplitPay,
            cashSplitStr,
            setCashSplitStr,
            mpesaSplitStr,
            setMpesaSplitStr,
            splitMpesaRef,
            setSplitMpesaRef,
            canLookupCustomers,
            customerPhoneQuery,
            setCustomerPhoneQuery,
            customerHits,
            customerSearchBusy,
            onSearchCustomers: () => void onSearchCustomers(),
            selectedCustomer,
            setSelectedCustomer,
            onComplete: () => void onComplete().catch(() => undefined),
            loading,
            outboxCount,
            outboxBusy,
            onRetryOutbox: () => void onRetryOutbox().catch(() => undefined),
            error,
            notice,
            canVoid,
            lastSale,
            lastSaleCustomerName,
            voidNotes,
            setVoidNotes,
            onVoidLastSale: () => void onVoidLastSale().catch(() => undefined),
            voidLoading,
            onDownloadReceiptPdf: () =>
              void onDownloadReceiptPdf().catch(() => undefined),
            receiptLoading,
          }}
        />
        <OpenShiftModal
          open={openShiftModal}
          onClose={() => setOpenShiftModal(false)}
          branches={branches.filter((b) => b.active)}
          preferredBranchId={branchId?.trim() || null}
          onOpened={() => {
            setOpenShiftModal(false);
            setNotice("Shift opened successfully.");
            refetchBranchOpenShift();
          }}
        />
        <CloseShiftModal
          open={closeShiftModal}
          onClose={() => setCloseShiftModal(false)}
          shift={branchOpenShift}
          onClosed={() => {
            setCloseShiftModal(false);
            setNotice("Shift closed successfully.");
            refetchBranchOpenShift();
          }}
        />
        {branchOpenShift ? (
          <DrawoutModal
            open={drawoutModal}
            onClose={() => setDrawoutModal(false)}
            shiftId={branchOpenShift.id}
            onCreated={() => {
              setDrawoutModal(false);
              setNotice("Drawout submitted.");
              refetchBranchOpenShift();
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <section
      className={cn("space-y-8", "mx-auto max-w-6xl pb-16")}
      style={dialogBrandTheme}
    >
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-[var(--pos-primary)]">
            {heading}
          </h2>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${online ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}
          >
            {online ? "Online" : "Offline"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Installable PWA: open{" "}
          <span className="font-medium text-foreground">/cashier</span> to
          install a compact cashier shell. When offline, sales can be queued
          on-device (IndexedDB) and replayed with the same{" "}
          <code className="text-xs">Idempotency-Key</code> once you are online
          with an open shift. Catalog search uses a short TTL read-through cache
          for stale/offline hints. Cash increases expected drawer closing;
          M-Pesa (manual) posts to clearing without moving the drawer. Voiding
          reverses the last completed sale only while the same shift is still
          open (<code className="text-xs">{Permission.SalesVoidOwn}</code> /{" "}
          <code className="text-xs">{Permission.SalesVoidAny}</code>).
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-4">
        <label className="flex min-w-[14rem] flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Branch</span>
          <select
            className="rounded border bg-background px-2 py-1.5"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={branchesLoading || branches.length === 0}
          >
            <option value="">—</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {topProducts.length > 0 ? (
        <section
          aria-label="Top selling products"
          className="space-y-3 rounded-3xl border border-border/50 bg-white p-4 shadow-sm ring-1 ring-black/[0.02] dark:border-border/60 dark:bg-card dark:ring-white/[0.04]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--pos-primary)_16%,transparent)] text-base font-bold leading-none text-[var(--pos-primary)]"
              >
                ★
              </span>
              <div>
                <h3 className="text-sm font-semibold leading-tight">
                  Top sellers
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  One tap to add to cart · ranked by recent sales on this device
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {topProducts.map((p) => (
              <TopSellerTile
                key={p.id}
                product={p}
                onAdd={() =>
                  addLine({
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

      {canBrowseCategories ? (
        <div className="space-y-3 rounded-md border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Browse by category</h3>
            {categoryBrowseStack.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                disabled={!online}
                onClick={() => setCategoryBrowseStack((s) => s.slice(0, -1))}
              >
                ← Back
              </Button>
            ) : null}
          </div>
          {!online ? (
            <p className="text-xs text-muted-foreground">
              Go online to load the category tree.
            </p>
          ) : categoryTreeBusy ? (
            <p className="text-xs text-muted-foreground">Loading categories…</p>
          ) : visibleCategoryTiles.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No active categories.
            </p>
          ) : (
            <>
              {categoryBrowseParentId ? (
                <div className="flex flex-wrap items-center gap-2">
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
                    Items here + subcategories
                  </Button>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {visibleCategoryTiles.map((node) => {
                  const thumb = node.thumbnailUrl?.trim();
                  const kids = (node.children ?? []).filter((c) => c.active);
                  const drillable = kids.length > 0;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      disabled={!online}
                      className="flex w-[7.5rem] shrink-0 flex-col gap-1 rounded-md border bg-background p-2 text-left text-xs shadow-sm hover:bg-accent disabled:opacity-50"
                      onClick={() => {
                        if (!online) {
                          return;
                        }
                        if (drillable) {
                          setCategoryBrowseStack((s) => [...s, node]);
                          return;
                        }
                        applySubtreeFilter(node.id, node.name);
                      }}
                    >
                      <span className="relative mx-auto h-16 w-full overflow-hidden rounded bg-muted">
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
                          <span className="flex h-full items-center justify-center text-muted-foreground">
                            —
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-2 font-medium leading-tight">
                        {node.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {drillable
                          ? `${kids.length} subcategories · tap to open`
                          : "Tap for items"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : null}

      <div className="space-y-3 rounded-md border bg-muted/20 p-4">
        <h3 className="text-sm font-medium">Add item</h3>
        {categoryFilterId ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
              Aisle: {categoryFilterLabel ?? categoryFilterId}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={clearCategoryFilter}
            >
              Clear aisle filter
            </Button>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <input
            className="max-w-md rounded border bg-background px-2 py-1.5 text-sm"
            placeholder={
              categoryFilterId
                ? "Optional search within this aisle…"
                : "Search name or SKU…"
            }
            value={search}
            onChange={(e) => {
              const v = e.target.value;
              setSearch(v);
              if (!v.trim() && !categoryFilterId?.trim()) {
                setHits([]);
                setSearchBanner(null);
              }
            }}
          />
          {searchBanner ? (
            <p className="max-w-md text-xs text-amber-800">{searchBanner}</p>
          ) : null}
          {hits.length > 0 ? (
            <ul className="max-h-48 max-w-md overflow-auto rounded border bg-background text-sm">
              {hits.map((h) => {
                const thumb = itemListThumbnailUrl(h);
                const hitTitle = cashierItemPrimaryLabel(h);
                const hitDetail = posSearchItemDetailLine(h);
                return (
                  <li key={h.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-accent"
                      onClick={() => addLine(h)}
                    >
                      {thumb ? (
                        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded border bg-muted">
                          <Image
                            src={thumb}
                            alt=""
                            width={36}
                            height={36}
                            className="object-cover"
                          />
                        </span>
                      ) : (
                        <span className="h-9 w-9 shrink-0 rounded border border-dashed border-muted-foreground/25 bg-muted/30" />
                      )}
                      <span className="min-w-0">
                        <span className="line-clamp-2 font-medium leading-snug">
                          {hitTitle}
                        </span>
                        <span className="block break-all text-xs text-muted-foreground">
                          {hitDetail}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 rounded-md border bg-muted/20 p-4">
        <h3 className="text-sm font-medium">Cart</h3>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lines yet.</p>
        ) : (
          <ul className="space-y-3">
            {lines.map((line) => (
              <li
                key={line.key}
                className="flex flex-wrap items-end gap-3 border-b border-dashed pb-3 last:border-0"
              >
                <div className="min-w-[12rem] flex-1 text-sm">
                  <p className="font-medium">{line.label}</p>
                  <p className="text-xs text-muted-foreground">{line.itemId}</p>
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">Qty</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-24 rounded border bg-background px-2 py-1.5 tabular-nums"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.key, "quantity", e.target.value)
                    }
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">
                    Unit ({currency})
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-28 rounded border bg-background px-2 py-1.5 tabular-nums"
                    value={line.unitPrice}
                    onChange={(e) =>
                      updateLine(line.key, "unitPrice", e.target.value)
                    }
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLine(line.key)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm tabular-nums">
          Total: <span className="font-medium">{grandTotal.toFixed(2)}</span>{" "}
          {currency}
        </p>
      </div>

      <div className="space-y-3 rounded-md border bg-muted/20 p-4">
        <h3 className="text-sm font-medium">Payment</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={splitPay}
            disabled={payMethodNeedsCustomer(payMethod)}
            onChange={(e) => {
              const next = e.target.checked;
              if (next && payMethodNeedsCustomer(payMethod)) {
                setPayMethod("cash");
              }
              setSplitPay(next);
            }}
          />
          Split cash + M-Pesa (amounts must equal total)
        </label>

        {splitPay ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Cash ({currency})</span>
              <input
                type="text"
                inputMode="decimal"
                className="w-28 rounded border bg-background px-2 py-1.5 tabular-nums"
                value={cashSplitStr}
                onChange={(e) => setCashSplitStr(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">M-Pesa ({currency})</span>
              <input
                type="text"
                inputMode="decimal"
                className="w-28 rounded border bg-background px-2 py-1.5 tabular-nums"
                value={mpesaSplitStr}
                onChange={(e) => setMpesaSplitStr(e.target.value)}
              />
            </label>
            <label className="flex min-w-[12rem] flex-col gap-1 text-sm">
              <span className="text-muted-foreground">M-Pesa ref</span>
              <input
                className="rounded border bg-background px-2 py-1.5"
                value={splitMpesaRef}
                onChange={(e) => setSplitMpesaRef(e.target.value)}
                placeholder="Confirmation code"
              />
            </label>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pay"
                  checked={payMethod === "cash"}
                  onChange={() => setPayMethod("cash")}
                />
                Cash
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="pay"
                  checked={payMethod === "mpesa_manual"}
                  onChange={() => setPayMethod("mpesa_manual")}
                />
                M-Pesa (manual ref)
              </label>
              {canLookupCustomers ? (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pay"
                    checked={payMethod === "customer_credit"}
                    onChange={() => {
                      setSplitPay(false);
                      setPayMethod("customer_credit");
                    }}
                  />
                  Customer tab
                </label>
              ) : null}
              {canLookupCustomers ? (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pay"
                    checked={payMethod === "customer_wallet"}
                    disabled={!online}
                    onChange={() => {
                      setSplitPay(false);
                      setPayMethod("customer_wallet");
                    }}
                  />
                  Store wallet
                </label>
              ) : null}
              {canLookupCustomers ? (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="pay"
                    checked={payMethod === "loyalty_redeem"}
                    disabled={!online}
                    onChange={() => {
                      setSplitPay(false);
                      setPayMethod("loyalty_redeem");
                    }}
                  />
                  Loyalty redemption
                </label>
              ) : null}
            </div>
            {payMethod === "mpesa_manual" ? (
              <label className="flex max-w-md flex-col gap-1 text-sm">
                <span className="text-muted-foreground">Reference</span>
                <input
                  className="rounded border bg-background px-2 py-1.5"
                  value={mpesaRef}
                  onChange={(e) => setMpesaRef(e.target.value)}
                  placeholder="e.g. QPH12ABC"
                />
              </label>
            ) : null}
            {payMethodNeedsCustomer(payMethod) && canLookupCustomers ? (
              <div className="space-y-2 rounded border border-dashed border-muted-foreground/30 p-3">
                <p className="text-xs text-muted-foreground">
                  {payMethod === "customer_credit"
                    ? "Search by phone digits, then select the customer. The full cart total posts to their tab."
                    : payMethod === "customer_wallet"
                      ? `Search by phone, then select the customer. The cart total is paid from their wallet balance (${currency}); the server rejects insufficient balance.`
                      : "Search by phone, then select the customer. Applies loyalty redemption for this cart total in cash terms — point cost and redemption caps are enforced by the server."}
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex min-w-[12rem] flex-col gap-1 text-sm">
                    <span className="text-muted-foreground">Phone</span>
                    <input
                      className="rounded border bg-background px-2 py-1.5"
                      value={customerPhoneQuery}
                      onChange={(e) => setCustomerPhoneQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void onSearchCustomers();
                        }
                      }}
                      placeholder="2547…"
                      disabled={!online}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!online || customerSearchBusy}
                    onClick={() => void onSearchCustomers()}
                  >
                    {customerSearchBusy ? "Searching…" : "Find"}
                  </Button>
                </div>
                {customerHits.length > 0 ? (
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                    {customerHits.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className={`w-full rounded border px-2 py-1.5 text-left ${
                            selectedCustomer?.id === c.id
                              ? "border-[var(--pos-primary)] bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)]"
                              : "border-transparent bg-background hover:bg-muted/50"
                          }`}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setError("");
                          }}
                        >
                          <span className="font-medium text-foreground">
                            {c.name}
                          </span>
                          <span className="block text-muted-foreground">
                            {c.phones.find((p) => p.primary)?.phone ??
                              c.phones[0]?.phone ??
                              "—"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {selectedCustomer ? (
                  <div className="space-y-1 text-xs text-foreground">
                    <p>
                      Selected:{" "}
                      <span className="font-medium">
                        {selectedCustomer.name}
                      </span>
                    </p>
                    <p className="tabular-nums text-muted-foreground">
                      Wallet{" "}
                      {Number(selectedCustomer.credit.walletBalance).toFixed(2)}{" "}
                      {currency} · {selectedCustomer.credit.loyaltyPoints} pts
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
        {outboxCount > 0 ? (
          <p className="text-sm text-amber-900">
            {outboxCount} sale(s) waiting to sync on this device.{" "}
            <button
              type="button"
              className="underline-offset-2 hover:underline disabled:opacity-50"
              disabled={outboxBusy || !online}
              onClick={() => onRetryOutbox().catch(() => undefined)}
            >
              {outboxBusy ? "Syncing…" : "Retry sync"}
            </button>
          </p>
        ) : null}
        <Button
          type="button"
          disabled={loading}
          onClick={() => onComplete().catch(() => undefined)}
          className="bg-[var(--pos-primary)] text-[var(--pos-primary-ink)] shadow-md hover:bg-[var(--pos-primary)] hover:opacity-90"
        >
          {loading ? "Recording…" : "Complete sale"}
        </Button>
      </div>

      {lastSale ? (
        <div className="space-y-3 rounded-md border border-dashed bg-muted/10 p-4">
          <h3 className="text-sm font-medium">Last sale (this session)</h3>
          <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="inline font-normal">Sale</dt>{" "}
              <dd className="inline font-mono text-foreground">
                {lastSale.id}
              </dd>
            </div>
            <div>
              <dt className="inline font-normal">Total</dt>{" "}
              <dd className="inline tabular-nums text-foreground">
                {Number(lastSale.grandTotal).toFixed(2)} {currency}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="inline font-normal">Sale journal</dt>{" "}
              <dd className="inline font-mono text-foreground">
                {lastSale.journalEntryId}
              </dd>
            </div>
            {lastSale.customerId ? (
              <div className="sm:col-span-2">
                <dt className="inline font-normal">Customer</dt>{" "}
                <dd className="inline text-foreground">
                  {lastSaleCustomerName ? (
                    <>
                      <span className="font-medium">
                        {lastSaleCustomerName}
                      </span>{" "}
                      <span className="font-mono text-muted-foreground">
                        ({lastSale.customerId})
                      </span>
                    </>
                  ) : (
                    <span className="font-mono">{lastSale.customerId}</span>
                  )}
                </dd>
              </div>
            ) : null}
            {isSaleVoided(lastSale) ? (
              <>
                <div className="sm:col-span-2">
                  <dt className="inline font-normal">Voided</dt>{" "}
                  <dd className="inline text-foreground">
                    {String(lastSale.voidedAt)}
                    {lastSale.voidJournalEntryId ? (
                      <>
                        {" "}
                        · void JE{" "}
                        <span className="font-mono">
                          {lastSale.voidJournalEntryId}
                        </span>
                      </>
                    ) : null}
                  </dd>
                </div>
                {lastSale.voidNotes ? (
                  <div className="sm:col-span-2">
                    <dt className="inline font-normal">Notes</dt>{" "}
                    <dd className="inline text-foreground">
                      {lastSale.voidNotes}
                    </dd>
                  </div>
                ) : null}
              </>
            ) : null}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={receiptLoading}
              onClick={() => onDownloadReceiptPdf().catch(() => undefined)}
            >
              {receiptLoading ? "Downloading…" : "Receipt PDF"}
            </Button>
          </div>
          {canVoid && !isSaleVoided(lastSale) ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
                <span className="text-muted-foreground">
                  Void notes (optional)
                </span>
                <input
                  className="rounded border bg-background px-2 py-1.5"
                  value={voidNotes}
                  onChange={(e) => setVoidNotes(e.target.value)}
                  placeholder="Reason / reference"
                  disabled={voidLoading}
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={voidLoading}
                onClick={() => onVoidLastSale().catch(() => undefined)}
              >
                {voidLoading ? "Voiding…" : "Void this sale"}
              </Button>
            </div>
          ) : null}
          {!canVoid && !isSaleVoided(lastSale) ? (
            <p className="text-xs text-muted-foreground">
              You do not have void permission on this account. Ask an admin to
              grant <code className="text-xs">{Permission.SalesVoidOwn}</code>{" "}
              or <code className="text-xs">{Permission.SalesVoidAny}</code>.
            </p>
          ) : null}
        </div>
      ) : null}
      {notice ? <DashboardFeedback kind="success" text={notice} /> : null}
      {error ? <DashboardFeedback kind="error" text={error} /> : null}
    </section>
  );
}

type TopSellerTileProps = {
  product: TopProductRecord;
  onAdd: () => void;
};

function TopSellerTile({ product, onAdd }: TopSellerTileProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-white text-left shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-border hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
        "dark:border-border/60 dark:bg-card",
      )}
      aria-label={`Add ${product.name}`}
    >
      <div className="relative aspect-[5/4] w-full shrink-0 bg-neutral-50 dark:bg-muted/50">
        {product.thumbnailUrl ? (
          <Image
            src={product.thumbnailUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
            className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
            unoptimized
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-4xl font-bold tracking-tight text-muted-foreground/50"
            aria-hidden
          >
            {product.name.trim().charAt(0).toUpperCase() || "?"}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 pt-2.5">
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
          {product.name}
        </p>
      </div>
    </button>
  );
}
