"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  fetchItemById,
  getCloudinarySignature,
  uploadToCloudinary,
  type ItemDetailRecord,
  type ItemSummaryRecord,
  type ItemVelocityRow,
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

function isLabelOnlyGroup(detail: ItemDetailRecord | null): boolean {
  if (!detail) return false;
  if (detail.groupLabelOnly === true) return true;
  const hasVariants = (detail.variants?.length ?? 0) > 0;
  return (
    detail.isSellable === false &&
    detail.isStocked === false &&
    !detail.variantOfItemId?.trim() &&
    hasVariants
  );
}

/** Stocked parent (e.g. Eggs) whose package options draw from this base on-hand. */
function isStockedBaseWithOptions(detail: ItemDetailRecord | null): boolean {
  if (!detail) return false;
  if (detail.variantOfItemId?.trim()) return false;
  if ((detail.variants?.length ?? 0) === 0) return false;
  if (detail.isStocked === false) return false;
  return true;
}

function variantLabel(v: ItemSummaryRecord): string {
  return (v.variantName || v.name || v.sku || "Option").trim();
}

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
  onSaved: (patch: Partial<ItemVelocityRow>) => void;
}) {
  const [detail, setDetail] = useState<ItemDetailRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] =
    useState<ItemSummaryRecord | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    setSelectedVariant(null);
    setError(null);
    fetchItemById(row.itemId, { branchId: branchId || undefined })
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        if (!isLabelOnlyGroup(d)) {
          setStock(formatQty(d.stockQty ?? row.currentStock));
          setBuying(
            toNum(d.buyingPrice) > 0 ? String(toNum(d.buyingPrice)) : "",
          );
          setSelling(
            toNum(d.bundlePrice) > 0
              ? String(toNum(d.bundlePrice))
              : toNum(row.sellingPrice) > 0
                ? String(toNum(row.sellingPrice))
                : "",
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDetail(null);
          setError(
            err instanceof Error ? err.message : "Could not load product.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [row.itemId, row.currentStock, row.sellingPrice, branchId]);

  const labelOnlyGroup = isLabelOnlyGroup(detail);
  const stockedBase = isStockedBaseWithOptions(detail);
  const editTarget = labelOnlyGroup ? selectedVariant : detail;
  const editItemId = editTarget?.id ?? row.itemId;

  const selectVariant = useCallback((v: ItemSummaryRecord) => {
    setSelectedVariant(v);
    setStock(formatQty(v.stockQty));
    setBuying(
      toNum(v.buyingPrice) > 0 ? String(toNum(v.buyingPrice)) : "",
    );
    setSelling(
      toNum(v.bundlePrice) > 0 ? String(toNum(v.bundlePrice)) : "",
    );
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    setError(null);
    if (labelOnlyGroup && !selectedVariant) {
      setError("Pick which option to update first.");
      return;
    }
    if (!branchId && (() => {
      const ns = parseFloat(stock);
      const cur = toNum(editTarget?.stockQty ?? row.currentStock);
      return !isNaN(ns) && Math.abs(ns - cur) > 0.0001;
    })()) {
      setError("Select a branch before changing stock.");
      return;
    }
    setSaving(true);
    try {
      const patch: Partial<ItemVelocityRow> = {};
      const tasks: Promise<unknown>[] = [];
      const ns = parseFloat(stock);
      const cur = toNum(
        editTarget?.stockQty ?? (labelOnlyGroup ? 0 : row.currentStock),
      );
      if (!isNaN(ns) && ns >= 0 && Math.abs(ns - cur) > 0.0001 && branchId) {
        tasks.push(
          setCatalogOnHandStock({
            itemId: editItemId,
            branchId: branchId.trim(),
            targetDisplay: ns,
            unitCost:
              (buying ? parseFloat(buying) : undefined) ||
              toNum(editTarget?.buyingPrice) ||
              toNum(row.buyingPrice) ||
              0,
            notes: `Set on-hand from activity to ${formatQty(ns)}`,
          }),
        );
        // Reflect on the velocity row when editing that same SKU (including stocked bases).
        if (!labelOnlyGroup || editItemId === row.itemId) {
          patch.currentStock = ns;
        }
      }
      const bp = buying ? parseFloat(buying) : undefined;
      if (
        bp !== undefined &&
        !isNaN(bp) &&
        bp !== toNum(editTarget?.buyingPrice ?? row.buyingPrice)
      ) {
        tasks.push(patchItem(editItemId, { buyingPrice: bp }));
        if (!labelOnlyGroup || editItemId === row.itemId) {
          patch.buyingPrice = bp;
        }
      }
      const sp = selling ? parseFloat(selling) : undefined;
      if (
        sp !== undefined &&
        !isNaN(sp) &&
        sp !== toNum(editTarget?.bundlePrice ?? row.sellingPrice)
      ) {
        tasks.push(patchItem(editItemId, { bundlePrice: sp }));
        if (!labelOnlyGroup || editItemId === row.itemId) {
          patch.sellingPrice = sp;
        }
      }
      if (tasks.length === 0) {
        onSaved({});
        return;
      }
      await Promise.all(tasks);
      onSaved(patch);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [
    labelOnlyGroup,
    selectedVariant,
    branchId,
    stock,
    buying,
    selling,
    editTarget,
    editItemId,
    row,
    onSaved,
  ]);

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
        onSaved({ imageKey: r.public_id });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [row.itemId, onSaved],
  );

  const field = (
    label: string,
    val: string,
    set: (v: string) => void,
    hint?: string,
  ) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <input
        type="number"
        inputMode="decimal"
        step="any"
        value={val}
        onChange={(e) => set(e.target.value)}
        placeholder={hint ?? "—"}
        className="h-12 rounded-xl border border-border/50 bg-muted/20 px-3.5 text-[16px] font-medium outline-none transition-colors hover:border-border focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30 placeholder:text-muted-foreground/35 md:h-10 md:text-[13px]"
      />
    </label>
  );

  const titleName = selectedVariant
    ? `${row.itemName} · ${variantLabel(selectedVariant)}`
    : row.itemName;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        side="bottom"
        className="!gap-0 !p-0 md:!inset-y-0 md:!bottom-auto md:!left-auto md:!right-0 md:!h-[100dvh] md:!max-h-[100dvh] md:!w-[min(100%,22rem)] md:!max-w-full md:!rounded-none md:!rounded-l-2xl md:!border-l md:!border-t-0 md:!pb-[env(safe-area-inset-bottom)] md:!shadow-[-24px_0_80px_-20px_rgba(0,0,0,0.12)] md:data-[state=open]:slide-in-from-right md:data-[state=closed]:slide-out-to-right"
        overlayClassName="bg-black/25 backdrop-blur-[2px]"
        showCloseButton={false}
      >
        {/* Drag handle — mobile bottom sheet cue */}
        <div className="flex justify-center pt-2.5 md:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-muted-foreground/25" />
        </div>

        <div className="flex items-center justify-between border-b border-border/40 px-4 pb-3 pt-1 md:pt-3">
          <div className="min-w-0">
            <DialogTitle className="truncate text-[15px] font-semibold tracking-tight">
              {titleName}
            </DialogTitle>
            {selectedVariant?.sku || row.sku ? (
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/50">
                {selectedVariant?.sku || row.sku}
              </p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="ml-2 flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground active:scale-95"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {!labelOnlyGroup ? (
          <div className="border-b border-border/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="group relative flex size-[4.25rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border/50 bg-muted/20 transition-colors active:scale-[0.98] hover:border-primary/30 hover:bg-primary/[0.04]"
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
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-100 transition-opacity md:opacity-0 md:group-hover:bg-black/20 md:group-hover:opacity-100">
                  <span className="flex size-8 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none">
                    <Camera className="size-3.5 text-white md:size-4" />
                  </span>
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
                <p className="mt-0.5 text-[12px] text-muted-foreground/55">
                  {row.imageKey ? "Tap to change" : "Tap to add"}
                </p>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        ) : null}

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
          {error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/[0.06] px-3 py-2.5 text-[12px] font-medium leading-snug text-destructive">
              {error}
            </div>
          ) : null}

          {detailLoading ? (
            <p className="text-[13px] text-muted-foreground">Loading…</p>
          ) : null}

          {stockedBase && !detailLoading ? (
            <div className="space-y-2 rounded-2xl border border-border/50 bg-muted/15 px-3.5 py-3">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Base stock</span>
                {" — "}
                trays and packs sell from this pool. Edit the base here.
              </p>
              {(detail?.variants?.length ?? 0) > 0 ? (
                <ul className="space-y-1.5 border-t border-border/40 pt-2.5">
                  {(detail?.variants ?? []).map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-2 text-[12px]"
                    >
                      <span className="truncate text-foreground/85">
                        {variantLabel(v)}
                        {v.packageUnitsPerSale != null ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {formatQty(v.packageUnitsPerSale)} / pack
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                        ≈ {formatQty(v.stockQty)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {labelOnlyGroup && !selectedVariant ? (
            <div className="space-y-2">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{row.itemName}</span>{" "}
                has no base stock. Pick an option:
              </p>
              <ul className="space-y-2">
                {(detail?.variants ?? []).map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => selectVariant(v)}
                      className="flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3.5 py-3 text-left transition-colors active:scale-[0.99] hover:border-primary/40 hover:bg-primary/[0.04]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium text-foreground">
                          {variantLabel(v)}
                        </span>
                        {v.sku ? (
                          <span className="font-mono text-[10px] text-muted-foreground/60">
                            {v.sku}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-mono text-[13px] tabular-nums text-foreground/80">
                        {formatQty(v.stockQty)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {labelOnlyGroup && selectedVariant ? (
            <button
              type="button"
              onClick={() => {
                setSelectedVariant(null);
                setError(null);
              }}
              className="min-h-10 text-[13px] font-medium text-primary"
            >
              ← All {row.itemName} options
            </button>
          ) : null}

          {(!labelOnlyGroup && !detailLoading) || selectedVariant ? (
            <>
              {field(
                stockedBase ? "Base in store" : "In store",
                stock,
                setStock,
                formatQty(editTarget?.stockQty ?? row.currentStock),
              )}
              <div className="grid grid-cols-2 gap-3">
                {field(
                  "Buying price",
                  buying,
                  setBuying,
                  toNum(editTarget?.buyingPrice ?? row.buyingPrice) > 0
                    ? String(toNum(editTarget?.buyingPrice ?? row.buyingPrice))
                    : "0",
                )}
                {field(
                  "Selling price",
                  selling,
                  setSelling,
                  toNum(editTarget?.bundlePrice ?? row.sellingPrice) > 0
                    ? String(
                        toNum(editTarget?.bundlePrice ?? row.sellingPrice),
                      )
                    : "0",
                )}
              </div>
            </>
          ) : null}
        </div>

        {(!labelOnlyGroup && !detailLoading) || selectedVariant ? (
          <div className="border-t border-border/40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || detailLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[14px] font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
            >
              <Save className="size-4" />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        ) : null}
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
  onRowPatched,
}: {
  rows: ItemVelocityRow[];
  sortKey: VelocitySortKey;
  sortDir: "asc" | "desc";
  onSort: (key: VelocitySortKey) => void;
  onSelectItem: (itemId: string) => void;
  search: string;
  branchId: string;
  /** Apply edits in place — do not refetch the whole board (preserves scroll). */
  onRowPatched?: (itemId: string, patch: Partial<ItemVelocityRow>) => void;
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
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
          <span className="flex shrink-0 items-center gap-1.5 self-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            <Gauge className="size-3" aria-hidden />
            Pulse
          </span>
          {movers.map(({ row, delta }) => {
            const up = delta > 0;
            return (
              <button
                key={row.itemId}
                type="button"
                onClick={() => onSelectItem(row.itemId)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[12px] font-medium transition-colors active:scale-[0.98]",
                  up
                    ? "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-700 hover:bg-emerald-500/10"
                    : "border-amber-500/25 bg-amber-500/[0.06] text-amber-800 hover:bg-amber-500/10",
                )}
              >
                {up ? (
                  <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
                ) : (
                  <ArrowDownRight className="size-3.5 shrink-0" aria-hidden />
                )}
                <span className="max-w-[8rem] truncate">{row.itemName}</span>
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
        <div className="py-10 text-center text-sm text-muted-foreground">
          {search.trim()
            ? "No products match your search."
            : "No sales in the last 30 days for this scope."}
        </div>
      ) : (
        <>
          {/* ── Mobile: pulse cards ───────────────────────────────── */}
          <div className="space-y-2 md:hidden">
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => onSort("itemName")}
                className={cn(
                  "h-8 shrink-0 rounded-full border px-3 text-[11px] font-semibold transition-colors",
                  sortKey === "itemName"
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-border/50 bg-muted/30 text-muted-foreground",
                )}
              >
                A–Z
                {sortKey === "itemName" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
              </button>
              {COLUMNS.map((col) => (
                <button
                  key={col.key}
                  type="button"
                  title={col.hint}
                  onClick={() => onSort(col.key)}
                  className={cn(
                    "h-8 shrink-0 rounded-full border px-3 text-[11px] font-semibold transition-colors",
                    sortKey === col.key
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-border/50 bg-muted/30 text-muted-foreground",
                  )}
                >
                  {col.label}
                  {sortKey === col.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </button>
              ))}
            </div>

            <ul className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/50 bg-card/40">
              {sorted.map((row, idx) => {
                const focusKey =
                  sortKey === "itemName" ? "todayQty" : sortKey;
                const focusQty = toNum(
                  row[focusKey as keyof ItemVelocityRow] as number | string,
                );
                const focusCol =
                  COLUMNS.find((c) => c.key === focusKey) ?? COLUMNS[0];
                const focusRev = toNum(
                  row[
                    focusKey.replace("Qty", "Revenue") as keyof ItemVelocityRow
                  ] as number | string,
                );
                const vsYday = toNum(row.todayQty) - toNum(row.yesterdayQty);

                return (
                  <li
                    key={row.itemId}
                    className={cn(
                      "relative",
                      idx === 0 && "animate-in fade-in-0 slide-in-from-bottom-1 duration-300",
                    )}
                    style={
                      idx > 0 && idx < 12
                        ? { animationDelay: `${idx * 28}ms` }
                        : undefined
                    }
                  >
                    <div className="flex gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => onSelectItem(row.itemId)}
                        className="min-w-0 flex-1 text-left active:opacity-80"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold tracking-tight text-foreground">
                              {row.itemName}
                            </p>
                            {row.sku ? (
                              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/50">
                                {row.sku}
                              </p>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-mono text-[18px] font-bold leading-none tabular-nums tracking-tight text-foreground">
                              {formatQty(focusQty)}
                            </p>
                            <p className="mt-0.5 text-[10px] font-medium text-muted-foreground/65">
                              {focusCol.label}
                              {focusRev > 0
                                ? ` · ${formatMoneyCompact(focusRev)}`
                                : ""}
                            </p>
                          </div>
                        </div>

                        {/* Period pulse — 5 beats */}
                        <div
                          className="mt-2.5 flex h-8 items-end gap-1"
                          aria-hidden
                        >
                          {COLUMNS.map((col) => {
                            const qty = toNum(
                              row[
                                col.key as keyof ItemVelocityRow
                              ] as number | string,
                            );
                            const pct = Math.max(
                              8,
                              Math.min(
                                100,
                                (qty / maxByCol[col.key]) * 100,
                              ),
                            );
                            const active = col.key === focusKey;
                            return (
                              <div
                                key={col.key}
                                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5"
                              >
                                <span
                                  className={cn(
                                    "w-full rounded-sm transition-[height,background-color] duration-300 ease-out",
                                    active
                                      ? "bg-primary"
                                      : "bg-primary/25",
                                  )}
                                  style={{ height: `${pct}%` }}
                                />
                                <span
                                  className={cn(
                                    "text-[8px] font-semibold uppercase tracking-wide",
                                    active
                                      ? "text-primary"
                                      : "text-muted-foreground/45",
                                  )}
                                >
                                  {col.label === "Yesterday"
                                    ? "Y"
                                    : col.label.slice(0, 2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-medium text-muted-foreground/70">
                            In store{" "}
                            <span className="font-mono tabular-nums text-foreground/85">
                              {formatQty(row.currentStock)}
                            </span>
                          </span>
                          {vsYday !== 0 ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5 font-mono tabular-nums",
                                vsYday > 0
                                  ? "text-emerald-600"
                                  : "text-amber-700",
                              )}
                            >
                              {vsYday > 0 ? (
                                <ArrowUpRight className="size-3" />
                              ) : (
                                <ArrowDownRight className="size-3" />
                              )}
                              {vsYday > 0 ? "+" : ""}
                              {formatQty(vsYday)} vs yday
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">
                              flat vs yday
                            </span>
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingRow(row)}
                        className="flex size-11 shrink-0 items-center justify-center self-center rounded-xl border border-border/50 bg-muted/25 text-foreground/70 transition-colors active:scale-95 active:bg-muted/50"
                        aria-label={`Edit ${row.itemName}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ── Desktop: density table ────────────────────────────── */}
          <div className="hidden overflow-x-auto md:block">
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
                      {sortKey === "itemName"
                        ? sortDir === "asc"
                          ? " ↑"
                          : " ↓"
                        : ""}
                    </button>
                  </th>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className="px-1.5 pb-2.5 pt-1 text-right"
                      title={col.hint}
                    >
                      <button
                        type="button"
                        onClick={() => onSort(col.key)}
                        className="w-full text-right text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70 hover:text-foreground"
                      >
                        {col.label}
                        {sortKey === col.key
                          ? sortDir === "asc"
                            ? " ↑"
                            : " ↓"
                          : ""}
                      </button>
                    </th>
                  ))}
                  <th
                    className="px-1.5 pb-2.5 pt-1 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70"
                    title="Branch on-hand (same as Products)"
                  >
                    In store
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
                      const qty = toNum(
                        row[
                          col.key as keyof ItemVelocityRow
                        ] as number | string,
                      );
                      const revKey = col.key.replace(
                        "Qty",
                        "Revenue",
                      ) as keyof ItemVelocityRow;
                      const rev = toNum(row[revKey] as number | string);
                      const pct = Math.min(
                        100,
                        (qty / maxByCol[col.key]) * 100,
                      );
                      return (
                        <td key={col.key} className="px-1.5 py-2 text-right">
                          <div className="ml-auto flex w-[4rem] flex-col items-end gap-0.5">
                            <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                              {formatQty(qty)}
                            </span>
                            <span className="font-mono text-[9px] tabular-nums text-muted-foreground/48">
                              {formatMoneyCompact(rev)}
                            </span>
                            <span
                              className="mt-0.5 h-0.5 w-full overflow-hidden rounded-full bg-muted/40"
                              aria-hidden
                            >
                              <span
                                className="block h-full rounded-full bg-primary/45"
                                style={{ width: `${pct}%` }}
                              />
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRow(row);
                        }}
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground/40 transition-all hover:bg-muted/60 hover:text-foreground group-hover:text-muted-foreground"
                        title="Edit stock, prices, photo"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingRow ? (
        <EditDrawer
          open
          onClose={() => setEditingRow(null)}
          row={editingRow}
          branchId={branchId}
          onSaved={(patch) => {
            if (Object.keys(patch).length > 0) {
              onRowPatched?.(editingRow.itemId, patch);
              setEditingRow((prev) => (prev ? { ...prev, ...patch } : null));
            }
            setEditingRow(null);
          }}
        />
      ) : null}
    </div>
  );
}
