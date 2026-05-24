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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DASHBOARD_SECTION_SURFACE } from "@/components/dashboard-page-ui";
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

// ── Tile components ────────────────────────────────────────────────

function KioskTileShelfBadge({ shelfLine }: { shelfLine: string }) {
  const { amount, code } = splitShelfPriceDisplay(shelfLine);
  return (
    <div className="pointer-events-none absolute bottom-1.5 right-1.5 z-[1] max-w-[calc(100%-0.75rem)] truncate rounded-md border border-neutral-300/80 bg-background/95 px-1.5 py-0.5 shadow-md backdrop-blur-[2px] dark:border-neutral-600/60 dark:bg-background/92 inline-flex items-baseline gap-0.5 tabular-nums">
      {code ? (
        <>
          <span className="text-[11px] font-bold leading-none text-neutral-900 dark:text-neutral-100 sm:text-[12px]">
            {amount}
          </span>
          <span className="text-[7px] font-semibold uppercase leading-none tracking-[0.14em] text-neutral-700 dark:text-neutral-300 sm:text-[8px]">
            {code}
          </span>
        </>
      ) : (
        <span className="text-[10px] font-semibold leading-none text-neutral-900 dark:text-neutral-100 sm:text-[11px]">
          {amount}
        </span>
      )}
    </div>
  );
}

function ItemTile({
  item,
  shelfLine,
  onPick,
}: {
  item: ItemSummaryRecord;
  shelfLine: string;
  onPick: () => void;
}) {
  const thumb = itemListThumbnailUrl(item);
  const title = cashierItemPrimaryLabel(item);

  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/45 bg-white text-left shadow-sm ring-1 ring-black/[0.02] transition-[box-shadow,border-color,transform] duration-200",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2",
        "dark:border-border/50 dark:bg-card dark:ring-white/[0.03]",
        "min-h-[7rem]",
      )}
    >
      <div className="relative flex-1">
        <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-t-xl bg-neutral-50/90 dark:bg-muted/40">
          {thumb ? (
            <Image
              src={thumb}
              alt=""
              width={120}
              height={90}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <ShoppingBasket className="size-8 text-muted-foreground/40" />
          )}
        </div>
        <KioskTileShelfBadge shelfLine={shelfLine} />
      </div>
      <div className="px-2 pb-2 pt-1.5">
        <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-foreground sm:text-xs">
          {title}
        </p>
      </div>
    </button>
  );
}

