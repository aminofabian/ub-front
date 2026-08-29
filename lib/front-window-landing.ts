import type { LandingContent } from "@/lib/storefront-templates";

export type LandingHighlight = {
  title: string;
  note?: string | null;
  imageUrl?: string | null;
};

export type FrontWindowLandingForm = {
  vitrineImageUrl: string;
  storyImageUrl: string;
  visitImageUrl: string;
  storyTitle: string;
  storyBody: string;
  storyQuote: string;
  carryTitle: string;
  carryLead: string;
  visitTitle: string;
  holdAtCounterNote: string;
  contactTitle: string;
  contactBody: string;
  secondaryCtaLabel: string;
  navStoryLabel: string;
  navCarryLabel: string;
  navVisitLabel: string;
  navContactLabel: string;
  highlights: { title: string; note: string; imageUrl: string }[];
};

export const FRONT_WINDOW_HIGHLIGHT_SLOTS = 6;

export const DEFAULT_FRONT_WINDOW_HIGHLIGHTS: readonly {
  title: string;
  note: string;
}[] = [
  {
    title: "Notebooks and journals",
    note: "Hardback, spiral, and pocket sizes for school and desk.",
  },
  {
    title: "Fine pens and pencils",
    note: "Ballpoints, gel, fountain-friendly inks, and sharpeners.",
  },
  {
    title: "Gift wrap and cards",
    note: "Ribbon, tissue, bags, and greeting cards for every occasion.",
  },
  {
    title: "Office essentials",
    note: "Files, staplers, clips and tape. The everyday counter staples.",
  },
  {
    title: "Art supplies",
    note: "Markers, sketch pads, paints, and craft basics.",
  },
  {
    title: "School packs",
    note: "Term lists, bulk stationery, and student-friendly bundles.",
  },
];

export const DEFAULT_FRONT_WINDOW_FORM: FrontWindowLandingForm = {
  vitrineImageUrl: "",
  storyImageUrl: "",
  visitImageUrl: "",
  storyTitle: "A counter you can actually walk up to.",
  storyBody: "",
  storyQuote:
    "We opened so students, offices, and gift-givers could get what they need without hunting through a mega-store.",
  carryTitle: "Stocked for desk, school and gift.",
  carryLead:
    "Walk the aisles in person. These are the counters our regulars come back for. Ask if you need something specific; we reorder fast.",
  visitTitle: "Find us on the street.",
  holdAtCounterNote:
    "Message us on WhatsApp if you want something ready when you arrive.",
  contactTitle: "Say hello from the sidewalk.",
  contactBody: "",
  secondaryCtaLabel: "Plan your visit",
  navStoryLabel: "Our story",
  navCarryLabel: "What we carry",
  navVisitLabel: "Visit",
  navContactLabel: "Contact",
  highlights: DEFAULT_FRONT_WINDOW_HIGHLIGHTS.map((item) => ({
    title: item.title,
    note: item.note,
    imageUrl: "",
  })),
};

export type FrontWindowResolvedCopy = {
  storeName: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  secondaryCtaLabel: string;
  hours: string;
  address: string;
  phone: string | null;
  whatsapp: string | null;
  vitrineImageUrl: string;
  storyImageUrl: string;
  visitImageUrl: string;
  storyTitle: string;
  storyBody: string;
  storyQuote: string;
  carryTitle: string;
  carryLead: string;
  visitTitle: string;
  holdAtCounterNote: string;
  contactTitle: string;
  contactBody: string;
  navStoryLabel: string;
  navCarryLabel: string;
  navVisitLabel: string;
  navContactLabel: string;
  highlights: LandingHighlight[];
};

function pick(content: LandingContent | null | undefined, key: keyof LandingContent) {
  const v = content?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function normalizeHighlights(
  raw: LandingContent["highlights"] | undefined,
): Array<{ title: string; note: string | null; imageUrl: string | null }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ title: string; note: string | null; imageUrl: string | null }> =
    [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const title =
      typeof item.title === "string" ? item.title.trim() : "";
    if (!title) continue;
    out.push({
      title,
      note:
        typeof item.note === "string" && item.note.trim()
          ? item.note.trim()
          : null,
      imageUrl:
        typeof item.imageUrl === "string" && item.imageUrl.trim()
          ? item.imageUrl.trim()
          : null,
    });
  }
  return out;
}

