"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COMMON_PURCHASE_UNITS } from "@/lib/purchase-unit-conversion";
import { cn } from "@/lib/utils";

import { nsdFieldLabel, nsdInput, nsdSelect } from "./new-supply-drawer-ui";

const PACK_UNIT_OPTIONS = [
  "tray",
  "crate",
  "box",
  "case",
  "pack",
  ...COMMON_PURCHASE_UNITS.filter(
    (u) => !["tray", "crate", "box", "case", "each", "kg", "g", "lb"].includes(u),
  ),
] as const;

export type SupplyPackQtyDefaults = {
  packUnit?: string | null;
  packSize?: number | string | null;
  productLabel?: string | null;
};

export type SupplyPackQtyApply = {
  totalQty: number;
  packCount: number;
  unitsPerPack: number;
  packUnit: string;
  /** Total money paid for these packs (optional). */
  amountSpent: number | null;
  /** Buying price per stock unit when amount spent was provided. */
  unitCost: number | null;
};

type SupplyPackQtyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: SupplyPackQtyDefaults | null;
  onApply: (result: SupplyPackQtyApply) => void;
};

function toPositiveNumber(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toNonNegNumber(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function formatQty(n: number): string {
  return Number.isInteger(n)
    ? String(n)
    : String(Math.round(n * 10000) / 10000);
}

function formatMoney(n: number): string {
  return n.toFixed(2);
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pluralizePack(unit: string, count: number): string {
  const u = unit.trim() || "pack";
  if (count === 1) return u;
  if (/s$/i.test(u)) return u;
  return `${u}s`;
}

export function formatPackQtyHint(result: SupplyPackQtyApply): string {
  const unit = result.packUnit.trim() || "pack";
  const packPart = `${formatQty(result.packCount)} × ${formatQty(result.unitsPerPack)} / ${unit}`;
  if (result.unitCost != null) {
    return `${packPart} · @ ${formatMoney(result.unitCost)}`;
  }
  return packPart;
}

/** Prefill pack calculator from supplier link and/or catalog packaging. */
export function resolveSupplyPackDefaults(args: {
  productLabel?: string | null;
  packUnit?: string | null;
  packSize?: number | string | null;
  packageUnitsPerSale?: number | string | null;
  packagingUnitName?: string | null;
  packagingUnitQty?: number | string | null;
}): SupplyPackQtyDefaults {
  const packUnit =
    args.packUnit?.trim() ||
    args.packagingUnitName?.trim() ||
    "tray";
  const packSize =
    args.packSize ??
    args.packageUnitsPerSale ??
    args.packagingUnitQty ??
    null;
  return {
    packUnit,
    packSize,
    productLabel: args.productLabel?.trim() || null,
  };
}

export function SupplyPackQtyModal({
  open,
  onOpenChange,
  defaults = null,
  onApply,
}: SupplyPackQtyModalProps) {
  const dismissGuardRef = useRef(false);
  const packsInputRef = useRef<HTMLInputElement | null>(null);

  const initialUnit = useMemo(() => {
    const fromDefaults = defaults?.packUnit?.trim();
    return fromDefaults || "tray";
  }, [defaults?.packUnit]);

  const initialSize = useMemo(() => {
    const n = toPositiveNumber(defaults?.packSize);
    return n != null ? formatQty(n) : "";
  }, [defaults?.packSize]);

  const [packUnit, setPackUnit] = useState(initialUnit);
  const [customUnit, setCustomUnit] = useState("");
  const [packsStr, setPacksStr] = useState("");
  const [unitsPerPackStr, setUnitsPerPackStr] = useState(initialSize);
  const [amountSpentStr, setAmountSpentStr] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    dismissGuardRef.current = true;
    const timer = window.setTimeout(() => {
      dismissGuardRef.current = false;
    }, 200);
    const known = PACK_UNIT_OPTIONS.some(
      (u) => u.toLowerCase() === initialUnit.toLowerCase(),
    );
    if (known) {
      setPackUnit(initialUnit);
      setCustomUnit("");
    } else {
      setPackUnit("__custom__");
      setCustomUnit(initialUnit);
    }
    setPacksStr("");
    setUnitsPerPackStr(initialSize);
    setAmountSpentStr("");
    setError(null);
    return () => window.clearTimeout(timer);
  }, [open, initialUnit, initialSize]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => packsInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  const resolvedUnit =
    packUnit === "__custom__"
      ? customUnit.trim() || "pack"
      : packUnit.trim() || "tray";

  const packs = toPositiveNumber(packsStr);
  const unitsPerPack = toPositiveNumber(unitsPerPackStr);
  const amountSpentRaw = amountSpentStr.trim();
  const amountSpentParsed =
    amountSpentRaw === "" ? null : toNonNegNumber(amountSpentStr);
  const amountSpentInvalid =
    amountSpentRaw !== "" && amountSpentParsed == null;

  const totalQty =
    packs != null && unitsPerPack != null
      ? Math.round(packs * unitsPerPack * 10000) / 10000
      : null;

  const unitCost =
    totalQty != null && amountSpentParsed != null && totalQty > 0
      ? roundMoney2(amountSpentParsed / totalQty)
      : null;

  const costPerPack =
    packs != null && amountSpentParsed != null && packs > 0
      ? roundMoney2(amountSpentParsed / packs)
      : null;

  const canApply = totalQty != null && !amountSpentInvalid;

  const handleApply = () => {
    if (packs == null) {
      setError("Enter how many packs you received.");
      return;
    }
    if (unitsPerPack == null) {
      setError("Enter how many units are in each pack.");
      return;
    }
    if (!resolvedUnit) {
      setError("Choose a pack name (tray, crate, …).");
      return;
    }
    if (amountSpentInvalid) {
      setError("Amount spent must be 0 or a positive number.");
      return;
    }
    const total = Math.round(packs * unitsPerPack * 10000) / 10000;
    const spent = amountSpentParsed;
    const unit =
      spent != null && total > 0 ? roundMoney2(spent / total) : null;
    onApply({
      totalQty: total,
      packCount: packs,
      unitsPerPack,
      packUnit: resolvedUnit,
      amountSpent: spent,
      unitCost: unit,
    });
    // Delay close so the Apply click cannot fall through onto
    // "Post supply" under the dialog (same bottom-right area).
    window.setTimeout(() => onOpenChange(false), 0);
  };

  const knownUnitSelected = PACK_UNIT_OPTIONS.some(
    (u) => u.toLowerCase() === packUnit.toLowerCase(),
  );
  const selectValue =
    packUnit === "__custom__" || !knownUnitSelected ? "__custom__" : packUnit;

  const applyLabel =
    totalQty == null
      ? "Use qty"
      : unitCost != null
        ? `Use ${formatQty(totalQty)} @ ${formatMoney(unitCost)}`
        : `Use ${formatQty(totalQty)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[300] flex max-h-[min(92dvh,36rem)] w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-0 overflow-hidden p-0 sm:w-full"
        overlayClassName="z-[295]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          if (dismissGuardRef.current) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (dismissGuardRef.current) e.preventDefault();
        }}
      >
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleApply();
          }}
        >
          <DialogHeader className="border-b border-border/50 px-4 py-3 sm:px-5 sm:py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Package className="size-5 text-primary" aria-hidden />
              Enter by pack
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {defaults?.productLabel?.trim() ? (
                <>
                  For{" "}
                  <span className="font-medium text-foreground">
                    {defaults.productLabel.trim()}
                  </span>
                  . Enter packs, units per pack, and what you paid — we fill qty
                  and unit cost.
                </>
              ) : (
                "Enter packs, units per pack, and what you paid — we fill qty and unit cost."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
            {error ? (
              <p className="rounded-sm border border-destructive/35 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <label className="flex flex-col gap-1">
              <span className={nsdFieldLabel}>Pack type</span>
              <select
                className={nsdSelect}
                value={selectValue}
                onChange={(e) => {
                  const v = e.target.value;
                  setPackUnit(v);
                  if (v !== "__custom__") setCustomUnit("");
                  setError(null);
                }}
              >
                {PACK_UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value="__custom__">Other…</option>
              </select>
            </label>

            {selectValue === "__custom__" ? (
              <label className="flex flex-col gap-1">
                <span className={nsdFieldLabel}>Custom pack name</span>
                <input
                  className={nsdInput}
                  value={customUnit}
                  onChange={(e) => {
                    setCustomUnit(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. sack"
                  autoComplete="off"
                />
              </label>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className={nsdFieldLabel}>
                  # of {pluralizePack(resolvedUnit, 2)}
                </span>
                <input
                  ref={packsInputRef}
                  className={cn(nsdInput, "text-right font-mono tabular-nums")}
                  value={packsStr}
                  onChange={(e) => {
                    setPacksStr(e.target.value);
                    setError(null);
                  }}
                  inputMode="decimal"
                  placeholder="e.g. 5"
                  autoComplete="off"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className={nsdFieldLabel}>Units per {resolvedUnit}</span>
                <input
                  className={cn(nsdInput, "text-right font-mono tabular-nums")}
                  value={unitsPerPackStr}
                  onChange={(e) => {
                    setUnitsPerPackStr(e.target.value);
                    setError(null);
                  }}
                  inputMode="decimal"
                  placeholder="e.g. 12"
                  autoComplete="off"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className={nsdFieldLabel}>Amount spent (total)</span>
              <input
                className={cn(nsdInput, "text-right font-mono tabular-nums")}
                value={amountSpentStr}
                onChange={(e) => {
                  setAmountSpentStr(e.target.value);
                  setError(null);
                }}
                inputMode="decimal"
                placeholder="e.g. 4500"
                autoComplete="off"
                aria-invalid={amountSpentInvalid || undefined}
              />
              <span className="text-[11px] text-muted-foreground">
                What you paid for all {pluralizePack(resolvedUnit, packs ?? 2)}{" "}
                — used to calculate unit cost.
              </span>
            </label>

            <div
              className={cn(
                "space-y-2 rounded-sm border px-3 py-2.5",
                totalQty != null
                  ? "border-primary/35 bg-primary/[0.06]"
                  : "border-border/70 bg-muted/20",
              )}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Qty in (units)
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 font-mono text-lg font-semibold tabular-nums",
                      totalQty != null
                        ? "text-primary"
                        : "text-muted-foreground/50",
                    )}
                  >
                    {totalQty != null ? formatQty(totalQty) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Unit cost
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 font-mono text-lg font-semibold tabular-nums",
                      unitCost != null
                        ? "text-primary"
                        : "text-muted-foreground/50",
                    )}
                  >
                    {unitCost != null ? formatMoney(unitCost) : "—"}
                  </p>
                </div>
              </div>
              {totalQty != null ? (
                <p className="text-[11px] text-muted-foreground">
                  {formatQty(packs!)} {pluralizePack(resolvedUnit, packs!)} ×{" "}
                  {formatQty(unitsPerPack!)} units
                  {amountSpentParsed != null
                    ? ` · spent ${formatMoney(amountSpentParsed)}`
                    : ""}
                  {costPerPack != null
                    ? ` · ${formatMoney(costPerPack)} / ${resolvedUnit}`
                    : ""}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Fill packs and units per pack to calculate qty. Add amount
                  spent to fill unit cost on the line.
                </p>
              )}
              {amountSpentInvalid ? (
                <p className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                  Enter a valid amount spent (0 or more).
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="border-t border-border/50 bg-muted/20 px-4 py-3 sm:px-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canApply}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleApply();
              }}
            >
              {applyLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
