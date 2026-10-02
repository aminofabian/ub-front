"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";

import { fetchTillCashiers, type TillPrintCashier } from "@/lib/api";
import {
  readStoredCashierIds,
  writeStoredCashierIds,
} from "@/lib/till-slip";
import { cn } from "@/lib/utils";

type CashierPrintPickerProps = {
  mode: "single" | "multiple";
  branchId: string;
  storageKey: string;
  onChange: (ids: string[]) => void;
};

export function CashierPrintPicker({
  mode,
  branchId,
  storageKey,
  onChange,
}: CashierPrintPickerProps) {
  const [cashiers, setCashiers] = useState<TillPrintCashier[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const bid = branchId.trim();
    if (!bid) {
      setCashiers([]);
      setSelected([]);
      onChange([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchTillCashiers(bid)
      .then((rows) => {
        if (cancelled) return;
        setCashiers(rows);
        const stored = readStoredCashierIds(storageKey).filter((id) =>
          rows.some((row) => row.id === id),
        );
        const next =
          mode === "single"
            ? stored[0]
              ? [stored[0]]
              : rows.length === 1
                ? [rows[0].id]
                : []
            : stored.length > 0
              ? stored
              : rows.length === 1
                ? [rows[0].id]
                : [];
        setSelected(next);
        writeStoredCashierIds(storageKey, next);
        onChange(next);
      })
      .catch(() => {
        if (cancelled) return;
        setCashiers([]);
        setSelected([]);
        onChange([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // onChange is a setState from the parent and stays stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, mode, storageKey]);

  const commit = (next: string[]) => {
    setSelected(next);
    writeStoredCashierIds(storageKey, next);
    onChange(next);
  };

  return (
    <fieldset className="mt-3 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] px-2.5 py-2">
      <legend className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
        <Printer className="size-3" aria-hidden />
        {mode === "single" ? "Print order to" : "Print receipt to"}
      </legend>
      <p className="mb-1.5 text-[10px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
        {mode === "single"
          ? "One till only. The other cashiers do not print this order."
          : "Each checked till prints this receipt. Leave them clear to skip paper."}
      </p>
      {loading ? (
        <p className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
          Loading cashiers…
        </p>
      ) : cashiers.length === 0 ? (
        <p className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
          No cashiers on this branch, so nothing will print.
        </p>
      ) : (
        <div
          className="flex max-h-28 flex-col gap-1 overflow-y-auto"
          role={mode === "single" ? "radiogroup" : "group"}
          aria-label={mode === "single" ? "Cashier till" : "Cashier tills"}
        >
          {mode === "single" ? (
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--order-ink,#15231f)]">
              <input
                type="radio"
                name={`${storageKey}-till`}
                checked={selected.length === 0}
                onChange={() => commit([])}
                className="size-3.5 accent-[var(--pos-primary,#0f766e)]"
              />
              Don’t print
            </label>
          ) : null}
          {cashiers.map((cashier) => {
            const checked = selected.includes(cashier.id);
            return (
              <label
                key={cashier.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 text-[12px]",
                  checked
                    ? "font-semibold text-[var(--order-ink,#15231f)]"
                    : "text-[color-mix(in_srgb,var(--order-ink,#15231f)_78%,transparent)]",
                )}
              >
                <input
                  type={mode === "single" ? "radio" : "checkbox"}
                  name={mode === "single" ? `${storageKey}-till` : undefined}
                  checked={checked}
                  onChange={() => {
                    if (mode === "single") {
                      commit([cashier.id]);
                      return;
                    }
                    commit(
                      checked
                        ? selected.filter((id) => id !== cashier.id)
                        : [...selected, cashier.id],
                    );
                  }}
                  className="size-3.5 accent-[var(--pos-primary,#0f766e)]"
                />
                <span className="truncate">{cashier.name}</span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
