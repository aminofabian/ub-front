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
import { Button } from "@/components/ui/button";
import {
  fetchBusiness,
  fetchMe,
  updateBusiness,
} from "@/lib/api";
import { getSessionTokens, hasAccessSession } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
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
  type StorefrontHeroSectionSettings,
  type StorefrontPromoSectionSettings,
  type StorefrontSectionConfig,
  type StorefrontSectionId,
} from "@/lib/storefront-design";
import {
  storefrontStaffEditReturnAbsoluteUrl,
  storefrontStaffEditReturnPath,
  storefrontWantsEditFromSearch,
} from "@/lib/storefront-staff-edit";
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
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  design: StorefrontDesign | null;
  imageOverrides: Record<string, string>;
  setImageOverride: (itemId: string, imageUrl: string) => void;
  displayImageUrl: (itemId: string, fallback: string | null) => string | null;
  openQuickEdit: (field: StorefrontQuickEditField) => void;
  saving: boolean;
};

const StaffEditContext = createContext<StaffEditContextValue | null>(null);

function isOwnerOrAdminRole(roleKey: string | null | undefined): boolean {
  const key = (roleKey ?? "").trim().toLowerCase();
  return key === "owner" || key === "admin";
}

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

export function StorefrontStaffEditProvider({
  initialDesign,
  children,
}: {
  initialDesign?: StorefrontDesign | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [design, setDesign] = useState<StorefrontDesign | null>(
    initialDesign ?? null,
  );
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>(
    {},
  );
  const [saving, setSaving] = useState(false);
  const [quickField, setQuickField] = useState<StorefrontQuickEditField | null>(
    null,
  );
  const [editDeepLink, setEditDeepLink] = useState(false);
  const autoEditAppliedRef = useRef(false);

  useEffect(() => {
    setDesign(initialDesign ?? null);
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
            setReady(true);
          }
          return;
        }
        const me = await fetchMe();
        if (cancelled) return;
        setCanEdit(isOwnerOrAdminRole(me.role?.key));
      } catch {
        if (!cancelled) setCanEdit(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ensureDesignLoaded = useCallback(async (): Promise<StorefrontDesign | null> => {
    try {
      const business = await fetchBusiness();
      const parsed = parseStorefrontDesignJson(
        business.storefront?.designJson ?? null,
      );
      setDesign(parsed);
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
      setEditMode(on);
      if (on) {
        void ensureDesignLoaded();
      } else {
        setQuickField(null);
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

  const openQuickEdit = useCallback(
    (field: StorefrontQuickEditField) => {
      if (!canEdit) return;
      if (!editMode) setEditModeSafe(true);
      setQuickField(field);
    },
    [canEdit, editMode, setEditModeSafe],
  );

  const saveDesign = useCallback(
    async (next: StorefrontDesign) => {
      setSaving(true);
      try {
        const designJson = serializeStorefrontDesign(next) ?? "";
        await updateBusiness({ storefront: { designJson } });
        setDesign(next);
        toast.success("Saved");
        router.refresh();
        setQuickField(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [router],
  );

  const handleQuickSave = useCallback(
    async (field: StorefrontQuickEditField, values: Record<string, string>) => {
      let base = design;
      if (!base) {
        base = await ensureDesignLoaded();
      }
      let next: StorefrontDesign;

      if (field === "announcement") {
        const text = (values.text ?? "").trim();
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
            title: (values.title ?? "").trim(),
            subtitle: (values.subtitle ?? "").trim(),
            coupon: (values.coupon ?? "").trim(),
          },
        });
      } else if (field === "hero") {
        const headline = (values.headline ?? "").trim();
        const subheadline = (values.subheadline ?? "").trim();
        const existing = base?.sections?.find((s) => s.id === "hero");
        const prev = (existing?.settings ??
          storefrontSectionDefaultSettings(
            "hero",
          )) as StorefrontHeroSectionSettings;
        next = upsertSection(base, "hero", {
          enabled: true,
          settings: {
            ...prev,
            headline,
            subheadline,
          },
        });
      } else if (field === "about") {
        const heading = (values.heading ?? "").trim();
        const text = (values.text ?? "").trim();
        const existing = base?.sections?.find((s) => s.id === "about");
        const prev = (existing?.settings ??
          storefrontSectionDefaultSettings(
            "about",
          )) as StorefrontAboutSectionSettings;
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
      } else {
        next = {
          ...(base ?? { version: 1 }),
          version: 1,
          business: {
            ...(base?.business ?? {}),
            tagline: (values.tagline ?? "").trim() || null,
          },
        };
      }

      await saveDesign(next);
    },
    [design, ensureDesignLoaded, saveDesign],
  );

  const dialogDefaults = useMemo(() => {
    const announcement = design?.sections?.find((s) => s.id === "announcement");
    const promo = design?.sections?.find((s) => s.id === "promo");
    const hero = design?.sections?.find((s) => s.id === "hero");
    const about = design?.sections?.find((s) => s.id === "about");
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
    };
  }, [design]);

  const value = useMemo<StaffEditContextValue>(
    () => ({
      ready,
      canEdit,
      editMode,
      setEditMode: setEditModeSafe,
      design,
      imageOverrides,
      setImageOverride,
      displayImageUrl,
      openQuickEdit,
      saving,
    }),
    [
      ready,
      canEdit,
      editMode,
      setEditModeSafe,
      design,
      imageOverrides,
      setImageOverride,
      displayImageUrl,
      openQuickEdit,
      saving,
    ],
  );

  return (
    <StaffEditContext.Provider value={value}>
      {children}
      <StorefrontStaffEditBar editDeepLink={editDeepLink} />
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
    </StaffEditContext.Provider>
  );
}

function StorefrontStaffEditBar({ editDeepLink }: { editDeepLink: boolean }) {
  const ctx = useStorefrontStaffEditOptional();
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
            Sign in as owner or admin to edit this shop.
          </p>
          <Button asChild size="sm" className="rounded-md">
            <Link href={href}>Staff sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { editMode, setEditMode, openQuickEdit } = ctx;

  return (
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
              Tap a field or product photo to edit
            </p>
          ) : null}
        </div>

        {editMode ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="rounded-md border-amber-600/30 bg-white/80"
              onClick={() => openQuickEdit("announcement")}
            >
              Announcement
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="rounded-md border-amber-600/30 bg-white/80"
              onClick={() => openQuickEdit("promo")}
            >
              Offer
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="rounded-md border-amber-600/30 bg-white/80"
              onClick={() => openQuickEdit("hero")}
            >
              Headline
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="rounded-md border-amber-600/30 bg-white/80"
              onClick={() => openQuickEdit("tagline")}
            >
              Tagline
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="rounded-md border-amber-600/30 bg-white/80"
              onClick={() => openQuickEdit("about")}
            >
              About
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="rounded-md border-amber-600/30 bg-white/80"
              onClick={() => openQuickEdit("contact")}
            >
              Contact
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="rounded-md border-amber-600/30 bg-white/80"
              onClick={() => openQuickEdit("hours")}
            >
              Hours
            </Button>
            <Link
              href={designStudioHref()}
              className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-amber-950 underline-offset-2 hover:underline"
            >
              <Sparkles className="size-3" aria-hidden />
              Full design studio
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Pencil affordance wrapping a visible storefront block. */
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

  return (
    <div className={cn("relative", className)}>
      {children}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          ctx.openQuickEdit(field);
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
