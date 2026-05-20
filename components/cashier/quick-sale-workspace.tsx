"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  DashboardAccessDenied,
  DASHBOARD_SECTION_SURFACE,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { CASHIER_POS_UI_COPY } from "@/lib/cashier-pos-copy";
import { APP_ROUTES } from "@/lib/config";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  fetchCategoryTree,
  fetchCurrentShift,
  fetchCustomerById,
  createCustomer,
  fetchCustomers,
  fetchItems,
  fetchPosStkPushStatus,
  fetchSaleReceiptPdf,
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
import { parseStkPhoneParts } from "@/lib/stk-phone";
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
} from "@/lib/cashier-item-display";
import {
  createEmptyCartSession,
  cartSessionLabel,
  cartSessionItemCount,
  cartSessionGrandTotal,
  MAX_CARTS,
  type CartSession,
} from "@/lib/cart-session";
import {
  customerPhoneValidationMessage,
  isValidCustomerPhone,
} from "@/lib/customer-phone";
import { resolveReceiptWebsite } from "@/lib/branch-receipt";
import {
  buildPosReceiptSnapshot,
  type PosReceiptSnapshot,
} from "@/lib/pos-receipt";
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
  const canManageCustomers = hasPermission(
    me?.permissions,
    Permission.CreditsCustomersWrite,
  );
  const canVoid =
    hasPermission(me?.permissions, Permission.SalesVoidAny) ||
    hasPermission(me?.permissions, Permission.SalesVoidOwn);

  const branchLockedRole =
    me?.role?.key?.trim().toLowerCase() === "stock_manager" ||
    me?.role?.key?.trim().toLowerCase() === "cashier";

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
  const customerNoPhoneMatch = activeCart.customerNoPhoneMatch;
  const customerRegisterName = activeCart.customerRegisterName;
  const selectedCustomer = activeCart.selectedCustomer;
  const splitPay = activeCart.splitPay;
  const cashSplitStr = activeCart.cashSplitStr;
  const mpesaSplitStr = activeCart.mpesaSplitStr;
  const splitMpesaRef = activeCart.splitMpesaRef;
  const cashTenderStr = activeCart.cashTenderStr;
  const stkPushStatus = activeCart.stkPushStatus;
  const stkPushError = activeCart.stkPushError;
  const stkPushCheckoutId = activeCart.stkPushCheckoutId;
  const stkAreaCode = activeCart.stkAreaCode;
  const stkPhone = activeCart.stkPhone;

  const [customerSearchBusy, setCustomerSearchBusy] = useState(false);
  const [customerRegisterBusy, setCustomerRegisterBusy] = useState(false);
  const stkConfirmedToastKey = useRef<string | null>(null);

  const notifyStkPaymentConfirmed = useCallback((checkoutId: string) => {
    const key = checkoutId.trim();
    if (!key || stkConfirmedToastKey.current === key) {
      return;
    }
    stkConfirmedToastKey.current = key;
    toast.success("M-Pesa payment received", {
      description: "Payment confirmed — you can complete the sale.",
      duration: 10_000,
    });
  }, []);

  const setPayMethod = useCallback(
    (m: SalePaymentMethod) => updateActiveCart({ payMethod: m }),
    [updateActiveCart],
  );
  const setMpesaRef = useCallback(
    (s: string) => updateActiveCart({ mpesaRef: s }),
    [updateActiveCart],
  );
  const setCustomerPhoneQuery = useCallback(
    (s: string) =>
      updateActiveCart({
        customerPhoneQuery: s,
        customerNoPhoneMatch: false,
        customerRegisterName: "",
        customerHits: [],
        selectedCustomer: null,
      }),
    [updateActiveCart],
  );
  const setCustomerRegisterName = useCallback(
    (s: string) => updateActiveCart({ customerRegisterName: s }),
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
  const setCashTenderStr = useCallback(
    (s: string) => updateActiveCart({ cashTenderStr: s }),
    [updateActiveCart],
  );
  const setStkAreaCode = useCallback(
    (s: string) => updateActiveCart({ stkAreaCode: s }),
    [updateActiveCart],
  );
  const setStkPhone = useCallback(
    (s: string) => updateActiveCart({ stkPhone: s }),
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
  const [lastReceipt, setLastReceipt] = useState<PosReceiptSnapshot | null>(
    null,
  );
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
    if (payMethod === "customer_credit") {
      const phoneErr = customerPhoneValidationMessage(q);
      if (phoneErr) {
        setError(phoneErr);
        setNotice("");
        return;
      }
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
      updateActiveCart({
        customerNoPhoneMatch: rows.length === 0,
        customerRegisterName: "",
        selectedCustomer: null,
      });
      setNotice("");
    } catch (e) {
      setCustomerHits([]);
      updateActiveCart({ customerNoPhoneMatch: false, customerRegisterName: "" });
      setError(e instanceof Error ? e.message : "Customer search failed.");
    } finally {
      setCustomerSearchBusy(false);
    }
  }, [customerPhoneQuery, online, payMethod, setCustomerHits, updateActiveCart]);

  const onRegisterCustomer = useCallback(async () => {
    const phone = customerPhoneQuery.trim();
    const name = customerRegisterName.trim();
    if (!phone) {
      setError("Enter a phone number first.");
      setNotice("");
      return;
    }
    const phoneErr = customerPhoneValidationMessage(phone);
    if (phoneErr) {
      setError(phoneErr);
      setNotice("");
      return;
    }
    if (!name) {
      setError("Enter the customer's name to register them.");
      setNotice("");
      return;
    }
    if (!online) {
      setError("Go online to register a customer.");
      setNotice("");
      return;
    }
    if (!canManageCustomers) {
      setError("You do not have permission to register customers.");
      setNotice("");
      return;
    }
    setCustomerRegisterBusy(true);
    setError("");
    try {
      const created = await createCustomer({
        name,
        phones: [{ phone, primary: true }],
      });
      setCustomerHits([created]);
      setSelectedCustomer(created);
      updateActiveCart({
        customerNoPhoneMatch: false,
        customerRegisterName: "",
      });
      setNotice(`${created.name} registered — tab ready for credit.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not register customer.");
    } finally {
      setCustomerRegisterBusy(false);
    }
  }, [
    canManageCustomers,
    customerPhoneQuery,
    customerRegisterName,
    online,
    setCustomerHits,
    setSelectedCustomer,
    updateActiveCart,
  ]);

  const refreshTopProducts = useCallback(() => {
    setTopProducts(getTopProducts(business?.id ?? null, 8));
  }, [business?.id]);

  const handleStalePosItem = useCallback(
    (itemId: string) => {
      refreshTopProducts();
      setHits((prev) => prev.filter((h) => h.id !== itemId));
    },
    [refreshTopProducts],
  );

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

  const canCompleteSale = useMemo(() => {
    if (lines.length === 0 || grandTotal <= 0) {
      return false;
    }
    if (splitPay) {
      const c = parseMoney(cashSplitStr);
      const m = parseMoney(mpesaSplitStr);
      if (c == null || m == null || c <= 0 || m <= 0) {
        return false;
      }
      return Math.abs(roundMoney2(c + m) - grandTotal) <= 0.001;
    }
    if (payMethod === "cash") {
      const tender = parseMoney(cashTenderStr.trim());
      return tender != null && tender >= grandTotal;
    }
    if (payMethodNeedsCustomer(payMethod)) {
      if (!selectedCustomer) {
        return false;
      }
      if (
        payMethod === "customer_credit" &&
        !isValidCustomerPhone(customerPhoneQuery)
      ) {
        return false;
      }
    }
    return true;
  }, [
    lines.length,
    grandTotal,
    splitPay,
    cashSplitStr,
    mpesaSplitStr,
    payMethod,
    cashTenderStr,
    selectedCustomer,
    customerPhoneQuery,
  ]);

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

  const lastStkPrefillCustomerId = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedCustomer) {
      lastStkPrefillCustomerId.current = null;
      return;
    }
    if (lastStkPrefillCustomerId.current === selectedCustomer.id) {
      return;
    }
    lastStkPrefillCustomerId.current = selectedCustomer.id;
    const raw = selectedCustomer.phones[0]?.phone?.trim();
    if (raw) {
      const { areaCode, local } = parseStkPhoneParts(raw);
      updateActiveCart({ stkAreaCode: areaCode, stkPhone: local });
    }
  }, [selectedCustomer, updateActiveCart]);

  const onStkPush = useCallback(
    async (phoneNumber: string) => {
      if (!online) {
        updateActiveCart({
          stkPushStatus: "failed",
          stkPushError: "Offline — cannot send STK Push",
        });
        return;
      }
      stkConfirmedToastKey.current = null;
      updateActiveCart({
        stkPushStatus: "sending",
        stkPushError: "",
        stkPushCheckoutId: "",
      });
      try {
        const { nextIdempotencyKey } = await import("@/lib/idempotency-key");
        const { initiatePosStkPush } = await import("@/lib/api");
        const result = await initiatePosStkPush(
          { phoneNumber, amount: grandTotal, description: "POS sale" },
          nextIdempotencyKey(),
        );
        if (!result.accepted || !result.checkoutRequestId) {
          throw new Error(result.message || "STK Push declined");
        }
        updateActiveCart({
          stkPushStatus: "sent",
          stkPushCheckoutId: result.checkoutRequestId,
          mpesaRef: result.checkoutRequestId,
          stkPushError: "",
        });
      } catch (e) {
        updateActiveCart({
          stkPushStatus: "failed",
          stkPushError: e instanceof Error ? e.message : "STK Push failed",
        });
      }
    },
    [online, grandTotal, updateActiveCart],
  );

  useEffect(() => {
    if (stkPushStatus !== "sent" || !stkPushCheckoutId?.trim() || !online) {
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await fetchPosStkPushStatus(stkPushCheckoutId);
        if (cancelled) {
          return;
        }
        if (status.success) {
          notifyStkPaymentConfirmed(stkPushCheckoutId);
          updateActiveCart({
            stkPushStatus: "confirmed",
            stkPushError: "",
            mpesaRef: status.gatewayTransactionId ?? stkPushCheckoutId,
          });
        } else if (status.failed) {
          updateActiveCart({
            stkPushStatus: "failed",
            stkPushError: status.failureReason ?? "M-Pesa payment failed",
          });
        }
      } catch {
        /* keep polling */
      }
    };
    const interval = setInterval(() => void poll(), 4000);
    void poll();
    const stop = setTimeout(() => clearInterval(interval), 180_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [
    stkPushStatus,
    stkPushCheckoutId,
    online,
    updateActiveCart,
    notifyStkPaymentConfirmed,
  ]);

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
      if (payMethod === "customer_credit") {
        const phoneErr = customerPhoneValidationMessage(customerPhoneQuery);
        if (phoneErr) {
          setError(phoneErr);
          setNotice("");
          return;
        }
      }
      if (!selectedCustomer) {
        setError("Find and select a customer for this payment type.");
        setNotice("");
        return;
      }
    }
    let cashTendered: number | null = null;
    if (!splitPay && payMethod === "cash") {
      const raw = cashTenderStr.trim();
      const tender = parseMoney(raw);
      if (tender == null) {
        setError("Enter the amount received from the customer.");
        setNotice("");
        return;
      }
      if (tender < grandTotal) {
        setError(
          `Amount received (${tender.toFixed(2)}) is less than the total (${grandTotal.toFixed(2)}).`,
        );
        setNotice("");
        return;
      }
      cashTendered = tender;
    }
    if (splitPay) {
      const c = parseMoney(cashSplitStr);
      const m = parseMoney(mpesaSplitStr);
      if (c == null || m == null || c <= 0 || m <= 0) {
        setError("Split tender needs positive cash and M-Pesa amounts.");
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
            reference: splitMpesaRef.trim() || null,
          },
        ]
      : [
          {
            method: payMethod,
            amount: grandTotal,
            reference:
              payMethod === "mpesa_manual" ? mpesaRef.trim() || null : null,
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
    const receiptCartLines = [...lines];
    const receiptCustomerName = selectedCustomer?.name?.trim() || null;
    const receiptBranch = branches.find((b) => b.id === bid);
    const receiptBranchName = receiptBranch?.name?.trim() ?? "";
    const receiptCurrency = business?.currency?.trim() || "KES";
    const receiptBusinessName = business?.name?.trim() || "Store";
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
        setLastReceipt(
          buildPosReceiptSnapshot({
            businessName: receiptBusinessName,
            logoUrl: business?.branding?.logoUrl ?? null,
            branchName: receiptBranchName,
            branchAddress: receiptBranch?.address?.trim() || null,
            branchPhone: receiptBranch?.receipt?.phone ?? null,
            branchEmail: receiptBranch?.receipt?.email ?? null,
            branchWebsite: resolveReceiptWebsite(
              receiptBranch?.receipt?.website,
              business?.primaryDomain,
            ),
            branchReceiptMessage: receiptBranch?.receipt?.footerNote ?? null,
            servedByName:
              me?.name?.trim() || result.sale.soldByName?.trim() || null,
            currency: receiptCurrency,
            cartLines: receiptCartLines,
            sale: result.sale,
            customerName: receiptCustomerName,
            cashTendered,
            clientSoldAt: salePayload.clientSoldAt ?? undefined,
          }),
        );
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
    cashTenderStr,
    selectedCustomer,
    business,
    branches,
    me,
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
      setLastReceipt((prev) =>
        prev && prev.saleId === updated.id
          ? { ...prev, voided: true, status: updated.status }
          : prev,
      );
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

  const onStartNewSale = useCallback(() => {
    setLastSale(null);
    setLastReceipt(null);
    setVoidNotes("");
    setNotice("");
    setError("");
  }, []);

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

  return (
    <>
      <CashierPosLayout
        pageTitle={heading}
        embeddedInDashboard={!isCashier}
        brandTheme={dialogBrandTheme}
        online={online}
        currency={currency}
        uiCopy={CASHIER_POS_UI_COPY}
        activeBranchName={activeBranchName}
        branchesLoading={branchesLoading}
        branchSelected={branchSelected}
        branchId={branchId}
        businessId={business?.id ?? null}
        onStalePosItem={handleStalePosItem}
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
          cashTenderStr,
          setCashTenderStr,
          stkAreaCode,
          setStkAreaCode,
          stkPhone,
          setStkPhone,
          stkPushStatus,
          stkPushError,
          onStkPush,
          canLookupCustomers,
          canManageCustomers,
          customerPhoneQuery,
          setCustomerPhoneQuery,
          customerHits,
          customerNoPhoneMatch,
          customerRegisterName,
          setCustomerRegisterName,
          customerSearchBusy,
          customerRegisterBusy,
          onSearchCustomers: () => void onSearchCustomers(),
          onRegisterCustomer: () => void onRegisterCustomer(),
          selectedCustomer,
          setSelectedCustomer,
          onComplete: () => void onComplete().catch(() => undefined),
          canCompleteSale,
          loading,
          outboxCount,
          outboxBusy,
          onRetryOutbox: () => void onRetryOutbox().catch(() => undefined),
          error,
          notice,
          canVoid,
          lastSale,
          lastReceipt,
          lastSaleCustomerName,
          voidNotes,
          setVoidNotes,
          onVoidLastSale: () => void onVoidLastSale().catch(() => undefined),
          voidLoading,
          onDownloadReceiptPdf: () =>
            void onDownloadReceiptPdf().catch(() => undefined),
          receiptLoading,
          onStartNewSale,
        }}
      />
      {isCashier ? (
        <>
          <OpenShiftModal
            open={openShiftModal}
            onClose={() => setOpenShiftModal(false)}
            branches={branches.filter((b) => b.active)}
            preferredBranchId={branchId?.trim() || null}
            lockBranchSelectionTo={
              branchLockedRole ? (me?.branchId ?? null) : null
            }
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
      ) : null}
    </>
  );
}
