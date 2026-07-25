"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowLeft,
  Loader2,
  Package,
  PackagePlus,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DashboardAccessDenied,
  DASHBOARD_SECTION_SURFACE,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import {
  addPathBLine,
  createPathBSession,
  fetchSupplierById,
  fetchSupplierItemLinks,
  fetchSuppliersPage,
  postPathBSession,
  postSellingPrice,
  type SupplierItemLinkRecord,
  type SupplierRecord,
} from "@/lib/api";
import { posBrandThemeStyle } from "@/lib/brand-theme";
import { kioskPlaceholderWashClass } from "@/components/cashier/kiosk-listing-styles";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import { posTileThumbUrl } from "@/lib/pos-tile-thumb";
import {
  isSupplierIdSegment,
  resolveSupplierFromSlug,
  supplierSlugSearchHint,
} from "@/lib/supplier-slug";
import { cn } from "@/lib/utils";

type SupplyCartLine = {
  itemId: string;
  name: string;
  sku: string;
  stock: number | null;
  qtyStr: string;
  costStr: string;
  sellStr: string;
  seedCost: string;
  seedSell: string;
};

type SupplierReceiveWorkspaceProps = {
  slug: string;
};

const TILE_SHELL = cn(
  "group relative flex h-full flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] text-left transition-[border-color,background-color] duration-150",
  "hover:border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] hover:bg-card",
  "focus:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_40%,transparent)]",
  "active:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_40%,var(--card))]",
  "dark:border-border/40 dark:bg-card",
);

const fieldClass = cn(
  "w-full rounded-lg border border-border/60 bg-background px-2.5 py-2 text-sm shadow-sm",
  "placeholder:text-muted-foreground/50",
  "focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_55%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_22%,transparent)]",
);

function moneySeed(raw: number | string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return "";
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : "";
}

function parsePos(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseNonNeg(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function formatStock(n: number | null): string {
  if (n == null) return "—";
  return Number.isInteger(n)
    ? n.toLocaleString("en-KE")
    : n.toLocaleString("en-KE", { maximumFractionDigits: 2 });
}

function linkStock(link: SupplierItemLinkRecord): number | null {
  if (link.currentStock == null || String(link.currentStock).trim() === "") {
    return null;
  }
  const n = Number(link.currentStock);
  return Number.isFinite(n) ? n : null;
}

/** Parent product id for filtering: variant parent, else the item itself. */
function linkParentId(link: SupplierItemLinkRecord): string {
  return link.variantOfItemId?.trim() || link.itemId;
}

function linkParentLabel(link: SupplierItemLinkRecord): string {
  const parent = link.parentItemName?.trim();
  if (parent) return parent;
  // Standalone / parent row — strip variant suffix when present.
  const name = link.itemName?.trim() || link.sku?.trim() || "Product";
  const sep = name.indexOf(" · ");
  return sep > 0 ? name.slice(0, sep) : name;
}

const PARENT_RAIL_BASE = cn(
  "flex aspect-square w-full shrink-0 items-center justify-center rounded-none border px-1",
  "text-center text-[11px] font-semibold leading-tight transition touch-manipulation",
);

function parentRailClass(active: boolean): string {
  return active
    ? cn(
        PARENT_RAIL_BASE,
        "border-[var(--pos-primary)] bg-[var(--pos-primary)] text-[var(--pos-primary-ink,#fff)]",
      )
    : cn(
        PARENT_RAIL_BASE,
        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
        "bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)] text-[var(--pos-ink,#1c1915)]",
        "hover:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,var(--card))]",
        "dark:border-border/40 dark:bg-card dark:text-foreground",
      );
}

const PARENT_RAIL_HEADER = cn(
  "flex h-10 shrink-0 items-center justify-center rounded-none",
  "bg-[var(--pos-primary)] px-2 text-center text-xs font-bold uppercase tracking-wide",
  "text-[var(--pos-primary-ink,#fff)]",
);

function linkToCartSeed(link: SupplierItemLinkRecord): SupplyCartLine {
  const cost = moneySeed(
    link.lastCostPrice ?? link.defaultCostPrice ?? link.catalogBuyingPrice,
  );
  const sell = moneySeed(link.catalogShelfPrice);
  return {
    itemId: link.itemId,
    name: link.itemName || link.sku || "Product",
    sku: link.sku || "",
    stock: linkStock(link),
    qtyStr: "1",
    costStr: cost,
    sellStr: sell,
    seedCost: cost,
    seedSell: sell,
  };
}

function ProductTile({
  link,
  cartQty,
  justAdded,
  currency,
  onPick,
}: {
  link: SupplierItemLinkRecord;
  cartQty: number;
  justAdded: boolean;
  currency: string;
  onPick: () => void;
}) {
  const title = link.itemName || link.sku || "Product";
  const thumb = posTileThumbUrl(title, link.thumbnailUrl);
  const cost = moneySeed(
    link.lastCostPrice ?? link.defaultCostPrice ?? link.catalogBuyingPrice,
  );
  const stock = linkStock(link);

  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        TILE_SHELL,
        cartQty > 0 &&
          "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_16%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_45%,var(--card))]",
      )}
      aria-label={
        cartQty > 0
          ? `${title}, ${cartQty} in supply cart. Tap to add another.`
          : `Add ${title} to supply cart`
      }
    >
      <div className="relative aspect-square w-full shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_55%,transparent)] dark:border-border/40">
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            fill
            sizes="(max-width: 640px) 22vw, (max-width: 1024px) 12vw, 90px"
            className="object-contain p-0.5 transition-transform duration-300 group-hover:scale-[1.04]"
            unoptimized
          />
        ) : (
          <span
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br",
              kioskPlaceholderWashClass(title),
            )}
            aria-hidden
          >
            <Package className="size-5 opacity-55" strokeWidth={1.5} />
          </span>
        )}
        {cartQty > 0 ? (
          <span
            className={cn(
              "absolute left-0 top-0 z-[1] inline-flex h-6 min-w-6 items-center justify-center px-1.5 text-[11px] font-bold tabular-nums text-[var(--pos-primary-ink,#fff)] bg-[var(--pos-primary)]",
              justAdded && "animate-pulse",
            )}
          >
            {cartQty}
          </span>
        ) : null}
      </div>
      <div className="flex min-h-[3.1rem] flex-1 flex-col justify-center gap-0.5 px-1.5 pb-1.5 pt-1">
        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)] dark:text-foreground">
          {title}
        </p>
        <p className="truncate text-[10px] tabular-nums text-muted-foreground">
          {cost
            ? `${Number(cost).toLocaleString("en-KE", { minimumFractionDigits: 2 })} ${currency}`
            : "Set cost"}
          {stock != null ? ` · Stock ${formatStock(stock)}` : ""}
        </p>
      </div>
    </button>
  );
}