export function frontWindowFormFromLandingContent(
  storeName: string,
  content: LandingContent | null | undefined,
): FrontWindowLandingForm {
  const saved = normalizeHighlights(content?.highlights);
  const highlights = Array.from({ length: FRONT_WINDOW_HIGHLIGHT_SLOTS }, (_, i) => {
    const savedItem = saved[i];
    const fallback = DEFAULT_FRONT_WINDOW_HIGHLIGHTS[i];
    return {
      title: savedItem?.title ?? fallback?.title ?? "",
      note: savedItem?.note ?? fallback?.note ?? "",
      imageUrl: savedItem?.imageUrl ?? "",
    };
  });

  const defaultStoryBody = `${storeName} is a neighborhood stationery shop: the kind with someone behind the counter who knows which notebook lays flat, which pen will not bleed, and where to find the right gift wrap before closing. No warehouse aisles. A well-stocked shelf and a person who will help you choose.`;

  const defaultContactBody = `Questions about stock, bulk orders, or school lists? A real person at ${storeName} will reply.`;

  return {
    vitrineImageUrl: pick(content, "vitrineImageUrl") ?? "",
    storyImageUrl: pick(content, "storyImageUrl") ?? "",
    visitImageUrl: pick(content, "visitImageUrl") ?? "",
    storyTitle: pick(content, "storyTitle") ?? DEFAULT_FRONT_WINDOW_FORM.storyTitle,
    storyBody: pick(content, "storyBody") ?? defaultStoryBody,
    storyQuote: pick(content, "storyQuote") ?? DEFAULT_FRONT_WINDOW_FORM.storyQuote,
    carryTitle: pick(content, "carryTitle") ?? DEFAULT_FRONT_WINDOW_FORM.carryTitle,
    carryLead: pick(content, "carryLead") ?? DEFAULT_FRONT_WINDOW_FORM.carryLead,
    visitTitle: pick(content, "visitTitle") ?? DEFAULT_FRONT_WINDOW_FORM.visitTitle,
    holdAtCounterNote:
      pick(content, "holdAtCounterNote") ??
      DEFAULT_FRONT_WINDOW_FORM.holdAtCounterNote,
    contactTitle:
      pick(content, "contactTitle") ?? DEFAULT_FRONT_WINDOW_FORM.contactTitle,
    contactBody: pick(content, "contactBody") ?? defaultContactBody,
    secondaryCtaLabel:
      pick(content, "secondaryCtaLabel") ??
      DEFAULT_FRONT_WINDOW_FORM.secondaryCtaLabel,
    navStoryLabel:
      pick(content, "navStoryLabel") ?? DEFAULT_FRONT_WINDOW_FORM.navStoryLabel,
    navCarryLabel:
      pick(content, "navCarryLabel") ?? DEFAULT_FRONT_WINDOW_FORM.navCarryLabel,
    navVisitLabel:
      pick(content, "navVisitLabel") ?? DEFAULT_FRONT_WINDOW_FORM.navVisitLabel,
    navContactLabel:
      pick(content, "navContactLabel") ?? DEFAULT_FRONT_WINDOW_FORM.navContactLabel,
    highlights,
  };
}

export function frontWindowFieldsForLandingContent(
  form: FrontWindowLandingForm,
): Pick<
  LandingContent,
  | "vitrineImageUrl"
  | "storyImageUrl"
  | "visitImageUrl"
  | "storyTitle"
  | "storyBody"
  | "storyQuote"
  | "carryTitle"
  | "carryLead"
  | "visitTitle"
  | "holdAtCounterNote"
  | "contactTitle"
  | "contactBody"
  | "secondaryCtaLabel"
  | "navStoryLabel"
  | "navCarryLabel"
  | "navVisitLabel"
  | "navContactLabel"
  | "highlights"
