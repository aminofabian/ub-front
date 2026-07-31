"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  Check,
  ExternalLink,
  Package,
  Pencil,
  Search,
  ShoppingBag,
  TrendingUp,
  Warehouse,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  fetchItemsPage,
  patchItem,
  postStockIncrease,
  getCloudinarySignature,
  uploadToCloudinary,
  type ItemActivityResponse,
  type ItemSummaryRecord,
} from "@/lib/api";

function toNum(n: number | string | null | undefined): number {
  if (n == null) return 0;
  return typeof n === "number" ? n : Number(n);
}

function formatQty(n: number | string | null | undefined): string {
  const v = toNum(n);
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatMoney(n: number | string | null | undefined): string {
  const v = toNum(n);
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const PERIOD_CHIPS: {
  key: keyof ItemActivityResponse["periods"];
  revKey: keyof ItemActivityResponse["periods"];
  label: string;
}[] = [
  { key: "todayQty", revKey: "todayRevenue", label: "Today" },
  { key: "yesterdayQty", revKey: "yesterdayRevenue", label: "Yesterday" },
  { key: "last3Qty", revKey: "last3Revenue", label: "3 days" },
  { key: "last7Qty", revKey: "last7Revenue", label: "7 days" },
  { key: "last30Qty", revKey: "last30Revenue", label: "30 days" },
];

function movementLabel(type: string): string {
  switch (type) {
    case "receipt":
      return "Stocked in";
    case "opening":
      return "Opening";
    case "transfer_in":
      return "Transfer in";
    default:
      return type;
  }
}

export function ActivityItemStory({
  itemId,
  activity,
  loading,
  error,
  itemTypeId,
  branchId,
  onPickItem,
  onChanged,
}: {
  itemId: string | null;
  activity: ItemActivityResponse | null;
  loading: boolean;
  error: string | null;
  itemTypeId?: string;
  branchId?: string;
  onPickItem: (itemId: string) => void;
  onChanged?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ItemSummaryRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [editStock, setEditStock] = useState("");
  const [editBuyingPrice, setEditBuyingPrice] = useState("");
  const [editSellingPrice, setEditSellingPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset edit form when activity changes
  useEffect(() => {
    if (activity) {
      setEditStock(formatQty(activity.summary.currentStock));
      setEditBuyingPrice(
        toNum(activity.summary.buyingPrice) > 0
          ? formatQty(activity.summary.buyingPrice)
          : "",
      );
      setEditSellingPrice(
        toNum(activity.summary.sellingPrice) > 0
          ? formatQty(activity.summary.sellingPrice)
          : "",
      );
    }
  }, [activity]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        const page = await fetchItemsPage(q, {
          size: 8,
          itemTypeId: itemTypeId?.trim() || undefined,
        });
        if (!cancelled) setSuggestions(page.content);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, itemTypeId]);

  const chartMax = useMemo(() => {
    if (!activity?.daily?.length) return 1;
    return Math.max(1, ...activity.daily.map((d) => toNum(d.qty)));
  }, [activity]);

  const handleSave = useCallback(async () => {
    if (!itemId || !activity) return;
    setEditError(null);
    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [];

      const currentStock = toNum(activity.summary.currentStock);
      const newStock = parseFloat(editStock);
      if (!isNaN(newStock) && newStock !== currentStock && branchId) {
        const diff = newStock - currentStock;
        if (diff !== 0) {
          const qty = Math.abs(diff);
          promises.push(
            postStockIncrease({
              branchId: branchId.trim(),
              itemId,
              quantity: qty,
              unitCost: 0,
              notes: `Quick stock adjustment from activity page (${diff > 0 ? "+" : ""}${formatQty(diff)})`,
            }),
          );
        }
      }

      const bp = editBuyingPrice.trim()
        ? parseFloat(editBuyingPrice)
        : undefined;
      if (bp !== undefined && !isNaN(bp)) {
        const currentBp = toNum(activity.summary.buyingPrice);
        if (bp !== currentBp) {
          promises.push(patchItem(itemId, { buyingPrice: bp }));
        }
      }

      const sp = editSellingPrice.trim()
        ? parseFloat(editSellingPrice)
        : undefined;
      if (sp !== undefined && !isNaN(sp)) {
        const currentSp = toNum(activity.summary.sellingPrice);
        if (sp !== currentSp) {
          promises.push(patchItem(itemId, { bundlePrice: sp }));
        }
      }

      if (promises.length === 0) {
        setEditing(false);
        return;
      }

      await Promise.all(promises);
      setEditing(false);
      onChanged?.();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }, [itemId, activity, editStock, editBuyingPrice, editSellingPrice, branchId, onChanged]);

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!itemId) return;
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      setEditError(null);
      try {
        const sig = await getCloudinarySignature("items");
        const result = await uploadToCloudinary(file, sig);
        await patchItem(itemId, { imageKey: result.public_id });
        onChanged?.();
      } catch (err) {
        setEditError(
          err instanceof Error ? err.message : "Photo upload failed.",
        );
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [itemId, onChanged],
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a product — e.g. Eggs…"
          className="h-10 w-full rounded-xl border border-border/50 bg-muted/30 pl-9 pr-3 text-sm outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
        />
        {query.trim().length >= 2 ? (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg">
            {searching ? (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">
                Searching…
              </p>
            ) : suggestions.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">
                No products found.
              </p>
            ) : (
              <ul>
                {suggestions.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/50"
                      onClick={() => {
                        onPickItem(item.id);
                        setQuery("");
                        setSuggestions([]);
                      }}
                    >
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {item.sku}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {!itemId ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-muted/10 px-6 py-12 text-center">
          <Package
            className="mx-auto size-8 text-muted-foreground/40"
            aria-hidden
          />
          <p className="mt-3 text-sm font-medium text-foreground/80">
            Pick a product to see its story
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Stocking history, sell-through, and how it has been moving day by
            day.
          </p>
        </div>
      ) : null}

      {itemId && loading ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          Loading product activity…
        </p>
      ) : null}

      {itemId && error ? (
        <p className="py-4 text-center text-xs text-destructive">{error}</p>
      ) : null}

      {itemId && activity && !loading ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {activity.summary.itemName}
              </h2>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {activity.summary.sku || "No SKU"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                  editing
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/50 bg-muted/30 text-foreground/80 hover:bg-muted/50",
                )}
              >
                <Pencil className="size-3" />
                {editing ? "Cancel" : "Edit"}
              </button>
              <Link
                href={`/products/${activity.summary.itemId}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80 transition-colors hover:bg-muted/50"
              >
                Open product
                <ExternalLink className="size-3" aria-hidden />
              </Link>
            </div>
          </div>

          {/* ---- INLINE EDIT PANEL ---- */}
          {editing ? (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
              {editError ? (
                <p className="mb-2 text-[11px] text-destructive">
                  {editError}
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Stock
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="h-8 rounded-md border border-border/50 bg-muted/30 px-2 text-[11px] outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
                  />
                </label>

                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Buying price
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={editBuyingPrice}
                    onChange={(e) => setEditBuyingPrice(e.target.value)}
                    placeholder="0"
                    className="h-8 rounded-md border border-border/50 bg-muted/30 px-2 text-[11px] outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
                  />
                </label>

                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Selling price
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(e.target.value)}
                    placeholder="0"
                    className="h-8 rounded-md border border-border/50 bg-muted/30 px-2 text-[11px] outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
                  />
                </label>

                <label className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Photo
                  </span>
                  <div className="flex items-center gap-2">
                    {activity.summary.imageKey ? (
                      <img
                        src={`https://res.cloudinary.com/dzqnyh7km/image/upload/w_36,h_36,c_fill/${activity.summary.imageKey}`}
                        alt=""
                        className="size-8 shrink-0 rounded border border-border/30 object-cover"
                      />
                    ) : null}
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                      className="flex h-8 items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground disabled:opacity-50"
                    >
                      <Camera className="size-3" />
                      {uploading ? "Uploading…" : "Upload"}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>
                </label>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex h-8 items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-3 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50"
                >
                  <X className="size-3" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Check className="size-3" />
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={Warehouse}
              label="On hand"
              value={formatQty(activity.summary.currentStock)}
            />
            <Kpi
              icon={ShoppingBag}
              label="Sold today"
              value={formatQty(activity.periods.todayQty)}
              hint={formatMoney(activity.periods.todayRevenue)}
            />
            <Kpi
              icon={TrendingUp}
              label="Avg / day (7d)"
              value={formatQty(activity.summary.avgUnitsPerDay7d)}
            />
            <Kpi
              icon={Package}
              label="Sell-through"
              value={
                activity.summary.sellThroughPct != null
                  ? `${formatQty(activity.summary.sellThroughPct)}%`
                  : "—"
              }
              hint={
                activity.summary.lastReceiptAt
                  ? `${formatQty(activity.summary.soldSinceLastReceipt)} sold since last stock-in`
                  : "No stock-in yet"
              }
            />
          </div>

          {/* Prices row */}
          <div className="flex flex-wrap gap-2">
            {activity.summary.buyingPrice != null &&
            toNum(activity.summary.buyingPrice) > 0 ? (
              <div className="min-w-[6rem] rounded-lg border border-border/30 bg-muted/10 px-3 py-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Buying Price
                </p>
                <p className="font-mono text-[11px] font-semibold tabular-nums">
                  {formatMoney(activity.summary.buyingPrice)}
                </p>
              </div>
            ) : null}
            {activity.summary.sellingPrice != null &&
            toNum(activity.summary.sellingPrice) > 0 ? (
              <div className="min-w-[6rem] rounded-lg border border-border/30 bg-muted/10 px-3 py-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Selling Price
                </p>
                <p className="font-mono text-[11px] font-semibold tabular-nums">
                  {formatMoney(activity.summary.sellingPrice)}
                </p>
              </div>
            ) : null}
            {activity.summary.imageKey ? (
              <div className="min-w-[6rem] rounded-lg border border-border/30 bg-muted/10 px-3 py-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Photo
                </p>
                <img
                  src={`https://res.cloudinary.com/dzqnyh7km/image/upload/w_48,h_48,c_fill/${activity.summary.imageKey}`}
                  alt="Item"
                  className="mt-0.5 size-8 rounded border border-border/30 object-cover"
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {PERIOD_CHIPS.map((chip) => (
              <div
                key={chip.label}
                className="min-w-[5.5rem] flex-1 rounded-xl border border-border/40 bg-muted/15 px-3 py-2"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                  {chip.label}
                </p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
                  {formatQty(activity.periods[chip.key])}
                </p>
                <p className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
                  {formatMoney(activity.periods[chip.revKey])}
                </p>
              </div>
            ))}
          </div>

          {activity.summary.lastReceiptAt ? (
            <p className="text-[11px] text-muted-foreground">
              Last stocked{" "}
              <span className="font-medium text-foreground/80">
                {new Date(activity.summary.lastReceiptAt).toLocaleString(
                  undefined,
                  {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </span>
              {activity.summary.lastReceiptQty != null
                ? ` · ${formatQty(activity.summary.lastReceiptQty)} units`
                : null}
            </p>
          ) : null}

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              Daily units sold
            </p>
            <div
              className="flex h-28 items-end gap-px sm:gap-0.5"
              role="img"
              aria-label="Daily quantity sold chart"
            >
              {activity.daily.map((point) => {
                const qty = toNum(point.qty);
                const h = Math.max(2, (qty / chartMax) * 100);
                const day = new Date(`${point.day}T12:00:00`);
                return (
                  <div
                    key={point.day}
                    className="group relative flex min-w-0 flex-1 flex-col items-center justify-end"
                    title={`${point.day}: ${formatQty(qty)}`}
                  >
                    <span
                      className={cn(
                        "w-full max-w-[10px] rounded-t-sm transition-colors",
                        qty > 0
                          ? "bg-primary/70 group-hover:bg-primary"
                          : "bg-muted/50",
                      )}
                      style={{ height: `${h}%` }}
                    />
                    <span className="mt-1 hidden text-[8px] text-muted-foreground/50 sm:block">
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                Stock-in history
              </p>
              {activity.stockIns.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No inbound movements recorded.
                </p>
              ) : (
                <ul className="divide-y divide-border/30 rounded-xl border border-border/40">
                  {activity.stockIns.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-start justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-foreground/90">
                          {movementLabel(m.movementType)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(m.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {m.reason || m.notes ? (
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70">
                            {m.reason || m.notes}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-emerald-700">
                        +{formatQty(m.quantityDelta)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                Recent sales
              </p>
              {activity.recentSales.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No sale lines in this window.
                </p>
              ) : (
                <ul className="divide-y divide-border/30 rounded-xl border border-border/40">
                  {activity.recentSales.slice(0, 12).map((s, idx) => (
                    <li
                      key={`${s.saleId}-${idx}`}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-foreground/90">
                          {new Date(s.soldAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {s.cashierName || "—"} · {s.paymentMethod}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-[11px] font-semibold tabular-nums">
                          {formatQty(s.quantity)}
                        </p>
                        <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {formatMoney(s.lineTotal)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
        <Icon className="size-3" aria-hidden />
        {label}
      </div>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-muted-foreground/65">{hint}</p>
      ) : null}
    </div>
  );
}
