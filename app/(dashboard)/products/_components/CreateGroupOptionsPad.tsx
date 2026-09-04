"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ImagePlus, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import styles from "./product-create-modal.module.css";

export type GroupOptionRow = {
  key: string;
  label: string;
  barcode: string;
  buyingPrice: string;
  unitPrice: string;
  stock: string;
  imageFile: File | null;
  imagePreview: string | null;
};

export function newGroupOptionRow(
  seed?: Partial<GroupOptionRow>,
): GroupOptionRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: "",
    barcode: "",
    buyingPrice: "",
    unitPrice: "",
    stock: "1",
    imageFile: null,
    imagePreview: null,
    ...seed,
  };
}

function parseMoney(raw: string, allowZero = false): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  if (allowZero) return n >= 0 ? n : null;
  return n > 0 ? n : null;
}

function parseQty(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export type ReadyGroupOption = {
  key: string;
  label: string;
  barcode: string;
  unitPrice: number;
  buyingPrice: number | null;
  stock: number;
  imageFile: File | null;
};

export function readyGroupOptions(rows: GroupOptionRow[]): ReadyGroupOption[] {
  return rows
    .map((row) => {
      const label = row.label.trim();
      const sell = parseMoney(row.unitPrice);
      const buy =
        row.buyingPrice.trim() === ""
          ? null
          : parseMoney(row.buyingPrice, true);
      const stock = parseQty(row.stock);
      if (!label || sell == null || stock == null) return null;
      if (row.buyingPrice.trim() && buy == null) return null;
      return {
        key: row.key,
        label,
        barcode: row.barcode.trim(),
        unitPrice: sell,
        buyingPrice: buy,
        stock,
        imageFile: row.imageFile,
      };
    })
    .filter((r): r is ReadyGroupOption => r != null);
}

const cellClass = cn(
  "h-9 w-full rounded-none border border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] bg-white px-2 text-[13px] text-[var(--catalog-ink,#15231f)] shadow-none",
  "focus:outline-none focus-visible:border-[var(--catalog-primary,#0f766e)] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_22%,transparent)]",
);

export function CreateGroupOptionsPad({
  rows,
  onChange,
  currency,
  disabled,
}: {
  rows: GroupOptionRow[];
  onChange: (next: GroupOptionRow[]) => void;
  currency: string;
  disabled?: boolean;
}) {
  const modeId = useId();
  const optionFileRef = useRef<HTMLInputElement>(null);
  const pendingPhotoKey = useRef<string | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const skipEnter = useRef<Set<string>>(new Set());
  const prevReady = useRef(0);
  const [inviteOn, setInviteOn] = useState(false);

  const ready = readyGroupOptions(rows);
  const startedCount = rows.filter(
    (r) => r.label.trim() || r.unitPrice.trim(),
  ).length;
  const incomplete = startedCount - ready.length;
  const status =
    startedCount === 0
      ? "Each option needs a name and sell price"
      : incomplete > 0
        ? `${incomplete} still need a name and sell price`
        : ready.length === 1
          ? "1 ready to create"
          : `${ready.length} ready to create`;

  useEffect(() => {
    if (ready.length > prevReady.current) setInviteOn(true);
    prevReady.current = ready.length;
  }, [ready.length]);

  useEffect(() => {
    const key = pendingFocus.current;
    if (!key) return;
    pendingFocus.current = null;
    document.getElementById(`${modeId}-opt-${key}`)?.focus();
  }, [rows, modeId]);

  const patch = (key: string, next: Partial<GroupOptionRow>) => {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...next } : r)));
  };

  const addRow = () => {
    if (disabled || rows.length >= 24) return;
    const row = newGroupOptionRow();
    pendingFocus.current = row.key;
    skipEnter.current.add(row.key);
    onChange([...rows, row]);
    window.setTimeout(() => skipEnter.current.delete(row.key), 240);
  };

  const removeRow = (key: string) => {
    if (disabled || rows.length <= 1) return;
    const row = rows.find((r) => r.key === key);
    if (row?.imagePreview) URL.revokeObjectURL(row.imagePreview);
    onChange(rows.filter((r) => r.key !== key));
  };

  const applyPhoto = (key: string, file: File | null) => {
    const prev = rows.find((r) => r.key === key);
    if (prev?.imagePreview) URL.revokeObjectURL(prev.imagePreview);
    if (!file) {
      patch(key, { imageFile: null, imagePreview: null });
      return;
    }
    patch(key, {
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    });
  };

  const onRowEnter = (index: number, row: GroupOptionRow) => {
    const isLast = index === rows.length - 1;
    const started = Boolean(row.label.trim() || row.unitPrice.trim());
    if (isLast && started) {
      addRow();
      return;
    }
    if (!isLast) {
      const next = rows[index + 1];
      document.getElementById(`${modeId}-opt-${next.key}`)?.focus();
    }
  };

  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <p className="text-[13px] font-medium text-[var(--catalog-ink,#15231f)]">
          Options{currency ? ` · ${currency}` : ""}
        </p>
        <span
          key={ready.length}
          className={cn(styles.tick, ready.length > 0 && styles.tickHot)}
        >
          {status}
        </span>
      </div>

      <div className={styles.pad}>
        <div className={styles.head}>
          <span className={styles.headNum}>#</span>
          <span className={styles.headPhoto}>Photo</span>
          <span className={styles.headOpt}>Option</span>
          <span className={styles.headSell}>Sell</span>
          <span className={styles.headStock}>Stock</span>
          <span className={styles.headCost}>Cost</span>
          <span className={styles.headCode}>Barcode</span>
          <span className={styles.headRemove} />
        </div>
        <input
          ref={optionFileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const key = pendingPhotoKey.current;
            const file = e.target.files?.[0] ?? null;
            pendingPhotoKey.current = null;
            e.target.value = "";
            if (key) applyPhoto(key, file);
          }}
        />
        {rows.map((row, index) => {
          const sellOk = parseMoney(row.unitPrice) != null;
          const labelOk = row.label.trim().length > 0;
          const started = labelOk || row.unitPrice.trim().length > 0;
          const rowReady = sellOk && labelOk;
          const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            onRowEnter(index, row);
          };
          return (
            <div
              key={row.key}
              id={`${modeId}-row-${row.key}`}
              className={styles.row}
              data-ready={rowReady ? "" : undefined}
              data-enter={skipEnter.current.has(row.key) ? undefined : ""}
            >
              <div className={styles.wash} aria-hidden />
              <div className={styles.num}>
                <span className={styles.index}>{index + 1}</span>
                <Check className={cn(styles.check, "size-3.5")} />
              </div>
              <div className={cn(styles.cell, styles.cellPhoto)}>
                <button
                  type="button"
                  className={styles.optPhoto}
                  data-filled={row.imagePreview ? "" : undefined}
                  disabled={disabled}
                  aria-label={
                    row.imagePreview
                      ? `Change photo for option ${index + 1}`
                      : `Add photo for option ${index + 1} (optional)`
                  }
                  onClick={() => {
                    pendingPhotoKey.current = row.key;
                    optionFileRef.current?.click();
                  }}
                  onContextMenu={(e) => {
                    if (!row.imagePreview) return;
                    e.preventDefault();
                    applyPhoto(row.key, null);
                  }}
                >
                  {row.imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local draft preview
                    <img
                      src={row.imagePreview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="size-3.5" aria-hidden />
                  )}
                </button>
              </div>
              <div className={styles.cell}>
                <input
                  id={`${modeId}-opt-${row.key}`}
                  className={cellClass}
                  value={row.label}
                  disabled={disabled}
                  onChange={(e) => patch(row.key, { label: e.target.value })}
                  onKeyDown={handleEnter}
                  placeholder={index === 0 ? "500ml, Red…" : undefined}
                  aria-label={`Option ${index + 1} name`}
                />
              </div>
              <div className={cn(styles.cell, styles.cellSell)}>
                <input
                  className={cn(
                    cellClass,
                    "text-right font-semibold tabular-nums",
                    started && !sellOk && "border-destructive/40",
                    rowReady &&
                      "border-[color-mix(in_srgb,var(--catalog-primary,#0f766e)_40%,transparent)]",
                  )}
                  inputMode="decimal"
                  value={row.unitPrice}
                  disabled={disabled}
                  onChange={(e) =>
                    patch(row.key, { unitPrice: e.target.value })
                  }
                  onKeyDown={handleEnter}
                  placeholder="0.00"
                  aria-label={`Option ${index + 1} sell price`}
                />
              </div>
              <div className={cn(styles.cell, styles.cellStock)}>
                <input
                  className={cn(cellClass, "text-right tabular-nums")}
                  inputMode="decimal"
                  value={row.stock}
                  disabled={disabled}
                  onChange={(e) => patch(row.key, { stock: e.target.value })}
                  onKeyDown={handleEnter}
                  placeholder="1"
                  aria-label={`Option ${index + 1} stock`}
                />
              </div>
              <div className={cn(styles.cell, styles.cellCost)}>
                <input
                  className={cn(cellClass, "text-right tabular-nums")}
                  inputMode="decimal"
                  value={row.buyingPrice}
                  disabled={disabled}
                  onChange={(e) =>
                    patch(row.key, { buyingPrice: e.target.value })
                  }
                  onKeyDown={handleEnter}
                  placeholder="0.00"
                  aria-label={`Option ${index + 1} cost`}
                />
              </div>
              <div className={cn(styles.cell, styles.cellCode)}>
                <input
                  className={cellClass}
                  value={row.barcode}
                  disabled={disabled}
                  onChange={(e) => patch(row.key, { barcode: e.target.value })}
                  onKeyDown={handleEnter}
                  placeholder="Scan"
                  aria-label={`Option ${index + 1} barcode`}
                />
              </div>
              <div className={cn(styles.cell, styles.cellRemove)}>
                {rows.length > 1 ? (
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label={`Remove option ${index + 1}`}
                    disabled={disabled}
                    onClick={() => removeRow(row.key)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        {rows.length < 24 ? (
          <button
            type="button"
            className={cn(styles.ghost, inviteOn && styles.ghostInvite)}
            disabled={disabled}
            onClick={addRow}
            onAnimationEnd={() => setInviteOn(false)}
          >
            <span className={styles.ghostIcon}>
              <Plus className="size-3.5" />
            </span>
            Next size or flavour
          </button>
        ) : null}
      </div>
    </section>
  );
}
