"use client";

import { useCallback, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  Check,
  Gauge,
  Pencil,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  patchItem,
  postStockIncrease,
  getCloudinarySignature,
  uploadToCloudinary,
  type ItemVelocityRow,
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
    minimumFractionDigits: 0,
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
  { key: "last3Qty", label: "3 days", hint: "Including today" },
  { key: "last7Qty", label: "7 days", hint: "Including today" },
  { key: "last30Qty", label: "30 days", hint: "Including today" },
];

/* ------------------------------------------------------------------ */
/*  Inline edit row for stock / buying price / selling price / photo  */
/* ------------------------------------------------------------------ */
function EditRow({
  row,
  branchId,
  onSaved,
  onCancel,
}: {
  row: ItemVelocityRow;
  branchId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [stock, setStock] = useState(formatQty(row.currentStock));
  const [buyingPrice, setBuyingPrice] = useState(
    toNum(row.buyingPrice) > 0 ? formatQty(row.buyingPrice) : "",
  );
  const [sellingPrice, setSellingPrice] = useState(
    toNum(row.sellingPrice) > 0 ? formatQty(row.sellingPrice) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(async () => {
    setError(null);
    setSaving(true);
    try {
      const promises: Promise<unknown>[] = [];

      // Stock change
      const currentStock = toNum(row.currentStock);
      const newStock = parseFloat(stock);
      if (!isNaN(newStock) && newStock !== currentStock) {
        const diff = newStock - currentStock;
        if (diff !== 0) {
          // Use postStockIncrease for positive adjustment
          const qty = Math.abs(diff);
          const unitCost = toNum(row.buyingPrice) || 0;
          promises.push(
            postStockIncrease({
              branchId: branchId.trim(),
              itemId: row.itemId,
              quantity: qty,
              unitCost,
              notes: `Quick stock ${diff > 0 ? "increase" : "decrease"} from activity board (${diff > 0 ? "+" : ""}${formatQty(diff)})`,
            }),
          );
        }
      }

      // Buying price
      const bp = buyingPrice.trim() ? parseFloat(buyingPrice) : undefined;
      if (bp !== undefined && !isNaN(bp) && bp !== toNum(row.buyingPrice)) {
        promises.push(patchItem(row.itemId, { buyingPrice: bp }));
      }

      // Selling price
      const sp = sellingPrice.trim() ? parseFloat(sellingPrice) : undefined;
      if (sp !== undefined && !isNaN(sp) && sp !== toNum(row.sellingPrice)) {
        promises.push(patchItem(row.itemId, { bundlePrice: sp }));
      }

      if (promises.length === 0) {
        onSaved();
        return;
      }

      await Promise.all(promises);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }, [
    row,
    stock,
    buyingPrice,
    sellingPrice,
    branchId,
    onSaved,
  ]);

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      setError(null);
      try {
        const sig = await getCloudinarySignature("items");
        const result = await uploadToCloudinary(file, sig);
        await patchItem(row.itemId, { imageKey: result.public_id });
        onSaved();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Photo upload failed.",
        );
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [row.itemId, onSaved],
  );

  const Field = ({
    label,
    value,
    onChange,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <label className="flex flex-col gap-0.5">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7.5 w-full rounded-md border border-border/50 bg-muted/30 px-2 text-[11px] outline-none transition-colors hover:border-border/80 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
      />
    </label>
  );

  return (
    <td
      colSpan={COLUMNS.length + 3}
      className="border-t border-border/20 bg-muted/[0.06] px-3 py-2.5"
    >
      {error ? (
        <p className="mb-2 text-[10px] text-destructive">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Stock" value={stock} onChange={setStock} />

        <Field
          label="Buying price"
          value={buyingPrice}
          onChange={setBuyingPrice}
          placeholder={toNum(row.buyingPrice) > 0 ? formatQty(row.buyingPrice) : "0"}
        />

        <Field
          label="Selling price"
          value={sellingPrice}
          onChange={setSellingPrice}
          placeholder={toNum(row.sellingPrice) > 0 ? formatQty(row.sellingPrice) : "0"}
        />

        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Photo
          </span>
          <div className="flex items-center gap-2">
            {row.imageKey ? (
              <img
                src={`https://res.cloudinary.com/dzqnyh7km/image/upload/w_32,h_32,c_fill/${row.imageKey}`}
                alt=""
                className="size-7 shrink-0 rounded border border-border/30 object-cover"
              />
            ) : null}
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex h-7.5 items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground disabled:opacity-50"
            >
              <Camera className="size-3" />
              {uploading ? "Uploading…" : row.imageKey ? "Change" : "Add"}
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

        <div className="ml-auto flex items-center gap-1.5 self-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex h-7.5 items-center gap-1 rounded-md bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Check className="size-3" />
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex h-7.5 items-center gap-1 rounded-md border border-border/50 bg-muted/30 px-2.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>
    </td>
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
  const [editingId, setEditingId] = useState<string | null>(null);

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
    const av = toNum(a[sortKey]);
    const bv = toNum(b[sortKey]);
    return sortDir === "asc" ? av - bv : bv - av;
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
          <table className="w-full min-w-[800px] text-xs">
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
                    className="pb-2.5 pt-1 text-right"
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
                <th className="pb-2.5 pt-1 pr-1 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
                  Stock
                </th>
                <th className="w-8 pb-2.5 pt-1 pr-1" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, idx) => {
                const isEven = idx % 2 === 0;
                const isEditing = editingId === row.itemId;
                return (
                  <>
                    <tr
                      key={row.itemId}
                      className={cn(
                        "cursor-pointer border-l-2 border-transparent transition-all duration-150",
                        "hover:border-l-primary/30 hover:bg-primary/[0.03]",
                        isEven ? "bg-transparent" : "bg-muted/[0.12]",
                        isEditing && "border-l-primary/40 bg-primary/[0.04]",
                      )}
                      onClick={() => onSelectItem(row.itemId)}
                    >
                      <td className="sticky left-0 z-[1] bg-inherit py-2.5 pl-1">
                        <p className="max-w-[180px] truncate text-[11px] font-medium text-foreground/90">
                          {row.itemName}
                        </p>
                        {row.sku ? (
                          <p className="font-mono text-[10px] text-muted-foreground/55">
                            {row.sku}
                          </p>
                        ) : null}
                      </td>
                      {COLUMNS.map((col) => {
                        const qty = toNum(
                          row[col.key as keyof ItemVelocityRow] as
                            | number
                            | string,
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
                          <td key={col.key} className="px-2 py-2.5 text-right">
                            <div className="ml-auto flex w-[4.5rem] flex-col items-end gap-0.5 sm:w-[5.5rem]">
                              <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground">
                                {formatQty(qty)}
                              </span>
                              <span className="font-mono text-[9px] tabular-nums text-muted-foreground/55">
                                {formatMoney(rev)}
                              </span>
                              <span
                                className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-muted/60"
                                aria-hidden
                              >
                                <span
                                  className="block h-full rounded-full bg-primary/55"
                                  style={{ width: `${pct}%` }}
                                />
                              </span>
                            </div>
                          </td>
                        );
                      })}
                      <td className="py-2.5 pr-1 text-right font-mono text-[11px] tabular-nums text-foreground/75">
                        {formatQty(row.currentStock)}
                      </td>
                      <td className="py-2.5 pr-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(
                              isEditing ? null : row.itemId,
                            );
                          }}
                          className={cn(
                            "flex size-6 items-center justify-center rounded-md transition-colors",
                            isEditing
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground/40 hover:bg-muted/60 hover:text-foreground",
                          )}
                          title="Edit stock, prices, photo"
                        >
                          <Pencil className="size-3" />
                        </button>
                      </td>
                    </tr>
                    {isEditing ? (
                      <tr key={`${row.itemId}-edit`}>
                        <EditRow
                          row={row}
                          branchId={branchId}
                          onSaved={() => {
                            setEditingId(null);
                            onRowsChanged?.();
                          }}
                          onCancel={() => setEditingId(null)}
                        />
                      </tr>
                    ) : null}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
