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
import { cn } from "@/lib/utils";

import { nsdInput } from "./new-supply-drawer-ui";

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
  amountSpent: number | null;
  packPrice: number | null;
  unitCost: number | null;
};

type SupplyPackQtyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: SupplyPackQtyDefaults | null;
  /** When set, prefer this size over catalog defaults (edit existing pack). */
  initialUnitsPerPack?: number | null;
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

export function formatPackQtyHint(result: SupplyPackQtyApply): string {
  const packPart =
    result.packCount === 1
      ? `Pack of ${formatQty(result.unitsPerPack)}`
      : `${formatQty(result.packCount)} packs × ${formatQty(result.unitsPerPack)}`;
  if (result.unitCost != null) {
    return `${packPart} · unit ${formatMoney(result.unitCost)}`;
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
    "pack";
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

const QUICK_SIZES = [6, 12, 24, 30, 40] as const;

/**
 * Two-beat pack setup: pieces in the carton + what the carton cost.
 * Pack count stays on the line (type 1 for one pack).
 */
export function SupplyPackQtyModal({
  open,
  onOpenChange,
  defaults = null,
  initialUnitsPerPack = null,
  onApply,
}: SupplyPackQtyModalProps) {
  const dismissGuardRef = useRef(false);
  const unitsInputRef = useRef<HTMLInputElement | null>(null);

  const seedSize = useMemo(() => {
    const fromInitial = toPositiveNumber(initialUnitsPerPack);
    if (fromInitial != null) return formatQty(fromInitial);
    const fromDefaults = toPositiveNumber(defaults?.packSize);
    return fromDefaults != null ? formatQty(fromDefaults) : "12";
  }, [initialUnitsPerPack, defaults?.packSize]);

  const [unitsPerPackStr, setUnitsPerPackStr] = useState(seedSize);
  const [packPriceStr, setPackPriceStr] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    dismissGuardRef.current = true;
    const timer = window.setTimeout(() => {
      dismissGuardRef.current = false;
    }, 200);
    setUnitsPerPackStr(seedSize);
    setPackPriceStr("");
    setError(null);
    return () => window.clearTimeout(timer);
  }, [open, seedSize]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      unitsInputRef.current?.focus();
      unitsInputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  const unitsPerPack = toPositiveNumber(unitsPerPackStr);
  const packPriceRaw = packPriceStr.trim();
  const packPriceParsed =
    packPriceRaw === "" ? null : toNonNegNumber(packPriceStr);
  const packPriceInvalid = packPriceRaw !== "" && packPriceParsed == null;

  const unitCost =
    unitsPerPack != null && packPriceParsed != null && unitsPerPack > 0
      ? roundMoney2(packPriceParsed / unitsPerPack)
      : null;

  const canApply = unitsPerPack != null && !packPriceInvalid;

  const handleApply = () => {
    if (unitsPerPack == null) {
      setError("How many pieces are in one pack?");
      return;
    }
    if (packPriceInvalid) {
      setError("Pack price must be 0 or more.");
      return;
    }
    const packPrice = packPriceParsed;
    const unit =
      packPrice != null && unitsPerPack > 0
        ? roundMoney2(packPrice / unitsPerPack)
        : null;
    onApply({
      totalQty: unitsPerPack,
      packCount: 1,
      unitsPerPack,
      packUnit: defaults?.packUnit?.trim() || "pack",
      amountSpent: packPrice,
      packPrice,
      unitCost: unit,
    });
    window.setTimeout(() => onOpenChange(false), 0);
  };

  const product = defaults?.productLabel?.trim() || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[300] flex w-[calc(100vw-1.5rem)] max-w-[22rem] flex-col gap-0 overflow-hidden p-0 sm:w-full"
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
          className="flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleApply();
          }}
        >
          <DialogHeader className="border-b border-border/50 px-4 pb-3 pt-4 sm:px-5">
            <DialogTitle className="flex items-center gap-2 text-base">
              <span className="grid size-8 place-items-center border border-amber-900/35 bg-amber-100 text-amber-950 dark:border-amber-200/30 dark:bg-amber-950/60 dark:text-amber-100">
                <Package className="size-4" aria-hidden />
              </span>
              Sold as a pack
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {product ? (
                <>
                  <span className="font-medium text-foreground">{product}</span>
                  {" — "}
                </>
              ) : null}
              Set the carton size. Then type packs and pack price on the line.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-4 py-4 sm:px-5">
            {error ? (
              <p className="border border-destructive/35 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col items-center gap-2 border border-amber-900/25 bg-[color-mix(in_srgb,oklch(0.86_0.08_85)_72%,var(--card))] px-4 py-5 dark:border-amber-200/20 dark:bg-amber-950/40">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-950/70 dark:text-amber-100/70">
                Pieces in this pack
              </p>
              <input
                ref={unitsInputRef}
                className={cn(
                  "w-full border-0 bg-transparent text-center font-mono text-5xl font-black tabular-nums tracking-tight",
                  "text-amber-950 outline-none dark:text-amber-50",
                  "placeholder:text-amber-950/25 dark:placeholder:text-amber-100/25",
                )}
                value={unitsPerPackStr}
                onChange={(e) => {
                  setUnitsPerPackStr(e.target.value);
                  setError(null);
                }}
                inputMode="decimal"
                placeholder="12"
                autoComplete="off"
                aria-label="Pieces in one pack"
              />
              <div className="flex flex-wrap justify-center gap-1.5">
                {QUICK_SIZES.map((n) => {
                  const active =
                    unitsPerPack != null && Math.abs(unitsPerPack - n) < 0.0001;
                  return (
                    <button
                      key={n}
                      type="button"
                      className={cn(
                        "min-w-9 border px-2 py-1 font-mono text-[11px] font-bold tabular-nums transition-colors",
                        active
                          ? "border-amber-950 bg-amber-950 text-amber-50 dark:border-amber-100 dark:bg-amber-100 dark:text-amber-950"
                          : "border-amber-900/25 text-amber-950/80 hover:border-amber-900/50 dark:border-amber-200/25 dark:text-amber-100/80",
                      )}
                      onClick={() => {
                        setUnitsPerPackStr(String(n));
                        setError(null);
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Pack price{" "}
                <span className="font-medium normal-case tracking-normal text-muted-foreground/80">
                  (optional)
                </span>
              </span>
              <input
                className={cn(
                  nsdInput,
                  "h-11 text-right font-mono text-base font-semibold tabular-nums",
                )}
                value={packPriceStr}
                onChange={(e) => {
                  setPackPriceStr(e.target.value);
                  setError(null);
                }}
                inputMode="decimal"
                placeholder="What one pack cost"
                autoComplete="off"
                aria-invalid={packPriceInvalid || undefined}
              />
            </label>

            <div
              className={cn(
                "flex items-end justify-between gap-3 border px-3 py-2.5",
                unitCost != null
                  ? "border-primary/35 bg-primary/[0.06]"
                  : "border-border/70 bg-muted/15",
              )}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Each costs
                </p>
                <p
                  className={cn(
                    "mt-0.5 font-mono text-2xl font-black tabular-nums",
                    unitCost != null
                      ? "text-primary"
                      : "text-muted-foreground/40",
                  )}
                >
                  {unitCost != null ? formatMoney(unitCost) : "—"}
                </p>
              </div>
              <p className="max-w-[9.5rem] text-right text-[11px] leading-snug text-muted-foreground">
                {unitsPerPack != null
                  ? packPriceParsed != null
                    ? `1 pack · ${formatQty(unitsPerPack)} pcs`
                    : `Then type 1 in qty for ${formatQty(unitsPerPack)} on the shelf`
                  : "Pick a pack size first"}
              </p>
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
              type="submit"
              disabled={!canApply}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleApply();
              }}
            >
              {unitsPerPack != null
                ? unitCost != null
                  ? `Pack of ${formatQty(unitsPerPack)} · ${formatMoney(unitCost)} ea`
                  : `Pack of ${formatQty(unitsPerPack)}`
                : "Use pack"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
