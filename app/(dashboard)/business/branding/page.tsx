"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, Palette, RefreshCw, Save } from "lucide-react";

import type { GeneratedBrandKit } from "@/components/brand/ai-logo-generator";
import { BrandingTemplateSection } from "@/components/business/branding-template-section";
import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX_WIDE,
  DashboardAccessDenied,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { prepareAppIconFile } from "@/lib/branding-asset-prepare";
import { setDocumentFavicon } from "@/lib/document-favicon";
import { APP_ROUTES } from "@/lib/config";
import { ONBOARDING_TARGETS } from "@/lib/onboarding-tour";
import {
  localitiesFromBranches,
  type StorefrontSeoLocation,
} from "@/lib/storefront-seo-defaults";
import { resolveBusinessFaviconHref } from "@/lib/tenant-favicon-path";
import { cn } from "@/lib/utils";
import {
  clearMyBrandingAppIcon,
  clearMyBrandingFavicon,
  clearMyBrandingLogo,
  clearMyBrandingOgImage,
  deleteMyBrandingBanner,
  fetchBranches,
  fetchBusiness,
  reorderMyBrandingBanners,
  updateMyBranding,
  uploadMyBrandingAppIcon,
  uploadMyBrandingBanner,
  uploadMyBrandingFavicon,
  uploadMyBrandingLogo,
  uploadMyBrandingLogoDark,
  uploadMyBrandingAssetKit,
  uploadMyBrandingOgImage,
  type BranchRecord,
  type BusinessRecord,
} from "@/lib/api";

import {
  AppIconSection,
  BannerSection,
  BrandingIdentityFields,
  BrandingSearchFields,
  buildPatch,
  emptyForm,
  FaviconSection,
  formFromBranding,
  isFormDirty,
  keepUnsavedFields,
  LogoSection,
  messageFor,
  OgImageSection,
  PasteUrlField,
  type BrandingSectionId,
  type FormState,
} from "./_components/branding-shared";
import { BrandingTheatre } from "./_components/branding-theatre";

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const MAX_FAVICON_BYTES = 512 * 1024;
const MAX_APP_ICON_BYTES = 1024 * 1024;
const MAX_OG_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_BANNER_BYTES = 5 * 1024 * 1024;

type Feedback = { kind: "success" | "error"; text: string } | null;

const APPLY_NOW_SECTIONS: BrandingSectionId[] = [
  "logos",
  "appIcon",
  "favicon",
  "og",
  "photos",
];

function sectionFromHash(hash: string): BrandingSectionId | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (id === "branding-banners") return "photos";
  if (id === "branding-search") return "search";
  if (id === "branding-identity") return "identity";
  const direct = id as BrandingSectionId;
  const known: BrandingSectionId[] = [
    "identity",
    "logos",
    "appIcon",
    "favicon",
    "og",
    "photos",
    "search",
    "themes",
  ];
  return known.includes(direct) ? direct : null;
}