function SupplyCartPanel({
  supplierName,
  currency,
  lines,
  payable,
  pulse,
  saving,
  canPost,
  canSetSellPrice,
  onPatch,
  onRemove,
  onPost,
  onCloseMobile,
}: {
  supplierName: string;
  currency: string;
  lines: SupplyCartLine[];
  payable: number;
  pulse: boolean;
  saving: boolean;
  canPost: boolean;
  canSetSellPrice: boolean;
  onPatch: (itemId: string, patch: Partial<SupplyCartLine>) => void;
  onRemove: (itemId: string) => void;
  onPost: () => void;
  onCloseMobile?: () => void;
}) {
  return (
    <aside
      className={cn(
        "flex h-full max-h-full min-h-0 w-full shrink-0 flex-col self-stretch overflow-hidden lg:w-[min(100%,22rem)] xl:w-[24rem]",
      )}
    >
      <div
        className={cn(
          "pos-market-receipt flex h-full min-h-0 flex-1 flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] dark:border-border/40",
          pulse &&
            "outline outline-1 outline-[color-mix(in_srgb,var(--pos-primary)_45%,transparent)]",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-3 py-2 dark:border-border/40">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Supply cart
            </p>
            <h2 className="pos-market-section-label mt-0.5 truncate text-lg leading-none text-foreground">
              {supplierName}
            </h2>
          </div>
          {onCloseMobile ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 p-0 lg:hidden"
              onClick={onCloseMobile}
              aria-label="Close cart"
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
          {lines.length === 0 ? (
            <p className="border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] px-3 py-8 text-center text-xs text-muted-foreground">
              Tap products to build this delivery.
            </p>
          ) : (
            lines.map((line) => {
              const qty = parsePos(line.qtyStr) ?? 0;
              const cost = parseNonNeg(line.costStr) ?? 0;
              const lineTotal = Math.round(qty * cost * 100) / 100;
              return (
                <div
                  key={line.itemId}
                  className="space-y-1.5 border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] pb-2 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight">
                        {line.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {line.sku ? `${line.sku} · ` : ""}
                        Stock {formatStock(line.stock)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 p-1 text-destructive/80 hover:text-destructive"
                      onClick={() => onRemove(line.itemId)}
                      aria-label={`Remove ${line.name}`}
                      disabled={saving}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div
                    className={cn(
                      "grid gap-1.5",
                      canSetSellPrice ? "grid-cols-3" : "grid-cols-2",
                    )}
                  >
                    <label className="space-y-0.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Qty
                      </span>
                      <input
                        className={fieldClass}
                        inputMode="decimal"
                        value={line.qtyStr}
                        disabled={saving}
                        onChange={(e) =>
                          onPatch(line.itemId, { qtyStr: e.target.value })
                        }
                      />
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Cost
                      </span>
                      <input
                        className={cn(fieldClass, "bg-amber-50/80 dark:bg-background")}
                        inputMode="decimal"
                        value={line.costStr}
                        disabled={saving}
                        onChange={(e) =>
                          onPatch(line.itemId, { costStr: e.target.value })
                        }
                      />
                    </label>
                    {canSetSellPrice ? (
                      <label className="space-y-0.5">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Sell
                        </span>
                        <input
                          className={fieldClass}
                          inputMode="decimal"
                          value={line.sellStr}
                          disabled={saving}
                          onChange={(e) =>
                            onPatch(line.itemId, { sellStr: e.target.value })
                          }
                        />
                      </label>
                    ) : null}
                  </div>
                  <p className="text-right text-[11px] font-semibold tabular-nums text-foreground">
                    {lineTotal.toLocaleString("en-KE", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {currency}
                  </p>
                </div>
              );
            })
          )}
        </div>

        <div className="shrink-0 space-y-2 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-3 py-3 dark:border-border/40">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Payable
              </p>
              <p className="pos-market-section-label text-xl leading-none text-foreground">
                {payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })}{" "}
                <span className="text-sm font-semibold text-muted-foreground">
                  {currency}
                </span>
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {lines.length} line{lines.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            type="button"
            className="h-11 w-full rounded-none text-sm font-semibold"
            disabled={!canPost || saving}
            onClick={onPost}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Posting…
              </>
            ) : (
              <>
                <PackagePlus className="size-4" aria-hidden />
                Post supply
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function SupplierReceiveWorkspace({ slug }: SupplierReceiveWorkspaceProps) {
  const router = useRouter();
  const {
    me,
    business,
    loading,
    branchId,
    branches,
    branchesLoading,
    canPathBWrite,
    canViewSuppliers,
  } = useDashboard();

  const currency =
    business?.currency?.trim().toUpperCase() || "KES";
  const brandTheme = useMemo(
    () => posBrandThemeStyle(business?.branding ?? null),
    [business?.branding],
  );
  const canSetSellPrice = hasPermission(
    me?.permissions,
    Permission.PricingSellPriceSet,
  );
  const canAccess = canPathBWrite && canViewSuppliers;
  const activeBranchName =
    branches.find((b) => b.id === branchId)?.name?.trim() || "";

  const [resolveBusy, setResolveBusy] = useState(true);
  const [supplier, setSupplier] = useState<SupplierRecord | null>(null);
  const [candidates, setCandidates] = useState<SupplierRecord[]>([]);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [links, setLinks] = useState<SupplierItemLinkRecord[]>([]);
  const [linksBusy, setLinksBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [parentFilterId, setParentFilterId] = useState<string | null>(null);
  const [cart, setCart] = useState<SupplyCartLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [pulseCart, setPulseCart] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResolveBusy(true);
    setResolveError(null);
    setSupplier(null);
    setCandidates([]);
    setCart([]);
    setParentFilterId(null);
    setFilter("");

    const run = async () => {
      try {
        if (isSupplierIdSegment(slug)) {
          const row = await fetchSupplierById(slug.trim());
          if (cancelled) return;
          setSupplier(row);
          setCandidates([row]);
          return;
        }

        const hint = supplierSlugSearchHint(slug);
        const page = await fetchSuppliersPage({
          ...(hint ? { search: hint } : {}),
          status: "active",
          page: 0,
          size: 100,
        });
        if (cancelled) return;

        let resolved = resolveSupplierFromSlug(page.content, slug);
        if (resolved.candidates.length === 0 && hint) {
          const broad = await fetchSuppliersPage({
            status: "active",
            page: 0,
            size: 200,
          });
          if (cancelled) return;
          resolved = resolveSupplierFromSlug(broad.content, slug);
        }

        setCandidates(resolved.candidates);
        setSupplier(resolved.match);
        if (!resolved.match && resolved.candidates.length === 0) {
          setResolveError("No supplier matches this link.");
        }
      } catch (e) {
        if (!cancelled) {
          setResolveError(
            e instanceof Error ? e.message : "Could not load supplier",
          );
        }
      } finally {
        if (!cancelled) setResolveBusy(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!supplier || !branchId.trim()) {
      setLinks([]);
      return;
    }
    let cancelled = false;
    setLinksBusy(true);
    void fetchSupplierItemLinks(supplier.id, { branchId })
      .then((list) => {
        if (!cancelled) setLinks(list.filter((l) => l.active));
      })
      .catch(() => {
        if (!cancelled) {
          setLinks([]);
          toast.error("Could not load supplier products");
        }
      })
      .finally(() => {
        if (!cancelled) setLinksBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supplier, branchId]);

  const parentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const link of links) {
      const id = linkParentId(link);
      if (!map.has(id)) {
        map.set(id, linkParentLabel(link));
      }
    }
    const sorted = [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" }));
    return [{ id: null as string | null, label: "All" }, ...sorted];
  }, [links]);

  const showParentRail = parentOptions.length > 2;

  useEffect(() => {
    if (
      parentFilterId &&
      !parentOptions.some((p) => p.id === parentFilterId)
    ) {
      setParentFilterId(null);
    }
  }, [parentFilterId, parentOptions]);

  const visibleLinks = useMemo(() => {
    const byParent = parentFilterId
      ? links.filter((l) => linkParentId(l) === parentFilterId)
      : links;
    const q = filter.trim().toLowerCase();
    if (!q) return byParent;
    return byParent.filter(
      (l) =>
        l.itemName.toLowerCase().includes(q) ||
        l.sku.toLowerCase().includes(q) ||
        (l.barcode ?? "").toLowerCase().includes(q) ||
        (l.parentItemName ?? "").toLowerCase().includes(q),
    );
  }, [links, filter, parentFilterId]);

  const cartQtyByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cart) {
      const q = parsePos(line.qtyStr) ?? 0;
      if (q > 0) map.set(line.itemId, q);
    }
    return map;
  }, [cart]);

  const readyLines = useMemo(
    () =>
      cart.filter((l) => {
        const qty = parsePos(l.qtyStr);
        const cost = parseNonNeg(l.costStr);
        return qty != null && cost != null;
      }),
    [cart],
  );

  const payable = useMemo(
    () =>
      readyLines.reduce((sum, l) => {
        const qty = parsePos(l.qtyStr) ?? 0;
        const cost = parseNonNeg(l.costStr) ?? 0;
        return sum + qty * cost;
      }, 0),
    [readyLines],
  );

  const markAdded = useCallback((itemId: string) => {
    setPulseCart(true);
    setJustAddedId(itemId);
    window.setTimeout(() => {
      setPulseCart(false);
      setJustAddedId(null);
    }, 450);
  }, []);

  const addLinkToCart = useCallback(
    (link: SupplierItemLinkRecord) => {
      setCart((prev) => {
        const existing = prev.find((l) => l.itemId === link.itemId);
        if (!existing) {
          return [...prev, linkToCartSeed(link)];
        }
        const qty = parsePos(existing.qtyStr) ?? 0;
        return prev.map((l) =>
          l.itemId === link.itemId
            ? { ...l, qtyStr: String(qty + 1) }
            : l,
        );
      });
      markAdded(link.itemId);
    },
    [markAdded],
  );

  const patchLine = (itemId: string, patch: Partial<SupplyCartLine>) => {
    setCart((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)),
    );
  };

  const removeLine = (itemId: string) => {
    setCart((prev) => prev.filter((l) => l.itemId !== itemId));
  };

  const onPost = async () => {
    if (!supplier) {
      toast.error("Pick a supplier");
      return;
    }
    const bid = branchId.trim();
    if (!bid) {
      toast.error("Select a branch first");
      return;
    }
    if (readyLines.length === 0) {
      toast.error("Enter qty and buy price on at least one product");
      return;
    }

    setSaving(true);
    try {
      const session = await createPathBSession({
        supplierId: supplier.id,
        branchId: bid,
        receivedAt: new Date().toISOString(),
        notes: `Receive from ${supplier.name}`,
      });

      const synced: { line: SupplyCartLine; serverLineId: string }[] = [];
      for (const line of readyLines) {
        const qty = parsePos(line.qtyStr)!;
        const cost = parseNonNeg(line.costStr)!;
        const amountMoney = Math.round(qty * cost * 100) / 100;
        const created = await addPathBLine(session.id, {
          description: `${line.name}${line.sku ? ` (${line.sku})` : ""}`,
          amountMoney,
          suggestedItemId: line.itemId,
        });
        synced.push({ line, serverLineId: created.id });
      }

      await postPathBSession(session.id, {
        lines: synced.map(({ line, serverLineId }) => ({
          lineId: serverLineId,
          itemId: line.itemId,
          usableQty: parsePos(line.qtyStr)!,
          wastageQty: 0,
        })),
      });

      if (canSetSellPrice) {
        const now = new Date().toISOString();
        for (const line of readyLines) {
          const sell = parseNonNeg(line.sellStr);
          if (sell == null) continue;
          const seed = parseNonNeg(line.seedSell);
          if (seed != null && Math.abs(sell - seed) < 0.005) continue;
          try {
            await postSellingPrice({
              itemId: line.itemId,
              branchId: bid,
              price: sell,
              effectiveFrom: now,
              notes: `Set from supplier receive · ${supplier.name}`,
            });
          } catch {
            /* stock already posted; price is best-effort */
          }
        }
      }

      toast.success(
        readyLines.length === 1
          ? `Stock updated · ${payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })} ${currency}`
          : `${readyLines.length} products updated · ${payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })} ${currency}`,
      );
      setCart([]);
      setMobileCartOpen(false);
      void fetchSupplierItemLinks(supplier.id, { branchId: bid }).then((list) =>
        setLinks(list.filter((l) => l.active)),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post supply");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className={cn(DASHBOARD_SECTION_SURFACE, "m-3")}>
        <DashboardAccessDenied
          title="Receive stock locked"
          description="You need receive-stock access to open a supplier till."
          backHref={APP_ROUTES.cashier}
          backLabel="Back to cashier"
        />
      </div>
    );
  }

  if (resolveBusy) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Finding supplier…
      </div>
    );
  }

  if (!supplier && candidates.length > 1) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 px-4 py-6" style={brandTheme}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Multiple matches
        </p>
        <h1 className="pos-market-section-label text-2xl text-[var(--pos-ink,#1c1915)] dark:text-foreground">
          Which supplier?
        </h1>
        <p className="text-sm text-muted-foreground">
          More than one supplier uses “{slug}”. Pick one to open the receive till.
        </p>
        <ul className="divide-y border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)]">
          {candidates.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted/40"
                onClick={() => {
                  setSupplier(c);
                  setCandidates([c]);
                  // Prefer a stable id URL when names collide.
                  router.replace(APP_ROUTES.supplier(c.id));
                }}
              >
                <Truck className="size-4 shrink-0 text-[var(--pos-primary)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.name}</span>
                  {c.code ? (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {c.code}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <Link
          href={APP_ROUTES.suppliers}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to suppliers
        </Link>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 px-4 py-6" style={brandTheme}>
        <h1 className="pos-market-section-label text-2xl text-[var(--pos-ink,#1c1915)] dark:text-foreground">
          Supplier not found
        </h1>
        <p className="text-sm text-muted-foreground">
          {resolveError ?? `No active supplier matches /supplier/${slug}.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={APP_ROUTES.supplierDirectory}>Browse suppliers</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={APP_ROUTES.suppliers}>Suppliers directory</Link>
          </Button>
        </div>
      </div>
    );
  }

  const cartPanelProps = {
    supplierName: supplier.name,
    currency,
    lines: cart,
    payable,
    pulse: pulseCart,
    saving,
    canPost: readyLines.length > 0 && Boolean(branchId.trim()),
    canSetSellPrice,
    onPatch: patchLine,
    onRemove: removeLine,
    onPost,
  };

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden pb-28 lg:pb-0"
      style={brandTheme as CSSProperties}
    >
      <div className="flex h-full min-h-0 flex-1 items-stretch overflow-hidden">
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] dark:border-border/40">
          <section className="shrink-0 border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2 pb-1.5 pt-1 dark:border-border/40 sm:px-3">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="pos-market-section-label text-[0.95rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
                    {supplier.name}
                  </h2>
                  {branchesLoading ? (
                    <span className="text-[11px] text-muted-foreground">
                      Loading branches…
                    </span>
                  ) : activeBranchName ? (
                    <span className="truncate text-[11px] text-muted-foreground">
                      Receiving at {activeBranchName}
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-800 dark:text-amber-200">
                      Pick a branch in the top nav
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Tap products into the cart · set qty &amp; cost · post supply
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Link
                  href={APP_ROUTES.cashier}
                  className="inline-flex h-7 items-center gap-1 border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" aria-hidden />
                  Cashier
                </Link>
                <Link
                  href={APP_ROUTES.suppliers}
                  className="inline-flex h-7 items-center gap-1 border border-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)] px-2 text-[11px] font-medium text-[var(--pos-ink,#1c1915)] hover:bg-[color-mix(in_srgb,var(--pos-primary)_8%,transparent)]"
                >
                  <Truck className="size-3.5 text-muted-foreground" aria-hidden />
                  Suppliers
                </Link>
              </div>
            </div>
          </section>

          <div className="relative shrink-0 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] dark:border-border/40">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className={cn(
                fieldClass,
                "h-11 rounded-none border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0",
              )}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Find a product…"
              disabled={saving || linksBusy}
            />
          </div>

          {showParentRail ? (
            <div className="flex gap-1 overflow-x-auto border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] p-1.5 scrollbar-none dark:border-border/40 dark:bg-muted/20 lg:hidden">
              {parentOptions.map((parent) => (
                <button
                  key={parent.id ?? "all"}
                  type="button"
                  onClick={() => setParentFilterId(parent.id)}
                  className={cn(
                    parentRailClass(parentFilterId === parent.id),
                    "size-[4.25rem] shrink-0",
                  )}
                >
                  <span className="line-clamp-3">{parent.label}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-y-contain px-2 py-2 sm:px-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="pos-market-section-label text-[0.95rem] leading-none text-[var(--pos-ink,#1c1915)] dark:text-foreground">
                {parentFilterId
                  ? parentOptions.find((p) => p.id === parentFilterId)?.label ??
                    "Linked products"
                  : "Linked products"}
                <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Shelf
                </span>
              </h3>
              <span className="text-xs tabular-nums text-muted-foreground">
                {visibleLinks.length}
              </span>
            </div>

            {linksBusy ? (
              <div className="flex items-center justify-center gap-2 border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] py-10 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading products…
              </div>
            ) : visibleLinks.length === 0 ? (
              <p className="border border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] py-10 text-center text-xs text-muted-foreground">
                {links.length === 0
                  ? "No linked products yet — link items on the suppliers page."
                  : parentFilterId
                    ? "No products under this parent."
                    : "No products match your search."}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-1 sm:grid-cols-5 sm:gap-1.5 md:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {visibleLinks.map((link) => (
                  <ProductTile
                    key={link.id}
                    link={link}
                    cartQty={cartQtyByItem.get(link.itemId) ?? 0}
                    justAdded={justAddedId === link.itemId}
                    currency={currency}
                    onPick={() => addLinkToCart(link)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {showParentRail ? (
          <aside className="hidden min-h-0 w-[7rem] shrink-0 flex-col border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_70%,transparent)] dark:border-border/40 dark:bg-muted/20 xl:w-[8rem] lg:flex">
            <div className={PARENT_RAIL_HEADER}>Parent</div>
            <nav
              aria-label="Filter by parent product"
              className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-1"
            >
              {parentOptions.map((parent) => (
                <button
                  key={parent.id ?? "all"}
                  type="button"
                  onClick={() => setParentFilterId(parent.id)}
                  className={parentRailClass(parentFilterId === parent.id)}
                  title={parent.label}
                >
                  <span className="line-clamp-3">{parent.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        ) : null}

        <div className="hidden h-full min-h-0 lg:flex">
          <SupplyCartPanel {...cartPanelProps} />
        </div>
      </div>

      <button
        type="button"
        className={cn(
          "fixed bottom-4 right-4 z-30 flex h-14 items-center gap-2 px-4 shadow-lg lg:hidden",
          "bg-[var(--pos-primary)] text-[var(--pos-primary-ink,#fff)]",
          pulseCart && "ring-2 ring-[var(--pos-primary)] ring-offset-2",
        )}
        onClick={() => setMobileCartOpen(true)}
      >
        <ShoppingCart className="size-5" aria-hidden />
        <span className="text-sm font-semibold">
          {cart.length} ·{" "}
          {payable.toLocaleString("en-KE", { minimumFractionDigits: 2 })}{" "}
          {currency}
        </span>
      </button>

      {mobileCartOpen ? (
        <div className="fixed inset-0 z-40 flex flex-col bg-background/80 p-3 backdrop-blur-sm lg:hidden">
          <SupplyCartPanel
            {...cartPanelProps}
            onCloseMobile={() => setMobileCartOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
