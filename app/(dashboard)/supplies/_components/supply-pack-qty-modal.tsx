"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Package, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type { ItemLinkPackOfferRecord } from "@/lib/api";
import { cn } from "@/lib/utils";

import { COMMON_PURCHASE_UNITS } from "@/lib/purchase-unit-conversion";

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
  /** Saved item pack option id when a saved pack shape was picked; null for custom. */
  packOptionId?: string | null;
  /** Optional second packaging level, persisted with a remembered custom pack. */
  innerPackUnit?: string | null;
  innerPackCount?: number | null;
  baseUnitsPerInner?: number | null;
  /** Save this custom shape as a reusable pack option for the product. */
  saveAsPackOption?: boolean;
};

type SupplyPackQtyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: SupplyPackQtyDefaults | null;
  /** When set, prefer this size over catalog defaults (edit existing pack). */
  initialUnitsPerPack?: number | null;
  /** Saved pack shapes offered by the supplier link — rendered as quick picks. */
  savedOptions?: ItemLinkPackOfferRecord[] | null;
  /** Catalog write permission: gates saving a custom shape to the product. */
  canSavePackOption?: boolean;
  onApply: (result: SupplyPackQtyApply) => void;
};

function toPositiveNumber(
  raw: string | number | null | undefined,
): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toNonNegNumber(
  raw: string | number | null | undefined,
): number | null {
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
      ? `${capitalize(result.packUnit)} of ${formatQty(result.unitsPerPack)}`
      : `${formatQty(result.packCount)} ${result.packUnit}s × ${formatQty(result.unitsPerPack)}`;
  if (result.unitCost != null) {
    return `${packPart} · unit ${formatMoney(result.unitCost)}`;
  }
  return packPart;
}

function capitalize(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Pack";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
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
    args.packUnit?.trim() || args.packagingUnitName?.trim() || "pack";
  const packSize =
    args.packSize ?? args.packageUnitsPerSale ?? args.packagingUnitQty ?? null;
  return {
    packUnit,
    packSize,
    productLabel: args.productLabel?.trim() || null,
  };
}

const QUICK_SIZES = [6, 12, 24, 30, 48] as const;

/**
 * Purchase packaging for one receipt line: the unit bought (carton, bale, sack…)
 * and how many base items one unit holds. Optional second level (outer → inner → item)
 * is persisted with the custom shape so the next purchase is one tap.
 */