export default function BrandingPage() {
  const searchParams = useSearchParams();
  const { canManageBusinessSettings } = useDashboard();
  const [snapshot, setSnapshot] = useState<BusinessRecord | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [faviconBusy, setFaviconBusy] = useState(false);
  const [appIconBusy, setAppIconBusy] = useState(false);
  const [ogImageBusy, setOgImageBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [activeSection, setActiveSection] = useState<BrandingSectionId | null>(
    null,
  );
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const patchForm = useCallback((patch: Partial<FormState>) => {
    setForm((s) => ({ ...s, ...patch }));
  }, []);

  const load = useCallback(() => {
    return Promise.all([fetchBusiness(), fetchBranches().catch(() => [])])
      .then(([next, nextBranches]) => {
        setLoadFailed(false);
        setFeedback(null);
        setSnapshot(next);
        setBranches(nextBranches);
        setForm(formFromBranding(next.branding));
      })
      .catch((error) => {
        setLoadFailed(true);
        setSnapshot(null);
        setBranches([]);
        setFeedback({
          kind: "error",
          text: messageFor(error, "Could not load branding."),
        });
      });
  }, []);

  useEffect(() => {
    if (!canManageBusinessSettings) return;
    void load();
  }, [canManageBusinessSettings, load]);

  useEffect(() => {
    const applyHash = () => {
      const id = sectionFromHash(window.location.hash);
      if (id) setActiveSection(id);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    if (searchParams.get("onboarding") !== "branding") return;
    if (!snapshot) return;
    setActiveSection("identity");
    queueMicrotask(() => {
      nameInputRef.current?.focus();
    });
  }, [searchParams, snapshot]);

  const resetFormFromSnapshot = useCallback(() => {
    if (!snapshot) return;
    setForm(formFromBranding(snapshot.branding));
  }, [snapshot]);

  if (!canManageBusinessSettings) {
    return (
      <DashboardAccessDenied
        title="Branding is restricted"
        description={
          <>
            Ask an owner or admin with{" "}
            <span className="font-mono text-xs">business.manage_settings</span>{" "}
            to update storefront branding, or open another area you have access
            to.
          </>
        }
        backHref={APP_ROUTES.business}
        backLabel="Back to business"
      />
    );
  }

  const isLoading = snapshot === null && !loadFailed;

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !HEX_REGEX.test(form.primaryColor) ||
      !HEX_REGEX.test(form.accentColor)
    ) {
      setFeedback({
        kind: "error",
        text: "Colors must be valid #RRGGBB hex values.",
      });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const next = await updateMyBranding(buildPatch(form));
      setSnapshot(next);
      setForm(formFromBranding(next.branding));
      setDocumentFavicon(resolveBusinessFaviconHref(next));
      setFeedback({ kind: "success", text: "Branding saved." });
    } catch (error) {
      setFeedback({ kind: "error", text: messageFor(error, "Save failed.") });
    } finally {
      setIsSaving(false);
    }
  };

  const applyAssetSnapshot = (next: BusinessRecord) => {
    const previousSaved = formFromBranding(snapshot?.branding);
    setSnapshot(next);
    setForm((prev) => keepUnsavedFields(prev, next.branding, previousSaved));
  };

  const onLogoUpload = async (file: File) => {
    if (!snapshot?.id) {
      const text = "Business not loaded yet.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    if (file.size > MAX_LOGO_BYTES) {
      const text = "Logo exceeds the 4 MB limit.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    setLogoBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingLogo(file, snapshot.id);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Logo updated." });
    } catch (error) {
      const text = messageFor(error, "Upload failed.");
      setFeedback({ kind: "error", text });
      throw error instanceof Error ? error : new Error(text);
    } finally {
      setLogoBusy(false);
    }
  };

  const onLogoClear = async () => {
    setLogoBusy(true);
    setFeedback(null);
    try {
      const next = await clearMyBrandingLogo();
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Logo removed." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Could not remove logo."),
      });
    } finally {
      setLogoBusy(false);
    }
  };

  const onLogoUploadDark = async (file: File) => {
    if (!snapshot?.id) {
      const text = "Business not loaded yet.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    if (file.size > MAX_LOGO_BYTES) {
      const text = "Logo exceeds the 4 MB limit.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    setLogoBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingLogoDark(file, snapshot.id);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Dark logo updated." });
    } catch (error) {
      const text = messageFor(error, "Upload failed.");
      setFeedback({ kind: "error", text });
      throw error instanceof Error ? error : new Error(text);
    } finally {
      setLogoBusy(false);
    }
  };

  const onLogoUploadPair = async (kit: GeneratedBrandKit) => {
    if (!snapshot?.id) {
      const text = "Business not loaded yet.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    if (
      kit.light.size > MAX_LOGO_BYTES ||
      kit.dark.size > MAX_LOGO_BYTES ||
      kit.og.size > MAX_OG_IMAGE_BYTES
    ) {
      const text = "An asset exceeds the 4 MB limit.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    if (kit.favicon.size > MAX_FAVICON_BYTES) {
      const text = "Favicon exceeds the 512 KB limit.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    if (kit.appIcon.size > MAX_APP_ICON_BYTES) {
      const text = "App icon exceeds the 1 MB limit.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    setLogoBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingAssetKit(kit, snapshot.id);
      applyAssetSnapshot(next);
      setDocumentFavicon(resolveBusinessFaviconHref(next));
      setFeedback({ kind: "success", text: "Brand kit updated." });
    } catch (error) {
      const text = messageFor(error, "Upload failed.");
      setFeedback({ kind: "error", text });
      throw error instanceof Error ? error : new Error(text);
    } finally {
      setLogoBusy(false);
    }
  };

  const onLogoClearDark = async () => {
    setLogoBusy(true);
    setFeedback(null);
    try {
      const next = await updateMyBranding({
        logoDarkUrl: "",
        logoDarkPublicId: "",
      });
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Dark logo removed." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Could not remove dark logo."),
      });
    } finally {
      setLogoBusy(false);
    }
  };

  const onFaviconUpload = async (file: File) => {
    if (!snapshot?.id) {
      setFeedback({ kind: "error", text: "Business not loaded yet." });
      return;
    }
    if (file.size > MAX_FAVICON_BYTES) {
      setFeedback({ kind: "error", text: "Favicon exceeds the 512 KB limit." });
      return;
    }
    setFaviconBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingFavicon(file, snapshot.id);
      applyAssetSnapshot(next);
      setDocumentFavicon(resolveBusinessFaviconHref(next));
      setFeedback({ kind: "success", text: "Favicon updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Favicon upload failed."),
      });
    } finally {
      setFaviconBusy(false);
    }
  };

  const onOgImageUpload = async (file: File) => {
    if (!snapshot?.id) {
      setFeedback({ kind: "error", text: "Business not loaded yet." });
      return;
    }
    if (file.size > MAX_OG_IMAGE_BYTES) {
      setFeedback({
        kind: "error",
        text: "Social preview image exceeds the 4 MB limit.",
      });
      return;
    }
    setOgImageBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingOgImage(file, snapshot.id);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Social preview image updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Upload failed."),
      });
    } finally {
      setOgImageBusy(false);
    }
  };

  const onOgImageClear = async () => {
    setOgImageBusy(true);
    setFeedback(null);
    try {
      const next = await clearMyBrandingOgImage();
      applyAssetSnapshot(next);
      setFeedback({
        kind: "success",
        text: "Social preview image removed.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Could not remove social preview image."),
      });
    } finally {
      setOgImageBusy(false);
    }
  };

  const onFaviconClear = async () => {
    setFaviconBusy(true);
    setFeedback(null);
    try {
      const next = await clearMyBrandingFavicon();
      applyAssetSnapshot(next);
      setDocumentFavicon(resolveBusinessFaviconHref(next));
      setFeedback({ kind: "success", text: "Favicon removed." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Could not remove favicon."),
      });
    } finally {
      setFaviconBusy(false);
    }
  };

  const onAppIconUpload = async (file: File) => {
    if (!snapshot?.id) {
      const text = "Business not loaded yet.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    let prepared = file;
    try {
      prepared = await prepareAppIconFile(file);
    } catch {
      prepared = file;
    }
    if (prepared.size > MAX_APP_ICON_BYTES) {
      const text = "App icon exceeds the 1 MB limit.";
      setFeedback({ kind: "error", text });
      throw new Error(text);
    }
    setAppIconBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingAppIcon(prepared, snapshot.id);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Home-screen icon updated." });
    } catch (error) {
      const text = messageFor(error, "App icon upload failed.");
      setFeedback({ kind: "error", text });
      throw error instanceof Error ? error : new Error(text);
    } finally {
      setAppIconBusy(false);
    }
  };

  const onAppIconClear = async () => {
    setAppIconBusy(true);
    setFeedback(null);
    try {
      const next = await clearMyBrandingAppIcon();
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Home-screen icon removed." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Could not remove the app icon."),
      });
    } finally {
      setAppIconBusy(false);
    }
  };

  const onBannerUpload = async (file: File) => {
    if (!snapshot?.id) {
      setFeedback({ kind: "error", text: "Business not loaded yet." });
      return;
    }
    if (file.size > MAX_BANNER_BYTES) {
      setFeedback({ kind: "error", text: "Banner exceeds the 5 MB limit." });
      return;
    }
    setBannerBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingBanner(file, snapshot.id);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Banner added." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Banner upload failed."),
      });
    } finally {
      setBannerBusy(false);
    }
  };

  const onBannerDelete = async (index: number) => {
    setBannerBusy(true);
    setFeedback(null);
    try {
      const next = await deleteMyBrandingBanner(index);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Banner removed." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Could not remove banner."),
      });
    } finally {
      setBannerBusy(false);
    }
  };

  const onBannerReorder = async (orderedUrls: string[]) => {
    setBannerBusy(true);
    setFeedback(null);
    try {
      const next = await reorderMyBrandingBanners(orderedUrls);
      applyAssetSnapshot(next);
      setFeedback({ kind: "success", text: "Banners reordered." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: messageFor(error, "Could not reorder banners."),
      });
    } finally {
      setBannerBusy(false);
    }
  };

  const logoUrl = snapshot?.branding?.logoUrl ?? null;
  const logoDarkUrl = snapshot?.branding?.logoDarkUrl ?? null;
  const appIconUrl = snapshot?.branding?.appIconUrl ?? null;
  const faviconUrl = snapshot?.branding?.faviconUrl ?? form.faviconUrl;
  const ogImageUrl = snapshot?.branding?.ogImage ?? form.ogImage;
  const bannerUrls = snapshot?.branding?.heroBannerUrls ?? [];

  const assetBusy =
    logoBusy || faviconBusy || appIconBusy || ogImageBusy || bannerBusy;
  const dirty = snapshot
    ? isFormDirty(form, formFromBranding(snapshot.branding))
    : false;

  const onboardingLocalitiesRaw =
    snapshot?.onboarding?.answers?.branchLocalities;
  const onboardingLocalities = Array.isArray(onboardingLocalitiesRaw)
    ? onboardingLocalitiesRaw.filter((v): v is string => typeof v === "string")
    : [];

  const seoLocation: StorefrontSeoLocation = {
    areas: localitiesFromBranches(branches, onboardingLocalities),
    countryCode: snapshot?.countryCode ?? "KE",
  };

  const seoDisplayName =
    form.displayName.trim() || snapshot?.name?.trim() || "Your store";

  const saveFooter = (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isSaving || !dirty}
        onClick={resetFormFromSnapshot}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="branding-edit-form"
        size="sm"
        className="gap-1.5"
        disabled={isSaving || assetBusy || !dirty}
      >
        {isSaving ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          <>
            <Save className="size-4" aria-hidden />
            Save changes
          </>
        )}
      </Button>
    </div>
  );

  const drawerFields = useMemo(() => {
    if (!activeSection) return null;

    switch (activeSection) {
      case "identity":
        return (
          <BrandingIdentityFields
            form={form}
            businessName={snapshot?.name}
            logoUrl={logoUrl}
            logoDarkUrl={logoDarkUrl}
            nameInputRef={nameInputRef}
            onFormChange={patchForm}
          />
        );
      case "logos":
        return (
          <LogoSection
            logoUrl={logoUrl}
            logoDarkUrl={logoDarkUrl}
            primaryColor={form.primaryColor}
            accentColor={form.accentColor}
            shopName={form.displayName || snapshot?.name}
            busy={logoBusy}
            onUpload={onLogoUpload}
            onUploadDark={onLogoUploadDark}
            onUploadPair={onLogoUploadPair}
            onClear={onLogoClear}
            onClearDark={onLogoClearDark}
          />
        );
      case "appIcon":
        return (
          <AppIconSection
            appIconUrl={appIconUrl}
            logoUrl={logoUrl}
            primaryColor={form.primaryColor}
            accentColor={form.accentColor}
            shopName={form.displayName || snapshot?.name}
            busy={appIconBusy}
            onUpload={onAppIconUpload}
            onClear={onAppIconClear}
          />
        );
      case "favicon":
        return (
          <>
            <FaviconSection
              faviconUrl={faviconUrl}
              busy={faviconBusy}
              onUpload={onFaviconUpload}
              onClear={onFaviconClear}
            />
            <PasteUrlField
              id="branding-favicon-url"
              label="Paste a favicon URL"
              value={form.faviconUrl}
              maxLength={1024}
              placeholder="https://cdn.example.com/favicon.png"
              onChange={(next) => patchForm({ faviconUrl: next })}
            />
          </>
        );
      case "og":
        return (
          <>
            <OgImageSection
              ogImageUrl={ogImageUrl}
              busy={ogImageBusy}
              onUpload={onOgImageUpload}
              onClear={onOgImageClear}
            />
            <PasteUrlField
              id="branding-og-image"
              label="Paste a share image URL"
              value={form.ogImage}
              maxLength={1024}
              placeholder="https://cdn.example.com/social-preview.png"
              onChange={(ogImage) => patchForm({ ogImage })}
            />
          </>
        );
      case "photos":
        return (
          <BannerSection
            banners={bannerUrls}
            busy={bannerBusy}
            onUpload={onBannerUpload}
            onDelete={onBannerDelete}
            onReorder={onBannerReorder}
          />
        );
      case "search":
        return (
          <BrandingSearchFields
            form={form}
            seoDisplayName={seoDisplayName}
            seoLocation={seoLocation}
            onFormChange={patchForm}
          />
        );
      case "themes":
        return (
          <BrandingTemplateSection
            business={snapshot}
            storeName={form.displayName}
            logoUrl={logoUrl}
            logoDarkUrl={logoDarkUrl}
            brandPrimary={form.primaryColor}
          />
        );
      default:
        return null;
    }
  }, [
    activeSection,
    form,
    snapshot,
    logoUrl,
    logoDarkUrl,
    appIconUrl,
    faviconUrl,
    ogImageUrl,
    bannerUrls,
    logoBusy,
    appIconBusy,
    faviconBusy,
    ogImageBusy,
    bannerBusy,
    patchForm,
    seoDisplayName,
    seoLocation,
    onLogoUpload,
    onLogoUploadDark,
    onLogoUploadPair,
    onLogoClear,
    onLogoClearDark,
    onAppIconUpload,
    onAppIconClear,
    onFaviconUpload,
    onFaviconClear,
    onOgImageUpload,
    onOgImageClear,
    onBannerUpload,
    onBannerDelete,
    onBannerReorder,
  ]);

  const drawerFooter = useMemo(() => {
    if (!activeSection) return null;
    if (activeSection === "themes") return null;
    if (APPLY_NOW_SECTIONS.includes(activeSection)) {
      if (activeSection === "favicon" || activeSection === "og") {
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveSection(null)}
            >
              Close
            </Button>
            <Button
              type="submit"
              form="branding-edit-form"
              size="sm"
              disabled={isSaving || !dirty}
            >
              {isSaving ? "Saving…" : "Save URL"}
            </Button>
          </div>
        );
      }
      return null;
    }
    if (activeSection === "identity" || activeSection === "search") {
      return saveFooter;
    }
    return null;
  }, [activeSection, dirty, isSaving, assetBusy, saveFooter]);

  const applyNowSection =
    !!activeSection && APPLY_NOW_SECTIONS.includes(activeSection);

  if (isLoading) {
    return (
      <div
        className={cn(
          DASHBOARD_MAX_WIDE,
          "flex flex-col items-center justify-center gap-4 py-24",
        )}
      >
        <Loader2
          className="size-10 animate-spin text-[#0f766e]"
          aria-hidden
        />
        <p className="text-sm text-[#7A7A7A]">Loading branding…</p>
      </div>
    );
  }

  if (loadFailed && !snapshot) {
    return (
      <div className={cn(DASHBOARD_MAX_WIDE, "mx-auto max-w-lg py-16")}>
        <div className="rounded-none border border-destructive/30 bg-destructive/5 p-8 text-center shadow-none">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="size-6" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">
            Could not load branding
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{feedback?.text}</p>
          <Button
            className="mt-6 gap-2"
            variant="outline"
            onClick={() => {
              setLoadFailed(false);
              setFeedback(null);
              void load();
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
      data-onboarding-target={ONBOARDING_TARGETS.brandingDrawer}
    >
      <form id="branding-edit-form" className="hidden" onSubmit={onSave} aria-hidden />

      <DashboardPageHero
        icon={Palette}
        eyebrow="Shop"
        title="Branding"
        description="Logo, colours, and the name shoppers see. Uploads go live immediately; name, colours, and SEO save together."
      >
        {dirty ? (
          <Button
            type="submit"
            form="branding-edit-form"
            size="sm"
            className="gap-1.5"
            disabled={isSaving || assetBusy}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-4" aria-hidden />
                Save
              </>
            )}
          </Button>
        ) : null}
      </DashboardPageHero>

      {feedback ? (
        <DashboardFeedback
          kind={feedback.kind === "error" ? "error" : "success"}
          text={feedback.text}
        />
      ) : null}

      {snapshot ? (
        <BrandingTheatre
          activeSectionId={activeSection}
          onActiveSectionChange={setActiveSection}
          form={form}
          dirty={dirty}
          business={snapshot}
          seoLocation={seoLocation}
          logoUrl={logoUrl}
          logoDarkUrl={logoDarkUrl}
          appIconUrl={appIconUrl}
          faviconUrl={faviconUrl}
          ogImageUrl={ogImageUrl}
          bannerCount={bannerUrls.length}
          onLogoScaleChange={(logoScale) => patchForm({ logoScale })}
          drawerFields={drawerFields}
          drawerFooter={drawerFooter}
          applyNowSection={applyNowSection}
        />
      ) : null}
    </div>
  );
}
