"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Search,
  ScanLine,
  ShoppingBasket,
  X,
  Receipt,
  Plus,
  History,
  Sparkles,
  Wifi,
  WifiOff,
  ChevronRight,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
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
  GroceryInvoiceCart,
  type GroceryCartLine,
} from "./grocery-invoice-cart";
import { GroceryInvoiceSuccess } from "./grocery-invoice-success";

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

// ── Product Card ───────────────────────────────────────────────────

function ProductCard({
  item,
  shelfLine,
  onPick,
  isTopSeller,
}: {
  item: ItemSummaryRecord;
  shelfLine: string;
  onPick: () => void;
  isTopSeller?: boolean;
}) {
  const thumb = itemListThumbnailUrl(item);
  const title = cashierItemPrimaryLabel(item);
  const { amount, code } = splitShelfPriceDisplay(shelfLine);
  const hasPrice =
    amount &&
    amount !== CASHIER_POS_UI_COPY.tileShelfEmpty &&
    amount !== CASHIER_POS_UI_COPY.tileShelfLoading;

  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[1.25rem] text-left",
        "border border-border/40 bg-white/95 backdrop-blur-sm",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_hsl(0_0%_100%/0.6)]",
        "transition-[transform,box-shadow,border-color] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1),0_3px_6px_-2px_rgba(0,0,0,0.05)]",
        "active:translate-y-0 active:scale-[0.97] active:shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        "dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/[0.18]",
        "touch-manipulation select-none",
      )}
    >
      {/* Image area */}
      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-b from-neutral-100 to-neutral-50 dark:from-white/[0.04] dark:to-white/[0.02]">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            width={200}
            height={200}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
            unoptimized
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBasket className="size-8 text-muted-foreground/20" />
          </div>
        )}

        {/* Top seller ribbon */}
        {isTopSeller && (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-500/95 px-1.5 py-[3px] text-[9px] font-bold uppercase tracking-[0.04em] text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] backdrop-blur-sm">
            <Sparkles className="size-2.5" />
            Top
          </span>
        )}

        {/* Soft top gradient for legibility */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/[0.04] to-transparent"
        />

        {/* Quick-add bubble (visible on hover/focus/touch) */}
        <div className="absolute bottom-1.5 right-1.5 flex translate-y-1 items-center justify-center opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-active:opacity-100">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] ring-2 ring-white/40 backdrop-blur-sm transition-transform duration-200 group-hover:scale-105 group-active:scale-90">
            <Plus className="size-4" strokeWidth={2.5} />
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between gap-1.5 px-3 pb-3 pt-2.5">
        <p className="line-clamp-2 text-[12.5px] font-semibold leading-[1.25] text-foreground">
          {title}
        </p>

        <div className="flex items-baseline gap-1">
          {hasPrice ? (
            <>
              <span className="text-[14.5px] font-bold tabular-nums leading-none text-foreground">
                {amount}
              </span>
              {code && (
                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {code}
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] font-medium text-muted-foreground/70">
              {shelfLine || "—"}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Section Header ─────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  meta,
  right,
}: {
  icon?: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <h3 className="truncate text-[13.5px] font-bold tracking-tight text-foreground">
          {title}
        </h3>
        {meta && (
          <span className="text-[11px] font-medium text-muted-foreground/80 tabular-nums">
            {meta}
          </span>
        )}
      </div>
      {right}
    </div>
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
    itemTypeId,
  } = useDashboard();
  const online = useOnlineStatus();
  const currency = business?.currency?.trim() || "KES";
  const cashierName = me?.name?.trim() || "";

  // Item browser state
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<ItemSummaryRecord[]>([]);
  const [searchBanner, setSearchBanner] = useState<string | null>(null);
  const [topProducts, setTopProducts] = useState<GroceryTopProduct[]>([]);
  const [topProductsLoading, setTopProductsLoading] = useState(false);
  const [topProductsReloadKey, setTopProductsReloadKey] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [tileShelfPrices, setTileShelfPrices] = useState<
    Record<string, string>
  >({});
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const tileShelfPriceValues = useRef<Record<string, number>>({});

  // Cart state
  const [lines, setLines] = useState<GroceryCartLine[]>([]);
  const [cartPulse, setCartPulse] = useState(0);
  const [recentlyAddedKey, setRecentlyAddedKey] = useState<string | null>(null);

  // Invoice generation state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedInvoice, setGeneratedInvoice] =
    useState<GroceryInvoiceResponse | null>(null);

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

  // Departments (item types) the operator is allowed to invoice from.
  // For grocery_clerk users this list is already filtered server- and
  // client-side to only the assigned departments; everyone else sees
  // every active item type in the business.
  const allowedDepartmentLabel = useMemo(() => {
    if (itemTypes.length === 0) return "";
    if (itemTypes.length === 1) return itemTypes[0].label?.trim() || "";
    return `${itemTypes.length} departments`;
  }, [itemTypes]);

  // ── Effects ──────────────────────────────────────────────────────

  // Server-aggregated top products for this user + branch. The list is
  // sorted in the backend (invoice count → total quantity → recency) so
  // it stays stable across reloads.
  useEffect(() => {
    if (!online) return;
    const bid = branchId?.trim();
    if (!bid) {
      setTopProducts([]);
      return;
    }
    let cancelled = false;
    setTopProductsLoading(true);
    fetchGroceryTopProducts(bid, 20)
      .then((list) => {
        if (cancelled) return;
        setTopProducts(list);
      })
      .catch(() => {
        if (cancelled) return;
        setTopProducts([]);
      })
      .finally(() => {
        if (!cancelled) setTopProductsLoading(false);
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
      // Backend already restricts grocery_clerk callers to their
      // assigned item types; passing the active itemTypeId narrows
      // results further for everyone else.
      const tid = itemTypeId?.trim() || undefined;
      fetchItems(q, {
        branchId: bid,
        itemTypeId: tid,
        page: 0,
        size: 50,
      })
        .then((items) => {
          if (cancelled) return;
          setHits(items ?? []);
          setSearchBanner(items.length === 0 ? "No items match." : null);
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
  }, [search, branchId, itemTypeId, online]);

  useEffect(() => {
    if (!online) {
      setTileShelfPrices({});
      return;
    }
    const hitIds = hits.map((h) => h.id);
    const topIds = topProducts.map((p) => p.id);
    const ids = Array.from(new Set([...hitIds, ...topIds]));
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
  }, [online, currency, hits, topProducts, branchId]);

  // Clear "recently added" highlight after animation
  useEffect(() => {
    if (!recentlyAddedKey) return;
    const t = window.setTimeout(() => setRecentlyAddedKey(null), 400);
    return () => window.clearTimeout(t);
  }, [recentlyAddedKey]);

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
    },
    [lines],
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
    },
    [],
  );

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    setGeneratedInvoice(null);
    setError(null);
  }, []);

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
      const invoice = await createGroceryInvoice({
        branchId: bid,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          unitName: l.unitName || undefined,
        })),
      });
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
  }, [branchId, lines]);

  const onNewInvoice = useCallback(() => {
    clearCart();
    setSearch("");
    setHits([]);
  }, [clearCart]);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "relative flex h-[calc(100vh-4rem)] flex-col overflow-hidden",
        // Soft layered background — feels like a native tablet canvas
        "bg-[radial-gradient(110%_60%_at_50%_0%,hsl(var(--primary)/0.045),transparent_60%),linear-gradient(180deg,hsl(var(--muted)/0.35)_0%,hsl(var(--background))_60%)]",
        "dark:bg-[radial-gradient(110%_60%_at_50%_0%,hsl(var(--primary)/0.08),transparent_60%),hsl(var(--background))]",
      )}
    >
      {/* ── Header ── */}
      <header
        className={cn(
          "relative z-30 flex shrink-0 items-center justify-between gap-3 px-3 py-2.5 sm:px-5",
          "border-b border-border/40",
          "bg-white/65 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/55",
          "dark:bg-background/60 dark:supports-[backdrop-filter]:bg-background/50",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative hidden size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-primary/8 to-primary/4 ring-1 ring-primary/15 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.5),0_4px_12px_-4px_hsl(var(--primary)/0.25)] sm:flex">
            <ShoppingBasket className="size-[20px] text-primary" />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full ring-2 ring-background",
                online ? "bg-emerald-500" : "bg-amber-500",
              )}
              aria-hidden
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-[15px] font-bold tracking-tight text-foreground">
                Grocery POS
              </h1>
              <span className="hidden min-[420px]:inline-flex items-center rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-foreground/60">
                Sale
              </span>
            </div>
            <p className="truncate text-[11.5px] text-muted-foreground">
              {branchesLoading
                ? "Loading branches…"
                : activeBranchName || "Select a branch"}
              {cashierName && (
                <span className="hidden sm:inline">
                  <span className="mx-1.5 text-muted-foreground/40">·</span>
                  {cashierName}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.05em]",
              online
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/40"
                : "bg-amber-50 text-amber-800 ring-1 ring-amber-200/60 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800/40",
            )}
          >
            {online ? (
              <Wifi className="size-3" />
            ) : (
              <WifiOff className="size-3" />
            )}
            {online ? "Online" : "Offline"}
          </span>

          <a
            href="/grocery/invoices"
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-2xl border border-border/40 bg-white/80 px-3 text-[12.5px] font-semibold text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-md",
              "transition-all duration-200 hover:border-border hover:bg-white hover:text-foreground active:scale-[0.96]",
              "dark:bg-white/[0.03]",
            )}
          >
            <History className="size-4" />
            <span className="hidden sm:inline">Invoices</span>
          </a>
        </div>
      </header>

      {/* ── Error Toast ── */}
      {error && (
        <div className="mx-3 mt-2 flex items-center gap-2.5 rounded-2xl bg-destructive/[0.08] px-4 py-3 text-[13px] font-medium text-destructive shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-destructive/15 sm:mx-5 animate-in slide-in-from-top-2 fade-in duration-200">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-destructive/15 active:scale-90"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Split View ── */}
      <div className="flex min-h-0 flex-1 flex-row">
        {/* ── LEFT: Product Browser ── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:w-[62%] lg:flex-none xl:w-[64%] 2xl:w-[66%]">
          {/* Sticky search + filters block */}
          <div
            className={cn(
              "shrink-0 px-3 pb-2.5 pt-3 sm:px-5 sm:pt-4",
              "bg-gradient-to-b from-background/80 via-background/40 to-transparent",
            )}
          >
            <div className="flex items-center gap-2">
              {/* Search */}
              <div
                className={cn(
                  "group flex h-12 flex-1 items-center gap-1.5 rounded-2xl pl-4 pr-1.5",
                  "border border-border/40 bg-white/85 backdrop-blur-md",
                  "shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_hsl(0_0%_100%/0.5)]",
                  "transition-[border-color,box-shadow] duration-200",
                  "focus-within:border-primary/45 focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.10)]",
                  "dark:bg-white/[0.04]",
                )}
              >
                <Search className="size-[17px] shrink-0 text-muted-foreground/70 transition-colors group-focus-within:text-primary" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    allowedDepartmentLabel
                      ? `Search ${allowedDepartmentLabel}, scan barcode…`
                      : "Search products, scan barcode…"
                  }
                  className="h-full flex-1 bg-transparent text-[14px] font-medium outline-none placeholder:text-muted-foreground/50"
                  autoComplete="off"
                  aria-label="Search products"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:scale-90"
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className={cn(
                    "ml-0.5 flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[12px] font-semibold",
                    "bg-foreground/[0.04] text-foreground/70",
                    "transition-colors hover:bg-foreground/[0.08] hover:text-foreground active:scale-[0.94]",
                  )}
                  aria-label="Scan barcode"
                >
                  <ScanLine className="size-[17px]" />
                  <span className="hidden md:inline">Scan</span>
                </button>
              </div>
            </div>

            {allowedDepartmentLabel && (
              <div className="mt-2 text-[11.5px] text-muted-foreground/70">
                Browsing{" "}
                <span className="font-semibold text-foreground/80">
                  {allowedDepartmentLabel}
                </span>
              </div>
            )}
          </div>

          {/* Scrollable Product Area */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-32 pt-1 sm:px-5 lg:pb-6">
            {/* Search results */}
            {hasSearch && (
              <section className="mb-5">
                <SectionHeader
                  title="Search Results"
                  meta={
                    hits.length > 0
                      ? `${hits.length} item${hits.length === 1 ? "" : "s"}`
                      : undefined
                  }
                />
                {hits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-border/40 bg-muted/[0.15] py-14 text-center">
                    <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted/40">
                      <Search className="size-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-[13.5px] font-semibold text-foreground/70">
                      {searchBanner ?? "No items match your search."}
                    </p>
                    <p className="mt-1 text-[11.5px] text-muted-foreground/60">
                      Try a different term or scan a barcode
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {hits.map((item) => (
                      <ProductCard
                        key={item.id}
                        item={item}
                        shelfLine={tileShelfLine(
                          online,
                          tileShelfPrices,
                          item.id,
                        )}
                        onPick={() => addLine(item)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Your Top Sellers (server-aggregated) */}
            {showCatalog && (
              <section className="mb-5">
                <SectionHeader
                  icon={
                    <span className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400/30 to-amber-500/10 ring-1 ring-amber-400/30">
                      <Sparkles className="size-3.5 text-amber-600 dark:text-amber-400" />
                    </span>
                  }
                  title="Your Top Sellers"
                  meta={
                    topProducts.length > 0 ? `${topProducts.length}` : undefined
                  }
                />
                {!online ? (
                  <div className="rounded-[1.25rem] border border-border/30 bg-muted/[0.12] px-4 py-8 text-center">
                    <WifiOff className="mx-auto mb-2 size-5 text-muted-foreground/40" />
                    <p className="text-[13px] text-muted-foreground">
                      Go online to load your top sellers.
                    </p>
                  </div>
                ) : topProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-border/40 bg-muted/[0.15] py-12 text-center">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-amber-100/40">
                      <Sparkles className="size-5 text-amber-500/80" />
                    </div>
                    <p className="text-[13.5px] font-semibold text-foreground/70">
                      {topProductsLoading
                        ? "Loading your top sellers…"
                        : "No top sellers yet."}
                    </p>
                    {!topProductsLoading && (
                      <p className="mt-1 text-[11.5px] text-muted-foreground/60">
                        Items you invoice will climb this list automatically.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {topProducts.map((p) => (
                      <ProductCard
                        key={p.id}
                        item={{
                          id: p.id,
                          name: p.name,
                          sku: p.sku ?? "",
                          thumbnailUrl: p.thumbnailUrl ?? null,
                        }}
                        shelfLine={tileShelfLine(online, tileShelfPrices, p.id)}
                        onPick={() =>
                          addLine({
                            id: p.id,
                            name: p.name,
                            sku: p.sku ?? "",
                            thumbnailUrl: p.thumbnailUrl ?? null,
                          })
                        }
                        isTopSeller
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

          </div>
        </div>

        {/* ── RIGHT: Cart side panel (lg+) ── */}
        <aside
          className={cn(
            "hidden lg:flex shrink-0 flex-col",
            "lg:w-[38%] xl:w-[36%] 2xl:w-[34%]",
            "border-l border-border/40",
            "bg-white/55 backdrop-blur-2xl",
            "supports-[backdrop-filter]:bg-white/45",
            "dark:bg-background/30 dark:supports-[backdrop-filter]:bg-background/25",
            "shadow-[inset_1px_0_0_hsl(0_0%_100%/0.6)]",
            "dark:shadow-[inset_1px_0_0_hsl(0_0%_100%/0.04)]",
          )}
        >
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
          />
        </aside>
      </div>

      {/* ── < lg: Floating Cart Dock + FAB ── */}
      <div
        className={cn(
          "lg:hidden pointer-events-none fixed inset-x-0 bottom-0 z-30",
          "px-3 sm:px-5",
          // Sit above mobile bottom-nav (md:hidden mobile-only nav uses ~4.25rem + safe area)
          "pb-[calc(env(safe-area-inset-bottom,0.5rem)+4.75rem)] md:pb-[calc(env(safe-area-inset-bottom,0.5rem)+1rem)]",
        )}
      >
        <div className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-2.5">
          {/* Cart preview pill (only when items present) */}
          {!isEmptyCart && (
            <button
              type="button"
              onClick={() => setShowCartDrawer(true)}
              className={cn(
                "group flex h-14 flex-1 items-center gap-3 rounded-2xl pl-3 pr-4",
                "border border-border/40 bg-white/95 backdrop-blur-xl",
                "shadow-[0_12px_36px_-12px_rgba(0,0,0,0.18),0_4px_12px_-4px_rgba(0,0,0,0.08),inset_0_1px_0_hsl(0_0%_100%/0.7)]",
                "transition-[transform,box-shadow] duration-200",
                "hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.22)]",
                "active:scale-[0.985]",
                "animate-in slide-in-from-bottom-3 duration-300",
                "dark:bg-background/90 dark:supports-[backdrop-filter]:bg-background/70",
              )}
            >
              <span
                key={cartPulse}
                className={cn(
                  "relative flex size-10 shrink-0 items-center justify-center rounded-xl",
                  "bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/15",
                  cartPulse > 0 && "animate-pos-cart-pulse",
                )}
              >
                <ShoppingBasket className="size-[18px] text-primary" />
                <span className="absolute -right-1.5 -top-1.5 flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground shadow-[0_2px_6px_rgba(0,0,0,0.2)] tabular-nums">
                  {cartItemCount}
                </span>
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[12px] font-semibold leading-none text-muted-foreground">
                  {cartItemCount} item{cartItemCount === 1 ? "" : "s"} in cart
                </p>
                <p className="mt-1 truncate text-[15px] font-bold tabular-nums leading-none text-foreground">
                  {formatShelfPriceLabel(grandTotal, currency) ??
                    `${currency} ${grandTotal.toFixed(2)}`}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-active:translate-x-0.5" />
            </button>
          )}

          {/* Floating Generate Invoice button — always visible */}
          <button
            type="button"
            onClick={isEmptyCart ? () => setShowCartDrawer(true) : onGenerate}
            disabled={loading}
            className={cn(
              "group relative flex h-14 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 text-[14px] font-bold text-white",
              "transition-[transform,box-shadow] duration-300",
              "active:scale-[0.96]",
              "touch-manipulation",
              isEmptyCart
                ? "bg-muted-foreground/40 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.2)]"
                : "bg-[linear-gradient(135deg,hsl(var(--primary))_0%,color-mix(in_oklch,hsl(var(--primary))_88%,#fff)_50%,hsl(var(--primary))_100%)]",
              !isEmptyCart &&
                "shadow-[0_12px_32px_-6px_hsl(var(--primary)/0.5),inset_0_1px_0_hsl(0_0%_100%/0.2)]",
              !isEmptyCart && !loading && "animate-pos-fab-breathe",
              loading && "pointer-events-none opacity-80",
              "animate-in zoom-in-95 fade-in duration-300",
              // Make solo button fill width when cart is empty on small screens
              isEmptyCart && "flex-1 sm:flex-none",
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
            {loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span className="hidden sm:inline">Processing…</span>
              </>
            ) : isEmptyCart ? (
              <>
                <ShoppingBasket className="size-[18px]" />
                <span>View Cart</span>
              </>
            ) : (
              <>
                <Receipt className="size-[18px] transition-transform duration-300 group-hover:-rotate-3" />
                <span className="hidden sm:inline">Generate Invoice</span>
                <span className="sm:hidden">Generate</span>
                <span className="flex size-5 items-center justify-center rounded-full bg-white/25 text-[11px] font-bold tabular-nums">
                  {cartItemCount}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Cart drawer (< lg only; slide-from-right on md, bottom-sheet on mobile) ── */}
      {showCartDrawer && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Cart"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setShowCartDrawer(false)}
          />

          {/* Mobile: bottom sheet | Tablet portrait: right side drawer */}
          <div
            className={cn(
              "absolute flex flex-col bg-background shadow-[0_-12px_48px_rgba(0,0,0,0.2)]",
              "max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:max-h-[88vh] max-md:rounded-t-[1.75rem]",
              "max-md:animate-in max-md:slide-in-from-bottom max-md:duration-300",
              "md:right-0 md:top-0 md:h-full md:w-[26rem] md:max-w-[88vw]",
              "md:animate-in md:slide-in-from-right md:duration-300",
              "md:border-l md:border-border/40",
              "dark:bg-card",
            )}
          >
            {/* Mobile-only drag handle */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="h-1.5 w-12 rounded-full bg-border/70" />
            </div>

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
            />
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
    </div>
  );
}
