"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  StorefrontQuickEditDialog,
  type StorefrontQuickEditField,
} from "@/components/storefront/storefront-quick-edit-dialog";
import { StorefrontCategoryPhotosDialog } from "@/components/storefront/storefront-category-photos-dialog";
import { StorefrontHeroPhotoDialog } from "@/components/storefront/storefront-hero-photo-dialog";
import { StorefrontSectionsToggleDialog } from "@/components/storefront/storefront-sections-toggle-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchBusiness,
  fetchMe,
  updateBusiness,
  uploadMyBrandingLogo,
} from "@/lib/api";
import { getSessionTokens, hasAccessSession } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import { hasPermission, Permission } from "@/lib/permissions";
import type { PublicCategory } from "@/lib/public-storefront";
import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";
import {
  STOREFRONT_DAY_KEYS,
  isValidHoursTime,
  parseStorefrontDesignJson,
  serializeStorefrontDesign,
  storefrontSectionDefaultSettings,
  type StorefrontAboutSectionSettings,
  type StorefrontAnnouncementSectionSettings,
  type StorefrontContactSectionSettings,
  type StorefrontDesign,
  type StorefrontDesignDayHours,
  type StorefrontDesignDayKey,
  type StorefrontDesignHours,
  type StorefrontDesignPhoto,
  type StorefrontHeroSectionSettings,
  type StorefrontPromoSectionSettings,
  type StorefrontSectionConfig,
  type StorefrontSectionId,
  type StorefrontSocialSectionSettings,
} from "@/lib/storefront-design";
import {
  canStorefrontOnPageEdit,
  STOREFRONT_DRAFT_PREVIEW_MAX_CHARS,
  storefrontStaffEditReturnAbsoluteUrl,
  storefrontStaffEditReturnPath,
  storefrontWantsEditFromSearch,
  trackStorefrontEditEvent,
} from "@/lib/storefront-staff-edit";
import { storefrontPreviewUrl } from "@/lib/storefront-preview";
import { serializeThemeOptions } from "@/lib/storefront-theme-options";
import { normalizeStoreThemeId, type StoreThemeId } from "@/lib/storefront-templates";
import { cn } from "@/lib/utils";

export type { StorefrontQuickEditField };
export { storefrontWantsEditFromSearch } from "@/lib/storefront-staff-edit";

function buildSimpleHours(values: Record<string, string>): StorefrontDesignHours {
  const weekdayOpen = isValidHoursTime(values.weekdayOpen)
    ? values.weekdayOpen!
    : "08:00";
  const weekdayClose = isValidHoursTime(values.weekdayClose)
    ? values.weekdayClose!
    : "19:00";
  const saturdayClosed = values.saturdayClosed === "1";
  const sundayClosed = values.sundayClosed !== "0";
  const saturdayOpen = isValidHoursTime(values.saturdayOpen)
    ? values.saturdayOpen!
    : weekdayOpen;
  const saturdayClose = isValidHoursTime(values.saturdayClose)
    ? values.saturdayClose!
    : weekdayClose;
  const sundayOpen = isValidHoursTime(values.sundayOpen)
    ? values.sundayOpen!
    : weekdayOpen;
  const sundayClose = isValidHoursTime(values.sundayClose)
    ? values.sundayClose!
    : weekdayClose;

  const days = {} as Record<StorefrontDesignDayKey, StorefrontDesignDayHours>;
  for (const key of STOREFRONT_DAY_KEYS) {
    if (key === "sat") {
      days[key] = saturdayClosed
        ? { open: false, openTime: saturdayOpen, closeTime: saturdayClose }
        : { open: true, openTime: saturdayOpen, closeTime: saturdayClose };
    } else if (key === "sun") {
      days[key] = sundayClosed
        ? { open: false, openTime: sundayOpen, closeTime: sundayClose }
        : { open: true, openTime: sundayOpen, closeTime: sundayClose };
    } else {
      days[key] = {
        open: true,
        openTime: weekdayOpen,
        closeTime: weekdayClose,
      };
    }
  }
  const note = (values.note ?? "").trim();
  return note ? { days, note } : { days };
}

function hoursFormDefaults(
  hours: StorefrontDesignHours | null | undefined,
): Pick<
  import("@/components/storefront/storefront-quick-edit-dialog").StorefrontQuickEditDefaults,
  | "weekdayOpen"
  | "weekdayClose"
  | "saturdayOpen"
  | "saturdayClose"
  | "saturdayClosed"
  | "sundayOpen"
  | "sundayClose"
  | "sundayClosed"
  | "hoursNote"
> {
  const mon = hours?.days?.mon;
  const sat = hours?.days?.sat;
  const sun = hours?.days?.sun;
  return {
    weekdayOpen: mon?.openTime || "08:00",
    weekdayClose: mon?.closeTime || "19:00",
    saturdayOpen: sat?.openTime || mon?.openTime || "08:00",
    saturdayClose: sat?.closeTime || mon?.closeTime || "19:00",
    saturdayClosed: sat ? !sat.open : false,
    sundayOpen: sun?.openTime || mon?.openTime || "08:00",
    sundayClose: sun?.closeTime || mon?.closeTime || "19:00",
    sundayClosed: sun ? !sun.open : true,
    hoursNote: hours?.note?.trim() || "",
  };
}

