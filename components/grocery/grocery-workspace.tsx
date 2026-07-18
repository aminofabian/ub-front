"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
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
} from "lucide-react";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { useDashboard } from "@/components/dashboard-provider";
import { useFeatureFlag } from "@/components/providers/tenant-provider";
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
  type ItemSummaryRecord,
  itemListThumbnailUrl,
} from "@/lib/api";
import {
  cashierItemPrimaryLabel,
  posCartLineSuffix,
} from "@/lib/cashier-item-display";
import {
  formatShelfPriceLabel,
  splitShelfPriceDisplay,
} from "@/lib/cashier-shelf-price";
import { fetchPosShelfPrice } from "@/lib/pos-shelf-price";
import { BarcodeScanner } from "@/components/barcode-scanner";

import {
  createGroceryInvoice,
  fetchGroceryTopProducts,
  GroceryApiError,
  type GroceryInvoiceResponse,
  type GroceryTopProduct,
} from "@/lib/grocery-api";
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
import {
  GroceryCartTabs,
  GroceryForwardedInvoicesPanel,
  type GroceryCartPanelTab,
} from "./grocery-forwarded-invoices-panel";

// ── Helpers ────────────────────────────────────────────────────────

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
    <span className="hidden items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground sm:inline-flex">
      <Clock3 className="size-3" />
      {time}
    </span>
  );
}

// ── Product Card ───────────────────────────────────────────────────