> {
  const highlights = form.highlights
    .map((item) => ({
      title: item.title.trim(),
      note: item.note.trim() || null,
      imageUrl: item.imageUrl.trim() || null,
    }))
    .filter((item) => item.title.length > 0);

  const trimOrNull = (value: string) => value.trim() || null;

  return {
    vitrineImageUrl: trimOrNull(form.vitrineImageUrl),
    storyImageUrl: trimOrNull(form.storyImageUrl),
    visitImageUrl: trimOrNull(form.visitImageUrl),
    storyTitle: trimOrNull(form.storyTitle),
    storyBody: trimOrNull(form.storyBody),
    storyQuote: trimOrNull(form.storyQuote),
    carryTitle: trimOrNull(form.carryTitle),
    carryLead: trimOrNull(form.carryLead),
    visitTitle: trimOrNull(form.visitTitle),
    holdAtCounterNote: trimOrNull(form.holdAtCounterNote),
    contactTitle: trimOrNull(form.contactTitle),
    contactBody: trimOrNull(form.contactBody),
    secondaryCtaLabel: trimOrNull(form.secondaryCtaLabel),
    navStoryLabel: trimOrNull(form.navStoryLabel),
    navCarryLabel: trimOrNull(form.navCarryLabel),
    navVisitLabel: trimOrNull(form.navVisitLabel),
    navContactLabel: trimOrNull(form.navContactLabel),
    highlights: highlights.length > 0 ? highlights : null,
  };
}

export function resolveFrontWindowCopy(
  storeName: string,
  content: LandingContent | null | undefined,
  heroFallbackUrl: string | null | undefined,
): FrontWindowResolvedCopy {
  const form = frontWindowFormFromLandingContent(storeName, content);

  return {
    storeName,
    headline: pick(content, "headline") ?? storeName,
    subheadline:
      pick(content, "subheadline") ??
      "Pens, paper, gifts and everyday essentials, curated at our neighborhood counter.",
    ctaLabel: pick(content, "ctaLabel") ?? "Message us",
    secondaryCtaLabel: form.secondaryCtaLabel,
    hours: pick(content, "hours") ?? "Mon–Sat 8:00–19:00 · Sun 9:00–17:00",
    address:
      pick(content, "address") ?? "Walk in. We are easy to find on the high street.",
    phone: pick(content, "phone"),
    whatsapp: pick(content, "whatsapp"),
    vitrineImageUrl:
      form.vitrineImageUrl.trim() ||
      heroFallbackUrl?.trim() ||
      "/storefront/front-window/vitrine.png",
    storyImageUrl:
      form.storyImageUrl.trim() || "/storefront/front-window/counter.png",
    visitImageUrl:
      form.visitImageUrl.trim() || "/storefront/front-window/street.png",
    storyTitle: form.storyTitle,
    storyBody: form.storyBody,
    storyQuote: form.storyQuote,
    carryTitle: form.carryTitle,
    carryLead: form.carryLead,
    visitTitle: form.visitTitle,
    holdAtCounterNote: form.holdAtCounterNote,
    contactTitle: form.contactTitle,
    contactBody: form.contactBody,
    navStoryLabel: form.navStoryLabel,
    navCarryLabel: form.navCarryLabel,
    navVisitLabel: form.navVisitLabel,
    navContactLabel: form.navContactLabel,
    highlights: form.highlights
      .filter((item) => item.title.trim())
      .map((item) => ({
        title: item.title.trim(),
        note: item.note.trim() || null,
        imageUrl: item.imageUrl.trim() || null,
      })),
  };
}

export function landingContentHasFrontWindowFields(
  content: LandingContent | null | undefined,
): boolean {
  if (!content) return false;
  const keys: (keyof LandingContent)[] = [
    "vitrineImageUrl",
    "storyImageUrl",
    "visitImageUrl",
    "storyTitle",
    "storyBody",
    "storyQuote",
    "carryTitle",
    "carryLead",
    "visitTitle",
    "holdAtCounterNote",
    "contactTitle",
    "contactBody",
    "secondaryCtaLabel",
    "navStoryLabel",
    "navCarryLabel",
    "navVisitLabel",
    "navContactLabel",
  ];
  if (keys.some((key) => pick(content, key))) return true;
  return normalizeHighlights(content.highlights).length > 0;
}