type StaffEditContextValue = {
  ready: boolean;
  canEdit: boolean;
  /** Role/settings gate AND `catalog.items.write` — mirrors grocery photo editing. */
  canEditPhotos: boolean;
  /** Role/settings gate AND `catalog.categories.write` — category / aisle photos. */
  canEditCategoryPhotos: boolean;
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  design: StorefrontDesign | null;
  /** True when working design differs from last published / loaded design. */
  dirty: boolean;
  publishDraft: () => Promise<void>;
  discardDraft: () => void;
  previewDraft: () => void;
  imageOverrides: Record<string, string>;
  setImageOverride: (itemId: string, imageUrl: string) => void;
  displayImageUrl: (itemId: string, fallback: string | null) => string | null;
  categoryIconOverrides: Record<string, string>;
  setCategoryIconOverride: (categoryId: string, imageUrl: string) => void;
  displayCategoryIconUrl: (
    categoryId: string,
    fallback: string | null,
  ) => string | null;
  /** Optimistic logo URL after on-page branding upload (saves immediately). */
  logoOverride: string | null;
  displayLogoUrl: (fallback: string | null) => string | null;
  uploadLogo: (file: File) => Promise<string>;
  /** Stage a quick-edit field patch into the draft (shared by sheet + inline). */
  commitInlineField: (
    field: StorefrontQuickEditField,
    values: Record<string, string>,
  ) => Promise<void>;
  /** Stage a per-theme personality string (e.g. chem-lab "Dispense"). */
  patchThemeOption: (
    key: string,
    value: string,
    themeId?: StoreThemeId,
  ) => Promise<void>;
  openQuickEdit: (field: StorefrontQuickEditField) => void;
  openHeroPhoto: () => void;
  openSectionsPanel: () => void;
  openCategoryPhotos: () => void;
  saving: boolean;
};

/** Multi-field blocks open the sheet; single-copy fields focus inline text. */
const SHEET_QUICK_EDIT_FIELDS = new Set<StorefrontQuickEditField>([
  "promo",
  "contact",
  "hours",
  "social",
]);

const StaffEditContext = createContext<StaffEditContextValue | null>(null);

function storefrontWantsEditFromWindow(): boolean {
  if (typeof window === "undefined") return false;
  return storefrontWantsEditFromSearch(window.location.search);
}

function staffEditReturnPath(): string {
  if (typeof window === "undefined") return "/?edit=1";
  return storefrontStaffEditReturnPath(window.location.href);
}

function upsertSection(
  design: StorefrontDesign | null,
  id: StorefrontSectionId,
  patch: {
    enabled?: boolean;
    settings?: Record<string, unknown>;
  },
): StorefrontDesign {
  const base: StorefrontDesign = design
    ? { ...design, version: 1 }
    : { version: 1 };
  const sections = [...(base.sections ?? [])];
  const idx = sections.findIndex((s) => s.id === id);
  const defaults = storefrontSectionDefaultSettings(id);
  const existing = idx >= 0 ? sections[idx]! : null;
  const nextSettings = {
    ...defaults,
    ...(existing?.settings ?? {}),
    ...(patch.settings ?? {}),
  };
  const next: StorefrontSectionConfig = {
    id,
    enabled: patch.enabled ?? existing?.enabled ?? true,
    settings: nextSettings as StorefrontSectionConfig["settings"],
  };
  if (idx >= 0) {
    sections[idx] = next;
  } else {
    sections.push(next);
  }
  return { ...base, sections };
}

export function useStorefrontStaffEditOptional(): StaffEditContextValue | null {
  return useContext(StaffEditContext);
}

export function useStorefrontStaffEdit(): StaffEditContextValue {
  const ctx = useContext(StaffEditContext);
  if (!ctx) {
    throw new Error("useStorefrontStaffEdit requires StorefrontStaffEditProvider");
  }
  return ctx;
}

/** Image URL with optimistic staff override when present. */
export function useStorefrontDisplayImage(
  itemId: string,
  fallback: string | null | undefined,
): string | null {
  const ctx = useStorefrontStaffEditOptional();
  const base = fallback?.trim() || null;
  if (!ctx) return base;
  return ctx.displayImageUrl(itemId, base);
}

/** Category icon URL with optimistic staff override when present. */
export function useStorefrontDisplayCategoryIcon(
  categoryId: string,
  fallback: string | null | undefined,
): string | null {
  const ctx = useStorefrontStaffEditOptional();
  const base = fallback?.trim() || null;
  if (!ctx) return base;
  return ctx.displayCategoryIconUrl(categoryId, base);
}

/** Logo URL with optimistic staff override after on-page upload. */
export function useStorefrontDisplayLogo(
  fallback: string | null | undefined,
): string | null {
  const ctx = useStorefrontStaffEditOptional();
  const base = fallback?.trim() || null;
  if (!ctx) return base;
  return ctx.displayLogoUrl(base);
}

