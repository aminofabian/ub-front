"use client";

import { useEffect, useRef, useState, type Ref } from "react";

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
import { formatMoney } from "@/lib/money";
import {
  eachFromPackPrice,
  formatPackMoneyInput,
  formatPackUnits,
  packagingLabel,
  packPriceFromEach,
  seedPackConfiguration,
} from "@/lib/pack-configuration";
import { COMMON_PURCHASE_UNITS } from "@/lib/purchase-unit-conversion";
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
  /** Saved item pack option id when a saved pack shape was picked; null for custom. */
  packOptionId?: string | null;
  /** Optional second packaging level, persisted with a remembered custom pack. */
  innerPackUnit?: string | null;
  innerPackCount?: number | null;
  baseUnitsPerInner?: number | null;
  /** Save this custom shape as a reusable pack option for the product. */
  saveAsPackOption?: boolean;
};

export type SupplyPackInnerSeed = {
  unit?: string | null;
  count?: number | string | null;
  base?: number | string | null;
};

type SupplyPackQtyModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults?: SupplyPackQtyDefaults | null;
  /** When set, prefer this size over catalog defaults (edit existing pack). */
  initialUnitsPerPack?: number | null;
  /** Price already on the line for one pack. Wins over the saved pack price. */
  initialPackPrice?: number | string | null;
  /** Known price of one item, used to fill the pack price when none is saved. */
  knownEachPrice?: number | string | null;
  currency?: string | null;
  /** Saved pack shapes offered by the supplier link — rendered as the choices. */
  savedOptions?: ItemLinkPackOfferRecord[] | null;
  /** Inner level already stored on this line, shown in the same form. */
  initialInner?: SupplyPackInnerSeed | null;
  /** Catalog write permission: gates saving a custom shape to the product. */
  canSavePackOption?: boolean;
  onApply: (result: SupplyPackQtyApply) => void;
};

const INNER_PACK_UNITS = [
  "packet",
  "sachet",
  "inner carton",
  "jar",
  "can",
  "bottle",
  "bar",
] as const;

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

export function formatPackQtyHint(result: SupplyPackQtyApply): string {
  const label = packagingLabel(result.packUnit, result.unitsPerPack);
  const counted =
    result.packCount === 1
      ? label
      : `${formatPackUnits(result.packCount)} × ${label}`;
  if (result.unitCost != null) {
    return `${counted} · ${formatPackMoneyInput(result.unitCost)} each`;
  }
  return counted;
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

function offersFrom(
  saved: ItemLinkPackOfferRecord[] | null | undefined,
) {
  return (saved ?? []).map((option) => ({
    id: option.id,
    packUnit: option.packUnit || "pack",
    unitsPerPack: Number(option.unitsPerPack),
    unitPrice:
      option.unitPrice != null && Number.isFinite(Number(option.unitPrice))
        ? Number(option.unitPrice)
        : null,
    eachPrice:
      option.eachPrice != null && Number.isFinite(Number(option.eachPrice))
        ? Number(option.eachPrice)
        : null,
  }));
}

type MoneyFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  inputRef?: Ref<HTMLInputElement>;
  invalid?: boolean;
  onChange: (value: string) => void;
};

function MoneyField({
  label,
  value,
  placeholder,
  inputRef,
  invalid,
  onChange,
}: MoneyFieldProps) {
  return (
    <label className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <input
        ref={inputRef}
        className={cn(
          nsdInput,
          "h-11 text-right font-mono text-base tabular-nums",
          invalid && "border-destructive",
        )}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="decimal"
        placeholder={placeholder}
        autoComplete="off"
        aria-label={label}
        aria-invalid={invalid || undefined}
      />
    </label>
  );
}

/**
 * One pack on a receipt or order line. Saved shapes fill the form.
 * Pack price and the count set the price per item; typing the item price
 * sets the pack price.
 */
