"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type LedgerSheetLine = {
  key: string;
  code: string;
  item: string;
  quantity: string;
  unitPrice: string;
  discPct: string;
  total: number;
};

export type LedgerCellField = "code" | "qty" | "price" | "disc";

type LedgerSheetProps = {
  lines: LedgerSheetLine[];
  selectedKey: string | null;
  activeField: LedgerCellField;
  allowPriceEdit: boolean;
  /**
   * Narrow screens stack each line as a card: name on top, controls under it.
   * The seven-column grid needs ≈40rem of width before it stops truncating.
   */
  compact?: boolean;
  onSelect: (key: string | null, field: LedgerCellField) => void;
  onFocusEntry: () => void;
  onVoidLine: (key: string) => void;
  onLineChange: (
    key: string,
    field: "quantity" | "unitPrice" | "disc",
    value: string,
  ) => void;
};

function bumpQty(current: string, delta: number): string | null {
  const n = Number(current);
  if (!Number.isFinite(n)) return delta > 0 ? "1" : null;
  const next = Math.round((n + delta) * 1000) / 1000;
  if (next <= 0) return null;
  return Number.isInteger(next) ? String(next) : String(next);
}

const FIELD_CLASS = cn(
  "min-w-0 bg-transparent text-right tabular-nums outline-none",
  "placeholder:text-muted-foreground/60",
);

function CellFrame({
  active,
  children,
  className,
  onClick,
}: {
  active: boolean;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex min-h-9 items-center border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-1.5 py-1 last:border-r-0",
        active && "bg-card ring-2 ring-inset ring-[var(--pos-primary)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ColHead({
  label,
  width,
  active,
  align = "left",
}: {
  label: string;
  width: string;
  active: boolean;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex h-7 items-center border-r border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-2 text-[9px] font-semibold uppercase tracking-[0.14em] last:border-r-0",
        width,
        align === "right" && "justify-end",
        active
          ? "bg-[color-mix(in_srgb,var(--pos-primary)_16%,var(--card))] text-[var(--pos-ink,#1c1915)]"
          : "text-muted-foreground",
      )}
    >
      {label}
    </div>
  );
}

/** Shared summary strip — the ledger's running figures. */
function SheetSummary({
  lineCount,
  qtySum,
  totalSum,
}: {
  lineCount: number;
  qtySum: number;
  totalSum: number;
}) {
  return (
    <div className="flex items-center gap-5 border-t border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      <span>
        {lineCount} {lineCount === 1 ? "line" : "lines"}
      </span>
      <span className="inline-flex items-baseline gap-1">
        Qty
        <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
          {Number.isInteger(qtySum) ? qtySum : qtySum.toFixed(3)}
        </span>
      </span>
      <span className="ml-auto inline-flex items-baseline gap-1">
        Sale
        <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
          {totalSum.toFixed(2)}
        </span>
      </span>
    </div>
  );
}

function EmptySheet({ onFocusEntry }: { onFocusEntry: () => void }) {
  return (
    <button
      type="button"
      onClick={onFocusEntry}
      className="flex w-full flex-col items-start gap-1 px-4 py-8 text-left"
    >
      <span className="text-sm font-medium text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)]">
        Waiting for the next item
      </span>
      <span className="max-w-[42ch] text-[12px] leading-relaxed text-muted-foreground">
        Scan a barcode, type a name in the bar above, or tap a best seller.
      </span>
    </button>
  );
}

