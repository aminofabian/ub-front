import type { LandingContent } from "@/lib/storefront-templates";

export const COMING_SOON_PHOTO_FIELDS = {
  cover: "vitrineImageUrl",
  story: "storyImageUrl",
  shop: "visitImageUrl",
} as const;

export type ComingSoonPhotoSlot = keyof typeof COMING_SOON_PHOTO_FIELDS;

const SLOT_PHOTO_KEY = {
  cover: "hero",
  story: "story",
  shop: "visit",
} as const;

export type ComingSoonPhotoKey = (typeof SLOT_PHOTO_KEY)[ComingSoonPhotoSlot];

export function comingSoonPhotoKey(slot: ComingSoonPhotoSlot): ComingSoonPhotoKey {
  return SLOT_PHOTO_KEY[slot];
}

export function mergeLandingPhoto(
  stored: LandingContent | null | undefined,
  visible: LandingContent | null | undefined,
  slot: ComingSoonPhotoSlot,
  url: string | null,
): LandingContent {
  const next: LandingContent = { ...(stored ?? {}) };
  const page = visible ?? {};
  for (const field of Object.values(COMING_SOON_PHOTO_FIELDS)) {
    const current = page[field]?.trim();
    if (current) next[field] = current;
  }
  const trimmed = url?.trim() ?? "";
  next[COMING_SOON_PHOTO_FIELDS[slot]] = trimmed || null;
  return next;
}
