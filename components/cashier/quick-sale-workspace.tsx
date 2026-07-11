"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  DashboardAccessDenied,
  DASHBOARD_SECTION_SURFACE,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { CASHIER_POS_UI_COPY } from "@/lib/cashier-pos-copy";
import { APP_ROUTES } from "@/lib/config";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useScopeChangeGuard } from "@/hooks/use-scope-change-guard";
import { useFeatureFlag } from "@/components/providers/tenant-provider";
import {
  fetchCategoryTree,
  fetchCurrentShift,
  fetchCustomerById,
  createCustomer,
  fetchCustomers,
  fetchItems,
  fetchPosStkPushStatus,
  fetchPosTopProducts,
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
import { allowNegativeStockForSales } from "@/lib/inventory-access";
import {
  countPendingSales,
  enqueuePendingSale,
  flushSaleOutbox,
  isSaleOutboxSupported,
} from "@/lib/sale-outbox";
import {
  lookupGroceryInvoiceByBarcode,
  lockGroceryInvoice,
  payGroceryInvoice,
  unlockGroceryInvoice,
  GroceryApiError,
} from "@/lib/grocery-api";
import {
  getTopProducts,
  recordSaleLines,
  type TopProductRecord,
} from "@/lib/top-products";
import {
  cashierItemPrimaryLabel,
  posAvailablePackages,
  posCartLineSuffix,
} from "@/lib/cashier-item-display";
import {
  createEmptyCartSession,
  pickActiveCartId,
  resetCartSessionKeepingTab,
  resolveCartTargetForAdd,
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
import { printPosReceipt } from "@/lib/desktop-print";
import { IS_DESKTOP } from "@/lib/runtime";
import {
  buildPosReceiptSnapshot,
  type PosReceiptSnapshot,
} from "@/lib/pos-receipt";
import { CashierPosLayout } from "./cashier-pos-layout";
import { TillPrinterStatus } from "./till-printer-status";
import { PendingInvoicesPanel } from "./pending-invoices-panel";
import { PendingSalesPanel } from "./pending-sales-panel";
import {
  CloseShiftModal,
  DrawoutModal,
  OpenShiftModal,
} from "@/components/shifts/shift-action-modals";
import {
  POS_DRAFT_FLAGS,
  fetchPosDraft,
  listPosDrafts,
  tryCompletePosDraftWithRetries,
} from "@/lib/pos-draft-api";
import {
  applyPosDraftToCart,
  mergeHydratedCartSessions,
  replayMirroredDraftsToServer,
  syncCartSessionToServer,
} from "@/lib/pos-draft-sync";
import {
  enqueuePendingDraftComplete,
  flushPendingDraftCompleteOutbox,
  isPosDraftStoreSupported,
  loadMirroredCarts,
  removeMirroredCart,
  saveMirroredCart,
  saveMirroredCarts,
} from "@/lib/pos-draft-store";

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

/** Match cart lines for quantity merge (tolerate 3.9 vs 3.90). */
function sameCartUnitPrice(a: string, b: string): boolean {
  const left = parseMoney(a);
  const right = parseMoney(b);
  if (left != null && right != null) {
    return Math.abs(left - right) < 0.001;
  }
  return a.trim() === b.trim();
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
    branchesLoading,
    itemTypes,
    itemTypeId: headerItemTypeId,
  } = useDashboard();
  const online = useOnlineStatus();
  const posDraftsEnabled = useFeatureFlag(POS_DRAFT_FLAGS.enabled);
  const posDraftsShadow = useFeatureFlag(POS_DRAFT_FLAGS.shadowWrites);
  const posDraftsUi = useFeatureFlag(POS_DRAFT_FLAGS.uiVisible);
  const posDraftOfflineMirror = useFeatureFlag(POS_DRAFT_FLAGS.offlineMirror);
  const posDraftPersistence = posDraftsEnabled || posDraftsShadow;
  const posDraftSyncEnabled = posDraftPersistence || posDraftOfflineMirror;
  const posDraftSyncTimers = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const posDraftMirrorTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const posDraftHydratedRef = useRef(false);
  const resumeDraftHandledRef = useRef(false);
  const invoiceParamHandledRef = useRef(false);
  const wasOfflineRef = useRef(false);
  const searchParams = useSearchParams();
  // Catalog search/browse is scoped to the header department. On the cashier
  // POS the header defaults to "All departments" so clerks can sell across every
  // department without changing scope first.
  const posItemTypeId = headerItemTypeId?.trim() || null;
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
  const allowNegativeStock = allowNegativeStockForSales(business);

  const branchLockedRole =
    me?.role?.key?.trim().toLowerCase() === "stock_manager" ||
    me?.role?.key?.trim().toLowerCase() === "cashier" ||
    me?.role?.key?.trim().toLowerCase() === "grocery_clerk";

  const [topProducts, setTopProducts] = useState<TopProductRecord[]>([]);
  const [topProductsLoading, setTopProductsLoading] = useState(false);
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
  /** When false (default), aisle browse clears after a successful add-to-cart. */
  const [keepAisleFilter, setKeepAisleFilter] = useState(false);

  // ── Multi-cart state ──────────────────────────────────────────────
  const [carts, setCarts] = useState<CartSession[]>(() => [
    createEmptyCartSession(),
  ]);
  const [activeCartId, setActiveCartId] = useState<string>(carts[0].id);

  // ── Page-level UI state (declared early because cart/draft callbacks reference them)
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [voidLoading, setVoidLoading] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [outboxCount, setOutboxCount] = useState(0);
  const [invoiceRefreshKey, setInvoiceRefreshKey] = useState(0);
  const [pendingSalesRefreshKey, setPendingSalesRefreshKey] = useState(0);
  /** Incremented after successful auto-print so the checkout drawer closes. */
  const [checkoutCompletedKey, setCheckoutCompletedKey] = useState(0);
  const [outboxBusy, setOutboxBusy] = useState(false);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
  const [lastReceipt, setLastReceipt] = useState<PosReceiptSnapshot | null>(
    null,
  );
  const [lastSaleCustomerName, setLastSaleCustomerName] = useState<
    string | null
  >(null);
  const [voidNotes, setVoidNotes] = useState("");

  const activeCart = useMemo(
    () =>
      carts.find((c) => c.id === activeCartId) ??
      carts.find((c) => c.lines.length === 0) ??
      carts[0] ??
      createEmptyCartSession(),
    [carts, activeCartId],
  );

  /** Repair stale tab selection after draft hydration or cart list changes. */
  useEffect(() => {
    setActiveCartId((current) => pickActiveCartId(carts, current));
  }, [carts]);

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

  const updateCartById = useCallback(
    (
      cartId: string,
      patch: Partial<CartSession> | ((prev: CartSession) => CartSession),
    ) => {
      setCarts((prev) =>
        prev.map((c) => {
          if (c.id !== cartId) return c;
          if (typeof patch === "function") return patch(c);
          return { ...c, ...patch };
        }),
      );
    },
    [],
  );

  const schedulePosDraftSync = useCallback(
    (cartId: string, debounceMs = 300) => {
      if (!posDraftSyncEnabled) return;
      const bid = branchId.trim();
      const bizId = business?.id?.trim() ?? "";
      const uid = me?.id?.trim() ?? "";
      if (!bid) return;

      const pending = posDraftSyncTimers.current[cartId];
      if (pending) clearTimeout(pending);

      posDraftSyncTimers.current[cartId] = setTimeout(() => {
        void (async () => {
          let snapshot: CartSession | undefined;
          setCarts((prev) => {
            snapshot = prev.find((c) => c.id === cartId);
            if (
              !snapshot ||
              (snapshot.lines.length === 0 &&
                (snapshot.removedServerLineIds ?? []).length === 0)
            ) {
              return prev;
            }
            return prev.map((c) =>
              c.id === cartId ? { ...c, syncStatus: "syncing" as const } : c,
            );
          });
          if (
            !snapshot ||
            (snapshot.lines.length === 0 &&
              (snapshot.removedServerLineIds ?? []).length === 0)
          ) {
            return;
          }

          if (!online) {
            if (posDraftOfflineMirror && bizId && uid) {
              await saveMirroredCart(bizId, bid, uid, snapshot);
              updateCartById(cartId, (prev) => ({
                ...prev,
                syncStatus: "idle",
              }));
            }
            return;
          }

          if (!posDraftPersistence) {
            if (posDraftOfflineMirror && bizId && uid) {
              await saveMirroredCart(bizId, bid, uid, snapshot);
              updateCartById(cartId, (prev) => ({
                ...prev,
                syncStatus: "idle",
              }));
            }
            return;
          }

          const synced = await syncCartSessionToServer(snapshot, bid, {
            uiVisible: posDraftsUi || posDraftsEnabled,
          });
          const merged = {
            ...synced,
            id: snapshot.id,
            label: snapshot.label,
            createdAt: snapshot.createdAt,
          };
          updateCartById(cartId, () => merged);
          if (posDraftOfflineMirror && bizId && uid) {
            await saveMirroredCart(bizId, bid, uid, merged);
          }
        })();
      }, debounceMs);
    },
    [
      posDraftSyncEnabled,
      posDraftPersistence,
      posDraftOfflineMirror,
      online,
      branchId,
      business?.id,
      me?.id,
      updateCartById,
      posDraftsUi,
      posDraftsEnabled,
    ],
  );

  useEffect(() => {
    posDraftHydratedRef.current = false;
  }, [branchId, business?.id, me?.id]);

  /** Hydrate mirrored + server pending drafts on POS load. */
  useEffect(() => {
    if (!posDraftSyncEnabled) return;
    const bid = branchId.trim();
    const uid = me?.id?.trim();
    const bizId = business?.id?.trim();
    if (!bid || !uid || !bizId) return;
    if (posDraftHydratedRef.current) return;

    posDraftHydratedRef.current = true;
    const uiOpts = { uiVisible: posDraftsUi || posDraftsEnabled };

    void (async () => {
      let localCarts: CartSession[] = [];
      if (posDraftOfflineMirror && isPosDraftStoreSupported()) {
        localCarts = await loadMirroredCarts(bizId, bid, uid);
      }

      if (!online) {
        if (localCarts.length > 0) {
          const merged = mergeHydratedCartSessions(localCarts, [], uiOpts);
          setCarts(merged);
          setActiveCartId((current) => pickActiveCartId(merged, current));
        }
        return;
      }

      try {
        const res = await listPosDrafts({
          branchId: bid,
          status: "pending",
          createdBy: uid,
        });
        const summaries = res.drafts ?? [];
        const fullDrafts =
          summaries.length > 0
            ? await Promise.all(
                summaries.slice(0, MAX_CARTS).map((d) => fetchPosDraft(d.id)),
              )
            : [];

        if (localCarts.length > 0 || fullDrafts.length > 0) {
          let merged = mergeHydratedCartSessions(
            localCarts,
            fullDrafts,
            uiOpts,
          );
          if (
            posDraftPersistence &&
            localCarts.some((c) => c.lines.length > 0)
          ) {
            const replay = await replayMirroredDraftsToServer(
              merged,
              bid,
              uiOpts,
            );
            merged = merged.map(
              (c) => replay.carts.find((r) => r.id === c.id) ?? c,
            );
            if (replay.hadConflict) {
              setNotice(
                "Some sales could not sync — resolve conflicts before checkout.",
              );
            }
          }
          setCarts(merged);
          setActiveCartId((current) => pickActiveCartId(merged, current));
          if (posDraftOfflineMirror) {
            await saveMirroredCarts(bizId, bid, uid, merged);
          }
        }
      } catch {
        if (localCarts.length > 0) {
          const merged = mergeHydratedCartSessions(localCarts, [], uiOpts);
          setCarts(merged);
          setActiveCartId((current) => pickActiveCartId(merged, current));
        }
      }
    })();
  }, [
    posDraftSyncEnabled,
    posDraftOfflineMirror,
    posDraftPersistence,
    online,
    branchId,
    me?.id,
    business?.id,
    posDraftsUi,
    posDraftsEnabled,
  ]);

  useEffect(() => {
    if (!posDraftOfflineMirror || !isPosDraftStoreSupported()) return;
    const bizId = business?.id?.trim();
    const bid = branchId.trim();
    const uid = me?.id?.trim();
    if (!bizId || !bid || !uid) return;

    if (posDraftMirrorTimer.current) {
      clearTimeout(posDraftMirrorTimer.current);
    }
    posDraftMirrorTimer.current = setTimeout(() => {
      void saveMirroredCarts(bizId, bid, uid, carts);
    }, 500);

    return () => {
      if (posDraftMirrorTimer.current) {
        clearTimeout(posDraftMirrorTimer.current);
      }
    };
  }, [carts, posDraftOfflineMirror, business?.id, branchId, me?.id]);

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

  const cartScopeBranchIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (lines.length === 0) {
      cartScopeBranchIdRef.current = null;
      return;
    }
    if (!cartScopeBranchIdRef.current) {
      const bid = branchId.trim();
      if (bid) cartScopeBranchIdRef.current = bid;
    }
  }, [lines.length, branchId]);

  useScopeChangeGuard(
    "cashier-cart",
    lines.length > 0,
    "This cart has items that were added for the current branch.",
  );

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
      const cartToRemove = carts.find((c) => c.id === id);
      if (cartToRemove?.groceryInvoiceId && online) {
        void unlockGroceryInvoice(cartToRemove.groceryInvoiceId);
      }
      setCarts((prev) => {
        if (prev.length <= 1) return prev; // never remove last
        const filtered = prev.filter((c) => c.id !== id);
        if (id === activeCartId) {
          setActiveCartId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeCartId, carts, online],
  );

  /** Remove the cart used for a completed sale and focus the next empty tab. */
  const clearCartAfterSale = useCallback(
    (cartIdToClear: string) => {
      const bizId = business?.id?.trim();
      const bid = branchId.trim();
      const uid = me?.id?.trim();
      if (posDraftOfflineMirror && bizId && bid && uid) {
        void removeMirroredCart(bizId, bid, uid, cartIdToClear);
      }
      setCarts((prev) => {
        const rest = prev.filter((c) => c.id !== cartIdToClear);
        const next = rest.length === 0 ? [createEmptyCartSession()] : rest;
        setActiveCartId(next[0].id);
        return next;
      });
    },
    [posDraftOfflineMirror, business?.id, branchId, me?.id],
  );

  const openDraftIds = useMemo(
    () =>
      carts
        .map((c) => c.draftId)
        .filter((id): id is string => id != null && id.length > 0),
    [carts],
  );

  const resumePosDraft = useCallback(
    async (draftId: string) => {
      const trimmed = draftId.trim();
      if (!trimmed) return;

      const existing = carts.find((c) => c.draftId === trimmed);
      if (existing) {
        setActiveCartId(existing.id);
        if (existing.ticketNumber != null) {
          toast.info(`Sale #${existing.ticketNumber} is already open`);
        }
        return;
      }

      const occupiedTabs = carts.filter((c) => c.lines.length > 0).length;
      if (occupiedTabs >= MAX_CARTS) {
        toast.error(`Maximum ${MAX_CARTS} sales can be open at once`);
        return;
      }

      try {
        const draft = await fetchPosDraft(trimmed);
        if (draft.status !== "pending") {
          toast.error("This sale is no longer pending.");
          setPendingSalesRefreshKey((k) => k + 1);
          return;
        }

        const shell = createEmptyCartSession();
        const cart = applyPosDraftToCart(shell, draft, {
          uiVisible: posDraftsUi || posDraftsEnabled,
        });

        setCarts((prev) => {
          const nonEmpty = prev.filter((c) => c.lines.length > 0);
          const empty = prev.filter((c) => c.lines.length === 0);
          const next = [...nonEmpty, cart];
          const trailing =
            next.length < MAX_CARTS
              ? empty.length > 0
                ? [empty[0]]
                : [createEmptyCartSession()]
              : [];
          return [...next, ...trailing];
        });
        setActiveCartId(cart.id);
        setPendingSalesRefreshKey((k) => k + 1);
        toast.success(`Resumed sale #${draft.ticketNumber}`);
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Could not load pending sale",
        );
      }
    },
    [carts, posDraftsUi, posDraftsEnabled],
  );

  /** Deep link: /cashier?resumeDraft={id} */
  useEffect(() => {
    const draftId = searchParams.get("resumeDraft")?.trim();
    if (!draftId || resumeDraftHandledRef.current) return;
    if (!posDraftPersistence || !online || !branchId.trim()) return;
    resumeDraftHandledRef.current = true;
    void resumePosDraft(draftId);
  }, [searchParams, posDraftPersistence, online, branchId, resumePosDraft]);

  const dismissCompletedSaleUi = useCallback(() => {
    setLastSale(null);
    setLastReceipt(null);
    setVoidNotes("");
  }, []);

  /** Load a grocery invoice by GI-* barcode into a new cart tab. */
  const loadGroceryInvoiceByBarcode = useCallback(
    async (barcode: string) => {
      const q = barcode.trim();
      if (!q || !q.startsWith("GI-") || !online) return;

      const bid = branchId?.trim();
      if (!bid) return;

      try {
        const invoice = await lookupGroceryInvoiceByBarcode(q);

        if (invoice.status !== "pending_payment") {
          const labels: Record<string, string> = {
            paid: "already been paid",
            cancelled: "been cancelled",
            expired: "expired",
          };
          toast.error(
            `This invoice has ${labels[invoice.status] ?? invoice.status}.`,
            { duration: 5000 },
          );
          return;
        }

        try {
          await lockGroceryInvoice(invoice.id);
        } catch (e) {
          if (e instanceof GroceryApiError && e.status === 409) {
            toast.error(e.message, { duration: 6000 });
            return;
          }
          throw e;
        }

        dismissCompletedSaleUi();
        setNotice("");
        setError("");

        const invoiceLines = invoice.lines.map((l) => ({
          key: crypto.randomUUID(),
          itemId: l.itemId,
          label: l.itemName,
          quantity: String(l.quantity),
          unitPrice: String(l.unitPrice),
          item: {
            id: l.itemId,
            name: l.itemName,
            sku: "",
            thumbnailUrl: null,
          } as ItemSummaryRecord,
        }));

        setCarts((prev) => {
          if (prev.length >= MAX_CARTS) {
            toast.error("Too many carts open. Clear one first.", {
              duration: 4000,
            });
            return prev;
          }
          const fresh = createEmptyCartSession();
          fresh.label = invoice.barcodeCode;
          fresh.lines = invoiceLines;
          fresh.groceryInvoiceId = invoice.id;
          fresh.groceryBarcode = invoice.barcodeCode;
          setActiveCartId(fresh.id);
          return [...prev, fresh];
        });

        setSearch("");
        setHits([]);
        toast.success(
          "Invoice " +
            invoice.barcodeCode +
            " loaded \u00b7 " +
            invoice.lines.length +
            " items",
          { duration: 4000 },
        );
      } catch (e) {
        const msg =
          e instanceof GroceryApiError ? e.message : "Failed to load invoice";
        toast.error(msg, { duration: 5000 });
      }
    },
    [online, branchId, dismissCompletedSaleUi],
  );

  /** Deep link: /cashier?invoice={barcode} */
  useEffect(() => {
    const barcode = searchParams.get("invoice")?.trim();
    if (!barcode) {
      // Reset the guard so a subsequent ?invoice= navigation in the same
      // session is still handled.
      invoiceParamHandledRef.current = false;
      return;
    }
    if (invoiceParamHandledRef.current) return;
    if (!online || !branchId.trim()) return;
    invoiceParamHandledRef.current = true;
    void loadGroceryInvoiceByBarcode(barcode);

    // Strip the query param so a reload does not re-trigger the load.
    const url = new URL(window.location.href);
    url.searchParams.delete("invoice");
    window.history.replaceState({}, "", url.toString());
  }, [searchParams, online, branchId, loadGroceryInvoiceByBarcode]);

  /** Refresh the pending-invoices badge on realtime grocery invoice events. */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { type?: string } | undefined;
      if (!detail?.type) return;
      if (
        [
          "created",
          "paid",
          "cancelled",
          "expired",
          "unlocked",
          "locked",
        ].includes(detail.type)
      ) {
        setInvoiceRefreshKey((k) => k + 1);
      }
    };
    window.addEventListener("grocery-invoice-event", handler);
    return () => window.removeEventListener("grocery-invoice-event", handler);
  }, []);

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
      updateActiveCart({
        customerNoPhoneMatch: false,
        customerRegisterName: "",
      });
      setError(e instanceof Error ? e.message : "Customer search failed.");
    } finally {
      setCustomerSearchBusy(false);
    }
  }, [
    customerPhoneQuery,
    online,
    payMethod,
    setCustomerHits,
    updateActiveCart,
  ]);

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
    if (variant === "cashier") {
      const bid = branchId?.trim();
      if (!online || !bid) {
        setTopProducts(getTopProducts(business?.id ?? null, 20));
        setTopProductsLoading(false);
        return;
      }
      setTopProductsLoading(true);
      void fetchPosTopProducts(bid, {
        limit: 20,
        itemTypeId: posItemTypeId ?? undefined,
      })
        .then((list) => {
          setTopProducts(
            list.map((row) => ({
              id: row.id,
              name: row.name,
              sku: row.sku ?? undefined,
              thumbnailUrl: row.thumbnailUrl ?? null,
              count: row.saleCount,
              qty: Number(row.totalQuantity) || 0,
              lastUsedAt: row.lastSoldAt
                ? Date.parse(row.lastSoldAt)
                : 0,
            })),
          );
        })
        .catch(() => {
          setTopProducts(getTopProducts(business?.id ?? null, 20));
        })
        .finally(() => {
          setTopProductsLoading(false);
        });
      return;
    }
    setTopProducts(getTopProducts(business?.id ?? null, 8));
  }, [variant, business?.id, branchId, online, posItemTypeId]);

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
    if (!online) {
      wasOfflineRef.current = true;
      return;
    }
    if (!canSell) {
      return;
    }
    const reconnected = wasOfflineRef.current;
    wasOfflineRef.current = false;

    let cancelled = false;
    (async () => {
      if (
        reconnected &&
        posDraftOfflineMirror &&
        posDraftPersistence &&
        branchId.trim()
      ) {
        let snapshot: CartSession[] = [];
        setCarts((prev) => {
          snapshot = prev;
          return prev;
        });
        const replay = await replayMirroredDraftsToServer(
          snapshot,
          branchId.trim(),
          { uiVisible: posDraftsUi || posDraftsEnabled },
        );
        if (!cancelled) {
          setCarts((prev) =>
            prev.map((c) => replay.carts.find((r) => r.id === c.id) ?? c),
          );
          if (replay.hadConflict) {
            setNotice(
              "Some sales could not sync — resolve conflicts before checkout.",
            );
          }
          const bizId = business?.id?.trim();
          const uid = me?.id?.trim();
          if (bizId && uid) {
            await saveMirroredCarts(bizId, branchId.trim(), uid, replay.carts);
          }
        }
      }

      const draftDrain = await flushPendingDraftCompleteOutbox();
      if (!cancelled && draftDrain.status === "blocked") {
        setError(`Queued draft checkout blocked: ${draftDrain.message}`);
        setNotice("");
      }

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
  }, [
    canSell,
    online,
    refreshOutbox,
    posDraftOfflineMirror,
    posDraftPersistence,
    branchId,
    business?.id,
    me?.id,
    posDraftsUi,
    posDraftsEnabled,
  ]);

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
        catalogScope: "SKUS_ONLY",
        ...(cat ? { categoryId: cat, includeCategoryDescendants: true } : {}),
        ...(typ ? { itemTypeId: typ } : {}),
        ...(branchId?.trim() ? { branchId: branchId.trim() } : {}),
      })
        .then((items) => {
          const sellable = items.filter((row) => row.groupLabelOnly !== true);
          setHits(sellable);
          if (q) {
            writeCachedItemsSearch(q, sellable);
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
    setCategoryBrowseStack([]);
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

  const capCartQuantity = useCallback(
    (item: ItemSummaryRecord, qty: number) => {
      if (allowNegativeStock) return qty;
      const max = posAvailablePackages(item);
      if (max == null) return qty;
      return Math.min(max, qty);
    },
    [allowNegativeStock],
  );

  // ── Grocery invoice barcode intercept ─────────────────────────

  useEffect(() => {
    const q = search.trim();
    if (!q || !q.startsWith("GI-")) return;
    void loadGroceryInvoiceByBarcode(q);
  }, [search, loadGroceryInvoiceByBarcode]);

  const addLine = useCallback(
    (
      item: ItemSummaryRecord,
      qty: number = 1,
      unitPrice: string = "",
    ): boolean => {
      if (item.groupLabelOnly) {
        toast.error("Choose a specific product, not the group label.");
        return false;
      }
      const addQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
      const safeQty = capCartQuantity(item, addQty);
      if (safeQty <= 0) {
        toast.error("This item is out of stock at this branch.");
        return false;
      }
      const startingNewSale = lastSale != null;
      if (startingNewSale) {
        dismissCompletedSaleUi();
        setNotice("");
        setError("");
      }
      const priceKey = (unitPrice ?? "").trim();
      const label =
        `${cashierItemPrimaryLabel(item)}${posCartLineSuffix(item)}`.trim();
      const newLine = {
        key: crypto.randomUUID(),
        itemId: item.id,
        label,
        quantity: String(safeQty),
        unitPrice: priceKey,
        item,
      };
      let targetCartId = activeCartId;
      let blockedByStock = false;
      let didAdd = false;
      setCarts((prev) => {
        const { carts: nextCarts, targetId } = resolveCartTargetForAdd(
          prev,
          activeCartId,
        );
        targetCartId = targetId;
        return nextCarts.map((cart) => {
          if (cart.id !== targetId) return cart;
          if (startingNewSale) {
            didAdd = true;
            return {
              ...resetCartSessionKeepingTab(cart),
              lines: [newLine],
            };
          }
          const existingIdx = cart.lines.findIndex(
            (l) =>
              l.itemId === item.id && sameCartUnitPrice(l.unitPrice, priceKey),
          );
          if (existingIdx >= 0) {
            const existing = cart.lines[existingIdx]!;
            const currentQty = Number(existing.quantity);
            const base = Number.isFinite(currentQty) && currentQty > 0 ? currentQty : 0;
            const capped = capCartQuantity(item, base + addQty);
            if (capped <= base) {
              blockedByStock = true;
              return cart;
            }
            didAdd = true;
            return {
              ...cart,
              lines: cart.lines.map((l, i) =>
                i === existingIdx
                  ? {
                      ...l,
                      quantity: String(capped),
                      unitPrice: priceKey || l.unitPrice,
                      label,
                      item,
                    }
                  : l,
              ),
            };
          }
          didAdd = true;
          return {
            ...cart,
            lines: [...cart.lines, newLine],
          };
        });
      });
      if (blockedByStock) {
        toast.error("Cannot add more — stock limit reached for this item.");
        return false;
      }
      if (!didAdd) {
        return false;
      }
      if (targetCartId !== activeCartId) {
        setActiveCartId(targetCartId);
      }
      setSearch("");
      if (!keepAisleFilter && categoryFilterId) {
        clearCategoryFilter();
      } else if (!categoryFilterId) {
        setHits([]);
      }
      schedulePosDraftSync(targetCartId, 0);
      return true;
    },
    [
      capCartQuantity,
      lastSale,
      dismissCompletedSaleUi,
      schedulePosDraftSync,
      activeCartId,
      keepAisleFilter,
      categoryFilterId,
      clearCategoryFilter,
    ],
  );

  const removeLine = useCallback(
    (key: string) => {
      updateActiveCart((cart) => {
        const removed = cart.lines.find((l) => l.key === key);
        const nextRemoved = removed?.serverLineId
          ? Array.from(
              new Set([
                ...(cart.removedServerLineIds ?? []),
                removed.serverLineId,
              ]),
            )
          : (cart.removedServerLineIds ?? []);
        return {
          ...cart,
          lines: cart.lines.filter((l) => l.key !== key),
          removedServerLineIds: nextRemoved,
        };
      });
      schedulePosDraftSync(activeCartId, 300);
    },
    [updateActiveCart, schedulePosDraftSync, activeCartId],
  );

  const updateLine = useCallback(
    (key: string, field: "quantity" | "unitPrice", value: string) => {
      updateActiveCart((cart) => ({
        ...cart,
        lines: cart.lines.map((l) => {
          if (l.key !== key) return l;
          if (field !== "quantity" || !l.item) {
            return { ...l, [field]: value };
          }
          const n = Number(value);
          if (!Number.isFinite(n) || n < 0) {
            return { ...l, quantity: value };
          }
          const capped = capCartQuantity(l.item, n);
          return { ...l, quantity: String(capped) };
        }),
      }));
    },
    [capCartQuantity, updateActiveCart],
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
    const scopeBranch = cartScopeBranchIdRef.current;
    if (scopeBranch && scopeBranch !== bid) {
      const scopeName =
        branches.find((b) => b.id === scopeBranch)?.name?.trim() ?? scopeBranch;
      const currentName =
        branches.find((b) => b.id === bid)?.name?.trim() ?? bid;
      if (
        !window.confirm(
          `This cart was started at ${scopeName} but the current branch is ${currentName}. Complete the sale at ${currentName} anyway?`,
        )
      ) {
        return;
      }
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
      ...(cashTendered != null ? { cashReceived: cashTendered } : {}),
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

    const soldCartId = activeCartId;

    setError("");
    setNotice("");

    const offlineNow = typeof navigator !== "undefined" && !navigator.onLine;
    if (offlineNow) {
      if (activeCart.groceryInvoiceId) {
        setError("Grocery invoice payment requires a network connection.");
        return;
      }
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
        const completeBody = {
          payments,
          ...(payMethodNeedsCustomer(payMethod) && selectedCustomer
            ? { customerId: selectedCustomer.id }
            : {}),
          clientSoldAt: salePayload.clientSoldAt,
          expectedVersion: activeCart.version,
        };

        const draftId = activeCart.draftId;
        const ticketNum = activeCart.ticketNumber;
        if (
          posDraftPersistence &&
          draftId &&
          posDraftOfflineMirror &&
          isPosDraftStoreSupported()
        ) {
          await enqueuePendingDraftComplete(idem, draftId, completeBody);
        } else {
          await enqueuePendingSale(idem, salePayload);
        }

        recordTopSellers();
        clearCartAfterSale(soldCartId);
        setVoidNotes("");
        await refreshOutbox();
        setPendingSalesRefreshKey((k) => k + 1);
        setNotice(
          draftId && posDraftOfflineMirror
            ? `Offline: sale #${ticketNum ?? "…"} queued — it will finalize when you are back online with an open shift.`
            : `Offline: sale queued on this device with idempotency key ${idem.slice(0, 12)}… It will post when you are online with an open shift.`,
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
      // ── Grocery invoice payment path ─────────────────────────────────
      if (activeCart.groceryInvoiceId) {
        const allowedMethods = new Set(["cash", "mpesa_manual"]);
        const isAllowedMethod = splitPay || allowedMethods.has(payMethod);
        if (!isAllowedMethod) {
          setLoading(false);
          setError(
            "Grocery invoices can only be paid with cash, M-Pesa, or split.",
          );
          return;
        }

        const groceryPayments = splitPay
          ? [
              {
                method: "cash" as const,
                amount: parseMoney(cashSplitStr)!,
              },
              {
                method: "mpesa_manual" as const,
                amount: parseMoney(mpesaSplitStr)!,
                reference: splitMpesaRef.trim() || undefined,
              },
            ]
          : [
              {
                method: payMethod,
                amount: grandTotal,
                reference:
                  payMethod === "mpesa_manual"
                    ? mpesaRef.trim() || undefined
                    : undefined,
              },
            ];

        try {
          const result = await payGroceryInvoice(
            activeCart.groceryInvoiceId,
            { payments: groceryPayments },
            idem,
          );

          const sale: SaleRecord = {
            id: result.saleId,
            branchId: bid,
            shiftId: "",
            status: result.status,
            grandTotal,
            refundedTotal: 0,
            journalEntryId: "",
            payments: groceryPayments.map((p) => ({
              method: p.method,
              amount: p.amount,
              reference: p.reference ?? null,
            })),
            items: [],
            soldByName: me?.name?.trim() ?? null,
          };

          setInvoiceRefreshKey((k) => k + 1);
          setPendingSalesRefreshKey((k) => k + 1);
          const completedReceipt = buildPosReceiptSnapshot({
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
            tillNumber: receiptBranch?.receipt?.tillNumber ?? null,
            branchReceiptMessage: receiptBranch?.receipt?.footerNote ?? null,
            servedByName: me?.name?.trim() || sale.soldByName?.trim() || null,
            currency: receiptCurrency,
            cartLines: receiptCartLines,
            sale,
            customerName: receiptCustomerName,
            cashTendered,
            clientSoldAt: salePayload.clientSoldAt ?? undefined,
          });
          const printed = await printPosReceipt(
            sale.id,
            undefined,
            {
              cupsName: receiptBranch?.receipt?.printerCupsName ?? null,
              branchId: bid,
            },
            completedReceipt.cashReceived != null
              ? {
                  received: completedReceipt.cashReceived,
                  change: completedReceipt.changeGiven ?? 0,
                }
              : null,
          ).catch(() => false);
          if (printed) {
            dismissCompletedSaleUi();
            setCheckoutCompletedKey((key) => key + 1);
          } else {
            setLastSale(sale);
            setLastReceipt(completedReceipt);
          }
          setVoidNotes("");
          recordTopSellers();
          clearCartAfterSale(soldCartId);
          setNotice(
            `Grocery invoice ${activeCart.groceryBarcode ?? ""} paid. Sale ${sale.id} recorded. Grand total ${grandTotal.toFixed(2)}${business?.currency?.trim() ? ` ${business.currency.trim()}` : ""}.`,
          );
          await refreshOutbox();
          const drain = await flushSaleOutbox();
          await refreshOutbox();
          if (drain.status === "blocked") {
            setError(`Earlier queued sale blocked: ${drain.message}`);
          }
          return;
        } catch (e) {
          setLoading(false);
          const msg =
            e instanceof GroceryApiError
              ? e.message
              : e instanceof Error
                ? e.message
                : "Payment failed";
          setError(msg);
          if (activeCart.groceryInvoiceId) {
            try {
              await unlockGroceryInvoice(activeCart.groceryInvoiceId);
            } catch {
              // ignore — lock expires automatically
            }
          }
          return;
        }
      }

      let draftId = activeCart.draftId;
      let draftVersion = activeCart.version;

      if (posDraftPersistence) {
        const pendingSync = posDraftSyncTimers.current[activeCartId];
        if (pendingSync) {
          clearTimeout(pendingSync);
          delete posDraftSyncTimers.current[activeCartId];
        }

        const synced = await syncCartSessionToServer(activeCart, bid, {
          uiVisible: posDraftsUi || posDraftsEnabled,
        });
        if (synced.syncStatus === "error") {
          setLoading(false);
          setError("Could not sync sale to the server. Try again.");
          return;
        }
        draftId = synced.draftId;
        draftVersion = synced.version;
        updateCartById(activeCartId, (prev) => ({
          ...synced,
          id: prev.id,
          label: prev.label,
          createdAt: prev.createdAt,
        }));
      }

      const completeBody = {
        payments,
        ...(payMethodNeedsCustomer(payMethod) && selectedCustomer
          ? { customerId: selectedCustomer.id }
          : {}),
        clientSoldAt: salePayload.clientSoldAt,
        expectedVersion: draftVersion,
      };

      let sale: SaleRecord | null = null;
      let failMsg = "Sale failed.";
      let failStatus = 0;

      if (posDraftPersistence && draftId) {
        const draftResult = await tryCompletePosDraftWithRetries(
          draftId,
          completeBody,
          idem,
        );
        if (draftResult.ok) {
          sale = draftResult.sale;
        } else {
          failMsg = draftResult.message;
          failStatus = draftResult.status;
        }
      } else {
        const postResult = await tryPostSaleWithRetries(salePayload, idem);
        if (postResult.ok) {
          sale = postResult.sale;
        } else {
          failMsg = postResult.message;
          failStatus = postResult.status;
        }
      }

      if (sale) {
        setInvoiceRefreshKey((k) => k + 1);
        setPendingSalesRefreshKey((k) => k + 1);
        const completedReceipt = buildPosReceiptSnapshot({
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
          tillNumber: receiptBranch?.receipt?.tillNumber ?? null,
          branchReceiptMessage: receiptBranch?.receipt?.footerNote ?? null,
          servedByName: me?.name?.trim() || sale.soldByName?.trim() || null,
          currency: receiptCurrency,
          cartLines: receiptCartLines,
          sale,
          customerName: receiptCustomerName,
          cashTendered,
          clientSoldAt: salePayload.clientSoldAt ?? undefined,
        });
        const printed = await printPosReceipt(
          sale.id,
          undefined,
          {
            cupsName: receiptBranch?.receipt?.printerCupsName ?? null,
            branchId: bid,
          },
          completedReceipt.cashReceived != null
            ? {
                received: completedReceipt.cashReceived,
                change: completedReceipt.changeGiven ?? 0,
              }
            : null,
        ).catch(() => false);
        if (printed) {
          dismissCompletedSaleUi();
          setCheckoutCompletedKey((key) => key + 1);
        } else {
          setLastSale(sale);
          setLastReceipt(completedReceipt);
        }
        setVoidNotes("");
        recordTopSellers();
        clearCartAfterSale(soldCartId);
        const ticketRef =
          activeCart.ticketNumber != null && activeCart.ticketNumber > 0
            ? `#${activeCart.ticketNumber}`
            : sale.id;
        setNotice(
          `Sale ${ticketRef} recorded. Grand total ${grandTotal.toFixed(2)}${business?.currency?.trim() ? ` ${business.currency.trim()}` : ""}.`,
        );
        await refreshOutbox();
        const drain = await flushSaleOutbox();
        await refreshOutbox();
        if (drain.status === "blocked") {
          setError(`Earlier queued sale blocked: ${drain.message}`);
        }
        return;
      }

      const msg = failMsg;
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

      if (failStatus === 0 || failStatus >= 500) {
        if (!isSaleOutboxSupported()) {
          setError(failMsg);
          return;
        }
        try {
          await enqueuePendingSale(idem, salePayload);
          recordTopSellers();
          clearCartAfterSale(soldCartId);
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

      setError(failMsg);
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
    clearCartAfterSale,
    activeCart,
    activeCartId,
    posDraftPersistence,
    posDraftsUi,
    posDraftsEnabled,
    posDraftOfflineMirror,
    updateCartById,
    customerPhoneQuery,
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
    const active = carts.find((c) => c.id === activeCartId) ?? carts[0];
    if (active?.groceryInvoiceId && online) {
      void unlockGroceryInvoice(active.groceryInvoiceId);
    }
    dismissCompletedSaleUi();
    setNotice("");
    setError("");
    setCarts((prev) => {
      const activeInPrev = prev.find((c) => c.id === activeCartId) ?? prev[0];
      if (!activeInPrev?.lines.length) {
        return prev;
      }
      if (prev.length === 1) {
        const fresh = createEmptyCartSession();
        setActiveCartId(fresh.id);
        return [fresh];
      }
      return prev.map((c) =>
        c.id === activeCartId ? resetCartSessionKeepingTab(c) : c,
      );
    });
  }, [activeCartId, carts, dismissCompletedSaleUi, online]);

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

  const posDraftOfflineBanner = useMemo(() => {
    if (online || !posDraftOfflineMirror) return null;
    if (!carts.some((c) => c.lines.length > 0)) return null;
    return "Sale will sync when connection returns.";
  }, [online, posDraftOfflineMirror, carts]);

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
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-[10px] font-medium text-muted-foreground">
          {activeBranchName || "Point of sale"}
        </span>
        <div className="flex items-center gap-2">
          {(posDraftsUi || posDraftsEnabled) && (
            <PendingSalesPanel
              onResumeDraft={(id) => void resumePosDraft(id)}
              openDraftIds={openDraftIds}
              refreshKey={pendingSalesRefreshKey}
            />
          )}
          <PendingInvoicesPanel
            onLoadInvoice={(barcode) =>
              void loadGroceryInvoiceByBarcode(barcode)
            }
            refreshKey={invoiceRefreshKey}
          />
        </div>
      </div>
      <CashierPosLayout
        pageTitle={heading}
        embeddedInDashboard={!isCashier}
        checkoutCompletedKey={checkoutCompletedKey}
        brandTheme={dialogBrandTheme}
        online={online}
        offlineBanner={posDraftOfflineBanner}
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
        topProductsLoading={variant === "cashier" ? topProductsLoading : false}
        topProductsTitle={
          variant === "cashier" ? "Top 20 best sellers" : undefined
        }
        topProductsSubtitle={
          variant === "cashier"
            ? "Ranked by units sold at this branch"
            : undefined
        }
        alwaysShowTopProducts={variant === "cashier"}
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
        keepAisleFilter={keepAisleFilter}
        onKeepAisleFilterChange={setKeepAisleFilter}
        typeFilterId={posItemTypeId}
        typeFilterLabel={typeFilterLabel}
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
        tillPrinterStatus={
          !IS_DESKTOP ? (
            <TillPrinterStatus
              compact
              cupsName={
                branches.find((b) => b.id === branchId.trim())?.receipt
                  ?.printerCupsName ?? null
              }
            />
          ) : null
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
        allowNegativeStock={allowNegativeStock}
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
          receiptPrinter: {
            cupsName:
              branches.find((b) => b.id === branchId.trim())?.receipt
                ?.printerCupsName ?? null,
            branchId: branchId.trim() || null,
          },
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
