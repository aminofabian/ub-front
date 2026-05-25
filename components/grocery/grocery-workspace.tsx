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
  Command,
  MapPin,
  Clock3,
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
    <span className="hidden items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white/80 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-zinc-700 shadow-[0_1px_0_hsl(0_0%_100%/0.6)_inset] backdrop-blur-md lg:inline-flex dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-200">
      <Clock3 className="size-3 text-zinc-500" />
      {time}
    </span>
  );
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
        "group relative flex flex-col overflow-hidden rounded-2xl text-left",
        "border border-zinc-200/90 bg-white",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_0_rgba(255,255,255,0.6)_inset]",
        "transition-[transform,box-shadow,border-color] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_28px_-10px_rgba(15,23,42,0.18),0_2px_6px_-2px_rgba(15,23,42,0.06)]",
        "active:translate-y-0 active:scale-[0.97] active:shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50",
        "dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/[0.2]",
        "touch-manipulation select-none",
      )}
    >
      {/* Image area */}
      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-zinc-100 via-zinc-50 to-white dark:from-white/[0.05] dark:via-white/[0.03] dark:to-white/[0.02]">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            width={240}
            height={240}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08]"
            unoptimized
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBasket className="size-9 text-zinc-300 dark:text-white/15" />
          </div>
        )}

        {/* Top seller ribbon */}
        {isTopSeller && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-[3px] text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-white shadow-[0_4px_10px_rgba(217,119,6,0.35)] ring-1 ring-amber-300/50">
            <Sparkles className="size-2.5" strokeWidth={2.5} />
            Top
          </span>
        )}

        {/* Soft top gradient for legibility */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/[0.06] to-transparent"
        />

        {/* Quick-add bubble */}
        <div className="absolute bottom-2 right-2 flex translate-y-1 items-center justify-center opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-active:opacity-100">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-white shadow-[0_6px_16px_rgba(40,167,69,0.4)] ring-2 ring-white/60 backdrop-blur-sm transition-transform duration-200 group-hover:scale-105 group-active:scale-90">
            <Plus className="size-[18px]" strokeWidth={2.75} />
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between gap-2 px-3 pb-3 pt-2.5">
        <p className="line-clamp-2 text-[13px] font-semibold leading-[1.3] text-zinc-900 dark:text-zinc-50">
          {title}
        </p>

        <div className="flex items-baseline gap-1">
          {hasPrice ? (
            <>
              <span className="text-[15px] font-extrabold tabular-nums leading-none tracking-tight text-zinc-900 dark:text-zinc-50">
                {amount}
              </span>
              {code && (
                <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                  {code}
                </span>
              )}
            </>
          ) : (
            <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
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
    <div className="mb-3.5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon}
        <h3 className="font-sans truncate text-[15px] font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
        {meta && (
          <span className="inline-flex items-center rounded-full border border-zinc-200/80 bg-white px-2 py-0.5 text-[10.5px] font-bold tabular-nums text-zinc-600 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-zinc-300">
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
  } = useDashboard();
  const online = useOnlineStatus();
  const currency = business?.currency?.trim() || "KES";
  const cashierName = me?.name?.trim() || "";
  // Grocery clerks always see the AppShell's bottom nav (kiosk-nav mode).
  // We use this to reserve room at the bottom of every scrollable surface
  // and shrink the workspace's height so the cart panel footer stays above
  // the always-present nav.
  const isKiosk =
    me?.role?.key?.trim().toLowerCase() === "grocery_clerk";

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
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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

  // Departments (item types) the grocery clerk is allowed to invoice from.
  // The dashboard provider already trims `itemTypes` to the assigned set for
  // clerks, so this label is only meaningful when the role is restricted —
  // otherwise the operator can search the full catalog and we hide the chip.
  const allowedDepartmentLabel = useMemo(() => {
    if (!isKiosk) return "";
    if (itemTypes.length === 0) return "";
    if (itemTypes.length === 1) return itemTypes[0].label?.trim() || "";
    return `${itemTypes.length} departments`;
  }, [isKiosk, itemTypes]);

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
      // No itemTypeId is passed here on purpose: the grocery counter should
      // search every product the operator is allowed to invoice. For
      // grocery_clerk users the backend already AND-s in all of their
      // assigned departments via the role-based filter, so narrowing to a
      // single dashboard-selected department would just hide valid hits.
      fetchItems(q, {
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
  }, [search, branchId, online]);

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
        "grocery-workspace relative flex flex-col overflow-hidden",
        // Kiosk-nav mode (grocery clerk): leave room for the always-present
        // bottom nav so the cart-panel footer + Generate button never get
        // hidden behind it on tablets/iPads.
        isKiosk
          ? "h-[calc(100dvh-4rem-5rem-env(safe-area-inset-bottom,0px))]"
          : "h-[calc(100dvh-4rem)]",
        // Layered "counter" background: warm-cool gradient + soft grid + subtle vignette
        "bg-[radial-gradient(120%_70%_at_50%_-10%,hsl(var(--primary)/0.07),transparent_55%),linear-gradient(180deg,#fafbfc_0%,#f3f4f6_55%,#eef0f3_100%)]",
        "dark:bg-[radial-gradient(120%_70%_at_50%_-10%,hsl(var(--primary)/0.12),transparent_55%),hsl(var(--background))]",
      )}
    >
      {/* Decorative grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 90% 60% at 50% 0%, black, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 60% at 50% 0%, black, transparent 75%)",
        }}
      />

      {/* ── Header ── */}
      <header
        className={cn(
          "relative z-30 flex shrink-0 items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-3.5",
          "border-b border-zinc-200/80",
          "bg-white/85 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/70",
          "shadow-[0_1px_0_rgba(15,23,42,0.02)]",
          "dark:bg-background/60 dark:supports-[backdrop-filter]:bg-background/50 dark:border-white/[0.06]",
        )}
      >
        {/* Top accent stripe */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />

        <div className="flex min-w-0 items-center gap-3">
          {/* Brand badge */}
          <div className="relative hidden size-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-primary via-emerald-600 to-emerald-700 shadow-[0_6px_18px_-6px_rgba(40,167,69,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-emerald-500/40 sm:flex">
            <ShoppingBasket className="size-[20px] text-white drop-shadow-sm" />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full ring-2 ring-white",
                online ? "bg-emerald-500" : "bg-amber-500",
              )}
              aria-hidden
            >
              <span
                className={cn(
                  "absolute size-3.5 rounded-full",
                  online ? "bg-emerald-500/60" : "bg-amber-500/60",
                  "animate-ping",
                )}
              />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-sans truncate text-[17px] font-extrabold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
                Grocery POS
              </h1>
              <span className="hidden lg:inline-flex items-center gap-1 rounded-md bg-zinc-900 px-1.5 py-[3px] text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-white shadow-[0_1px_0_rgba(255,255,255,0.1)_inset] dark:bg-white dark:text-zinc-900">
                Live · Sale
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11.5px]">
              <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                <MapPin className="size-3 text-zinc-400" />
                <span className="truncate font-semibold">
                  {branchesLoading
                    ? "Loading branches…"
                    : activeBranchName || "Select a branch"}
                </span>
              </span>
              {cashierName && (
                <>
                  <span className="hidden text-zinc-300 sm:inline">·</span>
                  <span className="hidden text-zinc-500 sm:inline">
                    {cashierName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LiveClock />

          <span
            className={cn(
              "hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.08em] ring-1",
              online
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/50"
                : "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800/50",
            )}
          >
            <span
              className={cn(
                "relative inline-flex size-1.5 rounded-full",
                online ? "bg-emerald-500" : "bg-amber-500",
              )}
            >
              {online && (
                <span className="absolute inset-0 size-1.5 animate-ping rounded-full bg-emerald-500/70" />
              )}
            </span>
            {online ? "Online" : "Offline"}
          </span>

          <a
            href="/grocery/invoices"
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-200/90 bg-white px-3 text-[12.5px] font-bold text-zinc-700 shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.6)]",
              "transition-all duration-200 hover:-translate-y-[1px] hover:border-zinc-300 hover:bg-white hover:text-zinc-900 hover:shadow-[0_4px_12px_-4px_rgba(15,23,42,0.1)] active:scale-[0.96] active:translate-y-0",
              "dark:bg-white/[0.04] dark:border-white/[0.08] dark:text-zinc-200",
            )}
          >
            <History className="size-4" />
            <span className="hidden sm:inline">Invoices</span>
          </a>
        </div>
      </header>

      {/* ── Error Toast ── */}
      {error && (
        <div className="mx-3 mt-2 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-800 shadow-[0_2px_8px_rgba(220,38,38,0.08)] sm:mx-5 animate-in slide-in-from-top-2 fade-in duration-200 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-200">
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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:w-[62%] lg:flex-none xl:w-[64%] 2xl:w-[66%]">
          {/* Sticky search + filters block */}
          <div
            className={cn(
              "shrink-0 px-3 pb-3 pt-3.5 sm:px-5 sm:pt-4",
            )}
          >
            <div className="flex items-center gap-2">
              {/* Search */}
              <div
                className={cn(
                  "group relative flex h-[3.25rem] flex-1 items-center gap-1.5 rounded-2xl pl-4 pr-1.5",
                  "border border-zinc-200/90 bg-white",
                  "shadow-[0_2px_6px_-1px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.7)]",
                  "transition-[border-color,box-shadow,transform] duration-200",
                  "focus-within:border-primary/60 focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.12),0_4px_12px_-2px_rgba(15,23,42,0.08)]",
                  "hover:border-zinc-300",
                  "dark:bg-white/[0.04] dark:border-white/[0.08]",
                )}
              >
                <Search className="size-[18px] shrink-0 text-zinc-500 transition-colors group-focus-within:text-primary" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    allowedDepartmentLabel
                      ? `Search ${allowedDepartmentLabel}, scan barcode…`
                      : "Search products, scan barcode…"
                  }
                  className="h-full flex-1 bg-transparent text-[14.5px] font-medium text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-50 dark:placeholder:text-zinc-500"
                  autoComplete="off"
                  aria-label="Search products"
                />
                {/* ⌘K hint */}
                <kbd
                  aria-hidden
                  className="mr-1 hidden h-7 select-none items-center gap-0.5 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 text-[10px] font-semibold text-zinc-500 shadow-[0_1px_0_rgba(15,23,42,0.04)] md:inline-flex dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-zinc-400"
                >
                  <Command className="size-3" />K
                </kbd>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 active:scale-90 dark:hover:bg-white/[0.06]"
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className={cn(
                    "ml-0.5 flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-[12.5px] font-bold",
                    "bg-zinc-900 text-white shadow-[0_2px_6px_-1px_rgba(15,23,42,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]",
                    "transition-all hover:bg-zinc-800 active:scale-[0.94]",
                    "dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100",
                  )}
                  aria-label="Scan barcode"
                >
                  <ScanLine className="size-[17px]" strokeWidth={2.25} />
                  <span className="hidden md:inline">Scan</span>
                </button>
              </div>
            </div>

            {/* Filter / context bar */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {allowedDepartmentLabel && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-700 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-200">
                  <span className="inline-block size-1.5 rounded-full bg-primary" />
                  {allowedDepartmentLabel}
                </span>
              )}
              {activeBranchName && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-700 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset] dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-200">
                  <MapPin className="size-3 text-zinc-500" />
                  {activeBranchName}
                </span>
              )}
              <span className="ml-auto hidden text-[11px] font-semibold text-zinc-500 sm:inline">
                Tap a product to add · Hold to edit qty
              </span>
            </div>
          </div>

          {/* Scrollable Product Area */}
          <div className="relative flex-1 overflow-y-auto overscroll-contain px-3 pb-32 pt-1 sm:px-5 lg:pb-6">
            {/* Top fade for scroll cue */}
            <span
              aria-hidden
              className="pointer-events-none sticky top-0 z-[1] -mb-2 block h-3 w-full bg-gradient-to-b from-zinc-50 to-transparent dark:from-background/70"
            />

            {/* Search results */}
            {hasSearch && (
              <section className="mb-6">
                <SectionHeader
                  icon={
                    <span className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                      <Search className="size-3.5 text-primary" strokeWidth={2.5} />
                    </span>
                  }
                  title="Search Results"
                  meta={
                    hits.length > 0
                      ? `${hits.length} match${hits.length === 1 ? "" : "es"}`
                      : undefined
                  }
                />
                {hits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300/80 bg-white/60 py-16 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-white/[0.08] dark:bg-white/[0.02]">
                    <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-100 to-white ring-1 ring-zinc-200/70 shadow-[0_4px_12px_-4px_rgba(15,23,42,0.08)] dark:from-white/[0.06] dark:to-white/[0.02] dark:ring-white/[0.08]">
                      <Search className="size-7 text-zinc-400" strokeWidth={2} />
                    </div>
                    <p className="text-[14px] font-bold text-zinc-700 dark:text-zinc-200">
                      {searchBanner ?? "No items match your search."}
                    </p>
                    <p className="mt-1.5 max-w-xs text-[12px] text-zinc-500 dark:text-zinc-400">
                      Try a different term, check spelling, or tap{" "}
                      <span className="font-bold text-zinc-700 dark:text-zinc-200">Scan</span> to scan
                      a barcode.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
              <section className="mb-6">
                <SectionHeader
                  icon={
                    <span className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300/60 via-amber-200/40 to-amber-100/30 ring-1 ring-amber-400/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_4px_10px_-4px_rgba(217,119,6,0.25)]">
                      <Sparkles className="size-3.5 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
                    </span>
                  }
                  title="Your Top Sellers"
                  meta={
                    topProducts.length > 0 ? `${topProducts.length}` : undefined
                  }
                  right={
                    topProducts.length > 0 ? (
                      <span className="hidden text-[10.5px] font-semibold uppercase tracking-[0.08em] text-zinc-500 md:inline">
                        Auto-curated
                      </span>
                    ) : null
                  }
                />
                {!online ? (
                  <div className="rounded-3xl border border-zinc-200/70 bg-amber-50/60 px-4 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:bg-amber-950/20 dark:border-amber-900/30">
                    <WifiOff className="mx-auto mb-2 size-6 text-amber-600/70 dark:text-amber-400/70" />
                    <p className="text-[13.5px] font-bold text-amber-900 dark:text-amber-200">
                      Offline mode
                    </p>
                    <p className="mt-1 text-[12px] text-amber-800/80 dark:text-amber-300/70">
                      Reconnect to load your top sellers.
                    </p>
                  </div>
                ) : topProducts.length === 0 ? (
                  <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-white py-14 text-center dark:from-amber-950/15 dark:via-white/[0.02] dark:to-white/[0.02] dark:border-amber-900/40">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -top-12 left-1/2 size-40 -translate-x-1/2 rounded-full bg-amber-300/20 blur-3xl"
                    />
                    <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-[0_8px_24px_-6px_rgba(217,119,6,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] ring-1 ring-amber-300/60">
                      <Sparkles className="size-6 text-white" strokeWidth={2.25} />
                    </div>
                    <p className="text-[14.5px] font-bold text-zinc-900 dark:text-zinc-50">
                      {topProductsLoading
                        ? "Loading your top sellers…"
                        : "No top sellers yet."}
                    </p>
                    {!topProductsLoading && (
                      <p className="mt-1.5 max-w-sm text-[12px] text-zinc-600 dark:text-zinc-400">
                        Items you invoice will climb this list automatically.
                        Search the catalog to make your first sale.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
            "relative",
            // Distinct cream/warm tint so the cart side feels like a "register counter"
            "bg-[linear-gradient(180deg,#fdfcfa_0%,#faf8f4_100%)]",
            "border-l border-zinc-200/90",
            "shadow-[inset_1px_0_0_rgba(255,255,255,0.85)]",
            "dark:bg-[linear-gradient(180deg,hsl(var(--background)/0.95)_0%,hsl(var(--background)/0.85)_100%)] dark:border-white/[0.06] dark:shadow-[inset_1px_0_0_rgba(255,255,255,0.04)]",
          )}
        >
          {/* Subtle perforation edge ribbon */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent"
          />
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
          // Sit above the bottom nav (~4.25rem + safe area). At md+ non-kiosk
          // sessions, the bottom nav is hidden so we relax the clearance —
          // but in kiosk-nav mode the nav stays at every size, so we keep the
          // larger padding throughout.
          isKiosk
            ? "pb-[calc(env(safe-area-inset-bottom,0.5rem)+4.75rem)]"
            : "pb-[calc(env(safe-area-inset-bottom,0.5rem)+4.75rem)] md:pb-[calc(env(safe-area-inset-bottom,0.5rem)+1rem)]",
        )}
      >
        {/* Fade gradient mask above the dock */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-zinc-50/95 via-zinc-50/40 to-transparent dark:from-background/90 dark:via-background/30"
        />

        <div className="pointer-events-auto relative mx-auto flex max-w-3xl items-center gap-2.5">
          {/* Cart preview pill (only when items present) */}
          {!isEmptyCart && (
            <button
              type="button"
              onClick={() => setShowCartDrawer(true)}
              className={cn(
                "group flex h-14 flex-1 items-center gap-3 rounded-2xl pl-3 pr-4",
                "border border-zinc-200/90 bg-white",
                "shadow-[0_16px_42px_-14px_rgba(15,23,42,0.22),0_4px_12px_-4px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]",
                "transition-[transform,box-shadow] duration-200",
                "hover:shadow-[0_20px_56px_-14px_rgba(15,23,42,0.28)]",
                "active:scale-[0.985]",
                "animate-in slide-in-from-bottom-3 duration-300",
                "dark:bg-background/90 dark:border-white/[0.08] dark:supports-[backdrop-filter]:bg-background/70",
              )}
            >
              <span
                key={cartPulse}
                className={cn(
                  "relative flex size-11 shrink-0 items-center justify-center rounded-xl",
                  "bg-gradient-to-br from-primary via-emerald-600 to-emerald-700 shadow-[0_4px_12px_-2px_rgba(40,167,69,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-emerald-500/40",
                  cartPulse > 0 && "animate-pos-cart-pulse",
                )}
              >
                <ShoppingBasket className="size-[19px] text-white" strokeWidth={2.25} />
                <span className="absolute -right-1.5 -top-1.5 flex min-w-[1.35rem] items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-extrabold leading-none text-white shadow-[0_3px_8px_rgba(0,0,0,0.25)] ring-2 ring-white tabular-nums dark:bg-white dark:text-zinc-900 dark:ring-background">
                  {cartItemCount}
                </span>
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] leading-none text-zinc-500 dark:text-zinc-400">
                  {cartItemCount} item{cartItemCount === 1 ? "" : "s"} · view cart
                </p>
                <p className="mt-1.5 truncate text-[16px] font-extrabold tabular-nums leading-none tracking-tight text-zinc-900 dark:text-zinc-50">
                  {formatShelfPriceLabel(grandTotal, currency) ??
                    `${currency} ${grandTotal.toFixed(2)}`}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-zinc-400 transition-transform duration-200 group-active:translate-x-0.5" />
            </button>
          )}

          {/* Floating Generate Invoice button — always visible */}
          <button
            type="button"
            onClick={isEmptyCart ? () => setShowCartDrawer(true) : onGenerate}
            disabled={loading}
            className={cn(
              "group relative flex h-14 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 text-[14px] font-extrabold text-white",
              "transition-[transform,box-shadow] duration-300",
              "active:scale-[0.96]",
              "touch-manipulation",
              isEmptyCart
                ? "bg-zinc-900 shadow-[0_10px_28px_-8px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] dark:bg-white dark:text-zinc-900"
                : "bg-[linear-gradient(135deg,hsl(var(--primary))_0%,color-mix(in_oklch,hsl(var(--primary))_88%,#fff)_50%,hsl(var(--primary))_100%)]",
              !isEmptyCart &&
                "shadow-[0_14px_34px_-8px_hsl(var(--primary)/0.55),inset_0_1px_0_hsl(0_0%_100%/0.25)]",
              !isEmptyCart && !loading && "animate-pos-fab-breathe",
              loading && "pointer-events-none opacity-80",
              "animate-in zoom-in-95 fade-in duration-300",
              // Make solo button fill width when cart is empty on small screens
              isEmptyCart && "flex-1 sm:flex-none",
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
            />
            {loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span className="hidden sm:inline">Processing…</span>
              </>
            ) : isEmptyCart ? (
              <>
                <ShoppingBasket className="size-[18px]" strokeWidth={2.25} />
                <span>View Cart</span>
              </>
            ) : (
              <>
                <Receipt className="size-[18px] transition-transform duration-300 group-hover:-rotate-3" strokeWidth={2.25} />
                <span className="hidden sm:inline">Generate Invoice</span>
                <span className="sm:hidden">Generate</span>
                <span className="flex size-5 items-center justify-center rounded-full bg-white/25 text-[11px] font-extrabold tabular-nums">
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
            className="absolute inset-0 bg-black/55 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setShowCartDrawer(false)}
          />

          {/* Mobile: bottom sheet | Tablet portrait: right side drawer */}
          <div
            className={cn(
              "absolute flex flex-col bg-[linear-gradient(180deg,#fdfcfa_0%,#faf8f4_100%)] shadow-[0_-16px_56px_rgba(15,23,42,0.25)]",
              "max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:max-h-[88vh] max-md:rounded-t-[1.75rem]",
              "max-md:animate-in max-md:slide-in-from-bottom max-md:duration-300",
              "md:right-0 md:top-0 md:h-full md:w-[28rem] md:max-w-[90vw]",
              "md:animate-in md:slide-in-from-right md:duration-300",
              "md:border-l md:border-zinc-200/90",
              "dark:bg-card dark:md:border-white/[0.06]",
            )}
          >
            {/* Mobile-only drag handle */}
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="h-1.5 w-12 rounded-full bg-zinc-300 dark:bg-white/15" />
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
