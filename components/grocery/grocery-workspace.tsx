"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Search,
  ScanLine,
  ShoppingBasket,
  X,
  Store,
  ChevronLeft,
  Receipt,
  Plus,
  Minus,
  Trash2,
  Grid3X3,
  History,
  Sparkles,
  Layers,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { CASHIER_POS_UI_COPY } from "@/lib/cashier-pos-copy";
import { cn } from "@/lib/utils";
import {
  fetchCategoryTree,
  fetchItems,
  type CategoryTreeNodeRecord,
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
import {
  getTopProducts,
  recordSaleLines,
  type TopProductRecord,
} from "@/lib/top-products";
import { BarcodeScanner } from "@/components/barcode-scanner";

import {
  createGroceryInvoice,
  GroceryApiError,
  type GroceryInvoiceResponse,
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
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-white text-left",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        "transition-all duration-200 ease-out",
        "active:scale-[0.97] active:shadow-[0_0_0_rgba(0,0,0,0)]",
        "hover:border-primary/25 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1",
        "dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/[0.14]",
        "touch-manipulation select-none",
        "min-h-[8.5rem]",
      )}
    >
      {/* Image area */}
      <div className="relative aspect-[5/4] w-full overflow-hidden bg-gradient-to-b from-neutral-100 to-neutral-50 dark:from-white/[0.04] dark:to-white/[0.02]">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            width={160}
            height={128}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            unoptimized
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBasket className="size-7 text-muted-foreground/25" />
          </div>
        )}

        {/* Top seller badge */}
        {isTopSeller && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm backdrop-blur-sm">
            <Sparkles className="size-2.5" />
            TOP
          </span>
        )}

        {/* Quick-add overlay on hover/touch */}
        <div className="absolute inset-0 flex items-end justify-end p-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-active:opacity-100">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/90 text-white shadow-lg backdrop-blur-sm transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
            <Plus className="size-4" />
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between px-2.5 pb-2.5 pt-2">
        <p className="line-clamp-2 text-[12px] font-semibold leading-[1.2] text-foreground">
          {title}
        </p>

        {/* Price */}
        <div className="mt-1.5 flex items-baseline gap-0.5">
          {hasPrice ? (
            <>
              <span className="text-[14px] font-bold tabular-nums leading-none text-foreground">
                {amount}
              </span>
              {code && (
                <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
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

// ── Category Pill ──────────────────────────────────────────────────

function CategoryPill({
  node,
  isActive,
  onClick,
}: {
  node: CategoryTreeNodeRecord;
  isActive: boolean;
  onClick: () => void;
}) {
  const thumb = node.thumbnailUrl?.trim();
  const kids = (node.children ?? []).filter((c) => c.active);
  const hasChildren = kids.length > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition-all duration-200",
        "touch-manipulation select-none",
        "active:scale-[0.96]",
        isActive
          ? "border-primary/40 bg-primary/8 text-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
          : "border-border/50 bg-white text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground dark:bg-white/[0.02] dark:hover:bg-white/[0.06]",
      )}
    >
      {thumb ? (
        <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
          <Image
            src={thumb}
            alt=""
            width={24}
            height={24}
            className="h-full w-full object-cover"
            unoptimized
          />
        </span>
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-[10px] font-bold text-muted-foreground">
          {node.name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
      <span className="line-clamp-1 max-w-[7rem]">{node.name}</span>
      {hasChildren && (
        <span className="ml-0.5 text-[9px] opacity-60">{kids.length}</span>
      )}
    </button>
  );
}

// ── Skeleton Cards ─────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border/30 bg-white dark:bg-white/[0.02]">
      <div className="aspect-[5/4] w-full animate-shimmer bg-gradient-to-r from-muted/30 via-muted/10 to-muted/30 bg-[length:200%_100%]" />
      <div className="space-y-2 px-2.5 pb-2.5 pt-2">
        <div className="h-3 w-3/4 rounded-md bg-muted/40 animate-shimmer bg-gradient-to-r from-muted/30 via-muted/10 to-muted/30 bg-[length:200%_100%]" />
        <div className="h-4 w-1/3 rounded-md bg-muted/30 animate-shimmer bg-gradient-to-r from-muted/30 via-muted/10 to-muted/30 bg-[length:200%_100%]" />
      </div>
    </div>
  );
}

// ── Main Workspace ─────────────────────────────────────────────────

export function GroceryWorkspace() {
  const { me, business, branches, branchId, setBranchId, branchesLoading } =
    useDashboard();
  const online = useOnlineStatus();
  const currency = business?.currency?.trim() || "KES";

  // Item browser state
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<ItemSummaryRecord[]>([]);
  const [searchBanner, setSearchBanner] = useState<string | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductRecord[]>([]);
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
  const [showScanner, setShowScanner] = useState(false);
  const [tileShelfPrices, setTileShelfPrices] = useState<
    Record<string, string>
  >({});
  const [showCategoryDrawer, setShowCategoryDrawer] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const tileShelfPriceValues = useRef<Record<string, number>>({});

  // Cart state
  const [lines, setLines] = useState<GroceryCartLine[]>([]);

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

  const visibleCategoryTiles = useMemo(() => {
    if (categoryBrowseStack.length > 0) {
      const parent = categoryBrowseStack[categoryBrowseStack.length - 1];
      const kids = (parent.children ?? []).filter((c) => c.active);
      if (kids.length > 0) return kids;
    }
    return categoryRoots;
  }, [categoryRoots, categoryBrowseStack]);

  const categoryBrowseParentId = useMemo(() => {
    if (categoryBrowseStack.length > 0) {
      return categoryBrowseStack[categoryBrowseStack.length - 1].id;
    }
    return null;
  }, [categoryBrowseStack]);

  const hasSearch = search.trim().length > 0 || categoryFilterId != null;
  const showCatalog = !hasSearch;
  const cartItemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  const activeBranchName = useMemo(() => {
    return branches.find((b) => b.id === branchId)?.name?.trim() ?? "";
  }, [branches, branchId]);

  // ── Effects ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    const spin = window.setTimeout(() => {
      if (!cancelled) setCategoryTreeBusy(true);
    }, 0);
    fetchCategoryTree()
      .then((tree) => {
        if (!cancelled) setCategoryRoots(tree.filter((n) => n.active));
      })
      .catch(() => {
        if (!cancelled) setCategoryRoots([]);
      })
      .finally(() => {
        if (!cancelled) setCategoryTreeBusy(false);
      });
    return () => {
      window.clearTimeout(spin);
      cancelled = true;
    };
  }, [online]);

  useEffect(() => {
    setTopProducts(getTopProducts(business?.id ?? null, 8));
  }, [business?.id]);

  useEffect(() => {
    const q = search.trim();
    const cat = categoryFilterId?.trim();
    if (!q && !cat) {
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
      fetchItems(q || undefined, {
        categoryId: cat || undefined,
        includeCategoryDescendants: !!cat,
        branchId: bid,
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
  }, [search, categoryFilterId, branchId, online]);

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

  // ── Cart actions ─────────────────────────────────────────────────

  const addLine = useCallback(
    (item: ItemSummaryRecord) => {
      const existingIdx = lines.findIndex((l) => l.itemId === item.id);
      if (existingIdx >= 0) {
        setLines((prev) =>
          prev.map((l, i) =>
            i === existingIdx ? { ...l, quantity: l.quantity + 1 } : l,
          ),
        );
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
      }
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

  // ── Category browsing ────────────────────────────────────────────

  const applySubtreeFilter = useCallback((id: string, label: string) => {
    setCategoryFilterId(id);
    setCategoryFilterLabel(label);
    setSearch("");
    setShowCategoryDrawer(false);
  }, []);

  const clearCategoryFilter = useCallback(() => {
    setCategoryFilterId(null);
    setCategoryFilterLabel(null);
    setCategoryBrowseStack([]);
  }, []);

  const drillCategory = useCallback(
    (node: CategoryTreeNodeRecord) => {
      const kids = (node.children ?? []).filter((c) => c.active);
      if (kids.length > 0) {
        setCategoryBrowseStack((s) => [...s, node]);
      } else {
        applySubtreeFilter(node.id, node.name);
      }
    },
    [applySubtreeFilter],
  );

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
      recordSaleLines(
        business?.id ?? null,
        lines.map((l) => ({
          item: {
            id: l.itemId,
            name: l.label,
            sku: "",
            thumbnailUrl: null,
          },
          qty: l.quantity,
        })),
      );
      toast.success("Invoice created!", {
        description: `Barcode: ${invoice.barcodeCode}`,
        duration: 6_000,
      });
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
  }, [branchId, lines, business?.id]);

  const onNewInvoice = useCallback(() => {
    clearCart();
    setSearch("");
    setHits([]);
  }, [clearCart]);

  // ── Render ───────────────────────────────────────────────────────

  const isEmptyCart = lines.length === 0;

  return (
    <div className="relative flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-gradient-to-b from-neutral-50/60 to-background dark:from-background dark:to-background">
      {/* ── Compact Header Bar ── */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/30 bg-white/70 px-4 py-2.5 backdrop-blur-xl dark:bg-background/70 md:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <Store className="size-[18px] text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold tracking-tight text-foreground truncate">
              Grocery
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {branchesLoading
                ? "Loading…"
                : activeBranchName
                  ? activeBranchName
                  : "Select branch"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!online && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              Offline
            </span>
          )}
          <a
            href="/grocery/invoices"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/40 bg-white px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-all duration-200 hover:border-border hover:bg-muted/50 hover:text-foreground active:scale-[0.97] dark:bg-white/[0.02]"
          >
            <History className="size-3.5" />
            <span className="hidden sm:inline">Invoices</span>
          </a>
        </div>
      </header>

      {/* ── Error Toast ── */}
      {error && (
        <div className="mx-3 mt-2 flex items-center gap-2.5 rounded-2xl bg-destructive/8 px-4 py-3 text-[13px] font-medium text-destructive shadow-sm ring-1 ring-destructive/10 md:mx-4 animate-in slide-in-from-top-2 duration-200">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-destructive/15 active:scale-90"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── Main Content: Split Pane ── */}
      <div className="flex flex-1 min-h-0 md:flex-row flex-col">
        {/* ── LEFT PANEL: Product Browser ── */}
        <div className="flex flex-1 flex-col min-h-0 md:w-[58%] lg:w-[60%]">
          {/* Search + Quick Actions Bar */}
          <div className="shrink-0 px-3 pt-3 pb-2 md:px-4 md:pt-4 md:pb-2.5">
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="flex flex-1 items-center gap-1.5 rounded-2xl border border-border/40 bg-white/80 pl-3.5 pr-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] backdrop-blur-md transition-all duration-200 focus-within:border-primary/40 focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.08)] dark:bg-white/[0.04]">
                <Search className="size-[17px] shrink-0 text-muted-foreground/70" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products, scan barcode…"
                  className="h-11 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground/50"
                  autoComplete="off"
                  aria-label="Search products"
                />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:scale-90"
                  aria-label="Scan barcode"
                >
                  <ScanLine className="size-[18px]" />
                </button>
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
              </div>

              {/* Quick action buttons */}
              <button
                type="button"
                onClick={() => setShowCategoryDrawer(true)}
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/40 bg-white/80 text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.03)] backdrop-blur-md transition-all duration-200 hover:border-border hover:text-foreground hover:shadow-md active:scale-[0.94] md:hidden"
                aria-label="Browse categories"
              >
                <Grid3X3 className="size-[18px]" />
              </button>
            </div>

            {/* Category filter chip */}
            {categoryFilterId && (
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                  <Layers className="size-3" />
                  {categoryFilterLabel ?? "Aisle"}
                </span>
                <button
                  type="button"
                  onClick={clearCategoryFilter}
                  className="text-[12px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Browse stack breadcrumb */}
            {categoryBrowseStack.length > 0 && !categoryFilterId && (
              <div className="mt-2 flex items-center gap-1 text-[12px]">
                <button
                  type="button"
                  onClick={() => setCategoryBrowseStack([])}
                  className="font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  All
                </button>
                {categoryBrowseStack.map((node, i) => (
                  <span key={node.id} className="flex items-center gap-1">
                    <ChevronLeft className="size-3 rotate-180 text-muted-foreground/40" />
                    {i === categoryBrowseStack.length - 1 ? (
                      <span className="font-semibold text-foreground">
                        {node.name}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setCategoryBrowseStack((s) => s.slice(0, i + 1))
                        }
                        className="font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {node.name}
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Category Pills (tablet/desktop — horizontal scroll) */}
          {showCatalog &&
            !categoryFilterId &&
            visibleCategoryTiles.length > 0 && (
              <div className="hidden md:flex shrink-0 items-center gap-1.5 overflow-x-auto px-4 pb-3 scrollbar-none">
                {/* "All" pill */}
                <button
                  type="button"
                  onClick={() => {
                    setCategoryBrowseStack([]);
                    setCategoryFilterId(null);
                    setCategoryFilterLabel(null);
                  }}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition-all duration-200 touch-manipulation select-none active:scale-[0.96]",
                    categoryBrowseStack.length === 0 && !categoryFilterId
                      ? "border-primary/40 bg-primary/8 text-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
                      : "border-border/50 bg-white text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground dark:bg-white/[0.02]",
                  )}
                >
                  <Grid3X3 className="size-3.5" />
                  All
                </button>
                {visibleCategoryTiles.map((node) => (
                  <CategoryPill
                    key={node.id}
                    node={node}
                    isActive={categoryBrowseStack.some((s) => s.id === node.id)}
                    onClick={() => drillCategory(node)}
                  />
                ))}
              </div>
            )}

          {/* Scrollable Product Area */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4 md:px-4 md:pb-5">
            {/* Search Results */}
            {hasSearch && (
              <section className="mb-4">
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
                    {search.trim() ? "Search Results" : "Aisle Items"}
                  </h3>
                  {hits.length > 0 && (
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {hits.length} item{hits.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                {hits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 bg-muted/[0.15] py-12 text-center">
                    <Search className="mb-3 size-8 text-muted-foreground/25" />
                    <p className="text-[13px] font-medium text-muted-foreground/70">
                      {search.trim()
                        ? "No items match your search."
                        : "No items in this aisle."}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/50">
                      Try a different term or browse categories
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5">
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

            {/* Top Sellers */}
            {showCatalog && topProducts.length > 0 && (
              <section className="mb-4">
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="inline-flex size-5 items-center justify-center rounded-md bg-amber-500/15 text-[10px]">
                    <Sparkles className="size-3 text-amber-600 dark:text-amber-400" />
                  </span>
                  <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
                    Top Sellers
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5">
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
              </section>
            )}

            {/* Category Browse Grid */}
            {showCatalog &&
              !categoryFilterId &&
              visibleCategoryTiles.length > 0 && (
                <section>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
                      Browse Aisles
                    </h3>
                    {categoryBrowseStack.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setCategoryBrowseStack((s) => s.slice(0, -1))
                        }
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
                      >
                        <ChevronLeft className="size-3.5" />
                        Back
                      </button>
                    )}
                  </div>
                  {!online ? (
                    <div className="rounded-2xl border border-border/30 bg-muted/[0.1] px-4 py-6 text-center">
                      <p className="text-[13px] text-muted-foreground">
                        Go online to browse aisles.
                      </p>
                    </div>
                  ) : categoryTreeBusy ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <SkeletonCard key={i} />
                      ))}
                    </div>
                  ) : visibleCategoryTiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 bg-muted/[0.15] py-12 text-center">
                      <Layers className="mb-3 size-8 text-muted-foreground/25" />
                      <p className="text-[13px] font-medium text-muted-foreground/70">
                        No active aisles.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5">
                      {visibleCategoryTiles.map((node) => {
                        const thumb = node.thumbnailUrl?.trim();
                        const kids = (node.children ?? []).filter(
                          (c) => c.active,
                        );
                        const drillable = kids.length > 0;
                        return (
                          <button
                            key={node.id}
                            type="button"
                            disabled={!online}
                            onClick={() => drillCategory(node)}
                            className={cn(
                              "group flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-white p-3 text-center transition-all duration-200",
                              "touch-manipulation select-none",
                              "active:scale-[0.96]",
                              "hover:border-primary/25 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
                              "disabled:opacity-50",
                              "dark:bg-white/[0.03] dark:hover:border-white/[0.14]",
                            )}
                          >
                            <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/30 bg-gradient-to-b from-neutral-100 to-neutral-50 dark:from-white/[0.04] dark:to-white/[0.02]">
                              {thumb ? (
                                <Image
                                  src={thumb}
                                  alt=""
                                  width={56}
                                  height={56}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-lg font-bold text-muted-foreground/40">
                                  {node.name.trim().charAt(0).toUpperCase() ||
                                    "?"}
                                </span>
                              )}
                              {drillable && (
                                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary/15 text-[8px] font-bold text-primary">
                                  ›
                                </span>
                              )}
                            </span>
                            <span className="line-clamp-2 text-[11px] font-semibold leading-[1.2] text-foreground">
                              {node.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

            {/* Empty catalog state */}
            {showCatalog &&
              topProducts.length === 0 &&
              visibleCategoryTiles.length === 0 &&
              !categoryTreeBusy && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Store className="mb-4 size-12 text-muted-foreground/20" />
                  <p className="text-[14px] font-medium text-muted-foreground">
                    {online
                      ? "No products available."
                      : "Go online to browse products."}
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Cart (Tablet: sticky side panel, Mobile: hidden behind floating button) ── */}
        {/* Desktop/Tablet: always visible side panel */}
        <div className="hidden md:flex md:w-[42%] lg:w-[40%] md:shrink-0 md:flex-col md:border-l md:border-border/30 md:bg-gradient-to-b md:from-white/60 md:to-white/40 md:backdrop-blur-2xl md:dark:from-background/80 md:dark:to-background/60">
          <GroceryInvoiceCart
            lines={lines}
            onUpdateLine={updateLine}
            onRemoveLine={removeLine}
            onGenerate={onGenerate}
            loading={loading}
            subtotal={subtotal}
            grandTotal={grandTotal}
            currency={currency}
            branchName={activeBranchName}
          />
        </div>

        {/* Mobile: cart as overlay drawer triggered by floating button */}
        {!isEmptyCart && (
          <div className="md:hidden">
            {/* Mobile cart peek bar */}
            <div className="fixed bottom-[5rem] left-3 right-3 z-30 animate-in slide-in-from-bottom-4 duration-300">
              <button
                type="button"
                onClick={() => setShowMobileCart(true)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-white/90 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.16)] active:scale-[0.98] dark:bg-background/90"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <ShoppingBasket className="size-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[13px] font-semibold text-foreground">
                    {cartItemCount} item{cartItemCount === 1 ? "" : "s"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatShelfPriceLabel(grandTotal, currency) ??
                      `${currency} ${grandTotal.toFixed(2)}`}
                  </p>
                </div>
                <span className="rounded-full bg-primary px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm">
                  View Cart
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating Generate Invoice Button (mobile) ── */}
      <div className="md:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0.5rem))] right-4 z-40">
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading || isEmptyCart}
          className={cn(
            "group relative flex items-center gap-2 rounded-2xl px-5 py-3.5 text-[14px] font-bold text-white transition-all duration-300",
            "shadow-[0_8px_32px_rgba(0,0,0,0.2),0_0_0_0_hsl(var(--primary)/0.4)]",
            "hover:shadow-[0_12px_40px_rgba(0,0,0,0.25),0_0_0_6px_hsl(var(--primary)/0.15)]",
            "active:scale-[0.95] active:shadow-[0_4px_16px_rgba(0,0,0,0.2)]",
            isEmptyCart
              ? "bg-muted-foreground/40"
              : "bg-gradient-to-r from-primary to-primary/90",
            loading && "opacity-70 pointer-events-none",
          )}
        >
          {loading ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Processing…
            </>
          ) : (
            <>
              <Receipt className="size-[18px] transition-transform duration-300 group-hover:rotate-[-4deg]" />
              Generate Invoice
              {!isEmptyCart && (
                <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-white/20 text-[11px]">
                  {cartItemCount}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* ── Category Drawer (mobile slide-over) ── */}
      {showCategoryDrawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowCategoryDrawer(false)}
          />
          {/* Drawer */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] rounded-t-3xl bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom duration-300 dark:bg-card">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-border/60" />
            </div>

            <div className="px-4 pb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-bold text-foreground">
                  Aisles
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCategoryDrawer(false)}
                  className="flex size-8 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-90"
                >
                  <X className="size-4" />
                </button>
              </div>

              {categoryBrowseStack.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCategoryBrowseStack((s) => s.slice(0, -1))}
                  className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-border/40 px-3 py-2 text-[12px] font-medium transition-colors hover:bg-muted active:scale-[0.97]"
                >
                  <ChevronLeft className="size-3.5" />
                  Back
                </button>
              )}

              <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto overscroll-contain">
                {/* "All" option */}
                <button
                  type="button"
                  onClick={() => {
                    setCategoryBrowseStack([]);
                    setCategoryFilterId(null);
                    setCategoryFilterLabel(null);
                    setShowCategoryDrawer(false);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all duration-200 active:scale-[0.95]",
                    categoryBrowseStack.length === 0 && !categoryFilterId
                      ? "border-primary/40 bg-primary/8"
                      : "border-border/40 bg-white hover:bg-muted/40 dark:bg-white/[0.02]",
                  )}
                >
                  <span className="flex size-12 items-center justify-center rounded-xl bg-muted/60">
                    <Grid3X3 className="size-5 text-muted-foreground" />
                  </span>
                  <span className="text-[11px] font-semibold">All Items</span>
                </button>

                {visibleCategoryTiles.map((node) => {
                  const thumb = node.thumbnailUrl?.trim();
                  const kids = (node.children ?? []).filter((c) => c.active);
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => drillCategory(node)}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-white p-3 text-center transition-all duration-200 active:scale-[0.95] dark:bg-white/[0.02]"
                    >
                      <span className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-neutral-100 to-neutral-50">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="text-base font-bold text-muted-foreground/40">
                            {node.name.trim().charAt(0).toUpperCase() || "?"}
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-2 text-[11px] font-semibold leading-[1.2]">
                        {node.name}
                      </span>
                      {kids.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          {kids.length} sub-aisle{kids.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Cart Bottom Sheet ── */}
      {showMobileCart && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowMobileCart(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] flex flex-col rounded-t-3xl bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.18)] animate-in slide-in-from-bottom duration-300 dark:bg-card">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-border/60" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary/[0.08]">
                  <ShoppingBasket className="size-[17px] text-primary" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-foreground">
                    Cart
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {cartItemCount} item{cartItemCount === 1 ? "" : "s"} ·{" "}
                    {formatShelfPriceLabel(grandTotal, currency) ??
                      `${currency} ${grandTotal.toFixed(2)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileCart(false)}
                className="flex size-8 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-90"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Cart items (reuse cart component design) */}
            <div className="flex-1 overflow-y-auto overscroll-contain border-t border-border/[0.06]">
              {lines.map((line, i) => {
                const lineTotal = round2(line.quantity * line.unitPrice);
                const priceLabel = formatShelfPriceLabel(
                  line.unitPrice,
                  currency,
                );
                const totalLabel = formatShelfPriceLabel(lineTotal, currency);
                return (
                  <div
                    key={line.key}
                    className={cn(
                      "flex items-start gap-3 px-5 py-3.5 transition-colors",
                      "hover:bg-muted/[0.25]",
                      i !== lines.length - 1 && "border-b border-border/[0.06]",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-1">
                        {line.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {priceLabel ??
                          `${currency} ${line.unitPrice.toFixed(2)}`}
                      </p>
                      <div className="mt-2 inline-flex items-center rounded-xl border border-border/50 bg-muted/[0.25] p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateLine(
                              line.key,
                              "quantity",
                              Math.max(1, line.quantity - 1),
                            )
                          }
                          disabled={line.quantity <= 1}
                          className="flex size-8 items-center justify-center rounded-lg bg-white transition-all active:scale-90 disabled:opacity-30 dark:bg-white/[0.04]"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="flex min-w-[2.25rem] items-center justify-center text-[13px] font-bold tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateLine(line.key, "quantity", line.quantity + 1)
                          }
                          className="flex size-8 items-center justify-center rounded-lg bg-white transition-all active:scale-90 dark:bg-white/[0.04]"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2.5 pt-0.5">
                      <span className="text-[15px] font-bold tabular-nums leading-none text-foreground">
                        {totalLabel ?? `${currency} ${lineTotal.toFixed(2)}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/40 transition-all active:scale-90 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile cart footer */}
            <div className="shrink-0 border-t border-border/[0.08] px-5 pb-5 pt-3">
              <div className="flex items-end justify-between mb-4">
                <span className="text-[13px] font-medium text-muted-foreground">
                  Total Due
                </span>
                <span className="text-[22px] font-bold tabular-nums leading-none tracking-tight text-foreground">
                  {formatShelfPriceLabel(grandTotal, currency) ??
                    `${currency} ${grandTotal.toFixed(2)}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMobileCart(false);
                  onGenerate();
                }}
                disabled={loading}
                className={cn(
                  "flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-3.5 text-[14px] font-bold text-white transition-all duration-300",
                  "bg-gradient-to-r from-primary to-primary/90",
                  "shadow-[0_4px_20px_rgba(0,0,0,0.15)]",
                  "active:scale-[0.97]",
                  loading && "opacity-70 pointer-events-none",
                )}
              >
                {loading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating Invoice…
                  </>
                ) : (
                  <>
                    <Receipt className="size-[18px]" />
                    Generate Invoice
                  </>
                )}
              </button>
            </div>
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