/**
 * Prefer the staff working design while edit mode is on so draft text / sections
 * / hero photo update on the page without waiting for Publish + refresh.
 */
export function useStorefrontLiveDesign(
  fallback: StorefrontDesign | null | undefined,
): StorefrontDesign | null {
  const ctx = useStorefrontStaffEditOptional();
  const base = fallback ?? null;
  if (ctx?.editMode && ctx.design) return ctx.design;
  return base;
}

const SECTION_TO_QUICK_FIELD: Partial<
  Record<StorefrontSectionId, StorefrontQuickEditField>
> = {
  announcement: "announcement",
  promo: "promo",
  hero: "hero",
  about: "about",
  contact: "contact",
  social: "social",
};

export function StorefrontStaffEditProvider({
  initialDesign,
  categories = [],
  children,
}: {
  initialDesign?: StorefrontDesign | null;
  categories?: PublicCategory[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canEditPhotos, setCanEditPhotos] = useState(false);
  const [canEditCategoryPhotos, setCanEditCategoryPhotos] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [design, setDesign] = useState<StorefrontDesign | null>(
    initialDesign ?? null,
  );
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>(
    {},
  );
  const [categoryIconOverrides, setCategoryIconOverrides] = useState<
    Record<string, string>
  >({});
  const [logoOverride, setLogoOverride] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [quickField, setQuickField] = useState<StorefrontQuickEditField | null>(
    null,
  );
  const [heroPhotoOpen, setHeroPhotoOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [categoryPhotosOpen, setCategoryPhotosOpen] = useState(false);
  const [editDeepLink, setEditDeepLink] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [storeThemeId, setStoreThemeId] = useState(() =>
    normalizeStoreThemeId(null),
  );
  const autoEditAppliedRef = useRef(false);
  const publishedDesignRef = useRef<StorefrontDesign | null>(
    initialDesign ?? null,
  );
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (dirtyRef.current) return;
    setDesign(initialDesign ?? null);
    publishedDesignRef.current = initialDesign ?? null;
  }, [initialDesign]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const wantsEdit = storefrontWantsEditFromWindow();
      if (!cancelled) setEditDeepLink(wantsEdit);
      try {
        if (!hasAccessSession() && !getSessionTokens()) {
          await restoreClientSessionFromCookie().catch(() => false);
        }
        if (!hasAccessSession() && !getSessionTokens()) {
          if (!cancelled) {
            setCanEdit(false);
            setCanEditPhotos(false);
            setCanEditCategoryPhotos(false);
            setReady(true);
          }
          return;
        }
        const me = await fetchMe();
        if (cancelled) return;
        const allowed = canStorefrontOnPageEdit({
          roleKey: me.role?.key,
          permissions: me.permissions,
        });
        setCanEdit(allowed);
        setCanEditPhotos(
          allowed &&
            hasPermission(me.permissions, Permission.CatalogItemsWrite),
        );
        setCanEditCategoryPhotos(
          allowed &&
            hasPermission(me.permissions, Permission.CatalogCategoriesWrite),
        );
      } catch {
        if (!cancelled) {
          setCanEdit(false);
          setCanEditPhotos(false);
          setCanEditCategoryPhotos(false);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureDesignLoaded = useCallback(async (): Promise<StorefrontDesign | null> => {
    if (dirtyRef.current && design) return design;
    try {
      const business = await fetchBusiness();
      const parsed = parseStorefrontDesignJson(
        business.storefront?.designJson ?? null,
      );
      setDesign(parsed);
      publishedDesignRef.current = parsed;
      setDirty(false);
      setBusinessId(business.id?.trim() || null);
      setStoreThemeId(
        normalizeStoreThemeId(business.storefront?.storeThemeId),
      );
      return parsed;
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not load shop design",
      );
      return design;
    }
  }, [design]);

  const setEditModeSafe = useCallback(
    (on: boolean) => {
      if (!on && dirtyRef.current) {
        const ok =
          typeof window === "undefined" ||
          window.confirm(
            "You have unpublished changes. Discard them and exit edit mode?",
          );
        if (!ok) return;
        setDesign(publishedDesignRef.current);
        setDirty(false);
      }
      setEditMode(on);
      if (on) {
        trackStorefrontEditEvent("storefront_edit_mode_on");
        void ensureDesignLoaded();
      } else {
        setQuickField(null);
        setHeroPhotoOpen(false);
        setSectionsOpen(false);
        setCategoryPhotosOpen(false);
      }
    },
    [ensureDesignLoaded],
  );

  // `?edit=1` → turn edit mode on once staff capability is known.
  useEffect(() => {
    if (!ready || !canEdit || !editDeepLink || autoEditAppliedRef.current) {
      return;
    }
    autoEditAppliedRef.current = true;
    setEditModeSafe(true);
  }, [ready, canEdit, editDeepLink, setEditModeSafe]);

  const setImageOverride = useCallback((itemId: string, imageUrl: string) => {
    const id = itemId.trim();
    const url = imageUrl.trim();
    if (!id || !url) return;
    setImageOverrides((prev) => ({ ...prev, [id]: url }));
  }, []);

  const displayImageUrl = useCallback(
    (itemId: string, fallback: string | null) => {
      const override = imageOverrides[itemId.trim()];
      return override?.trim() || fallback;
    },
    [imageOverrides],
  );

  const setCategoryIconOverride = useCallback(
    (categoryId: string, imageUrl: string) => {
      const id = categoryId.trim();
      const url = imageUrl.trim();
      if (!id || !url) return;
      setCategoryIconOverrides((prev) => ({ ...prev, [id]: url }));
    },
    [],
  );

  const displayCategoryIconUrl = useCallback(
    (categoryId: string, fallback: string | null) => {
      const override = categoryIconOverrides[categoryId.trim()];
      return override?.trim() || fallback;
    },
    [categoryIconOverrides],
  );

  const displayLogoUrl = useCallback(
    (fallback: string | null) => {
      return logoOverride?.trim() || fallback;
    },
    [logoOverride],
  );

  const uploadLogo = useCallback(
    async (file: File) => {
      let bid = businessId;
      if (!bid) {
        const business = await fetchBusiness();
        bid = business.id?.trim() || null;
        setBusinessId(bid);
      }
      if (!bid) {
        throw new Error("Could not resolve business for logo upload.");
      }
      const updated = await uploadMyBrandingLogo(file, bid);
      const url = updated.branding?.logoUrl?.trim();
      if (!url) {
        throw new Error("Upload finished but no logo URL was returned.");
      }
      setLogoOverride(url);
      trackStorefrontEditEvent("storefront_logo_uploaded");
      toast.success("Logo updated");
      return url;
    },
    [businessId],
  );

  const openQuickEdit = useCallback(
    (field: StorefrontQuickEditField) => {
      if (!canEdit) return;
      if (!editMode) setEditModeSafe(true);
      setQuickField(field);
    },
    [canEdit, editMode, setEditModeSafe],
  );

  const openHeroPhoto = useCallback(() => {
    if (!canEdit) return;
    if (!editMode) setEditModeSafe(true);
    setHeroPhotoOpen(true);
  }, [canEdit, editMode, setEditModeSafe]);

  const openSectionsPanel = useCallback(() => {
    if (!canEdit) return;
    if (!editMode) setEditModeSafe(true);
    setSectionsOpen(true);
  }, [canEdit, editMode, setEditModeSafe]);

  const openCategoryPhotos = useCallback(() => {
    if (!canEdit) return;
    if (!editMode) setEditModeSafe(true);
    setCategoryPhotosOpen(true);
  }, [canEdit, editMode, setEditModeSafe]);

  /** Stage designJson changes locally — shoppers still see the last publish. */
  const applyDraft = useCallback(
    (
      next: StorefrontDesign,
      meta?: {
        field?: string;
        event?: string;
        data?: Record<string, unknown>;
      },
    ) => {
      setDesign(next);
      setDirty(true);
      if (meta?.event) {
        trackStorefrontEditEvent(meta.event, {
          field: meta.field,
          draft: true,
          ...meta.data,
        });
      } else if (meta?.field) {
        trackStorefrontEditEvent("storefront_quick_text_saved", {
          field: meta.field,
          draft: true,
        });
      }
      setQuickField(null);
      setHeroPhotoOpen(false);
    },
    [],
  );

  const publishDraft = useCallback(async () => {
    if (!design || !dirtyRef.current) {
      toast.message("Nothing to publish");
      return;
    }
    setSaving(true);
    try {
      const designJson = serializeStorefrontDesign(design) ?? "";
      await updateBusiness({ storefront: { designJson } });
      publishedDesignRef.current = design;
      setDirty(false);
      toast.success("Published");
      trackStorefrontEditEvent("storefront_design_published");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not publish");
      trackStorefrontEditEvent("storefront_edit_save_failed", {
        field: "publish",
      });
      throw e;
    } finally {
      setSaving(false);
    }
  }, [design, router]);

  const discardDraft = useCallback(() => {
    if (!dirtyRef.current) return;
    setDesign(publishedDesignRef.current);
    setDirty(false);
    setQuickField(null);
    setHeroPhotoOpen(false);
    setSectionsOpen(false);
    toast.message("Draft discarded");
    trackStorefrontEditEvent("storefront_draft_discarded");
  }, []);

  const previewDraft = useCallback(() => {
    if (!design || !dirtyRef.current) {
      toast.message("Make a change first, then preview");
      return;
    }
    const designJson = serializeStorefrontDesign(design) ?? "";
    if (!designJson) {
      toast.error("Could not serialize draft for preview");
      return;
    }
    if (designJson.length > STOREFRONT_DRAFT_PREVIEW_MAX_CHARS) {
      toast.error(
        "Draft is too large to preview in the URL. Publish to see it live.",
      );
      return;
    }
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    if (!origin) return;
    const url = storefrontPreviewUrl(origin, "store", storeThemeId, {
      designJson,
    });
    window.open(url, "_blank", "noopener,noreferrer");
    trackStorefrontEditEvent("storefront_draft_preview_opened");
  }, [design, storeThemeId]);

  const handleQuickSave = useCallback(
    async (field: StorefrontQuickEditField, values: Record<string, string>) => {
      let base = design;
      if (!base) {
        base = await ensureDesignLoaded();
      }
      let next: StorefrontDesign;

      if (field === "announcement") {
        const text =
          values.text !== undefined
            ? values.text.trim()
            : ((base?.sections?.find((s) => s.id === "announcement")
                ?.settings as StorefrontAnnouncementSectionSettings | undefined)
                ?.text ?? "");
        next = upsertSection(base, "announcement", {
          enabled: true,
          settings: { text },
        });
      } else if (field === "promo") {
        const existing = base?.sections?.find((s) => s.id === "promo");
        const prev = (existing?.settings ??
          storefrontSectionDefaultSettings(
            "promo",
          )) as StorefrontPromoSectionSettings;
        next = upsertSection(base, "promo", {
          enabled: true,
          settings: {
            ...prev,
            title:
              values.title !== undefined ? values.title.trim() : prev.title,
            subtitle:
              values.subtitle !== undefined
                ? values.subtitle.trim()
                : prev.subtitle,
            coupon:
              values.coupon !== undefined ? values.coupon.trim() : prev.coupon,
          },
        });
      } else if (field === "hero") {
        const existing = base?.sections?.find((s) => s.id === "hero");
        const prev = (existing?.settings ??
          storefrontSectionDefaultSettings(
            "hero",
          )) as StorefrontHeroSectionSettings;
        next = upsertSection(base, "hero", {
          enabled: true,
          settings: {
            ...prev,
            headline:
              values.headline !== undefined
                ? values.headline.trim()
                : prev.headline,
            subheadline:
              values.subheadline !== undefined
                ? values.subheadline.trim()
                : prev.subheadline,
          },
        });
      } else if (field === "about") {
        const existing = base?.sections?.find((s) => s.id === "about");
        const prev = (existing?.settings ??
          storefrontSectionDefaultSettings(
            "about",
          )) as StorefrontAboutSectionSettings;
        const heading =
          values.heading !== undefined ? values.heading.trim() : prev.heading;
        const text =
          values.text !== undefined ? values.text.trim() : prev.text;
        next = upsertSection(base, "about", {
          enabled: true,
          settings: { ...prev, heading, text },
        });
        next = {
          ...next,
          business: {
            ...(next.business ?? {}),
            description: text || null,
          },
        };
      } else if (field === "contact") {
        next = upsertSection(base, "contact", {
          enabled: true,
          settings: {
            ...((base?.sections?.find((s) => s.id === "contact")?.settings ??
              storefrontSectionDefaultSettings(
                "contact",
              )) as StorefrontContactSectionSettings),
          },
        });
        next = {
          ...next,
          business: {
            ...(next.business ?? {}),
            contact: {
              ...(next.business?.contact ?? {}),
              phone: (values.phone ?? "").trim() || null,
              whatsapp: (values.whatsapp ?? "").trim() || null,
              email: (values.email ?? "").trim() || null,
            },
            location: {
              ...(next.business?.location ?? {}),
              address: (values.address ?? "").trim() || null,
              town: (values.town ?? "").trim() || null,
            },
          },
        };
      } else if (field === "hours") {
        next = upsertSection(base, "contact", {
          enabled: true,
          settings: {
            ...((base?.sections?.find((s) => s.id === "contact")?.settings ??
              storefrontSectionDefaultSettings(
                "contact",
              )) as StorefrontContactSectionSettings),
            showHours: true,
          },
        });
        next = {
          ...next,
          business: {
            ...(next.business ?? {}),
            hours: buildSimpleHours(values),
          },
        };
      } else if (field === "social") {
        const heading = (values.heading ?? "").trim();
        const existing = base?.sections?.find((s) => s.id === "social");
        const prev = (existing?.settings ??
          storefrontSectionDefaultSettings(
            "social",
          )) as StorefrontSocialSectionSettings;
        next = upsertSection(base, "social", {
          enabled: true,
          settings: {
            ...prev,
            heading: heading || prev.heading || "Follow us",
          },
        });
        const social: NonNullable<
          NonNullable<StorefrontDesign["business"]>["social"]
        > = {};
        const instagram = (values.instagram ?? "").trim().slice(0, 160);
        const facebook = (values.facebook ?? "").trim().slice(0, 160);
        const tiktok = (values.tiktok ?? "").trim().slice(0, 160);
        const x = (values.x ?? "").trim().slice(0, 160);
        const youtube = (values.youtube ?? "").trim().slice(0, 160);
        if (instagram) social.instagram = instagram;
        if (facebook) social.facebook = facebook;
        if (tiktok) social.tiktok = tiktok;
        if (x) social.x = x;
        if (youtube) social.youtube = youtube;
        next = {
          ...next,
          business: {
            ...(next.business ?? {}),
            social: Object.keys(social).length > 0 ? social : null,
          },
        };
      } else {
        next = {
          ...(base ?? { version: 1 }),
          version: 1,
          business: {
            ...(base?.business ?? {}),
            tagline:
              values.tagline !== undefined
                ? values.tagline.trim() || null
                : (base?.business?.tagline ?? null),
          },
        };
      }

      applyDraft(next, { field });
    },
    [design, ensureDesignLoaded, applyDraft],
  );

  const commitInlineField = useCallback(
    async (
      field: StorefrontQuickEditField,
      values: Record<string, string>,
    ) => {
      await handleQuickSave(field, values);
      trackStorefrontEditEvent("storefront_inline_text_committed", { field });
    },
    [handleQuickSave],
  );

  const patchThemeOption = useCallback(
    async (key: string, value: string, themeIdArg?: StoreThemeId) => {
      const optionKey = key.trim();
      if (!optionKey) return;
      let base = design;
      if (!base) {
        base = await ensureDesignLoaded();
      }
      const themeId = themeIdArg ?? storeThemeId;
      const blob = { ...(base?.theme ?? {}) };
      const current = { ...(blob[themeId] ?? {}) };
      current[optionKey] = value.trim();
      const serialized = serializeThemeOptions(themeId, current);
      if (serialized) {
        blob[themeId] = serialized;
      } else {
        delete blob[themeId];
      }
      const next: StorefrontDesign = {
        ...(base ?? { version: 1 }),
        version: 1,
        theme: Object.keys(blob).length > 0 ? blob : null,
      };
      applyDraft(next, {
        field: optionKey,
        event: "storefront_theme_option_patched",
        data: { themeId, key: optionKey },
      });
    },
    [design, ensureDesignLoaded, applyDraft, storeThemeId],
  );

  const handleHeroPhotoSave = useCallback(
    async (photo: StorefrontDesignPhoto | null) => {
      let base = design;
      if (!base) {
        base = await ensureDesignLoaded();
      }
      const next: StorefrontDesign = {
        ...(base ?? { version: 1 }),
        version: 1,
        photos: photo ? { hero: photo } : null,
      };
      // Enable hero section when adding a photo so the merchant hero renders.
      const withHero = photo
        ? upsertSection(next, "hero", { enabled: true })
        : next;
      applyDraft(withHero, {
        field: "hero_photo",
        event: "storefront_hero_photo_saved",
        data: { hasPhoto: Boolean(photo) },
      });
    },
    [design, ensureDesignLoaded, applyDraft],
  );

  const handleSectionToggle = useCallback(
    async (id: StorefrontSectionId, enabled: boolean) => {
      let base = design;
      if (!base) {
        base = await ensureDesignLoaded();
      }
      const next = upsertSection(base, id, { enabled });
      applyDraft(next, {
        field: id,
        event: "storefront_section_toggled",
        data: { sectionId: id, enabled },
      });
    },
    [design, ensureDesignLoaded, applyDraft],
  );

  const handleSectionEdit = useCallback(
    (id: StorefrontSectionId) => {
      const field = SECTION_TO_QUICK_FIELD[id];
      if (field) openQuickEdit(field);
    },
    [openQuickEdit],
  );

  const sectionEnabledById = useMemo(() => {
    const map: Partial<Record<StorefrontSectionId, boolean>> = {};
    for (const section of design?.sections ?? []) {
      map[section.id] = section.enabled;
    }
    return map;
  }, [design]);

  const dialogDefaults = useMemo(() => {
    const announcement = design?.sections?.find((s) => s.id === "announcement");
    const promo = design?.sections?.find((s) => s.id === "promo");
    const hero = design?.sections?.find((s) => s.id === "hero");
    const about = design?.sections?.find((s) => s.id === "about");
    const social = design?.sections?.find((s) => s.id === "social");
    const annSettings = announcement?.settings as
      | StorefrontAnnouncementSectionSettings
      | undefined;
    const promoSettings = promo?.settings as
      | StorefrontPromoSectionSettings
      | undefined;
    const heroSettings = hero?.settings as
      | StorefrontHeroSectionSettings
      | undefined;
    const aboutSettings = about?.settings as
      | StorefrontAboutSectionSettings
      | undefined;
    const socialSettings = social?.settings as
      | StorefrontSocialSectionSettings
      | undefined;
    return {
      announcement: annSettings?.text ?? "",
      promoTitle: promoSettings?.title ?? "",
      promoSubtitle: promoSettings?.subtitle ?? "",
      promoCoupon: promoSettings?.coupon ?? "",
      headline: heroSettings?.headline ?? "",
      subheadline: heroSettings?.subheadline ?? "",
      tagline: design?.business?.tagline?.trim() ?? "",
      aboutHeading: aboutSettings?.heading ?? "",
      aboutText:
        aboutSettings?.text?.trim() ||
        design?.business?.description?.trim() ||
        "",
      phone: design?.business?.contact?.phone?.trim() ?? "",
      whatsapp: design?.business?.contact?.whatsapp?.trim() ?? "",
      email: design?.business?.contact?.email?.trim() ?? "",
      address: design?.business?.location?.address?.trim() ?? "",
      town: design?.business?.location?.town?.trim() ?? "",
      ...hoursFormDefaults(design?.business?.hours),
      socialHeading: socialSettings?.heading ?? "",
      instagram: design?.business?.social?.instagram?.trim() ?? "",
      facebook: design?.business?.social?.facebook?.trim() ?? "",
      tiktok: design?.business?.social?.tiktok?.trim() ?? "",
      x: design?.business?.social?.x?.trim() ?? "",
      youtube: design?.business?.social?.youtube?.trim() ?? "",
    };
  }, [design]);

  const value = useMemo<StaffEditContextValue>(
    () => ({
      ready,
      canEdit,
      canEditPhotos,
      canEditCategoryPhotos,
      editMode,
      setEditMode: setEditModeSafe,
      design,
      dirty,
      publishDraft,
      discardDraft,
      previewDraft,
      imageOverrides,
      setImageOverride,
      displayImageUrl,
      categoryIconOverrides,
      setCategoryIconOverride,
      displayCategoryIconUrl,
      logoOverride,
      displayLogoUrl,
      uploadLogo,
      commitInlineField,
      patchThemeOption,
      openQuickEdit,
      openHeroPhoto,
      openSectionsPanel,
      openCategoryPhotos,
      saving,
    }),
    [
      ready,
      canEdit,
      canEditPhotos,
      canEditCategoryPhotos,
      editMode,
      setEditModeSafe,
      design,
      dirty,
      publishDraft,
      discardDraft,
      previewDraft,
      imageOverrides,
      setImageOverride,
      displayImageUrl,
      categoryIconOverrides,
      setCategoryIconOverride,
      displayCategoryIconUrl,
      logoOverride,
      displayLogoUrl,
      uploadLogo,
      commitInlineField,
      patchThemeOption,
      openQuickEdit,
      openHeroPhoto,
      openSectionsPanel,
      openCategoryPhotos,
      saving,
    ],
  );

  return (
    <StaffEditContext.Provider value={value}>
      <StorefrontStaffEditBar editDeepLink={editDeepLink} />
      {children}
      <StorefrontQuickEditDialog
        field={quickField}
        open={quickField != null}
        onOpenChange={(open) => {
          if (!open) setQuickField(null);
        }}
        defaults={dialogDefaults}
        saving={saving}
        onSave={handleQuickSave}
      />
      <StorefrontHeroPhotoDialog
        open={heroPhotoOpen}
        onOpenChange={setHeroPhotoOpen}
        businessId={businessId}
        photo={design?.photos?.hero ?? null}
        saving={saving}
        onSave={handleHeroPhotoSave}
      />
      <StorefrontSectionsToggleDialog
        open={sectionsOpen}
        onOpenChange={setSectionsOpen}
        enabledById={sectionEnabledById}
        saving={saving}
        onToggle={handleSectionToggle}
        onEdit={handleSectionEdit}
      />
      <StorefrontCategoryPhotosDialog
        open={categoryPhotosOpen}
        onOpenChange={setCategoryPhotosOpen}
        categories={categories}
        iconOverrides={categoryIconOverrides}
      />
    </StaffEditContext.Provider>
  );
}

function StorefrontStaffEditBar({ editDeepLink }: { editDeepLink: boolean }) {
  const ctx = useStorefrontStaffEditOptional();
  const [moreOpen, setMoreOpen] = useState(false);
  if (!ctx?.ready) return null;

  function designStudioHref(): string {
    const absolute =
      typeof window !== "undefined"
        ? storefrontStaffEditReturnAbsoluteUrl(window.location.href)
        : null;
    if (!absolute) return APP_ROUTES.businessDesign;
    return `${APP_ROUTES.businessDesign}?returnTo=${encodeURIComponent(absolute)}`;
  }

  // Deep link without owner/admin session → invite staff sign-in.
  if (!ctx.canEdit) {
    if (!editDeepLink) return null;
    const next = staffEditReturnPath();
    const href = `${APP_ROUTES.staffLogin}?next=${encodeURIComponent(next)}`;
    return (
      <div
        className="sticky top-0 z-[70] border-b border-amber-500/40 bg-amber-50 text-amber-950 shadow-sm"
        role="region"
        aria-label="Staff sign-in to edit"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <p className="text-[12px] font-medium">
            Sign in as staff with shop settings access to edit this shop.
          </p>
          <Button asChild size="sm" className="rounded-md">
            <Link href={href}>Staff sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const {
    editMode,
    setEditMode,
    openQuickEdit,
    openHeroPhoto,
    openSectionsPanel,
    openCategoryPhotos,
    dirty,
    publishDraft,
    discardDraft,
    previewDraft,
    saving,
  } = ctx;

  const fieldItems = [
    { label: "Sections", action: () => openSectionsPanel() },
    { label: "Hero photo", action: () => openHeroPhoto() },
    { label: "Categories", action: () => openCategoryPhotos() },
    { label: "Announcement", action: () => openQuickEdit("announcement") },
    { label: "Offer", action: () => openQuickEdit("promo") },
    { label: "Headline", action: () => openQuickEdit("hero") },
    { label: "Tagline", action: () => openQuickEdit("tagline") },
    { label: "About", action: () => openQuickEdit("about") },
    { label: "Social", action: () => openQuickEdit("social") },
    { label: "Contact", action: () => openQuickEdit("contact") },
    { label: "Hours", action: () => openQuickEdit("hours") },
  ];

  return (
    <>
    <div
      className={cn(
        "sticky top-0 z-[70] border-b shadow-sm",
        editMode
          ? "border-amber-500/40 bg-amber-50 text-amber-950"
          : "border-border/60 bg-background/95 text-foreground backdrop-blur-md",
      )}
      role="region"
      aria-label="Shop editing"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={editMode ? "secondary" : "default"}
            className="gap-1.5 rounded-md"
            aria-pressed={editMode}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? (
              <>
                <Check className="size-3.5" aria-hidden />
                Done
              </>
            ) : (
              <>
                <Pencil className="size-3.5" aria-hidden />
                Edit shop
              </>
            )}
          </Button>
          {editMode ? (
            <p className="text-[12px] font-medium text-amber-900/80">
              {dirty
                ? "Draft on this page — Publish to go live. Logo & photos save immediately."
                : "Click headlines to type · click logo or photos to upload"}
            </p>
          ) : null}
        </div>

        {editMode ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {dirty ? (
              <>
                <Button
                  type="button"
                  size="xs"
                  className="rounded-md"
                  disabled={saving}
                  onClick={() => void publishDraft()}
                >
                  Publish
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="rounded-md border-amber-600/30 bg-white/80"
                  disabled={saving}
                  onClick={() => previewDraft()}
                >
                  Preview
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  className="rounded-md text-amber-950"
                  disabled={saving}
                  onClick={() => discardDraft()}
                >
                  Discard
                </Button>
              </>
            ) : null}

            <Button
              type="button"
              size="xs"
              variant="outline"
              className="rounded-md border-amber-600/30 bg-white/80 sm:hidden"
              onClick={() => setMoreOpen(true)}
            >
              More
            </Button>

            <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
              {fieldItems.map((item) => (
                <Button
                  key={item.label}
                  type="button"
                  size="xs"
                  variant="outline"
                  className="rounded-md border-amber-600/30 bg-white/80"
                  onClick={item.action}
                >
                  {item.label}
                </Button>
              ))}
              <Link
                href={designStudioHref()}
                className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-amber-950 underline-offset-2 hover:underline"
              >
                <Sparkles className="size-3" aria-hidden />
                Full design studio
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>

    <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
      <DialogContent side="bottom" className="gap-3 p-5 sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit shop</DialogTitle>
          <DialogDescription>
            Add content or open a panel. Design changes stage as a draft.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          {fieldItems.map((item) => (
            <Button
              key={item.label}
              type="button"
              variant="outline"
              className="justify-start rounded-lg"
              onClick={() => {
                setMoreOpen(false);
                item.action();
              }}
            >
              {item.label}
            </Button>
          ))}
          <Button asChild variant="ghost" className="justify-start rounded-lg">
            <Link href={designStudioHref()}>Full design studio</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

/** Pencil + click-target wrapping a visible storefront block. */
export function StorefrontQuickEditTarget({
  field,
  label,
  children,
  className,
}: {
  field: StorefrontQuickEditField;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useStorefrontStaffEditOptional();
  if (!ctx?.editMode) {
    return <>{children}</>;
  }
  const editor = ctx;

  const opensSheet = SHEET_QUICK_EDIT_FIELDS.has(field);

  function activate(e: React.MouseEvent | React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (opensSheet) {
      editor.openQuickEdit(field);
      return;
    }
    const root = e.currentTarget as HTMLElement;
    const inline = root.querySelector<HTMLElement>(
      "[data-storefront-inline-text]",
    );
    if (inline) {
      inline.focus();
      return;
    }
    editor.openQuickEdit(field);
  }

  return (
    <div
      className={cn(
        "relative rounded-sm outline-none transition-[box-shadow]",
        "ring-1 ring-amber-500/25 hover:ring-amber-500/45",
        className,
      )}
      data-storefront-quick-edit={field}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate(e as unknown as React.MouseEvent);
        }
      }}
      role="group"
      aria-label={`Editable ${label}`}
    >
      {children}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          editor.openQuickEdit(field);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-2 top-2 z-[5] inline-flex items-center gap-1 rounded-md border border-amber-600/40 bg-amber-50/95 px-2 py-1 text-[11px] font-semibold text-amber-950 shadow-sm backdrop-blur-sm transition hover:bg-amber-100"
        aria-label={`Edit ${label}`}
      >
        <Pencil className="size-3" aria-hidden />
        Edit
      </button>
    </div>
  );
}