// ── Main workspace ─────────────────────────────────────────────────

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
  const tileShelfPriceValues = useRef<Record<string, number>>({});

  // Cart state
  const [lines, setLines] = useState<GroceryCartLine[]>([]);

  // Invoice generation state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedInvoice, setGeneratedInvoice] =
    useState<GroceryInvoiceResponse | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────

  const subtotal = useMemo(() => {
    let t = 0;
    for (const line of lines) {
      t += round2(line.quantity * line.unitPrice);
    }
    return round2(t);
  }, [lines]);

  const grandTotal = subtotal; // No tax/discount for grocery invoices

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

  const activeBranchName = useMemo(() => {
    return branches.find((b) => b.id === branchId)?.name?.trim() ?? "";
  }, [branches, branchId]);

  // ── Effects ─────────────────────────────────────────────────────────

  // Fetch category tree
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

  // Load top products
  useEffect(() => {
    setTopProducts(getTopProducts(business?.id ?? null, 8));
  }, [business?.id]);

  // Search
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

  // Shelf prices
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
        if (r.price != null) { tileShelfPriceValues.current[id] = typeof r.price === "string" ? Number(r.price) : r.price; }
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

  // ── Cart actions ───────────────────────────────────────────────────

  const addLine = useCallback(
    (item: ItemSummaryRecord) => {
      const existingIdx = lines.findIndex((l) => l.itemId === item.id);
      if (existingIdx >= 0) {
        // Increment quantity
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

  // ── Category browsing ──────────────────────────────────────────────

  const applySubtreeFilter = useCallback((id: string, label: string) => {
    setCategoryFilterId(id);
    setCategoryFilterLabel(label);
    setSearch("");
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

  // ── Generate invoice ───────────────────────────────────────────────

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
    // Require prices on all lines
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
      // Record top sellers
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

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl flex-col gap-0 overflow-hidden px-2 py-3 sm:px-4">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
            <Store className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Grocery Counter
            </h1>
            <p className="text-xs text-muted-foreground">
              {branchesLoading
                ? "Loading…"
                : activeBranchName
                  ? `Selling at ${activeBranchName}`
                  : "Pick a branch to start"}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {!online && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              Offline
            </span>
          )}
          <a
            href="/grocery/invoices"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Receipt className="size-3.5" />
            Invoices
          </a>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="mx-1 mb-2 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive sm:mx-0">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 rounded-md p-0.5 hover:bg-destructive/20"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Main two-panel layout */}
      <div className="flex flex-1 gap-4 overflow-hidden lg:flex-row flex-col">
        {/* ── Left Panel: Item Browser ── */}
        <div className="flex flex-1 flex-col overflow-hidden lg:w-[55%]">
          {/* Search bar */}
          <div className="shrink-0 px-1 pb-3 sm:px-0">
            <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/90 pl-3 pr-1 shadow-sm transition-colors focus-within:border-primary/30 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]">
              <Search className="size-[1.125rem] shrink-0 text-muted-foreground/80" />
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="shrink-0 rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Scan barcode"
              >
                <ScanLine className="size-[1.125rem]" />
              </button>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  categoryFilterId
                    ? "Search within this aisle…"
                    : "Search by name, SKU or scan barcode…"
                }
                className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 sm:h-11"
                autoComplete="off"
                aria-label="Search products"
              />
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
            {searchBanner && (
              <p className="mt-2 px-0.5 text-xs text-amber-800 dark:text-amber-200">
                {searchBanner}
              </p>
            )}
            {categoryFilterId && (
              <div className="mt-2 flex items-center gap-2 px-0.5 text-xs">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
                  Aisle: {categoryFilterLabel ?? categoryFilterId}
                </span>
                <button
                  type="button"
                  onClick={clearCategoryFilter}
                  className="text-muted-foreground underline-offset-2 hover:underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-1 pb-4 sm:px-0">
            {/* Search hits */}
            {hasSearch && (
              <section
                className={cn(
                  DASHBOARD_SECTION_SURFACE,
                  "space-y-2 p-3 sm:space-y-2.5 sm:p-4",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    {search.trim() ? "Search results" : "Aisle items"}
                  </h3>
                  {hits.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {hits.length} match{hits.length === 1 ? "" : "es"}
                    </span>
                  )}
                </div>
                {hits.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/50 bg-muted/10 py-7 text-center text-xs text-muted-foreground">
                    {search.trim()
                      ? "No items match your search."
                      : "No items in this aisle."}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2">
                    {hits.map((item) => (
                      <ItemTile
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

            {/* Top sellers */}
            {showCatalog && topProducts.length > 0 && (
              <section className="mb-3 space-y-2.5 rounded-xl border border-border/50 bg-card p-3 shadow-sm sm:p-3.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    ★
                  </span>
                  <h3 className="text-sm font-semibold tracking-tight">
                    Top sellers
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2">
                  {topProducts.map((p) => (
                    <ItemTile
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
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Category browsing */}
            {showCatalog && (
              <section
                className={cn(
                  DASHBOARD_SECTION_SURFACE,
                  "space-y-2 p-3 sm:p-4",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    Browse Aisles
                  </h3>
                  {categoryBrowseStack.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() =>
                        setCategoryBrowseStack((s) => s.slice(0, -1))
                      }
                    >
                      <ChevronLeft className="size-3.5" />
                      Back
                    </Button>
                  )}
                </div>
                {!online ? (
                  <p className="text-xs text-muted-foreground">
                    Go online to load aisles.
                  </p>
                ) : categoryTreeBusy ? (
                  <p className="text-xs text-muted-foreground">
                    Loading aisles…
                  </p>
                ) : visibleCategoryTiles.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/50 bg-muted/10 py-7 text-center text-xs text-muted-foreground">
                    No active aisles.
                  </p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-0.5">
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
                          className="flex w-[5.75rem] shrink-0 flex-col items-center gap-1 rounded-xl border border-border/45 bg-white p-1.5 text-center text-[10px] shadow-sm ring-1 ring-black/[0.02] transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md disabled:opacity-50"
                          onClick={() => drillCategory(node)}
                        >
                          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/35 bg-neutral-50/90">
                            {thumb ? (
                              <Image
                                src={thumb}
                                alt=""
                                width={44}
                                height={44}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <span className="text-sm font-bold text-muted-foreground/70">
                                {node.name.trim().charAt(0).toUpperCase() ||
                                  "?"}
                              </span>
                            )}
                          </span>
                          <span className="line-clamp-2 min-h-[2rem] w-full text-[10px] font-semibold leading-[1.15] text-foreground">
                            {node.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>

        {/* ── Right Panel: Invoice Cart ── */}
        <div className="flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.02] lg:w-[45%] dark:ring-white/[0.03]">
          <GroceryInvoiceCart
            lines={lines}
            onUpdateLine={updateLine}
            onRemoveLine={removeLine}
            onGenerate={onGenerate}
            loading={loading}
            subtotal={subtotal}
            grandTotal={grandTotal}
            currency={currency}
          />
        </div>
      </div>

      {/* Scanner overlay */}
      {showScanner && (
        <BarcodeScanner
          onScan={(barcode) => {
            setSearch(barcode);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Success modal */}
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