export function SupplyPackQtyModal({
  open,
  onOpenChange,
  defaults = null,
  initialUnitsPerPack = null,
  initialPackPrice = null,
  knownEachPrice = null,
  currency = "KES",
  savedOptions = null,
  initialInner = null,
  canSavePackOption = false,
  onApply,
}: SupplyPackQtyModalProps) {
  const dismissGuardRef = useRef(false);
  const containsRef = useRef<HTMLInputElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);

  const [optionId, setOptionId] = useState<string | null>(null);
  const [packUnit, setPackUnit] = useState("pack");
  const [unitsStr, setUnitsStr] = useState("");
  const [packPriceStr, setPackPriceStr] = useState("");
  const [eachStr, setEachStr] = useState("");
  const [innerOpen, setInnerOpen] = useState(false);
  const [innerUnitStr, setInnerUnitStr] = useState("packet");
  const [innerCountStr, setInnerCountStr] = useState("");
  const [innerBaseStr, setInnerBaseStr] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saved = savedOptions && savedOptions.length > 0 ? savedOptions : null;

  useEffect(() => {
    if (!open) return;
    dismissGuardRef.current = true;
    const timer = window.setTimeout(() => {
      dismissGuardRef.current = false;
    }, 200);
    const seed = seedPackConfiguration({
      packUnit: defaults?.packUnit,
      packSize: initialUnitsPerPack ?? defaults?.packSize,
      packPrice: initialPackPrice,
      knownEach: knownEachPrice,
      saved: offersFrom(savedOptions),
    });
    setOptionId(seed.optionId);
    setPackUnit(seed.unit);
    setUnitsStr(seed.units);
    setPackPriceStr(seed.packPrice);
    setEachStr(seed.each);
    const innerCount = toPositiveNumber(initialInner?.count);
    const innerBase = toPositiveNumber(initialInner?.base);
    const hasInner = innerCount != null && innerBase != null;
    setInnerOpen(hasInner);
    setInnerUnitStr(initialInner?.unit?.trim() || "packet");
    setInnerCountStr(hasInner ? formatPackUnits(innerCount) : "");
    setInnerBaseStr(hasInner ? formatPackUnits(innerBase) : "");
    setRemember(seed.optionId == null && canSavePackOption);
    setError(null);
    const focusTimer = window.setTimeout(() => {
      const target = seed.units.trim() ? priceRef.current : containsRef.current;
      target?.focus();
      target?.select();
    }, 50);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(focusTimer);
    };
    // Seed once each time the sheet opens. Later parent renders must not wipe edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const innerCount = toPositiveNumber(innerCountStr);
  const innerBase = toPositiveNumber(innerBaseStr);
  const innerTotal =
    innerOpen && innerCount != null && innerBase != null
      ? Math.round(innerCount * innerBase * 10000) / 10000
      : null;
  const typedUnits = toPositiveNumber(unitsStr);
  const unitsPerPack = innerTotal ?? typedUnits;
  const packPriceRaw = packPriceStr.trim();
  const packPriceParsed =
    packPriceRaw === "" ? null : toNonNegNumber(packPriceStr);
  const packPriceInvalid = packPriceRaw !== "" && packPriceParsed == null;
  const unitLabel = packUnit.trim() || "pack";
  const canApply =
    unitsPerPack != null && unitsPerPack > 1 && !packPriceInvalid;
  const product = defaults?.productLabel?.trim() || null;
  const packSummary =
    unitsPerPack != null && unitsPerPack > 1
      ? packagingLabel(unitLabel, unitsPerPack)
      : null;
  const readoutEach =
    packPriceParsed != null && unitsPerPack != null
      ? eachFromPackPrice(packPriceParsed, unitsPerPack)
      : null;

  const writeEachFromPack = (nextUnits: number | null, nextPackRaw: string) => {
    const pack = nextPackRaw.trim() === "" ? null : toNonNegNumber(nextPackRaw);
    if (nextUnits == null || pack == null) {
      setEachStr("");
      return;
    }
    const each = eachFromPackPrice(pack, nextUnits);
    setEachStr(each != null ? formatPackMoneyInput(each) : "");
  };

  const matchSaved = (units: number | null, unit: string) => {
    if (!saved || units == null) return null;
    const wanted = unit.trim().toLowerCase();
    return (
      saved.find((option) => {
        const same = Math.abs(Number(option.unitsPerPack) - units) < 0.0001;
        const named = (option.packUnit || "pack").trim().toLowerCase() === wanted;
        return same && named;
      }) ?? null
    );
  };

  const selectSaved = (option: ItemLinkPackOfferRecord) => {
    const units = Number(option.unitsPerPack);
    const price =
      option.unitPrice != null && Number.isFinite(Number(option.unitPrice))
        ? Number(option.unitPrice)
        : null;
    const eachKnown = toPositiveNumber(knownEachPrice);
    const pack =
      price ??
      (eachKnown != null ? packPriceFromEach(eachKnown, units) : null);
    setOptionId(option.id);
    setPackUnit(option.packUnit || "pack");
    setUnitsStr(formatPackUnits(units));
    setPackPriceStr(pack != null ? formatPackMoneyInput(pack) : "");
    setEachStr(
      pack != null ? formatPackMoneyInput(eachFromPackPrice(pack, units) ?? 0) : "",
    );
    setInnerOpen(false);
    setRemember(false);
    setError(null);
  };

  const handleApply = () => {
    if (!packUnit.trim()) {
      setError("Name this pack. Carton, bale, sack.");
      return;
    }
    if (unitsPerPack == null || unitsPerPack <= 1) {
      setError(`How many items are in one ${unitLabel}?`);
      return;
    }
    const innerStarted =
      innerOpen && (innerCountStr.trim() !== "" || innerBaseStr.trim() !== "");
    if (innerStarted) {
      if (!innerUnitStr.trim()) {
        setError("Name the smaller pack. Packet, sachet.");
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
    }
    if (packPriceInvalid) {
      setError("Pack price must be 0 or more.");
      return;
    }
    const packPrice = packPriceParsed;
    const unit =
      packPrice != null && unitsPerPack > 0
        ? eachFromPackPrice(packPrice, unitsPerPack)
        : null;
    onApply({
      totalQty: unitsPerPack,
      packCount: 1,
      unitsPerPack,
      packUnit: unitLabel,
      amountSpent: packPrice,
      packPrice,
      unitCost: unit,
      packOptionId: optionId,
      innerPackUnit: innerStarted ? innerUnitStr.trim() : null,
      innerPackCount: innerStarted ? innerCount : null,
      baseUnitsPerInner: innerStarted ? innerBase : null,
      saveAsPackOption: optionId == null && remember,
    });
    window.setTimeout(() => onOpenChange(false), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[300] flex w-[calc(100vw-1.5rem)] max-w-[26rem] flex-col gap-0 overflow-hidden p-0 sm:w-full"
        overlayClassName="z-[295]"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => {
          if (dismissGuardRef.current) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (dismissGuardRef.current) event.preventDefault();
        }}
      >
        <form
          className="flex flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleApply();
          }}
        >
          <DialogHeader className="border-b border-border/60 px-4 pb-3 pt-4 sm:px-5">
            <DialogTitle className="text-base">Pack configuration</DialogTitle>
            <DialogDescription className="text-sm text-foreground">
              {product ?? "Set what one pack holds and what it costs."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-4 py-4 sm:px-5">
            {error ? (
              <p role="alert" className="text-[13px] text-destructive">
                {error}
              </p>
            ) : null}

            {saved ? (
              <div role="radiogroup" aria-label="Pack" className="flex flex-col gap-1.5">
                {saved.map((option) => {
                  const units = Number(option.unitsPerPack);
                  const active = optionId === option.id;
                  const price = toNonNegNumber(option.unitPrice);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={cn(
                        "flex items-baseline justify-between gap-3 border px-3 py-2 text-left",
                        active
                          ? "border-primary bg-primary/[0.06]"
                          : "border-border bg-background hover:bg-muted/40",
                      )}
                      onClick={() => selectSaved(option)}
                    >
                      <span className="text-[13px] font-medium">
                        {packagingLabel(option.packUnit, units)}
                      </span>
                      <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                        {price != null ? formatMoney(price, currency) : "Ask"}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="radio"
                  aria-checked={optionId == null}
                  className={cn(
                    "border px-3 py-2 text-left text-[13px]",
                    optionId == null
                      ? "border-primary bg-primary/[0.06] font-medium"
                      : "border-border text-muted-foreground hover:bg-muted/40",
                  )}
                  onClick={() => {
                    setOptionId(null);
                    setRemember(canSavePackOption);
                    setError(null);
                  }}
                >
                  Other size
                </button>
              </div>
            ) : null}

            <div className="space-y-2.5">
              <label className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3">
                <span className="text-[13px] text-muted-foreground">Pack name</span>
                <input
                  className={cn(nsdInput, "h-11 text-sm")}
                  value={packUnit}
                  onChange={(event) => {
                    const next = event.target.value;
                    setPackUnit(next);
                    setOptionId(matchSaved(typedUnits, next)?.id ?? null);
                    setError(null);
                  }}
                  list="supply-purchase-units"
                  placeholder="carton, bale, sack"
                  maxLength={32}
                  autoComplete="off"
                  aria-label="Pack name"
                />
                <datalist id="supply-purchase-units">
                  {COMMON_PURCHASE_UNITS.map((unit) => (
                    <option key={unit} value={unit} />
                  ))}
                </datalist>
              </label>

              <label className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3">
                <span className="text-[13px] text-muted-foreground">Pack contains</span>
                <span className="flex h-11 items-center border border-border bg-background">
                  <input
                    ref={containsRef}
                    className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-right font-mono text-base tabular-nums outline-none"
                    value={
                      innerTotal != null ? formatPackUnits(innerTotal) : unitsStr
                    }
                    onChange={(event) => {
                      const next = event.target.value;
                      setUnitsStr(next);
                      const units = toPositiveNumber(next);
                      setOptionId(matchSaved(units, packUnit)?.id ?? null);
                      writeEachFromPack(units, packPriceStr);
                      setError(null);
                    }}
                    readOnly={innerTotal != null}
                    inputMode="decimal"
                    placeholder="6"
                    autoComplete="off"
                    aria-label="Items in one pack"
                  />
                  <span className="pr-2.5 text-[12px] text-muted-foreground">items</span>
                </span>
              </label>

              <MoneyField
                label="Pack price"
                value={packPriceStr}
                placeholder="0"
                inputRef={priceRef}
                invalid={packPriceInvalid}
                onChange={(next) => {
                  setPackPriceStr(next);
                  writeEachFromPack(unitsPerPack, next);
                  setError(null);
                }}
              />

              <MoneyField
                label="Price per item"
                value={eachStr}
                placeholder="0"
                onChange={(next) => {
                  setEachStr(next);
                  const each = next.trim() === "" ? null : toNonNegNumber(next);
                  if (unitsPerPack != null && each != null) {
                    const pack = packPriceFromEach(each, unitsPerPack);
                    setPackPriceStr(pack != null ? formatPackMoneyInput(pack) : "");
                  } else if (next.trim() === "") {
                    setPackPriceStr("");
                  }
                  setError(null);
                }}
              />

              {packSummary && packPriceParsed != null && readoutEach != null ? (
                <p className="text-[13px] tabular-nums text-muted-foreground">
                  {packSummary}
                  {" · "}
                  {formatMoney(packPriceParsed, currency)}
                  {" · "}
                  {formatMoney(readoutEach, currency)} each
                </p>
              ) : packSummary ? (
                <p className="text-[13px] text-muted-foreground">{packSummary}</p>
              ) : null}
            </div>

            <div>
              <button
                type="button"
                className="text-[13px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                aria-expanded={innerOpen}
                onClick={() => {
                  setInnerOpen((openInner) => !openInner);
                  setError(null);
                }}
              >
                {innerOpen ? "Hide smaller packs" : "Smaller packs inside"}
              </button>
              {innerOpen ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="col-span-2 flex flex-col gap-1">
                    <span className="text-[12px] text-muted-foreground">Smaller pack</span>
                    <input
                      className={cn(nsdInput, "h-10")}
                      value={innerUnitStr}
                      onChange={(event) => {
                        setInnerUnitStr(event.target.value);
                        setError(null);
                      }}
                      list="supply-inner-units"
                      placeholder="packet, sachet"
                      maxLength={32}
                      autoComplete="off"
                    />
                    <datalist id="supply-inner-units">
                      {INNER_PACK_UNITS.map((unit) => (
                        <option key={unit} value={unit} />
                      ))}
                    </datalist>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] text-muted-foreground">
                      In one {unitLabel}
                    </span>
                    <input
                      className={cn(nsdInput, "h-10 text-right font-mono")}
                      value={innerCountStr}
                      onChange={(event) => {
                        const next = event.target.value;
                        setInnerCountStr(next);
                        const count = toPositiveNumber(next);
                        const base = toPositiveNumber(innerBaseStr);
                        const total =
                          count != null && base != null ? count * base : null;
                        writeEachFromPack(total, packPriceStr);
                        setError(null);
                      }}
                      inputMode="decimal"
                      placeholder="12"
                      autoComplete="off"
                      aria-label={`Smaller packs in one ${unitLabel}`}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] text-muted-foreground">
                      Items in one {innerUnitStr || "pack"}
                    </span>
                    <input
                      className={cn(nsdInput, "h-10 text-right font-mono")}
                      value={innerBaseStr}
                      onChange={(event) => {
                        const next = event.target.value;
                        setInnerBaseStr(next);
                        const base = toPositiveNumber(next);
                        const count = toPositiveNumber(innerCountStr);
                        const total =
                          count != null && base != null ? count * base : null;
                        writeEachFromPack(total, packPriceStr);
                        setError(null);
                      }}
                      inputMode="decimal"
                      placeholder="10"
                      autoComplete="off"
                      aria-label={`Items in one ${innerUnitStr || "smaller pack"}`}
                    />
                  </label>
                </div>
              ) : null}
            </div>

            {canSavePackOption && optionId == null ? (
              <label className="flex items-center justify-between gap-3 border border-border px-3 py-2">
                <span className="text-[13px]">Remember for this product</span>
                <Switch
                  size="sm"
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked)}
                  aria-label="Remember this packaging for the product"
                />
              </label>
            ) : null}
          </div>

          <DialogFooter className="border-t border-border/60 px-4 py-3 sm:px-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canApply}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleApply();
              }}
            >
              {packSummary ? `Use ${packSummary}` : "Use this pack"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
