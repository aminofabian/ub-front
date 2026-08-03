"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  ExternalLink,
  Image as ImageIcon,
  Package,
  Pencil,
  Save,
  Search,
  ShoppingBag,
  TrendingUp,
  Warehouse,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  fetchItemsPage,
  patchItem,
  getCloudinarySignature,
  uploadToCloudinary,
  type ItemActivityResponse,
  type ItemSummaryRecord,
} from "@/lib/api";
import { setCatalogOnHandStock } from "@/lib/set-on-hand-stock";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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

function formatMoneyCompact(n: number | string | null | undefined): string {
  const v = toNum(n);
  if (v === 0) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
    case "receipt": return "Stocked in";
    case "opening": return "Opening";
    case "transfer_in": return "Transfer in";
    default: return type;
  }
}

/* ------------------------------------------------------------------ */
/*                          Edit Drawer                               */
/* ------------------------------------------------------------------ */
function EditDrawer({
  open,
  onClose,
  activity,
  branchId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  activity: ItemActivityResponse;
  branchId?: string;
  onSaved: () => void;
}) {
  const s = activity.summary;
  const [stock, setStock] = useState(formatQty(s.currentStock));
  const [buying, setBuying] = useState(
    toNum(s.buyingPrice) > 0 ? String(toNum(s.buyingPrice)) : "",
  );
  const [selling, setSelling] = useState(
    toNum(s.sellingPrice) > 0 ? String(toNum(s.sellingPrice)) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      const p: Promise<unknown>[] = [];
      const cur = toNum(s.currentStock);
      const ns = parseFloat(stock);
      if (!isNaN(ns) && ns >= 0 && Math.abs(ns - cur) > 0.0001 && branchId) {
        p.push(
          setCatalogOnHandStock({
            itemId: s.itemId,
            branchId: branchId.trim(),
            targetDisplay: ns,
            unitCost: toNum(s.buyingPrice) || 0,
            notes: `Set on-hand from activity to ${formatQty(ns)}`,
          }),
        );
      }
      const bp = buying ? parseFloat(buying) : undefined;
      if (bp !== undefined && !isNaN(bp) && bp !== toNum(s.buyingPrice))
        p.push(patchItem(s.itemId, { buyingPrice: bp }));
      const sp = selling ? parseFloat(selling) : undefined;
      if (sp !== undefined && !isNaN(sp) && sp !== toNum(s.sellingPrice))
        p.push(patchItem(s.itemId, { bundlePrice: sp }));
      if (p.length === 0) { onSaved(); return; }
      await Promise.all(p);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [s, stock, buying, selling, branchId, onSaved]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setError(null);
    try {
      const sig = await getCloudinarySignature("items");
      const r = await uploadToCloudinary(f, sig);
      await patchItem(s.itemId, { imageKey: r.public_id });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [s.itemId, onSaved]);

  const field = (label: string, val: string, set: (v: string) => void, hint?: string) => (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <input
        type="number"
        step="any"
        value={val}
        onChange={(e) => set(e.target.value)}
        placeholder={hint ?? "—"}
        className="h-9 rounded-lg border border-border/50 bg-muted/20 px-3 text-[13px] font-medium outline-none transition-colors hover:border-border focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30 placeholder:text-muted-foreground/35"
      />
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        side="right"
        className="w-[min(100%,22rem)] !gap-0 !p-0"
        overlayClassName="bg-black/20 backdrop-blur-[2px]"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <DialogTitle className="truncate text-[14px] font-semibold">
              {s.itemName}
            </DialogTitle>
            {s.sku ? (
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/50">
                {s.sku}
              </p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="ml-2 flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Photo */}
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border/50 bg-muted/20 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
            >
              {s.imageKey ? (
                <img
                  src={`https://res.cloudinary.com/dzqnyh7km/image/upload/w_128,h_128,c_fill/${s.imageKey}`}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <ImageIcon className="size-5 text-muted-foreground/35 group-hover:text-primary/50" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
                <Camera className="size-4 text-white" />
              </div>
              {uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <svg className="size-4 animate-spin text-primary" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                </div>
              ) : null}
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Photo</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/50">{s.imageKey ? "Tap to change" : "Tap to add"}</p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>

        {/* Fields */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-[11px] font-medium text-destructive">
              {error}
            </div>
          ) : null}
          {field("Stock on hand", stock, setStock, formatQty(s.currentStock))}
          <div className="grid grid-cols-2 gap-3">
            {field("Buying price", buying, setBuying, toNum(s.buyingPrice) > 0 ? String(toNum(s.buyingPrice)) : "0")}
            {field("Selling price", selling, setSelling, toNum(s.sellingPrice) > 0 ? String(toNum(s.sellingPrice)) : "0")}
          </div>
        </div>

        <div className="border-t px-4 py-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            <Save className="size-4" />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*                          Main component                            */
/* ------------------------------------------------------------------ */
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
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setSearching(true);
      try {
        const page = await fetchItemsPage(q, { size: 8, itemTypeId: itemTypeId?.trim() || undefined });
        if (!cancelled) setSuggestions(page.content);
      } catch { if (!cancelled) setSuggestions([]); }
      finally { if (!cancelled) setSearching(false); }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [query, itemTypeId]);

  const chartMax = useMemo(() => {
    if (!activity?.daily?.length) return 1;
    return Math.max(1, ...activity.daily.map((d) => toNum(d.qty)));
  }, [activity]);

  const s = activity?.summary;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a product — e.g. Eggs…"
          className="h-10 w-full rounded-xl border border-border/50 bg-muted/30 pl-9 pr-3 text-sm outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
        />
        {query.trim().length >= 2 ? (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-border/50 bg-card shadow-lg">
            {searching ? (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">Searching…</p>
            ) : suggestions.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">No products found.</p>
            ) : (
              <ul>
                {suggestions.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/50"
                      onClick={() => { onPickItem(item.id); setQuery(""); setSuggestions([]); }}
                    >
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{item.sku}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {/* Empty state */}
      {!itemId ? (
        <div className="rounded-2xl border border-dashed border-border/50 bg-muted/10 px-6 py-12 text-center">
          <Package className="mx-auto size-8 text-muted-foreground/40" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground/80">Pick a product to see its story</p>
          <p className="mt-1 text-xs text-muted-foreground">Stocking history, sell-through, and how it has been moving day by day.</p>
        </div>
      ) : null}

      {itemId && loading ? (
        <p className="py-8 text-center text-xs text-muted-foreground">Loading product activity…</p>
      ) : null}

      {itemId && error ? (
        <p className="py-4 text-center text-xs text-destructive">{error}</p>
      ) : null}

      {itemId && activity && !loading ? (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {s?.imageKey ? (
                <img
                  src={`https://res.cloudinary.com/dzqnyh7km/image/upload/w_64,h_64,c_fill/${s.imageKey}`}
                  alt=""
                  className="size-10 shrink-0 rounded-xl border border-border/30 object-cover"
                />
              ) : null}
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">{s?.itemName}</h2>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{s?.sku || "No SKU"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 text-[11px] font-semibold text-foreground/80 transition-colors hover:bg-muted/50"
              >
                <Pencil className="size-3" />
                Edit
              </button>
              <Link
                href={`/products/${s?.itemId}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 text-[11px] font-semibold text-foreground/80 transition-colors hover:bg-muted/50"
              >
                <ExternalLink className="size-3" aria-hidden />
                Open
              </Link>
            </div>
          </div>

          {/* Quick info row: prices + stock */}
          <div className="flex flex-wrap items-center gap-1.5">
            {s?.buyingPrice != null && toNum(s.buyingPrice) > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-border/30 bg-muted/15 px-2 py-0.5 font-mono text-[10.5px] tabular-nums">
                <span className="text-[9px] text-muted-foreground/60">Buy</span>
                {formatMoneyCompact(s.buyingPrice)}
              </span>
            ) : null}
            {s?.sellingPrice != null && toNum(s.sellingPrice) > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-border/30 bg-muted/15 px-2 py-0.5 font-mono text-[10.5px] tabular-nums">
                <span className="text-[9px] text-muted-foreground/60">Sell</span>
                {formatMoneyCompact(s.sellingPrice)}
              </span>
            ) : null}
          </div>

          {/* KPIs */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Warehouse} label="On hand" value={formatQty(s?.currentStock)} />
            <Kpi icon={ShoppingBag} label="Sold today" value={formatQty(activity.periods.todayQty)} hint={formatMoneyCompact(activity.periods.todayRevenue)} />
            <Kpi icon={TrendingUp} label="Avg / day (7d)" value={formatQty(s?.avgUnitsPerDay7d)} />
            <Kpi
              icon={Package}
              label="Sell-through"
              value={s?.sellThroughPct != null ? `${formatQty(s.sellThroughPct)}%` : "—"}
              hint={s?.lastReceiptAt ? `${formatQty(s.soldSinceLastReceipt)} sold since last stock-in` : "No stock-in yet"}
            />
          </div>

          {/* Period chips */}
          <div className="flex flex-wrap gap-2">
            {PERIOD_CHIPS.map((chip) => (
              <div key={chip.label} className="min-w-[5.5rem] flex-1 rounded-xl border border-border/40 bg-muted/15 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">{chip.label}</p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{formatQty(activity.periods[chip.key])}</p>
                <p className="font-mono text-[10px] tabular-nums text-muted-foreground/60">{formatMoney(activity.periods[chip.revKey])}</p>
              </div>
            ))}
          </div>

          {/* Last stocked */}
          {s?.lastReceiptAt ? (
            <p className="text-[11px] text-muted-foreground">
              Last stocked{" "}
              <span className="font-medium text-foreground/80">
                {new Date(s.lastReceiptAt).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
              {s.lastReceiptQty != null ? ` · ${formatQty(s.lastReceiptQty)} units` : null}
            </p>
          ) : null}

          {/* Daily chart */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">Daily units sold</p>
            <div className="flex h-28 items-end gap-px sm:gap-0.5" role="img" aria-label="Daily quantity sold chart">
              {activity.daily.map((point) => {
                const qty = toNum(point.qty);
                const h = Math.max(2, (qty / chartMax) * 100);
                const day = new Date(`${point.day}T12:00:00`);
                return (
                  <div key={point.day} className="group relative flex min-w-0 flex-1 flex-col items-center justify-end" title={`${point.day}: ${formatQty(qty)}`}>
                    <span
                      className={cn(
                        "w-full max-w-[10px] rounded-t-sm transition-colors",
                        qty > 0 ? "bg-primary/70 group-hover:bg-primary" : "bg-muted/50",
                      )}
                      style={{ height: `${h}%` }}
                    />
                    <span className="mt-1 hidden text-[8px] text-muted-foreground/50 sm:block">{day.getDate()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stock-ins + Recent sales */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">Stock-in history</p>
              {activity.stockIns.length === 0 ? (
                <p className="text-xs text-muted-foreground">No inbound movements recorded.</p>
              ) : (
                <ul className="divide-y divide-border/30 rounded-xl border border-border/40">
                  {activity.stockIns.map((m) => (
                    <li key={m.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-foreground/90">{movementLabel(m.movementType)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(m.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {m.reason || m.notes ? (
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground/70">{m.reason || m.notes}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-emerald-700">+{formatQty(m.quantityDelta)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">Recent sales</p>
              {activity.recentSales.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sale lines in this window.</p>
              ) : (
                <ul className="divide-y divide-border/30 rounded-xl border border-border/40">
                  {activity.recentSales.slice(0, 12).map((s, idx) => (
                    <li key={`${s.saleId}-${idx}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-foreground/90">
                          {new Date(s.soldAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">{s.cashierName || "—"} · {s.paymentMethod}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-[11px] font-semibold tabular-nums">{formatQty(s.quantity)}</p>
                        <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{formatMoney(s.lineTotal)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Edit drawer */}
          {editOpen ? (
            <EditDrawer
              open
              activity={activity}
              branchId={branchId}
              onClose={() => setEditOpen(false)}
              onSaved={() => { setEditOpen(false); onChanged?.(); }}
            />
          ) : null}
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
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-muted-foreground/65">{hint}</p> : null}
    </div>
  );
}
