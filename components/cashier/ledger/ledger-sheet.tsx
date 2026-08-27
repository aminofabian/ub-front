"use client";

import type { ReactNode } from "react";
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
  entryCode: string;
  selectedKey: string | null;
  activeField: LedgerCellField;
  allowPriceEdit: boolean;
  onSelect: (key: string | null, field: LedgerCellField) => void;
  onEntryCodeChange: (value: string) => void;
  onEntryCommit: () => void;
  onLineChange: (
    key: string,
    field: "quantity" | "unitPrice" | "disc",
    value: string,
  ) => void;
};

const COLS = [
  { id: "A", label: "Item", width: "min-w-0 flex-1" },
  { id: "B", label: "Qty", width: "w-[4.5rem] shrink-0" },
  { id: "C", label: "Price", width: "w-[6rem] shrink-0" },
  { id: "D", label: "Disc %", width: "w-[4.75rem] shrink-0" },
  { id: "E", label: "Total", width: "w-[7rem] shrink-0" },
  { id: "F", label: "SKU", width: "w-[8.5rem] shrink-0" },
] as const;

function CellFrame({
  active,
  children,
  className,
}: {
  active: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-8 items-start border-r border-zinc-200 px-1.5 py-1.5 last:border-r-0",
        active && "ring-2 ring-inset ring-[var(--pos-primary)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LedgerSheet({
  lines,
  entryCode,
  selectedKey,
  activeField,
  allowPriceEdit,
  onSelect,
  onEntryCodeChange,
  onEntryCommit,
  onLineChange,
}: LedgerSheetProps) {
  const qtySum = lines.reduce((n, l) => n + (Number(l.quantity) || 0), 0);
  const totalSum = lines.reduce((n, l) => n + l.total, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-zinc-300 bg-white">
      <div className="flex border-b border-zinc-300 bg-zinc-100 text-[11px] font-semibold text-zinc-600">
        {COLS.map((col) => (
          <div
            key={col.id}
            className={cn(
              "flex h-8 items-center gap-1.5 border-r border-zinc-200 px-2 last:border-r-0",
              col.width,
            )}
          >
            <span className="text-[10px] font-medium text-zinc-400">{col.id}</span>
            <span>{col.label}</span>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {lines.map((line) => {
          const selected = selectedKey === line.key;
          return (
            <div
              key={line.key}
              className={cn(
                "flex border-b border-zinc-100 text-[13px]",
                selected
                  ? "bg-[color-mix(in_srgb,var(--pos-primary)_7%,white)]"
                  : "bg-white",
              )}
            >
              <CellFrame
                active={selected && activeField === "code"}
                className="min-w-0 flex-1"
              >
                <button
                  type="button"
                  className="w-full whitespace-normal break-words text-left font-medium leading-snug text-zinc-900"
                  onClick={() => onSelect(line.key, "code")}
                >
                  {line.item}
                </button>
              </CellFrame>
              <CellFrame
                active={selected && activeField === "qty"}
                className="w-[4.5rem] shrink-0"
              >
                <input
                  value={line.quantity}
                  onFocus={() => onSelect(line.key, "qty")}
                  onChange={(e) =>
                    onLineChange(line.key, "quantity", e.target.value)
                  }
                  className="w-full bg-transparent text-right leading-snug tabular-nums outline-none"
                  inputMode="decimal"
                />
              </CellFrame>
              <CellFrame
                active={selected && activeField === "price"}
                className="w-[6rem] shrink-0"
              >
                <input
                  value={line.unitPrice}
                  readOnly={!allowPriceEdit}
                  onFocus={() => onSelect(line.key, "price")}
                  onChange={(e) =>
                    allowPriceEdit &&
                    onLineChange(line.key, "unitPrice", e.target.value)
                  }
                  className={cn(
                    "w-full bg-transparent text-right leading-snug tabular-nums outline-none",
                    !allowPriceEdit && "text-zinc-500",
                  )}
                  inputMode="decimal"
                />
              </CellFrame>
              <CellFrame
                active={selected && activeField === "disc"}
                className="w-[4.75rem] shrink-0"
              >
                <input
                  value={line.discPct}
                  readOnly={!allowPriceEdit}
                  onFocus={() => onSelect(line.key, "disc")}
                  onChange={(e) =>
                    allowPriceEdit &&
                    onLineChange(line.key, "disc", e.target.value)
                  }
                  className={cn(
                    "w-full bg-transparent text-right leading-snug tabular-nums outline-none",
                    !allowPriceEdit && "text-zinc-500",
                  )}
                  inputMode="decimal"
                />
              </CellFrame>
              <CellFrame
                active={false}
                className="w-[7rem] shrink-0 justify-end font-semibold leading-snug tabular-nums"
              >
                {line.total.toFixed(2)}
              </CellFrame>
              <CellFrame
                active={false}
                className="w-[8.5rem] shrink-0 font-mono text-[12px] leading-snug text-zinc-500"
              >
                <span className="w-full whitespace-normal break-all">
                  {line.code}
                </span>
              </CellFrame>
            </div>
          );
        })}

        <div className="flex border-b border-zinc-200 bg-white text-[13px]">
          <CellFrame
            active={selectedKey == null && activeField === "code"}
            className="min-w-0 flex-1"
          >
            <input
              value={entryCode}
              placeholder="scan or type"
              onFocus={() => onSelect(null, "code")}
              onChange={(e) => onEntryCodeChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onEntryCommit();
                }
              }}
              className="w-full bg-transparent text-zinc-800 outline-none placeholder:text-zinc-400"
            />
          </CellFrame>
          <CellFrame active={false} className="w-[4.5rem] shrink-0" />
          <CellFrame active={false} className="w-[6rem] shrink-0" />
          <CellFrame active={false} className="w-[4.75rem] shrink-0" />
          <CellFrame active={false} className="w-[7rem] shrink-0 text-zinc-400">
            {entryCode ? "Enter to add" : ""}
          </CellFrame>
          <CellFrame active={false} className="w-[8.5rem] shrink-0" />
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] text-zinc-600">
        <span>
          Items{" "}
          <span className="font-semibold tabular-nums text-zinc-900">
            {lines.length}
          </span>
        </span>
        <span>
          SUM(Qty){" "}
          <span className="font-semibold tabular-nums text-zinc-900">
            {Number.isInteger(qtySum) ? qtySum : qtySum.toFixed(3)}
          </span>
        </span>
        <span>
          SUM(Total){" "}
          <span className="font-semibold tabular-nums text-zinc-900">
            {totalSum.toFixed(2)}
          </span>
        </span>
      </div>
    </div>
  );
}
