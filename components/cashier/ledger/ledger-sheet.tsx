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
        "flex min-h-9 items-center border-r border-zinc-200 px-1.5 py-1 last:border-r-0",
        active && "bg-white ring-2 ring-inset ring-[var(--pos-primary)]",
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
        "flex h-8 items-center border-r border-zinc-200 px-2 last:border-r-0",
        width,
        align === "right" && "justify-end",
        active
          ? "bg-[color-mix(in_srgb,var(--pos-primary)_16%,white)] text-zinc-900"
          : "text-zinc-600",
      )}
    >
      {label}
    </div>
  );
}

export function LedgerSheet({
  lines,
  selectedKey,
  activeField,
  allowPriceEdit,
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

  const onQtyKey = (key: string, value: string, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const next = bumpQty(value, e.key === "ArrowUp" ? 1 : -1);
    if (next != null) onLineChange(key, "quantity", next);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-zinc-300 bg-white">
      <div className="flex border-b border-zinc-300 bg-zinc-100 text-[11px] font-semibold">
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

      <div className="min-h-0 flex-1 overflow-auto">
        {lines.length === 0 ? (
          <button
            type="button"
            onClick={onFocusEntry}
            className="flex w-full flex-col items-start gap-1 px-4 py-8 text-left"
          >
            <span className="text-sm font-medium text-zinc-800">
              Waiting for the next item
            </span>
            <span className="max-w-[42ch] text-[12px] leading-relaxed text-zinc-500">
              Scan a barcode, type a name in the bar above, or tap a best seller.
            </span>
          </button>
        ) : (
          lines.map((line, index) => {
            const selected = selectedKey === line.key;
            return (
              <div
                key={line.key}
                className={cn(
                  "group flex border-b border-zinc-100 text-[13px]",
                  selected
                    ? "bg-[color-mix(in_srgb,var(--pos-primary)_8%,white)]"
                    : "bg-white hover:bg-zinc-50",
                )}
              >
                <CellFrame
                  active={false}
                  className="w-8 shrink-0 justify-center text-[11px] tabular-nums text-zinc-400"
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
                    <span className="block whitespace-normal break-words font-medium leading-snug text-zinc-900">
                      {line.item}
                    </span>
                    {line.code ? (
                      <span className="mt-0.5 block font-mono text-[10px] leading-none text-zinc-400">
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
                      className="flex size-6 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
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
                      className="flex size-6 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
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
                      "w-full bg-transparent text-right leading-snug tabular-nums outline-none",
                      !allowPriceEdit && "text-zinc-600",
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
                      className="w-full bg-transparent text-right leading-snug tabular-nums outline-none"
                      inputMode="decimal"
                    />
                  </CellFrame>
                ) : null}
                <CellFrame
                  active={false}
                  className="w-[7rem] shrink-0 justify-end font-semibold leading-snug tabular-nums"
                >
                  {line.total.toFixed(2)}
                </CellFrame>
                <CellFrame active={false} className="w-9 shrink-0 justify-center">
                  <button
                    type="button"
                    aria-label={`Remove ${line.item}`}
                    onClick={() => onVoidLine(line.key)}
                    className={cn(
                      "flex size-7 items-center justify-center rounded text-zinc-400",
                      "hover:bg-red-50 hover:text-red-700",
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
            className="flex w-full border-b border-dashed border-zinc-200 px-3 py-2 text-left text-[12px] text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
          >
            Next line · scan or type above
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-5 border-t border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] text-zinc-600">
        <span>
          {lines.length} {lines.length === 1 ? "line" : "lines"}
        </span>
        <span>
          Qty{" "}
          <span className="font-semibold tabular-nums text-zinc-900">
            {Number.isInteger(qtySum) ? qtySum : qtySum.toFixed(3)}
          </span>
        </span>
        <span className="ml-auto">
          Sale{" "}
          <span className="font-semibold tabular-nums text-zinc-900">
            {totalSum.toFixed(2)}
          </span>
        </span>
      </div>
    </div>
  );
}