export function LedgerSheet({
  lines,
  selectedKey,
  activeField,
  allowPriceEdit,
  compact = false,
  onSelect,
  onFocusEntry,
  onVoidLine,
  onLineChange,
}: LedgerSheetProps) {
  const qtySum = lines.reduce((n, l) => n + (Number(l.quantity) || 0), 0);
  const totalSum = lines.reduce((n, l) => n + l.total, 0);
  const editing = selectedKey != null;
  const qtyCol = editing && activeField === "qty";
  const priceCol = editing && activeField === "price";
  const discCol = editing && activeField === "disc";
  const itemCol = !editing && activeField === "code";

  const onQtyKey = (
    key: string,
    value: string,
    e: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const next = bumpQty(value, e.key === "ArrowUp" ? 1 : -1);
    if (next != null) onLineChange(key, "quantity", next);
  };

  if (compact) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-card dark:border-border/40">
        <div className="pos-scroll min-h-0 flex-1 overflow-y-auto">
          {lines.length === 0 ? (
            <EmptySheet onFocusEntry={onFocusEntry} />
          ) : (
            lines.map((line, index) => {
              const selected = selectedKey === line.key;
              return (
                <div
                  key={line.key}
                  className={cn(
                    "border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-2 py-2 last:border-b-0",
                    selected
                      ? "bg-[color-mix(in_srgb,var(--pos-primary)_8%,var(--card))]"
                      : "bg-card",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="w-4 shrink-0 pt-0.5 text-right font-mono text-[10px] tabular-nums text-muted-foreground/70">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onSelect(line.key, "code")}
                    >
                      <span className="line-clamp-2 block text-[13px] font-semibold leading-snug text-[var(--pos-ink,#1c1915)]">
                        {line.item}
                      </span>
                      {line.code ? (
                        <span className="mt-0.5 block truncate font-mono text-[10px] leading-none text-muted-foreground/70">
                          {line.code}
                        </span>
                      ) : null}
                    </button>
                    <span className="shrink-0 pt-0.5 font-mono text-[13px] font-semibold tabular-nums text-[var(--pos-ink,#1c1915)]">
                      {line.total.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${line.item}`}
                      onClick={() => onVoidLine(line.key)}
                      className="-mr-1 flex size-8 shrink-0 items-center justify-center text-muted-foreground/70 hover:text-red-700"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>

                  <div className="mt-1.5 flex items-center gap-1.5 pl-6">
                    <div
                      className={cn(
                        "flex h-10 shrink-0 items-stretch border",
                        selected && activeField === "qty"
                          ? "border-[var(--pos-primary)]"
                          : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
                      )}
                    >
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        className="flex w-9 items-center justify-center text-muted-foreground hover:text-[var(--pos-ink,#1c1915)]"
                        onClick={() => {
                          const next = bumpQty(line.quantity, -1);
                          if (next != null)
                            onLineChange(line.key, "quantity", next);
                        }}
                      >
                        <Minus className="size-3.5" aria-hidden />
                      </button>
                      <input
                        value={line.quantity}
                        aria-label={`Quantity for ${line.item}`}
                        inputMode="decimal"
                        onFocus={() => onSelect(line.key, "qty")}
                        onChange={(e) =>
                          onLineChange(line.key, "quantity", e.target.value)
                        }
                        onKeyDown={(e) => onQtyKey(line.key, line.quantity, e)}
                        className="w-10 shrink-0 border-x border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-transparent text-center text-[15px] font-semibold tabular-nums outline-none"
                      />
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        className="flex w-9 items-center justify-center text-muted-foreground hover:text-[var(--pos-ink,#1c1915)]"
                        onClick={() => {
                          const next = bumpQty(line.quantity, 1);
                          if (next != null)
                            onLineChange(line.key, "quantity", next);
                        }}
                      >
                        <Plus className="size-3.5" aria-hidden />
                      </button>
                    </div>

                    <label
                      className={cn(
                        "flex h-10 min-w-0 flex-1 items-center gap-1 border px-2",
                        selected && activeField === "price"
                          ? "border-[var(--pos-primary)]"
                          : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
                      )}
                    >
                      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Price
                      </span>
                      <input
                        value={line.unitPrice}
                        aria-label={`Price for ${line.item}`}
                        readOnly={!allowPriceEdit}
                        inputMode="decimal"
                        onFocus={() => onSelect(line.key, "price")}
                        onChange={(e) =>
                          allowPriceEdit &&
                          onLineChange(line.key, "unitPrice", e.target.value)
                        }
                        className={cn(
                          FIELD_CLASS,
                          "flex-1 font-mono text-[14px]",
                          !allowPriceEdit && "text-muted-foreground",
                        )}
                      />
                    </label>

                    {allowPriceEdit ? (
                      <label
                        className={cn(
                          "flex h-10 w-[4.75rem] shrink-0 items-center gap-1 border px-2",
                          selected && activeField === "disc"
                            ? "border-[var(--pos-primary)]"
                            : "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)]",
                        )}
                      >
                        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          %
                        </span>
                        <input
                          value={line.discPct}
                          aria-label={`Discount percent for ${line.item}`}
                          inputMode="decimal"
                          onFocus={() => onSelect(line.key, "disc")}
                          onChange={(e) =>
                            onLineChange(line.key, "disc", e.target.value)
                          }
                          className={cn(FIELD_CLASS, "w-full font-mono text-[14px]")}
                        />
                      </label>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}

          {lines.length > 0 ? (
            <button
              type="button"
              onClick={onFocusEntry}
              className="flex w-full border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-3 py-2.5 text-left text-[12px] text-muted-foreground/70 hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] hover:text-muted-foreground"
            >
              Next line · scan or type above
            </button>
          ) : null}
        </div>

        <SheetSummary
          lineCount={lines.length}
          qtySum={qtySum}
          totalSum={totalSum}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-card dark:border-border/40">
      <div className="flex border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_14%,transparent)] bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)] text-[11px] font-semibold dark:border-border/40">
        <ColHead label="#" width="w-8 shrink-0" active={false} />
        <ColHead label="Item" width="min-w-0 flex-1" active={itemCol} />
        <ColHead label="Qty" width="w-[5.75rem] shrink-0" active={qtyCol} align="right" />
        <ColHead label="Price" width="w-[6rem] shrink-0" active={priceCol} align="right" />
        {allowPriceEdit ? (
          <ColHead
            label="Disc %"
            width="w-[4.75rem] shrink-0"
            active={discCol}
            align="right"
          />
        ) : null}
        <ColHead label="Total" width="w-[7rem] shrink-0" active={false} align="right" />
        <ColHead label="" width="w-9 shrink-0" active={false} />
      </div>

      <div className="pos-scroll min-h-0 flex-1 overflow-auto">
        {lines.length === 0 ? (
          <EmptySheet onFocusEntry={onFocusEntry} />
        ) : (
          lines.map((line, index) => {
            const selected = selectedKey === line.key;
            return (
              <div
                key={line.key}
                className={cn(
                  "group flex border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] text-[13px]",
                  selected
                    ? "bg-[color-mix(in_srgb,var(--pos-primary)_8%,var(--card))]"
                    : "bg-card hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]",
                )}
              >
                <CellFrame
                  active={false}
                  className="w-8 shrink-0 justify-center font-mono text-[11px] tabular-nums text-muted-foreground/70"
                >
                  {index + 1}
                </CellFrame>
                <CellFrame
                  active={selected && activeField === "code"}
                  className="min-w-0 flex-1 items-start"
                >
                  <button
                    type="button"
                    className="w-full py-0.5 text-left"
                    onClick={() => onSelect(line.key, "qty")}
                  >
                    <span className="block whitespace-normal break-words font-medium leading-snug text-[var(--pos-ink,#1c1915)]">
                      {line.item}
                    </span>
                    {line.code ? (
                      <span className="mt-0.5 block font-mono text-[10px] leading-none text-muted-foreground/70">
                        {line.code}
                      </span>
                    ) : null}
                  </button>
                </CellFrame>
                <CellFrame
                  active={selected && activeField === "qty"}
                  className="w-[5.75rem] shrink-0 gap-0.5"
                >
                  {selected ? (
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      className="flex size-6 shrink-0 items-center justify-center text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] hover:text-[var(--pos-ink,#1c1915)]"
                      onClick={() => {
                        const next = bumpQty(line.quantity, -1);
                        if (next != null) onLineChange(line.key, "quantity", next);
                      }}
                    >
                      <Minus className="size-3" aria-hidden />
                    </button>
                  ) : null}
                  <input
                    value={line.quantity}
                    aria-label={`Quantity for ${line.item}`}
                    onFocus={() => onSelect(line.key, "qty")}
                    onChange={(e) =>
                      onLineChange(line.key, "quantity", e.target.value)
                    }
                    onKeyDown={(e) => onQtyKey(line.key, line.quantity, e)}
                    className="min-w-0 flex-1 bg-transparent text-center leading-snug tabular-nums outline-none"
                    inputMode="decimal"
                  />
                  {selected ? (
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      className="flex size-6 shrink-0 items-center justify-center text-muted-foreground hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)] hover:text-[var(--pos-ink,#1c1915)]"
                      onClick={() => {
                        const next = bumpQty(line.quantity, 1);
                        if (next != null) onLineChange(line.key, "quantity", next);
                      }}
                    >
                      <Plus className="size-3" aria-hidden />
                    </button>
                  ) : null}
                </CellFrame>
                <CellFrame
                  active={selected && activeField === "price"}
                  className="w-[6rem] shrink-0"
                >
                  <input
                    value={line.unitPrice}
                    aria-label={`Price for ${line.item}`}
                    readOnly={!allowPriceEdit}
                    onFocus={() => onSelect(line.key, "price")}
                    onChange={(e) =>
                      allowPriceEdit &&
                      onLineChange(line.key, "unitPrice", e.target.value)
                    }
                    className={cn(
                      "w-full bg-transparent text-right font-mono leading-snug tabular-nums outline-none",
                      !allowPriceEdit && "text-muted-foreground",
                    )}
                    inputMode="decimal"
                  />
                </CellFrame>
                {allowPriceEdit ? (
                  <CellFrame
                    active={selected && activeField === "disc"}
                    className="w-[4.75rem] shrink-0"
                  >
                    <input
                      value={line.discPct}
                      aria-label={`Discount percent for ${line.item}`}
                      onFocus={() => onSelect(line.key, "disc")}
                      onChange={(e) =>
                        onLineChange(line.key, "disc", e.target.value)
                      }
                      className="w-full bg-transparent text-right font-mono leading-snug tabular-nums outline-none"
                      inputMode="decimal"
                    />
                  </CellFrame>
                ) : null}
                <CellFrame
                  active={false}
                  className="w-[7rem] shrink-0 justify-end font-mono font-semibold leading-snug tabular-nums"
                >
                  {line.total.toFixed(2)}
                </CellFrame>
                <CellFrame active={false} className="w-9 shrink-0 justify-center">
                  <button
                    type="button"
                    aria-label={`Remove ${line.item}`}
                    onClick={() => onVoidLine(line.key)}
                    className={cn(
                      "flex size-7 items-center justify-center text-muted-foreground/70",
                      "hover:bg-red-500/10 hover:text-red-700",
                      "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                      selected && "opacity-100",
                    )}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </CellFrame>
              </div>
            );
          })
        )}

        {lines.length > 0 ? (
          <button
            type="button"
            onClick={onFocusEntry}
            className="flex w-full border-b border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] px-3 py-2 text-left text-[12px] text-muted-foreground/70 hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] hover:text-muted-foreground"
          >
            Next line · scan or type above
          </button>
        ) : null}
      </div>

      <SheetSummary
        lineCount={lines.length}
        qtySum={qtySum}
        totalSum={totalSum}
      />
    </div>
  );
}
