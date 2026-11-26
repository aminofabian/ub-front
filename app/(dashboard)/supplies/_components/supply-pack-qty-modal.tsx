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
import {
  inferSupplyPackSellUnit,
  type SupplyPackSellUnit,
  type SupplySellPricingItem,
} from "@/lib/supply-pack-math";
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
  /** How the line’s sell price should be read after apply. */
  sellUnit: SupplyPackSellUnit;
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
  /** Catalog item — seeds whether shelf sell is per pack or per piece. */
  pricingItem?: SupplySellPricingItem | null;
  /** Existing sell-unit choice when editing a packed line. */
  initialSellUnit?: SupplyPackSellUnit | null;
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

const SIZE_CHIPS = [6, 10, 12, 24, 30, 40] as const;

const MAX_DOTS = 36;

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

function offersFrom(saved: ItemLinkPackOfferRecord[] | null | undefined) {
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
  hint?: string;
  value: string;
  placeholder: string;
  inputRef?: Ref<HTMLInputElement>;
  invalid?: boolean;
  onChange: (value: string) => void;
};

function MoneyField({
  label,
  hint,
  value,
  placeholder,
  inputRef,
  invalid,
  onChange,
}: MoneyFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        {hint ? (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        ) : null}
      </span>
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

/** Geometric fill showing how many pieces sit in one pack (capped for calm). */
function PackFillPreview({
  units,
  packUnit,
}: {
  units: number | null;
  packUnit: string;
}) {
  const count = units != null && units > 1 ? Math.min(units, MAX_DOTS) : 0;
  const overflow = units != null && units > MAX_DOTS ? units - MAX_DOTS : 0;
  const cols =
    count <= 6 ? count || 1 : count <= 12 ? 6 : count <= 24 ? 8 : 9;

  return (
    <div
      className="border border-[color:var(--kiosk-border,rgba(18,26,22,0.10))] bg-[color:var(--kiosk-elevated,#FCFAF5)] px-3 py-3 dark:bg-muted/20"
      aria-hidden={count === 0}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-cormorant)] text-[1.35rem] leading-none tracking-tight text-foreground">
            One {packUnit || "pack"}
          </p>
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
            {units != null && units > 1
              ? overflow > 0
                ? `Holds ${formatPackUnits(units)} · showing the first ${MAX_DOTS}`
                : `Holds ${formatPackUnits(units)}`
              : "How many pieces come in one?"}
          </p>
        </div>
        {units != null && units > 1 ? (
          <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-primary">
            ×{formatPackUnits(units)}
          </span>
        ) : null}
      </div>
      <div
        className="mt-3 grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: count }, (_, index) => (
          <span
            key={index}
            className="aspect-square border border-primary/25 bg-primary/15 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200"
            style={{ animationDelay: `${Math.min(index, 12) * 12}ms` }}
          />
        ))}
      </div>
    </div>
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
  pricingItem = null,
  initialSellUnit = null,
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
  const [sellUnit, setSellUnit] = useState<SupplyPackSellUnit>("pack");
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
    const seededUnits = toPositiveNumber(seed.units);
    setSellUnit(
      initialSellUnit ??
        inferSupplyPackSellUnit(pricingItem, seededUnits),
    );
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
        const named =
          (option.packUnit || "pack").trim().toLowerCase() === wanted;
        return same && named;
      }) ?? null
    );
  };

  const applySize = (size: number) => {
    setUnitsStr(formatPackUnits(size));
    setOptionId(matchSaved(size, packUnit)?.id ?? null);
    writeEachFromPack(size, packPriceStr);
    setInnerOpen(false);
    setError(null);
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
      pack != null
        ? formatPackMoneyInput(eachFromPackPrice(pack, units) ?? 0)
        : "",
    );
    setInnerOpen(false);
    setRemember(false);
    setError(null);
  };

  const handleApply = () => {
    if (!packUnit.trim()) {
      setError("Name this pack — tray, carton, bale, sack.");
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
        setError("Name the smaller pack — packet, sachet.");
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
      sellUnit,
    });
    window.setTimeout(() => onOpenChange(false), 0);
  };

  const sellStory =
    sellUnit === "pack"
      ? `Sell on the line is per ${unitLabel}`
      : "Sell on the line is per piece";
  const storyLine =
    packSummary && packPriceParsed != null && readoutEach != null
      ? `One ${unitLabel} · ${formatMoney(packPriceParsed, currency)} · ${formatMoney(readoutEach, currency)} each · ${sellStory.toLowerCase()}`
      : packSummary
        ? `One ${unitLabel} holds ${formatPackUnits(unitsPerPack!)} — add what the supplier charges · ${sellStory.toLowerCase()}`
        : "Name the pack, say how many it holds, then the price you pay for one.";

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
            <DialogTitle className="font-[family-name:var(--font-cormorant)] text-[1.45rem] font-medium leading-none tracking-tight">
              How the supplier packs this
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {product
                ? `Set one ${unitLabel} for ${product}. Qty and cost on the line stay in ${unitLabel}s.`
                : `Set one ${unitLabel}. Qty and cost on the line stay in ${unitLabel}s.`}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[min(70vh,36rem)] space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            {error ? (
              <p role="alert" className="text-[13px] text-destructive">
                {error}
              </p>
            ) : null}

            <PackFillPreview units={unitsPerPack} packUnit={unitLabel} />

            <p className="border border-primary/20 bg-primary/[0.06] px-3 py-2 text-[13px] leading-snug text-foreground">
              {storyLine}
            </p>

            {saved ? (
              <div
                role="radiogroup"
                aria-label="Saved packs"
                className="flex flex-col gap-1.5"
              >
                <p className="text-[12px] font-medium text-muted-foreground">
                  Saved for this product
                </p>
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
                        "flex items-baseline justify-between gap-3 border px-3 py-2 text-left transition-colors duration-200",
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
                    "border px-3 py-2 text-left text-[13px] transition-colors duration-200",
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
                  Different size
                </button>
              </div>
            ) : null}

            <div className="space-y-3">
              <label className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-foreground">
                  Called a
                </span>
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
                  placeholder="tray, carton, bale, sack"
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

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-foreground">
                  Holds how many
                </span>
                <div className="flex flex-wrap gap-1">
                  {SIZE_CHIPS.map((size) => {
                    const active =
                      !innerOpen &&
                      typedUnits != null &&
                      Math.abs(typedUnits - size) < 0.0001;
                    return (
                      <button
                        key={size}
                        type="button"
                        className={cn(
                          "h-8 min-w-8 border px-2 font-mono text-[12px] tabular-nums transition-colors duration-200",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}
                        aria-pressed={active}
                        onClick={() => applySize(size)}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
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
                    placeholder="30"
                    autoComplete="off"
                    aria-label={`Items in one ${unitLabel}`}
                  />
                  <span className="pr-2.5 text-[12px] text-muted-foreground">
                    in one {unitLabel}
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MoneyField
                  label={`Price of one ${unitLabel}`}
                  hint="What you pay"
                  value={packPriceStr}
                  placeholder="430"
                  inputRef={priceRef}
                  invalid={packPriceInvalid}
                  onChange={(next) => {
                    setPackPriceStr(next);
                    writeEachFromPack(unitsPerPack, next);
                    setError(null);
                  }}
                />
                <MoneyField
                  label="That is, each"
                  hint="Auto from pack"
                  value={eachStr}
                  placeholder="14.33"
                  onChange={(next) => {
                    setEachStr(next);
                    const each =
                      next.trim() === "" ? null : toNonNegNumber(next);
                    if (unitsPerPack != null && each != null) {
                      const pack = packPriceFromEach(each, unitsPerPack);
                      setPackPriceStr(
                        pack != null ? formatPackMoneyInput(pack) : "",
                      );
                    } else if (next.trim() === "") {
                      setPackPriceStr("");
                    }
                    setError(null);
                  }}
                />
              </div>

              <fieldset className="space-y-1.5">
                <legend className="text-[13px] font-medium text-foreground">
                  Shelf sell price is for
                </legend>
                <div
                  role="radiogroup"
                  aria-label="Shelf sell unit"
                  className="grid grid-cols-2 gap-1.5"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={sellUnit === "pack"}
                    className={cn(
                      "border px-3 py-2.5 text-left transition-colors duration-200",
                      sellUnit === "pack"
                        ? "border-primary bg-primary/[0.06]"
                        : "border-border hover:bg-muted/40",
                    )}
                    onClick={() => setSellUnit("pack")}
                  >
                    <span className="block text-[13px] font-semibold">
                      One {unitLabel}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                      Eggs tray @ 450 — same unit as cost
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={sellUnit === "piece"}
                    className={cn(
                      "border px-3 py-2.5 text-left transition-colors duration-200",
                      sellUnit === "piece"
                        ? "border-primary bg-primary/[0.06]"
                        : "border-border hover:bg-muted/40",
                    )}
                    onClick={() => setSellUnit("piece")}
                  >
                    <span className="block text-[13px] font-semibold">
                      One piece
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                      Break a carton, sell each sachet
                    </span>
                  </button>
                </div>
              </fieldset>
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
                {innerOpen
                  ? "Hide smaller packs inside"
                  : "Smaller packs inside this one"}
              </button>
              {innerOpen ? (
                <div className="mt-2 grid grid-cols-2 gap-2 border border-border/70 p-2.5">
                  <label className="col-span-2 flex flex-col gap-1">
                    <span className="text-[12px] text-muted-foreground">
                      Smaller pack
                    </span>
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
                <span className="text-[13px]">
                  Remember this {unitLabel} for the product
                </span>
                <Switch
                  size="sm"
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked)}
                  aria-label={`Remember this ${unitLabel} for the product`}
                />
              </label>
            ) : null}
          </div>

          <DialogFooter className="border-t border-border/60 px-4 py-3 sm:px-5">
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
