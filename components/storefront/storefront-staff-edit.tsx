"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  parseStorefrontDesignJson,
  serializeStorefrontDesign,
  storefrontSectionDefaultSettings,
  type StorefrontAnnouncementSectionSettings,
  type StorefrontDesign,
  type StorefrontHeroSectionSettings,
  type StorefrontSectionConfig,
  type StorefrontSectionId,
} from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

export type { StorefrontQuickEditField };

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

  useEffect(() => {
    setDesign(initialDesign ?? null);
  }, [initialDesign]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
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
    const hero = design?.sections?.find((s) => s.id === "hero");
    const annSettings = announcement?.settings as
      | StorefrontAnnouncementSectionSettings
      | undefined;
    const heroSettings = hero?.settings as
      | StorefrontHeroSectionSettings
      | undefined;
    return {
      announcement: annSettings?.text ?? "",
      headline: heroSettings?.headline ?? "",
      subheadline: heroSettings?.subheadline ?? "",
      tagline: design?.business?.tagline?.trim() ?? "",
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
      <StorefrontStaffEditBar />
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

function StorefrontStaffEditBar() {
  const ctx = useStorefrontStaffEditOptional();
  if (!ctx?.ready || !ctx.canEdit) return null;

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
            <Link
              href={APP_ROUTES.businessDesign}
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