export function SupplyPackQtyModal({
  open,
  onOpenChange,
  defaults = null,
  initialUnitsPerPack = null,
  savedOptions = null,
  canSavePackOption = false,
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

  const seedUnit = useMemo(
    () => defaults?.packUnit?.trim() || "pack",
    [defaults?.packUnit],
  );

  const [packUnit, setPackUnit] = useState(seedUnit);
  const [unitsPerPackStr, setUnitsPerPackStr] = useState(seedSize);
  const [innerOpen, setInnerOpen] = useState(false);
  const [innerUnitStr, setInnerUnitStr] = useState("packet");
  const [innerCountStr, setInnerCountStr] = useState("");
  const [innerBaseStr, setInnerBaseStr] = useState("");
  const [packPriceStr, setPackPriceStr] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedPacks =
    savedOptions && savedOptions.length > 0 ? savedOptions : null;

  useEffect(() => {
    if (!open) return;
    dismissGuardRef.current = true;
    const timer = window.setTimeout(() => {
      dismissGuardRef.current = false;
    }, 200);
    setPackUnit(seedUnit);
    setUnitsPerPackStr(seedSize);
    setInnerOpen(false);
    setInnerUnitStr("packet");
    setInnerCountStr("");
    setInnerBaseStr("");
    setPackPriceStr("");
    setRemember(!savedPacks && canSavePackOption);
    setError(null);
    return () => window.clearTimeout(timer);
    // savedPacks intentionally read at open time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seedSize, seedUnit, canSavePackOption]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      unitsInputRef.current?.focus();
      unitsInputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  const innerCount = toPositiveNumber(innerCountStr);
  const innerBase = toPositiveNumber(innerBaseStr);
  const innerTotal =
    innerCount != null && innerBase != null
      ? Math.round(innerCount * innerBase * 10000) / 10000
      : null;
  const typedUnits = toPositiveNumber(unitsPerPackStr);
  const unitsPerPack = innerOpen ? innerTotal : typedUnits;

  const packPriceRaw = packPriceStr.trim();
  const packPriceParsed =
    packPriceRaw === "" ? null : toNonNegNumber(packPriceStr);
  const packPriceInvalid = packPriceRaw !== "" && packPriceParsed == null;

  const unitCost =
    unitsPerPack != null && packPriceParsed != null && unitsPerPack > 0
      ? roundMoney2(packPriceParsed / unitsPerPack)
      : null;

  const unitLabel = packUnit.trim() || "pack";

  const canApply =
    unitsPerPack != null && unitsPerPack > 1 && !packPriceInvalid;

  const handleApply = () => {
    if (!packUnit.trim()) {
      setError("Which unit do you buy this in?");
      return;
    }
    if (unitsPerPack == null || unitsPerPack <= 1) {
      setError(`How many items are in one ${unitLabel}?`);
      return;
    }
    if (innerOpen) {
      if (!innerUnitStr.trim()) {
        setError("Name the inner package (packet, sachet…).");
        return;
      }
      if (innerCount == null || innerCount <= 1) {
        setError(`How many ${innerUnitStr.trim()}s are in one ${unitLabel}?`);
        return;
      }
      if (innerBase == null) {
        setError(`How many items are in one ${innerUnitStr.trim()}?`);
        return;
      }
      if (
        innerTotal == null ||
        Math.abs(innerTotal - innerCount * innerBase) > 0.0001
      ) {
        setError("Inner packaging does not add up — check the numbers.");
        return;
      }
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
      packUnit: unitLabel,
      amountSpent: packPrice,
      packPrice,
      unitCost: unit,
      packOptionId: null,
      innerPackUnit: innerOpen ? innerUnitStr.trim() : null,
      innerPackCount: innerOpen ? innerCount : null,
      baseUnitsPerInner: innerOpen ? innerBase : null,
      saveAsPackOption: remember,
    });
    window.setTimeout(() => onOpenChange(false), 0);
  };

  const applySavedOption = (option: ItemLinkPackOfferRecord) => {
    const units = Number(option.unitsPerPack);
    const price =
      option.unitPrice != null && Number.isFinite(Number(option.unitPrice))
        ? Number(option.unitPrice)
        : null;
    onApply({
      totalQty: units,
      packCount: 1,
      unitsPerPack: units,
      packUnit: option.packUnit || "pack",
      amountSpent: price,
      packPrice: price,
      unitCost: price != null ? roundMoney2(price / units) : null,
      packOptionId: option.id,
      saveAsPackOption: false,
    });
    window.setTimeout(() => onOpenChange(false), 0);
  };

  const product = defaults?.productLabel?.trim() || null;
  const breakdown =
    innerOpen && innerTotal != null && innerCount != null && innerBase != null
      ? `${formatQty(innerCount)} ${innerUnitStr.trim() || "inner"}s × ${formatQty(innerBase)} = ${formatQty(innerTotal)}`
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[300] flex w-[calc(100vw-1.5rem)] max-w-[24rem] flex-col gap-0 overflow-hidden p-0 sm:w-full"
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
              Bought as a package
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {product ? (
                <>
                  <span className="font-medium text-foreground">{product}</span>
                  {" — "}
                </>
              ) : null}
              One {unitLabel} holds how many? Type the price for one {unitLabel}{" "}
              and we work out the cost per item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-4 py-4 sm:px-5">
            {error ? (
              <p className="border border-destructive/35 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            {savedPacks ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-bold tracking-[-0.02em] text-muted-foreground">
                  Saved packs from this supplier
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {savedPacks.map((option) => {
                    const units = Number(option.unitsPerPack);
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className="inline-flex h-8 items-center gap-1 border border-amber-900/30 bg-amber-50 px-2 font-mono text-[11px] font-bold tabular-nums text-amber-950 transition-colors hover:border-amber-900/60 dark:border-amber-200/25 dark:bg-amber-950/50 dark:text-amber-100"
                        title={
                          option.unitPrice != null
                            ? `${formatMoney(Number(option.unitPrice))} per ${option.packUnit || "pack"}`
                            : `${capitalize(option.packUnit || "pack")} of ${formatQty(units)}`
                        }
                        onClick={() => applySavedOption(option)}
                      >
                        ×{formatQty(units)}
                        {option.unitPrice != null ? (
                          <span className="font-semibold normal-case tracking-normal opacity-70">
                            {formatMoney(Number(option.unitPrice))}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold tracking-[-0.02em] text-muted-foreground">
                Purchase unit
              </span>
              <input
                className={cn(nsdInput, "h-10 text-sm font-medium")}
                value={packUnit}
                onChange={(e) => {
                  setPackUnit(e.target.value);
                  setError(null);
                }}
                list="supply-purchase-units"
                placeholder="carton, bale, sack, crate…"
                maxLength={32}
                autoComplete="off"
                aria-label="Purchase unit"
              />
              <datalist id="supply-purchase-units">
                {COMMON_PURCHASE_UNITS.map((unit) => (
                  <option key={unit} value={unit} />
                ))}
              </datalist>
            </label>

            <div className="flex flex-col items-center gap-2 border border-amber-900/25 bg-[color-mix(in_srgb,oklch(0.86_0.08_85)_72%,var(--card))] px-4 py-4 dark:border-amber-200/20 dark:bg-amber-950/40">
              <p className="text-[10px] font-bold tracking-[-0.02em] text-amber-950/70 dark:text-amber-100/70">
                Items in each {unitLabel}
              </p>
              <input
                ref={unitsInputRef}
                className={cn(
                  "w-full border-0 bg-transparent text-center font-mono text-5xl font-black tabular-nums tracking-tight",
                  "text-amber-950 outline-none dark:text-amber-50",
                  "placeholder:text-amber-950/25 dark:placeholder:text-amber-100/25",
                )}
                value={innerOpen && innerTotal != null ? formatQty(innerTotal) : unitsPerPackStr}
                onChange={(e) => {
                  setUnitsPerPackStr(e.target.value);
                  setError(null);
                }}
                readOnly={innerOpen}
                inputMode="decimal"
                placeholder="12"
                autoComplete="off"
                aria-label={`Items in one ${unitLabel}`}
              />
              {innerOpen ? (
                <p className="text-[11px] font-medium text-amber-950/70 dark:text-amber-100/70">
                  {breakdown ?? "Set the inner packing below"}
                </p>
              ) : (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {QUICK_SIZES.map((n) => {
                    const active =
                      typedUnits != null && Math.abs(typedUnits - n) < 0.0001;
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
              )}
            </div>

            <div className="border border-border/70 bg-muted/10">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                onClick={() => {
                  setInnerOpen((v) => !v);
                  setError(null);
                }}
                aria-expanded={innerOpen}
              >
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                  <Plus
                    className={cn(
                      "size-3.5 transition-transform",
                      innerOpen && "rotate-45",
                    )}
                    aria-hidden
                  />
                  Inner packs inside each {unitLabel}?
                </span>
                <span className="text-[10px] text-muted-foreground">optional</span>
              </button>
              {innerOpen ? (
                <div className="grid grid-cols-2 gap-2 border-t border-border/60 px-3 py-2.5">
                  <label className="col-span-2 flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      Inner unit
                    </span>
                    <input
                      className={cn(nsdInput, "h-9")}
                      value={innerUnitStr}
                      onChange={(e) => {
                        setInnerUnitStr(e.target.value);
                        setError(null);
                      }}
                      list="supply-inner-units"
                      placeholder="packet, sachet, inner carton"
                      maxLength={32}
                      autoComplete="off"
                    />
                    <datalist id="supply-inner-units">
                      {["packet", "sachet", "inner carton", "jar", "can", "bottle", "bar"].map(
                        (u) => (
                          <option key={u} value={u} />
                        ),
                      )}
                    </datalist>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      {innerUnitStr || "inner"}s per {unitLabel}
                    </span>
                    <input
                      className={cn(nsdInput, "h-9 text-right font-mono")}
                      value={innerCountStr}
                      onChange={(e) => {
                        setInnerCountStr(e.target.value);
                        setError(null);
                      }}
                      inputMode="decimal"
                      placeholder="12"
                      autoComplete="off"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground">
                      Items per {innerUnitStr || "inner"}
                    </span>
                    <input
                      className={cn(nsdInput, "h-9 text-right font-mono")}
                      value={innerBaseStr}
                      onChange={(e) => {
                        setInnerBaseStr(e.target.value);
                        setError(null);
                      }}
                      inputMode="decimal"
                      placeholder="10"
                      autoComplete="off"
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold tracking-[-0.02em] text-muted-foreground">
                Price for one {unitLabel}{" "}
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
                placeholder={`What one ${unitLabel} cost`}
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
                <p className="text-[10px] font-bold tracking-[-0.02em] text-muted-foreground">
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
                    ? `1 ${unitLabel} · ${formatQty(unitsPerPack)} items`
                    : `Then type 1 in qty for ${formatQty(unitsPerPack)} on the shelf`
                  : "Pick a pack size first"}
              </p>
            </div>

            {canSavePackOption ? (
              <label className="flex items-center justify-between gap-3 border border-border/70 bg-background px-3 py-2">
                <span className="flex flex-col">
                  <span className="text-[11px] font-semibold text-foreground">
                    Remember this for the product
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Next time it is one tap — saved on the item, not just this device
                  </span>
                </span>
                <Switch
                  size="sm"
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked)}
                  aria-label="Remember this packaging for the product"
                />
              </label>
            ) : null}
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
                  ? `${capitalize(unitLabel)} of ${formatQty(unitsPerPack)} · ${formatMoney(unitCost)} ea`
                  : `${capitalize(unitLabel)} of ${formatQty(unitsPerPack)}`
                : "Use package"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
