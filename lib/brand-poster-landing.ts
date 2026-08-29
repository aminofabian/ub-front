import type { LandingContent } from "@/lib/storefront-templates";

export type BrandPosterTone = "paper" | "night";

export type BrandPosterLandingForm = {
  tagline: string;
  editionText: string;
  spineText: string;
  badgeLabel: string;
  contactLead: string;
  secondaryImageUrl: string;
  tone: BrandPosterTone;
};

export const DEFAULT_BRAND_POSTER_FORM: BrandPosterLandingForm = {
  tagline: "",
  editionText: "",
  spineText: "",
  badgeLabel: "",
  contactLead:
    "Questions before we open? Reach out — a real person will reply.",
  secondaryImageUrl: "",
  tone: "paper",
};

export type BrandPosterResolvedCopy = {
  storeName: string;
  headline: string;
  subheadline: string;
  tagline: string | null;
  editionText: string;
  spineText: string;
  badgeLabel: string;
  contactLead: string;
  ctaLabel: string;
  hours: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  heroImageUrl: string | null;
  secondaryImageUrl: string | null;
  tone: BrandPosterTone;
};

function pick(
  content: LandingContent | null | undefined,
  key: keyof LandingContent,
): string | null {
  const value = content?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function trimOrNull(value: string): string | null {
  return value.trim() || null;
}

export function patchBrandPoster(
  prev: BrandPosterLandingForm,
  patch: Partial<BrandPosterLandingForm>,
): BrandPosterLandingForm {
  return { ...prev, ...patch };
}

export function brandPosterFormFromLandingContent(
  storeName: string,
  content: LandingContent | null | undefined,
): BrandPosterLandingForm {
  const toneRaw = pick(content, "posterTone");
  const tone: BrandPosterTone = toneRaw === "night" ? "night" : "paper";

  return {
    tagline: pick(content, "posterTagline") ?? "",
    editionText: pick(content, "posterEditionText") ?? "",
    spineText: pick(content, "posterSpineText") ?? "",
    badgeLabel: pick(content, "posterBadgeLabel") ?? "",
    contactLead:
      pick(content, "posterContactLead") ??
      DEFAULT_BRAND_POSTER_FORM.contactLead,
    secondaryImageUrl: pick(content, "posterSecondaryImageUrl") ?? "",
    tone,
  };
}

export function brandPosterFieldsForLandingContent(
  form: BrandPosterLandingForm,
): Pick<
  LandingContent,
  | "posterTagline"
  | "posterEditionText"
  | "posterSpineText"
  | "posterBadgeLabel"
  | "posterContactLead"
  | "posterSecondaryImageUrl"
  | "posterTone"
> {
  return {
    posterTagline: trimOrNull(form.tagline),
    posterEditionText: trimOrNull(form.editionText),
    posterSpineText: trimOrNull(form.spineText),
    posterBadgeLabel: trimOrNull(form.badgeLabel),
    posterContactLead: trimOrNull(form.contactLead),
    posterSecondaryImageUrl: trimOrNull(form.secondaryImageUrl),
    posterTone: form.tone === "night" ? "night" : null,
  };
}

export function resolveBrandPosterCopy(
  storeName: string,
  content: LandingContent | null | undefined,
  heroFallbackUrl: string | null | undefined,
): BrandPosterResolvedCopy {
  const form = brandPosterFormFromLandingContent(storeName, content);
  const hours = pick(content, "hours");
  const badgeDefault = hours ? "Open for visits" : "Opening soon";

  return {
    storeName,
    headline: pick(content, "headline") ?? storeName,
    subheadline:
      pick(content, "subheadline") ??
      "Something good is on the way. Watch this space.",
    tagline: trimOrNull(form.tagline),
    editionText:
      form.editionText.trim() || String(new Date().getFullYear()),
    spineText:
      form.spineText.trim() || `Coming soon · ${storeName}`,
    badgeLabel: form.badgeLabel.trim() || badgeDefault,
    contactLead:
      form.contactLead.trim() || DEFAULT_BRAND_POSTER_FORM.contactLead,
    ctaLabel: pick(content, "ctaLabel") ?? "Get in touch",
    hours,
    address: pick(content, "address"),
    phone: pick(content, "phone"),
    whatsapp: pick(content, "whatsapp"),
    heroImageUrl:
      pick(content, "vitrineImageUrl")?.trim() ||
      heroFallbackUrl?.trim() ||
      null,
    secondaryImageUrl: trimOrNull(form.secondaryImageUrl),
    tone: form.tone,
  };
}
