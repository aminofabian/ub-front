"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ImageOff,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import { useSessionItemType } from "@/hooks/use-session-scope";
import {
  DashboardLoading,
  DashboardFeedback,
  DASHBOARD_MAX_WIDE,
} from "@/components/dashboard-page-ui";
import { ActiveScopeSubtitle } from "@/components/active-scope-subtitle";
import { cn } from "@/lib/utils";
import {
  fetchBranches,
  fetchCategories,
  fetchItemTypes,
  fetchItemsPage,
  patchItem,
  getCloudinarySignature,
  uploadToCloudinary,
  type BranchRecord,
  type CategoryRecord,
  type ItemsPageResult,
  type ItemSummaryRecord,
  type ItemTypeRecord,
} from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function fmtQty(n: number | string | null | undefined): string {
  const v = toNum(n);
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtMoney(n: number | string | null | undefined): string {
  const v = toNum(n);
  if (v === 0) return "—";
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const PAGE_SIZE = 60;
const MAX_ITEMS = 500; // don't hammer the API — cap at 500

/* ------------------------------------------------------------------ */
/*  Upload button (per card)                                           */
/* ------------------------------------------------------------------ */
function QuickUpload({
  itemId,
  onDone,
}: {
  itemId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setBusy(true);
      try {
        const sig = await getCloudinarySignature("items");
        const r = await uploadToCloudinary(f, sig);
        await patchItem(itemId, { imageKey: r.public_id });
        onDone();
      } catch {
        // silently ignore — the card just stays
      } finally {
        setBusy(false);
        if (ref.current) ref.current.value = "";
      }
    },
    [itemId, onDone],
  );

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[10px] font-semibold transition-all",
          "border border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 active:scale-95",
          busy && "opacity-50",
        )}
      >
        {busy ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Upload className="size-3" />
        )}
        {busy ? "Uploading…" : "Upload"}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handle}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function InventoryMissingImagesPage() {
  const { setBranchId: setHeaderBranchId } = useDashboard();
  const { itemTypeId: headerItemTypeId } = useSessionItemType();

  // Data
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemTypeRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [branchId, setBranchId] = useState("");
  const [itemTypeId, setItemTypeId] = useState(headerItemTypeId ?? "");
  const [categoryId, setCategoryId] = useState("");

  // Results
  const [items, setItems] = useState<ItemSummaryRecord[]>([]);
  const [totalMissing, setTotalMissing] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capped, setCapped] = useState(false);

  // Load reference data once
  useEffect(() => {
    Promise.all([fetchBranches(), fetchItemTypes(), fetchCategories()])
      .then(([b, t, c]) => {
        setBranches(b);
        setItemTypes(t);
        setCategories(c);
      })
      .catch(() => {});
  }, []);

  // Keep header branch in sync
  useEffect(() => {
    if (branchId) setHeaderBranchId(branchId);
  }, [branchId, setHeaderBranchId]);

  // Load items
  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const all: ItemSummaryRecord[] = [];
      let page = 0;
      let total = 0;
      let hitCap = false;

      while (all.length < MAX_ITEMS) {
        const res: ItemsPageResult<ItemSummaryRecord> = await fetchItemsPage(
          query || undefined,
          {
            page,
            size: PAGE_SIZE,
            branchId: branchId || undefined,
            itemTypeId: itemTypeId || undefined,
            categoryId: categoryId || undefined,
            sort: [{ property: "name", direction: "asc" }],
          },
        );

        total = res.totalElements;

        // Filter to items *without* any image
        for (const item of res.content) {
          const hasImage =
            item.imageKey?.trim() ||
            item.thumbnailUrl?.trim();
          if (!hasImage) {
            all.push(item);
            if (all.length >= MAX_ITEMS) {
              hitCap = true;
              break;
            }
          }
        }

        if (hitCap || res.last) break;
        page++;
      }

      setItems(all);
      setTotalMissing(all.length);
      setTotalAll(total);
      setCapped(hitCap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load items.");
    } finally {
      setLoading(false);
    }
  }, [query, branchId, itemTypeId, categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  // Debounced search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setQuery(v), 300);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setTotalMissing((n) => n - 1);
  }, []);

  const activeTypeName = useMemo(
    () => itemTypes.find((t) => t.id === itemTypeId)?.label,
    [itemTypes, itemTypeId],
  );

  // Quick links to other inventory pages
  const quickLinks = [
    { href: "/inventory/missing-barcodes", label: "Missing barcodes", desc: "Products without barcodes" },
    { href: "/inventory/stock", label: "Stock levels", desc: "Current stock across branches" },
    { href: "/inventory/valuation", label: "Valuation", desc: "Inventory value report" },
    { href: "/inventory/restock", label: "Restock", desc: "Low-stock reorder suggestions" },
  ];

  return (
    <div className="relative isolate h-full scroll-smooth overflow-y-auto overscroll-contain">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 -top-28 h-80 w-80 bg-orange-400/[0.04] blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-72 w-80 bg-teal-400/[0.04] blur-3xl" />
      </div>

      <div className={cn(DASHBOARD_MAX_WIDE, "!space-y-4 !pb-12")}>
        {/* ── Header ── */}
        <div className="sticky top-0 z-30 overflow-hidden border border-border/40 bg-linear-to-b from-card/95 via-card/90 to-card/85 shadow-lg backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Link
                href="/inventory"
                className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-muted/30 text-muted-foreground/70 transition-colors hover:border-border/60 hover:bg-muted/50 hover:text-foreground"
                aria-label="Back to inventory"
              >
                <ArrowLeft className="size-[15px]" />
              </Link>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13px] font-bold leading-none tracking-tight text-foreground">
                  Missing Images
                </span>
                <ActiveScopeSubtitle className="text-[10px]" />
              </div>
            </div>

            <span className="hidden h-5 w-px bg-border/60 sm:block" aria-hidden />

            {/* Stats pill */}
            {!loading ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-400/[0.06] px-3 py-1">
                  <ImageOff className="size-3 text-orange-500" />
                  <span className="text-[11px] font-semibold tabular-nums text-orange-700">
                    {totalMissing}{capped ? "+" : ""}
                  </span>
                  <span className="text-[10px] text-orange-600/60">without image</span>
                </div>
                {totalAll > 0 ? (
                  <span className="text-[10px] text-muted-foreground/50">
                    of {totalAll.toLocaleString()} total
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="group flex size-7.5 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-muted/30 text-muted-foreground/80 transition-all hover:border-border/70 hover:bg-muted/50 hover:text-foreground active:scale-95 disabled:opacity-40"
                aria-label="Refresh"
              >
                <RefreshCw
                  className={cn("size-3.5 transition-transform", loading && "animate-spin")}
                />
              </button>
            </div>
          </div>

          {/* ── Filters bar ── */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border/30 px-4 py-2">
            {/* Search */}
            <div className="relative min-w-[140px] flex-1 sm:max-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/50" />
              <input
                placeholder="Search products…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-7.5 w-full rounded-lg border border-border/50 bg-muted/30 pl-7.5 pr-2.5 text-[11px] outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30 placeholder:text-muted-foreground/45"
              />
            </div>

            {/* Branch */}
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-7.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 pr-7 text-[11px] font-medium text-foreground/80 outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {/* Item type */}
            <select
              value={itemTypeId}
              onChange={(e) => setItemTypeId(e.target.value)}
              className="h-7.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 pr-7 text-[11px] font-medium text-foreground/80 outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
            >
              <option value="">All departments</option>
              {itemTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>

            {/* Category */}
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-7.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 pr-7 text-[11px] font-medium text-foreground/80 outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Content ── */}
        {error ? <DashboardFeedback kind="error" text={error} /> : null}

        {loading ? (
          <DashboardLoading label={`Scanning ${activeTypeName ? activeTypeName.toLowerCase() : "catalog"} for items without images…`} />
        ) : items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="flex size-20 items-center justify-center rounded-3xl border-2 border-dashed border-emerald-400/30 bg-emerald-400/[0.04]">
              <ImageOff className="size-8 text-emerald-400/60" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground/80">All products have images</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {query || branchId || itemTypeId || categoryId
                  ? "No matching items found without images. Try adjusting your filters."
                  : "Every product in the catalog has a photo. Great job! ✨"}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Info banner */}
            {capped ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.05] px-4 py-2.5">
                <Package className="size-4 shrink-0 text-amber-500" />
                <p className="text-[11px] text-amber-800">
                  Showing the first {MAX_ITEMS} items without images. Narrow your search or filters to see more specific results.
                </p>
              </div>
            ) : null}

            {/* ── Card grid ── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/40 bg-card p-4 shadow-sm transition-all hover:border-border/70 hover:shadow-md"
                >
                  {/* Placeholder image area */}
                  <div className="flex aspect-[4/3] items-center justify-center rounded-xl border-2 border-dashed border-border/50 bg-muted/20 transition-colors group-hover:border-orange-400/20 group-hover:bg-orange-400/[0.03]">
                    <div className="flex flex-col items-center gap-1.5">
                      <ImageOff className="size-8 text-muted-foreground/25 group-hover:text-orange-400/30" />
                      <span className="text-[9px] font-medium uppercase tracking-widest text-muted-foreground/35 group-hover:text-orange-400/40">
                        No image
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/products/${item.id}`}
                      className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-foreground/90 transition-colors hover:text-primary"
                    >
                      {item.name}
                    </Link>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-mono text-[10px] text-muted-foreground/55">{item.sku}</span>
                      {item.categoryName ? (
                        <>
                          <span className="text-[10px] text-muted-foreground/25">·</span>
                          <span className="truncate text-[10px] text-muted-foreground/50">{item.categoryName}</span>
                        </>
                      ) : null}
                    </div>

                    {/* Meta row */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                      {item.stockQty != null ? (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-muted-foreground/70">
                          <span className="text-[9px] text-muted-foreground/40">Stock</span>
                          {fmtQty(item.stockQty)}
                        </span>
                      ) : null}
                      {(item.buyingPrice != null && toNum(item.buyingPrice) > 0) ? (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-muted-foreground/70">
                          <span className="text-[9px] text-muted-foreground/40">Buy</span>
                          {fmtMoney(item.buyingPrice)}
                        </span>
                      ) : null}
                      {(item.bundlePrice != null && toNum(item.bundlePrice) > 0) ? (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-muted-foreground/70">
                          <span className="text-[9px] text-muted-foreground/40">Sell</span>
                          {fmtMoney(item.bundlePrice)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Upload action */}
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/30 pt-3">
                    <Link
                      href={`/products/${item.id}`}
                      className="text-[10px] font-medium text-muted-foreground/60 transition-colors hover:text-foreground"
                    >
                      View product →
                    </Link>
                    <QuickUpload itemId={item.id} onDone={() => removeItem(item.id)} />
                  </div>
                </div>
              ))}
            </div>

            {/* ── Quick links footer ── */}
            <div className="rounded-2xl border border-border/40 bg-muted/10 p-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
                Quick actions
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {quickLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="group flex flex-col gap-0.5 rounded-xl border border-border/30 bg-card px-3.5 py-2.5 transition-all hover:border-primary/20 hover:bg-primary/[0.03] hover:shadow-sm"
                  >
                    <span className="text-[11px] font-semibold text-foreground/80 group-hover:text-primary">
                      {l.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">{l.desc}</span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