function ProductCard({
  item,
  shelfLine,
  onPick,
  cartQty = 0,
  cartLineTotal = 0,
  currency,
}: {
  item: ItemSummaryRecord;
  shelfLine: string;
  onPick: () => void;
  cartQty?: number;
  cartLineTotal?: number;
  currency: string;
}) {
  const thumb = itemListThumbnailUrl(item);
  const title = cashierItemPrimaryLabel(item);
  const { amount, code } = splitShelfPriceDisplay(shelfLine);
  const hasPrice =
    amount &&
    amount !== CASHIER_POS_UI_COPY.tileShelfEmpty &&
    amount !== CASHIER_POS_UI_COPY.tileShelfLoading;
  const inCart = cartQty > 0;
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
        inCart
          ? `${title} — ${cartQty} in cart. Tap to add another.`
          : `Add ${title} to cart`
      }
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-card text-left",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "touch-manipulation select-none",
        inCart
          ? "border-primary/50 bg-primary/[0.03]"
          : "border-border hover:border-primary/25",
      )}
    >
      {/* Image area */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            width={240}
            height={240}
            className="h-full w-full object-cover"
            unoptimized
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBasket className="size-7 text-muted-foreground/40" />
          </div>
        )}

        {inCart && (
          <span
            key={cartQty}
            className="absolute right-1.5 top-1.5 z-[2] inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold tabular-nums text-primary-foreground"
            aria-hidden
          >
            ×{cartQty}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between gap-1 px-2 pb-2 pt-1.5">
        <p className="line-clamp-2 text-[11px] font-medium leading-snug text-foreground">
          {title}
        </p>

        {lineTotalSplit ? (
          <div className="flex min-w-0 items-end justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-baseline gap-1 leading-none">
                <span className="truncate text-[13px] font-semibold tabular-nums text-primary">
                  {lineTotalSplit.amount}
                </span>
                {lineTotalSplit.code && (
                  <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {lineTotalSplit.code}
                  </span>
                )}
              </span>
              <span className="truncate text-[10px] tabular-nums leading-none text-muted-foreground">
                {cartQty}&thinsp;&times;&thinsp;{amount}
                {code ? ` ${code}` : ""}
              </span>
            </div>
          </div>
        ) : (
        <div className="flex items-baseline gap-1">
          {hasPrice ? (
            <>
              <span className="text-[12px] font-semibold tabular-nums leading-none text-foreground">
                {amount}
              </span>
              {code && (
                <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                  {code}
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {shelfLine || "—"}
            </span>
          )}
        </div>
        )}
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
  const online = useOnlineStatus();
  const currency = business?.currency?.trim() || "KES";
  const cashierName = effectiveMe?.name?.trim() || "";
  const tenantTitle =
    business?.branding?.displayName?.trim() ||
    business?.name?.trim() ||
    "Grocery";
  const primaryColor = business?.branding?.primaryColor;

  // Item browser state
  const [search, setSearch] = useState("");
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
  const tileShelfPriceValues = useRef<Record<string, number>>({});
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Cart state
  const [lines, setLines] = useState<GroceryCartLine[]>([]);
  const [draftState, setDraftState] = useState<GroceryDraftState>(
    createGroceryDraftState(),
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

  // ── Draft sync ─────────────────────────────────────────────────────

  function scheduleDraftSync(delayMs = 300) {
    if (!groceryDraftPersistence || !online || !branchId) return;
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
      const existingIdx = lines.findIndex((l) => l.itemId === item.id);
      if (existingIdx >= 0) {
        const existingKey = lines[existingIdx].key;
        setLines((prev) =>
          prev.map((l, i) =>
            i === existingIdx ? { ...l, quantity: l.quantity + 1 } : l,
          ),
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
          unitName: "",
        };
        setLines((prev) => [...prev, newLine]);
        setRecentlyAddedKey(newLine.key);
      }
      setCartPulse((n) => n + 1);
      scheduleDraftSync();
    },
    [lines, scheduleDraftSync],
  );

  const updateLine = useCallback(
    (key: string, field: "quantity" | "unitPrice", value: number) => {
      setLines((prev) =>
        prev.map((l) => {
          if (l.key !== key) return l;
          if (field === "quantity") {
            return { ...l, quantity: Math.max(1, value) };
          }
          return { ...l, unitPrice: Math.max(0, value) };
        }),
      );
      scheduleDraftSync();
    },
    [scheduleDraftSync],
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
  }, [branchId, lines, groceryDraftPersistence, draftState]);

  const onNewInvoice = useCallback(() => {
    beginNewSale();
    setSearch("");
    setHits([]);
  }, [beginNewSale]);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="grocery-app-root relative flex h-[100dvh] min-h-0 w-full flex-col">
      <div
        className={cn(
          "grocery-app-stage grocery-workspace relative mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col overflow-hidden bg-background",
        )}
        style={
          {
            "--grocery-tab-clearance": GROCERY_TAB_BAR_CLEARANCE,
          } as CSSProperties
        }
      >
      {/* ── App header ── */}
      <header className="relative z-30 shrink-0 border-b border-border bg-background pt-[env(safe-area-inset-top,0px)]">
        <div className="relative flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card sm:size-11">
              <TenantLogo
                brand={tenantTitle}
                logoUrl={business?.branding?.logoUrl}
                faviconUrl={business?.branding?.faviconUrl}
                primaryColor={primaryColor}
                variant="sidebar-mark"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {tenantTitle}
              </p>
              <h1 className="truncate font-heading text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">
                Counter
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="size-3 shrink-0 opacity-70" aria-hidden />
                  <span className="truncate font-medium">
                    {branchesLoading
                      ? "Loading…"
                      : activeBranchName || "Select branch"}
                  </span>
                </span>
                {activeDepartmentLabel ? (
                  <span className="inline-flex items-center gap-1 border-l border-border/50 pl-2">
                    {activeDepartmentLabel}
                  </span>
                ) : null}
                {cashierName ? (
                  <span className="hidden border-l border-border/50 pl-2 sm:inline">
                    {cashierName}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <LiveClock />
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wide",
                online
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  online ? "bg-primary" : "bg-muted-foreground",
                )}
              />
              <span className="hidden min-[380px]:inline">
                {online ? "Online" : "Offline"}
              </span>
            </span>
            <RealtimeConnectionIndicator />
          </div>
        </div>
      </header>

      {/* ── Error Toast ── */}
      {error && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive sm:mx-5">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-red-200/60 active:scale-90 dark:hover:bg-red-900/40"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Split View ── */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-row">
        {/* ── LEFT: Product Browser ── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:w-[58%] md:flex-none lg:w-[60%] xl:w-[62%]">
          {/* Sticky search */}
          <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-background px-3 pb-3 pt-2.5 sm:px-4 sm:pt-3">
            <div className="flex items-center gap-2">
              <div className="group relative flex h-11 flex-1 items-center gap-2 rounded-lg border border-border bg-card pl-3 pr-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30 sm:h-12 sm:pl-3.5">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    activeDepartmentLabel
                      ? `Search ${activeDepartmentLabel}, scan barcode…`
                      : "Search products, scan barcode…"
                  }
                  className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  autoComplete="off"
                  aria-label="Search products"
                />
                {/* ⌘K hint */}
                <kbd
                  aria-hidden
                  className="mr-1 hidden h-6 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground md:inline-flex"
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
                  className="ml-0.5 flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-[var(--primary-hover)]"
                  aria-label="Scan barcode"
                >
                  <ScanLine className="size-[17px]" strokeWidth={2.25} />
                  <span className="hidden md:inline">Scan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Product Area */}
          <div
            className="relative flex min-h-0 flex-1"
            style={{ paddingBottom: `max(1rem, ${GROCERY_TAB_BAR_CLEARANCE})` }}
          >
            {showDepartmentRail ? (
              <div className="pointer-events-none absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 sm:block">
                <GroceryDepartmentRail
                  departments={itemTypes}
                  selectedId={selectedDepartmentId}
                  onSelect={setSelectedDepartmentId}
                />
              </div>
            ) : null}

            <div
              className={cn(
                "relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-2 sm:px-4 md:pb-4",
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
              className="pointer-events-none sticky top-0 z-[1] -mb-2 block h-3 w-full bg-gradient-to-b from-background to-transparent"
            />

            {/* Search results */}
            {hasSearch && (
              <section className="mb-6">
                {hits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
                    <Search className="mb-3 size-8 text-muted-foreground/50" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-foreground">
                      {searchBanner ?? "No items match your search."}
                    </p>
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                      Try a different term or use Scan for barcodes.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
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
                  <div className="rounded-lg border border-border bg-muted/50 px-4 py-10 text-center">
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
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
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
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
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
                        />
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            </div>
          </div>
        </div>

        {/* ── RIGHT: Cart side panel (iPad md+) ── */}
        <aside
          className={cn(
            "hidden shrink-0 flex-col border-l border-border bg-muted/30 md:flex",
            "md:w-[42%] lg:w-[40%] xl:w-[38%]",
            "relative pb-[var(--grocery-tab-clearance)]",
          )}
        >
          <GroceryCartTabs
            activeTab={cartPanelTab}
            onTabChange={setCartPanelTab}
            forwardedCount={forwardedInvoices.length}
          />
          {cartPanelTab === "sale" ? (
            <GroceryInvoiceCart
              lines={lines}
              onUpdateLine={updateLine}
              onRemoveLine={removeLine}
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
              counterNumber={showCounterNumber ? draftState.counterNumber : null}
              syncStatus={groceryDraftPersistence ? draftState.syncStatus : "idle"}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <GroceryForwardedInvoicesPanel
              invoices={forwardedInvoices}
              onDismiss={dismissForwardedInvoice}
              onViewInvoice={viewForwardedInvoice}
              currency={currency}
            />
            </div>
          )}
        </aside>
      </div>

      {/* ── Phone: floating cart dock above tab bar ── */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-[var(--grocery-tab-clearance)] sm:px-4 md:hidden"
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
              className="flex h-12 flex-1 items-center gap-3 rounded-lg border border-border bg-card pl-3 pr-3 shadow-sm"
            >
              <span className="relative flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ShoppingBasket className="size-4" strokeWidth={2.25} />
                <span className="absolute -right-1.5 -top-1.5 flex min-w-[1.1rem] items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-semibold leading-none text-background tabular-nums">
                  {cartItemCount}
                </span>
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs text-muted-foreground">
                  {cartItemCount} item{cartItemCount === 1 ? "" : "s"}
                </p>
                <p className="truncate text-sm font-semibold tabular-nums text-foreground">
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
              "flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium sm:px-5",
              "transition-colors active:scale-[0.98]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              isEmptyCart
                ? "border border-border bg-card text-foreground"
                : "bg-primary text-primary-foreground hover:bg-[var(--primary-hover)]",
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
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
                    {forwardedInvoices.length}
                  </span>
                ) : null}
              </>
            ) : (
              <>
                <Receipt className="size-4" strokeWidth={2.25} />
                <span className="hidden sm:inline">Generate Invoice</span>
                <span className="sm:hidden">Generate</span>
                <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-bold tabular-nums">
                  {cartItemCount}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

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
            className="absolute inset-0 bg-black/55 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setShowCartDrawer(false)}
          />

          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 flex max-h-[88vh] flex-col",
              "rounded-t-[1.75rem] bg-[linear-gradient(180deg,#fdfcfa_0%,#faf8f4_100%)]",
              "shadow-[0_-16px_56px_rgba(15,23,42,0.25)]",
              "animate-in slide-in-from-bottom duration-300",
              "dark:bg-card",
            )}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-white/15" />
            </div>

            <GroceryCartTabs
              activeTab={cartPanelTab}
              onTabChange={setCartPanelTab}
              forwardedCount={forwardedInvoices.length}
            />
            {cartPanelTab === "sale" ? (
              <GroceryInvoiceCart
                lines={lines}
                onUpdateLine={updateLine}
                onRemoveLine={removeLine}
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
                counterNumber={showCounterNumber ? draftState.counterNumber : null}
                syncStatus={groceryDraftPersistence ? draftState.syncStatus : "idle"}
              />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <GroceryForwardedInvoicesPanel
                  invoices={forwardedInvoices}
                  onDismiss={dismissForwardedInvoice}
                  onViewInvoice={viewForwardedInvoice}
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

      <GroceryAppBottomNav activeTab="counter" />
      </div>
    </div>
  );
}
