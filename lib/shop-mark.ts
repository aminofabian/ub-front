import { pickReadableTextColor } from "@/lib/branding-color-presets";

/** One drawn emblem. `lettermark` is the monogram used when the trade is unknown. */
export type ShopMarkKind =
  | "lettermark"
  | "butchery"
  | "mini-mart"
  | "full-grocery"
  | "fresh-market"
  | "mixed-shop"
  | "cosmetics"
  | "wines-spirits"
  | "pharmacy"
  | "barbershop"
  | "salon"
  | "spa"
  | "nail-studio"
  | "beauty-parlour"
  | "restaurant"
  | "cafe"
  | "fast-food"
  | "bar"
  | "lodging";

export type ShopMarkColors = {
  plate: string;
  deep: string;
  ink: string;
  soft: string;
  label: string;
  labelInk: string;
};

type ShopMark = {
  kind: ShopMarkKind;
  label: string;
};

const LETTERMARK: ShopMark = { kind: "lettermark", label: "Name" };

const SHOP_MARKS: Record<string, ShopMark> = {
  butchery: { kind: "butchery", label: "Butchery" },
  "mini-mart": { kind: "mini-mart", label: "Mini mart" },
  "full-grocery": { kind: "full-grocery", label: "Grocery" },
  "fresh-market": { kind: "fresh-market", label: "Fresh market" },
  "mixed-shop": { kind: "mixed-shop", label: "Mixed shop" },
  cosmetics: { kind: "cosmetics", label: "Cosmetics" },
  "wines-spirits": { kind: "wines-spirits", label: "Wines and spirits" },
  pharmacy: { kind: "pharmacy", label: "Pharmacy" },
  barbershop: { kind: "barbershop", label: "Barbershop" },
  salon: { kind: "salon", label: "Salon" },
  spa: { kind: "spa", label: "Spa" },
  "nail-studio": { kind: "nail-studio", label: "Nail studio" },
  "beauty-parlour": { kind: "beauty-parlour", label: "Beauty parlour" },
  restaurant: { kind: "restaurant", label: "Restaurant" },
  cafe: { kind: "cafe", label: "Café" },
  "fast-food": { kind: "fast-food", label: "Takeaway" },
  bar: { kind: "bar", label: "Bar" },
  lodging: { kind: "lodging", label: "Guest house" },
  other: LETTERMARK,
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const channel = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function mixHex(a: string, b: string, t: number): string {
  const from = hexToRgb(a);
  const to = hexToRgb(b);
  return rgbToHex(
    from.r + (to.r - from.r) * t,
    from.g + (to.g - from.g) * t,
    from.b + (to.b - from.b) * t,
  );
}

/** First chosen shop format wins. An empty or unknown list is a name seal. */
export function resolveShopMark(
  storeTypes: readonly string[] | null | undefined,
): ShopMark {
  for (const raw of storeTypes ?? []) {
    const found = SHOP_MARKS[raw.trim().toLowerCase()];
    if (found) return found;
  }
  return LETTERMARK;
}

export function shopMarkCaption(
  storeTypes: readonly string[] | null | undefined,
): string {
  const mark = resolveShopMark(storeTypes);
  if (mark.kind === "lettermark") {
    return "Name mark from your shop name — upload anytime to replace";
  }
  return `${mark.label} mark from your shop name — upload anytime to replace`;
}

/** Plate, ink, and inset-label colours for one emblem. */
export function shopMarkColors(
  primary: string,
  primaryDeep: string,
  onBrand: boolean,
): ShopMarkColors {
  if (onBrand) {
    return {
      plate: "#FFFFFF",
      deep: mixHex(primary, "#FFFFFF", 0.72),
      ink: primary,
      soft: mixHex(primary, "#FFFFFF", 0.4),
      label: primary,
      labelInk: pickReadableTextColor(primary),
    };
  }
  const ink = pickReadableTextColor(primary);
  const lightInk = ink === "#FFFFFF";
  return {
    plate: primary,
    deep: primaryDeep,
    ink,
    soft: lightInk ? "rgba(255,255,255,0.78)" : "rgba(17,24,39,0.4)",
    label: "#FFFFFF",
    labelInk: lightInk ? primary : "#111827",
  };
}
