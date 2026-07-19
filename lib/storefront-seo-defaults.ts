/**
 * Fallback storefront SEO when a tenant has not set branding.metaTitle /
 * branding.metaDescription. Area comes from branch localities (onboarding +
 * branch name/address). Admins override under Business → Branding → Search & social
 * and may use [Area] / [Country] placeholders in custom copy.
 */

export type StorefrontSeoLocation = {
  /** Short locality labels, e.g. ["Westlands", "Kasarani"]. */
  areas?: readonly string[] | null;
  /** ISO-3166 alpha-2, e.g. "KE". */
  countryCode?: string | null;
};

const COUNTRY_DISPLAY: Record<string, string> = {
  KE: "Kenya",
  UG: "Uganda",
  TZ: "Tanzania",
  RW: "Rwanda",
  ET: "Ethiopia",
};

/** Shopper-facing country name; defaults to Kenya when unknown/empty. */
export function countryDisplayName(countryCode?: string | null): string {
  const code = (countryCode ?? "KE").trim().toUpperCase();
  return COUNTRY_DISPLAY[code] ?? code;
}

/**
 * Primary area for titles — first cleaned label.
 * Prefers onboarding localities, then branch address first segment, then
 * branch name with a trailing " branch" stripped.
 */
export function primaryStorefrontArea(
  areas?: readonly string[] | null,
): string | null {
  if (!areas?.length) {
    return null;
  }
  for (const raw of areas) {
    const cleaned = cleanLocationLabel(raw);
    if (cleaned) {
      return cleaned;
    }
  }
  return null;
}

/** Formats areas for prose: "Westlands", "Westlands & Kasarani", or "Westlands, Kasarani & Ruiru". */
export function formatAreaPhrase(areas?: readonly string[] | null): string | null {
  const cleaned = (areas ?? [])
    .map(cleanLocationLabel)
    .filter((v): v is string => Boolean(v));
  if (cleaned.length === 0) {
    return null;
  }
  if (cleaned.length === 1) {
    return cleaned[0]!;
  }
  if (cleaned.length === 2) {
    return `${cleaned[0]} & ${cleaned[1]}`;
  }
  const head = cleaned.slice(0, -1).join(", ");
  return `${head} & ${cleaned[cleaned.length - 1]}`;
}

export function cleanLocationLabel(raw: string | null | undefined): string | null {
  let value = (raw ?? "").trim();
  if (!value) {
    return null;
  }
  value = value.replace(/\s+branch$/i, "").trim();
  if (value.includes(",")) {
    const first = value.split(",", 2)[0]?.trim() ?? "";
    if (first && first.length <= 48) {
      value = first;
    }
  }
  if (value.length > 64) {
    value = value.slice(0, 64).trim();
  }
  return value || null;
}

/** Derive locality labels from branch records (mirrors backend BranchLocalityLabels). */
export function localitiesFromBranches(
  branches: readonly {
    name?: string | null;
    address?: string | null;
    active?: boolean | null;
  }[],
  onboardingLocalities?: readonly string[] | null,
): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string | null | undefined) => {
    const cleaned = cleanLocationLabel(raw);
    if (!cleaned) {
      return;
    }
    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    labels.push(cleaned);
  };
  for (const loc of onboardingLocalities ?? []) {
    push(loc);
  }
  for (const branch of branches) {
    if (branch.active === false) {
      continue;
    }
    const fromAddress = cleanLocationLabel(branch.address);
    if (fromAddress) {
      push(fromAddress);
      continue;
    }
    push(branch.name);
  }
  return labels;
}

export type StorefrontSeoVars = {
  displayName: string;
  area?: string | null;
  country?: string | null;
};

function seoVars(
  displayName: string,
  location?: StorefrontSeoLocation | null,
): StorefrontSeoVars {
  const name = displayName.trim() || "Neighborhood Shop";
  return {
    displayName: name,
    area: primaryStorefrontArea(location?.areas),
    country: countryDisplayName(location?.countryCode),
  };
}

/**
 * Substitutes [Area], [Country], [Name] (and {area}/{country}/{name}) in
 * admin-authored SEO templates. Tidies leftover "in ," when area is missing.
 */
export function applySeoPlaceholders(
  template: string,
  vars: StorefrontSeoVars,
): string {
  let out = template;
  out = out.replace(/\[Area\]|\{area\}/gi, vars.area?.trim() || "");
  out = out.replace(/\[Country\]|\{country\}/gi, vars.country?.trim() || "Kenya");
  out = out.replace(
    /\[Name\]|\{name\}|\{displayName\}/gi,
    vars.displayName.trim() || "",
  );
  out = out.replace(/\bin\s*,/gi, "in");
  out = out.replace(/\s{2,}/g, " ");
  out = out.replace(/\s+,/g, ",");
  out = out.replace(/,\s*,/g, ",");
  return out.trim().replace(/^[,|]\s*/, "").replace(/\s*[,|]$/, "");
}

export function defaultStorefrontMetaTitle(
  displayName: string,
  location?: StorefrontSeoLocation | null,
): string {
  const vars = seoVars(displayName, location);
  if (vars.area) {
    return `${vars.displayName} | Groceries & Essentials in ${vars.area}, ${vars.country}`;
  }
  return `${vars.displayName} | Groceries & Essentials in ${vars.country}`;
}

export function defaultStorefrontMetaDescription(
  displayName: string,
  location?: StorefrontSeoLocation | null,
): string {
  const vars = seoVars(displayName, location);
  const areaPhrase = formatAreaPhrase(location?.areas);
  if (areaPhrase) {
    return `${vars.displayName} — your neighborhood shop in ${areaPhrase}. Browse products, check prices and stock, then pick up in store or get delivery. Fresh stock and fair prices.`;
  }
  return `${vars.displayName} — your neighborhood shop. Browse products, check prices and stock, then pick up in store or get delivery. Fresh stock and fair prices.`;
}

export function defaultStorefrontMetaKeywords(
  displayName: string,
  location?: StorefrontSeoLocation | null,
): string {
  const vars = seoVars(displayName, location);
  const area = primaryStorefrontArea(location?.areas);
  return [
    vars.displayName || undefined,
    area || undefined,
    vars.country,
    "groceries",
    "essentials",
    "neighborhood shop",
    "local store",
    "shop online",
    "pick up in store",
    "delivery",
    "fair prices",
    "in stock",
  ]
    .filter(Boolean)
    .join(", ");
}

/** Resolve effective title: custom (with placeholders) or location-aware default. */
export function resolveStorefrontMetaTitle(
  displayName: string,
  metaTitle: string | null | undefined,
  location?: StorefrontSeoLocation | null,
): string {
  const vars = seoVars(displayName, location);
  const custom = metaTitle?.trim();
  if (custom) {
    return applySeoPlaceholders(custom, vars);
  }
  return defaultStorefrontMetaTitle(displayName, location);
}

/** Resolve effective description: custom (with placeholders) or location-aware default. */
export function resolveStorefrontMetaDescription(
  displayName: string,
  metaDescription: string | null | undefined,
  location?: StorefrontSeoLocation | null,
): string {
  const vars = seoVars(displayName, location);
  const custom = metaDescription?.trim();
  if (custom) {
    return applySeoPlaceholders(custom, vars);
  }
  return defaultStorefrontMetaDescription(displayName, location);
}
