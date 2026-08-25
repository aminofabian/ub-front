import type { ThemeOptionValue } from "@/lib/storefront-theme-options";

/**
 * Chem-lab storefront vocabulary. Merchants pick Shop (generic ecommerce) or
 * Lab (reagent bench), then optionally override individual labels.
 */

export type ChemLabVoice = "shop" | "lab";

export type ChemLabCopyKeys = {
  cart: string;
  dispense: string;
  inventory: string;
  searchPrefix: string;
  searchPlaceholder: string;
  rack: string;
  empty: string;
  loadMore: string;
  loading: string;
  busy: string;
  statusOn: string;
  statusIdle: string;
  coaTitle: string;
  assay: string;
  footerCare: string;
  shiftDark: string;
  shiftLight: string;
  statusKey: string;
  compoundKey: string;
  bayKey: string;
  gradeKey: string;
  lotKey: string;
};

export const CHEM_LAB_VOICE_PACKS: Record<ChemLabVoice, ChemLabCopyKeys> = {
  shop: {
    cart: "Cart",
    dispense: "Add",
    inventory: "Inventory",
    searchPrefix: "Find",
    searchPlaceholder: "Search products…",
    rack: "Featured",
    empty: "Nothing here yet — new items arriving soon.",
    loadMore: "Load more",
    loading: "Loading…",
    busy: "Adding…",
    statusOn: "In stock",
    statusIdle: "Idle",
    coaTitle: "Details",
    assay: "",
    footerCare: "Handle with care. Same-day pickup.",
    shiftDark: "Night",
    shiftLight: "Day",
    statusKey: "Status",
    compoundKey: "Product",
    bayKey: "Shelf",
    gradeKey: "Variant",
    lotKey: "Shop",
  },
  lab: {
    cart: "Beaker",
    dispense: "Dispense",
    inventory: "Reagent inventory",
    searchPrefix: "CAS",
    searchPlaceholder: "Lookup compound…",
    rack: "Specimen rack",
    empty: "Bench empty — new compounds arriving soon.",
    loadMore: "Load more compounds",
    loading: "Synthesizing…",
    busy: "Dispensing…",
    statusOn: "On bench",
    statusIdle: "Idle",
    coaTitle: "Certificate of analysis",
    assay: "Assay pass",
    footerCare: "Handle with care. Same-day bench pickup.",
    shiftDark: "Night shift",
    shiftLight: "Day shift",
    statusKey: "Status",
    compoundKey: "Compound",
    bayKey: "Bay",
    gradeKey: "Grade",
    lotKey: "Lot",
  },
};

/** Text option keys merchants can override in the design studio. */
export const CHEM_LAB_COPY_OVERRIDE_KEYS = [
  "cart",
  "dispense",
  "inventory",
  "searchPrefix",
  "searchPlaceholder",
  "rack",
] as const satisfies ReadonlyArray<keyof ChemLabCopyKeys>;

export type ChemLabCopyOverrideKey = (typeof CHEM_LAB_COPY_OVERRIDE_KEYS)[number];

export function chemLabVoiceFromTheme(
  theme: Record<string, Record<string, ThemeOptionValue>> | null | undefined,
): ChemLabVoice {
  const raw = theme?.["chem-lab"]?.voice;
  return raw === "lab" ? "lab" : "shop";
}

/**
 * Resolve one label: stored text override wins, else the active voice pack.
 */
export function chemLabCopyString(
  theme: Record<string, Record<string, ThemeOptionValue>> | null | undefined,
  key: keyof ChemLabCopyKeys,
): string {
  if ((CHEM_LAB_COPY_OVERRIDE_KEYS as readonly string[]).includes(key)) {
    const stored = theme?.["chem-lab"]?.[key];
    if (typeof stored === "string" && stored.trim()) return stored.trim();
  }
  return CHEM_LAB_VOICE_PACKS[chemLabVoiceFromTheme(theme)][key];
}

/** Full resolved vocabulary for the chem-lab theme. */
export function resolveChemLabCopy(
  theme: Record<string, Record<string, ThemeOptionValue>> | null | undefined,
): ChemLabCopyKeys & { voice: ChemLabVoice } {
  const voice = chemLabVoiceFromTheme(theme);
  const pack = CHEM_LAB_VOICE_PACKS[voice];
  const out: ChemLabCopyKeys & { voice: ChemLabVoice } = { ...pack, voice };
  for (const key of CHEM_LAB_COPY_OVERRIDE_KEYS) {
    out[key] = chemLabCopyString(theme, key);
  }
  return out;
}
