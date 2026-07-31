"use client";

import { useCallback, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  Gauge,
  Image as ImageIcon,
  Pencil,
  Save,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  patchItem,
  postStockIncrease,
  getCloudinarySignature,
  uploadToCloudinary,
  type ItemVelocityRow,
} from "@/lib/api";
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

function formatMoneyCompact(n: number | string | null | undefined): string {
  const v = toNum(n);
  if (v === 0) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString(undefined, {
    minimumFractionDigits: Math.abs(v) < 1 ? 2 : 0,
    maximumFractionDigits: 0,
  });
}

export type VelocitySortKey =
  | "itemName"
  | "todayQty"
  | "yesterdayQty"
  | "last3Qty"
  | "last7Qty"
  | "last30Qty";

const COLUMNS: { key: VelocitySortKey; label: string; hint: string }[] = [
  { key: "todayQty", label: "Today", hint: "Sold today" },
  { key: "yesterdayQty", label: "Yesterday", hint: "Sold yesterday" },
  { key: "last3Qty", label: "3d", hint: "Including today" },
  { key: "last7Qty", label: "7d", hint: "Including today" },
  { key: "last30Qty", label: "30d", hint: "Including today" },
];

/* ------------------------------------------------------------------ */
/*                          Edit Drawer                               */
/* ------------------------------------------------------------------ */
function EditDrawer({
  open,
  onClose,
  row,
  branchId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  row: ItemVelocityRow;
  branchId: string;
  onSaved: () => void;
}) {
  const [stock, setStock] = useState(formatQty(row.currentStock));
  const [buying, setBuying] = useState(
    toNum(row.buyingPrice) > 0 ? String(toNum(row.buyingPrice)) : "",
  );
  const [selling, setSelling] = useState(
    toNum(row.sellingPrice) > 0 ? String(toNum(row.sellingPrice)) : "",
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
      const cur = toNum(row.currentStock);
      const ns = parseFloat(stock);
      if (!isNaN(ns) && ns !== cur && branchId) {
        const d = ns - cur;
        if (d !== 0) {
          p.push(
            postStockIncrease({
              branchId: branchId.trim(),
              itemId: row.itemId,
              quantity: Math.abs(d),
              unitCost: toNum(row.buyingPrice) || 0,
              notes: `Quick adjust from activity (${d > 0 ? "+" : ""}${formatQty(d)})`,
            }),
          );
        }
      }
      const bp = buying ? parseFloat(buying) : undefined;
      if (bp !== undefined && !isNaN(bp) && bp !== toNum(row.buyingPrice)) {
        p.push(patchItem(row.itemId, { buyingPrice: bp }));
      }
      const sp = selling ? parseFloat(selling) : undefined;
      if (sp !== undefined && !isNaN(sp) && sp !== toNum(row.sellingPrice)) {
        p.push(patchItem(row.itemId, { bundlePrice: sp }));
      }
      if (p.length === 0) { onSaved(); return; }
      await Promise.all(p);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [row, stock, buying, selling, branchId, onSaved]);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setUploading(true);
      setError(null);
      try {
        const sig = await getCloudinarySignature("items");
        const r = await uploadToCloudinary(f, sig);
        await patchItem(row.itemId, { imageKey: r.public_id });
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [row.itemId, onSaved],
  );

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
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0">
            <DialogTitle className="truncate text-[14px] font-semibold">
              {row.itemName}
            </DialogTitle>
            {row.sku ? (
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/50">
                {row.sku}
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

        {/* Photo area */}
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border/50 bg-muted/20 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
            >
              {row.imageKey ? (
                <img
                  src={`https://res.cloudinary.com/dzqnyh7km/image/upload/w_128,h_128,c_fill/${row.imageKey}`}
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
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Photo
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/50">
                {row.imageKey ? "Tap to change" : "Tap to add"}
              </p>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>

        {/* Form fields */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/[0.06] px-3 py-2 text-[11px] font-medium text-destructive">
              {error}
            </div>
          ) : null}

          {field("Stock on hand", stock, setStock, formatQty(row.currentStock))}

          <div className="grid grid-cols-2 gap-3">
            {field("Buying price", buying, setBuying, toNum(row.buyingPrice) > 0 ? String(toNum(row.buyingPrice)) : "0")}
            {field("Selling price", selling, setSelling, toNum(row.sellingPrice) > 0 ? String(toNum(row.sellingPrice)) : "0")}
          </div>
        </div>

        {/* Footer */}
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
/*                            Main board                              */
/* ------------------------------------------------------------------ */
export function ActivityVelocityBoard({
  rows,
  sortKey,
  sortDir,
  onSort,
  onSelectItem,
  search,
  branchId,
  onRowsChanged,
}: {
  rows: ItemVelocityRow[];
  sortKey: VelocitySortKey;
  sortDir: "asc" | "desc";
  onSort: (key: VelocitySortKey) => void;
  onSelectItem: (itemId: string) => void;
  search: string;
  branchId: string;
  onRowsChanged?: () => void;
}) {
  const [editingRow, setEditingRow] = useState<ItemVelocityRow | null>(null);

  const filtered = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.itemName.toLowerCase().includes(q) ||
        (r.sku ?? "").toLowerCase().includes(q),
    );
  })();

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "itemName") {
      const cmp = a.itemName.localeCompare(b.itemName, undefined, {
        sensitivity: "base",
      });
      return sortDir === "asc" ? cmp : -cmp;
    }
    return sortDir === "asc"
      ? toNum(a[sortKey]) - toNum(b[sortKey])
      : toNum(b[sortKey]) - toNum(a[sortKey]);
  });

  const maxByCol: Record<string, number> = {};
  for (const col of COLUMNS) {
    maxByCol[col.key] = Math.max(
      1,
      ...sorted.map((r) => toNum(r[col.key as keyof ItemVelocityRow])),
    );
  }

  const movers = [...rows]
    .map((r) => ({
      row: r,
      delta: toNum(r.todayQty) - toNum(r.yesterdayQty),
    }))
    .filter((m) => m.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {movers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            <Gauge className="size-3" aria-hidden />
            Pulse vs yesterday
          </span>
          {movers.map(({ row, delta }) => {
            const up = delta > 0;
            return (
              <button
                key={row.itemId}
                type="button"
                onClick={() => onSelectItem(row.itemId)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  up
                    ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-700 hover:bg-emerald-500/10"
                    : "border-amber-500/25 bg-amber-500/[0.06] text-amber-800 hover:bg-amber-500/10",
                )}
              >
                {up ? (
                  <ArrowUpRight className="size-3 shrink-0" aria-hidden />
                ) : (
                  <ArrowDownRight className="size-3 shrink-0" aria-hidden />
                )}
                <span className="max-w-[9rem] truncate">{row.itemName}</span>
                <span className="font-mono tabular-nums">
                  {up ? "+" : ""}
                  {formatQty(delta)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted-foreground">
          {search.trim()
            ? "No products match your search."
            : "No sales in the last 30 days for this scope."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b-2 border-border/50 text-left">
                <th className="sticky left-0 z-10 bg-card pb-2.5 pt-1 pl-1">
                  <button
                    type="button"
                    onClick={() => onSort("itemName")}
                    className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 hover:text-foreground"
                  >
                    Product
                    {sortKey === "itemName" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-1.5 pb-2.5 pt-1 text-right" title={col.hint}>
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="w-full text-right text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 hover:text-foreground"
                    >
                      {col.label}
                      {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ))}
                <th className="px-1.5 pb-2.5 pt-1 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
                  Stock
                </th>
                <th className="w-8 pb-2.5 pt-1" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => (
                <tr
                  key={row.itemId}
                  className={cn(
                    "group cursor-pointer border-l-2 border-transparent transition-colors",
                    "hover:border-l-primary/30 hover:bg-primary/[0.03]",
                    idx % 2 === 0 ? "bg-transparent" : "bg-muted/[0.08]",
                  )}
                  onClick={() => onSelectItem(row.itemId)}
                >
                  <td className="sticky left-0 z-[1] bg-inherit py-2 pl-1 pr-2">
                    <p className="max-w-[180px] truncate text-[11px] font-medium text-foreground/90">
                      {row.itemName}
                    </p>
                    {row.sku ? (
                      <p className="font-mono text-[9.5px] text-muted-foreground/45">
                        {row.sku}
                      </p>
                    ) : null}
                  </td>
                  {COLUMNS.map((col) => {
                    const qty = toNum(row[col.key as keyof ItemVelocityRow] as number | string);
                    const revKey = col.key.replace("Qty", "Revenue") as keyof ItemVelocityRow;
                    const rev = toNum(row[revKey] as number | string);
                    const pct = Math.min(100, (qty / maxByCol[col.key]) * 100);
                    return (
                      <td key={col.key} className="px-1.5 py-2 text-right">
                        <div className="ml-auto flex w-[4rem] flex-col items-end gap-0.5">
                          <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                            {formatQty(qty)}
                          </span>
                          <span className="font-mono text-[9px] tabular-nums text-muted-foreground/48">
                            {formatMoneyCompact(rev)}
                          </span>
                          <span className="mt-0.5 h-0.5 w-full overflow-hidden rounded-full bg-muted/40" aria-hidden>
                            <span className="block h-full rounded-full bg-primary/45" style={{ width: `${pct}%` }} />
                          </span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-1.5 py-2 text-right font-mono text-[11px] tabular-nums text-foreground/75">
                    {formatQty(row.currentStock)}
                  </td>
                  <td className="py-2 pr-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingRow(row); }}
                      className="flex size-6 items-center justify-center rounded-md text-muted-foreground/25 opacity-0 transition-all hover:bg-muted/60 hover:text-foreground group-hover:opacity-100"
                      title="Edit stock, prices, photo"
                    >
                      <Pencil className="size-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingRow ? (
        <EditDrawer
          open
          onClose={() => setEditingRow(null)}
          row={editingRow}
          branchId={branchId}
          onSaved={() => {
            setEditingRow(null);
            onRowsChanged?.();
          }}
        />
      ) : null}
    </div>
  );
}
