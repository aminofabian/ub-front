/**
 * Shared packaging language for product choice, the pack sheet, order lines,
 * and the message that goes to the supplier. One phrase everywhere:
 * "Carton (6 items)" or "Individual item".
 */

export const INDIVIDUAL_ITEM_LABEL = "Individual item";

export type PackOfferSeed = {
  id: string;
  packUnit: string;
  unitsPerPack: number;
  /** Price for one pack. Null when the supplier has not set one. */
  unitPrice: number | null;
  eachPrice?: number | null;
};

export type PackConfigSeed = {
  optionId: string | null;
  unit: string;
  units: string;
  packPrice: string;
  each: string;
};

function positive(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function nonNegative(raw: number | string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function sameSize(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.0001;
}

export function formatPackUnits(n: number): string {
  const rounded = Math.round(n * 10000) / 10000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function roundPackMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatPackMoneyInput(n: number): string {
  const rounded = roundPackMoney(n);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function capitalizePackUnit(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "Pack";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Carton (6 items). One item, or an unknown size, is an individual item. */
export function packagingLabel(
  unit: string | null | undefined,
  units: number | null | undefined,
): string {
  if (units == null || !(units > 1)) return INDIVIDUAL_ITEM_LABEL;
  const count = formatPackUnits(units);
  const noun = units === 1 ? "item" : "items";
  return `${capitalizePackUnit(unit)} (${count} ${noun})`;
}

export function eachFromPackPrice(
  packPrice: number,
  units: number,
): number | null {
  if (!(units > 0) || !Number.isFinite(packPrice) || packPrice < 0) return null;
  return roundPackMoney(packPrice / units);
}

export function packPriceFromEach(each: number, units: number): number | null {
  if (!(units > 0) || !Number.isFinite(each) || each < 0) return null;
  return roundPackMoney(each * units);
}

function offerPrice(
  units: number,
  explicitPackPrice: number | null,
  knownEach: number | null,
  offer: PackOfferSeed | null,
): number | null {
  if (explicitPackPrice != null) return explicitPackPrice;
  if (offer?.unitPrice != null) return offer.unitPrice;
  if (offer?.eachPrice != null) return packPriceFromEach(offer.eachPrice, units);
  if (knownEach != null) return packPriceFromEach(knownEach, units);
  return null;
}

function matchingOffer(
  offers: PackOfferSeed[],
  units: number | null,
  unit: string | null,
): PackOfferSeed | null {
  if (units == null) return null;
  const wanted = unit?.trim().toLowerCase() ?? "";
  const sized = offers.filter((offer) => sameSize(offer.unitsPerPack, units));
  if (sized.length === 0) return null;
  if (!wanted) return sized[0] ?? null;
  return (
    sized.find((offer) => offer.packUnit.trim().toLowerCase() === wanted) ??
    sized[0] ??
    null
  );
}

/**
 * Fill the pack sheet from a saved shape. An explicit pack price already on
 * the line wins. Otherwise the saved pack price, then price-per-item × count.
 */
export function seedPackConfiguration(args: {
  packUnit?: string | null;
  packSize?: number | string | null;
  packPrice?: number | string | null;
  knownEach?: number | string | null;
  saved?: PackOfferSeed[] | null;
}): PackConfigSeed {
  const offers = args.saved?.filter((offer) => offer.unitsPerPack > 1) ?? [];
  const hintedSize = positive(args.packSize);
  const hintedUnit = args.packUnit?.trim() || null;
  const explicitPrice = nonNegative(args.packPrice);
  const knownEach = positive(args.knownEach);
  const matched =
    matchingOffer(offers, hintedSize, hintedUnit) ??
    (hintedSize == null ? offers[0] ?? null : null);
  const unit = (matched?.packUnit || hintedUnit || "pack").trim() || "pack";
  const units = matched?.unitsPerPack ?? hintedSize;
  if (units == null) {
    return { optionId: null, unit, units: "", packPrice: "", each: "" };
  }
  const pack = offerPrice(units, explicitPrice, knownEach, matched);
  const each = pack != null ? eachFromPackPrice(pack, units) : null;
  return {
    optionId: matched?.id ?? null,
    unit,
    units: formatPackUnits(units),
    packPrice: pack != null ? formatPackMoneyInput(pack) : "",
    each: each != null ? formatPackMoneyInput(each) : "",
  };
}

/** Product column and supplier message: name plus how it is packed. */
export function orderLinePackName(
  productName: string,
  pack: { unit?: string | null; units?: number | null } | null | undefined,
  offersPacks: boolean,
): string {
  const name = productName.trim() || "Item";
  const units = pack?.units;
  if (units != null && units > 1) {
    return `${name} — ${packagingLabel(pack?.unit, units)}`;
  }
  if (offersPacks) return `${name} — ${INDIVIDUAL_ITEM_LABEL}`;
  return name;
}
