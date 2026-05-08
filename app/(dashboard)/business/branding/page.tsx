"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Palette,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX,
  DashboardFeedback,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  clearMyBrandingFavicon,
  clearMyBrandingLogo,
  fetchBusiness,
  updateMyBranding,
  uploadMyBrandingFavicon,
  uploadMyBrandingLogo,
  type BrandingPatchPayload,
  type BrandingRecord,
  type BusinessRecord,
} from "@/lib/api";

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_PRIMARY = "#0F766E";
const DEFAULT_ACCENT = "#F59E0B";
const ACCEPTED_LOGO_TYPES = "image/png,image/jpeg,image/webp,image/svg+xml";
const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const ACCEPTED_FAVICON_TYPES = "image/png,image/x-icon,image/vnd.microsoft.icon,image/webp,.ico";
const MAX_FAVICON_BYTES = 512 * 1024;

type FormState = {
  displayName: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
};

type Feedback = { kind: "success" | "error"; text: string } | null;

function emptyForm(): FormState {
  return {
    displayName: "",
    faviconUrl: "",
    primaryColor: DEFAULT_PRIMARY,
    accentColor: DEFAULT_ACCENT,
  };
}

function formFromBranding(b: BrandingRecord | undefined | null): FormState {
  return {
    displayName: String(b?.displayName ?? ""),
    faviconUrl: String(b?.faviconUrl ?? ""),
    primaryColor: normalizeHex(b?.primaryColor) ?? DEFAULT_PRIMARY,
    accentColor: normalizeHex(b?.accentColor) ?? DEFAULT_ACCENT,
  };
}

function normalizeHex(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  return HEX_REGEX.test(trimmed) ? trimmed.toUpperCase() : null;
}

function buildPatch(next: FormState): BrandingPatchPayload {
  return {
    displayName: next.displayName.trim(),
    faviconUrl: next.faviconUrl.trim(),
    primaryColor: next.primaryColor.toUpperCase(),
    accentColor: next.accentColor.toUpperCase(),
  };
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function inputClass() {
  return cn(
    "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition-colors",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
  );
}

function labelClass() {
  return "text-sm font-medium leading-none text-foreground";
}

function hintClass() {
  return "text-xs leading-relaxed text-muted-foreground";
}

function ColorField({
  label,
  htmlId,
  value,
  onChange,
}: {
  label: string;
  htmlId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = HEX_REGEX.test(value);
  return (
    <div className="space-y-2">
      <label className={labelClass()} htmlFor={htmlId}>
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={htmlId}
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background shadow-sm"
        />
        <input
          aria-label={`${label} hex value`}
          className={cn(inputClass(), "w-36 max-w-full font-mono text-sm uppercase")}
          value={value}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
        {valid ? null : (
          <span className="text-xs font-medium text-destructive">Use #RRGGBB</span>
        )}
      </div>
    </div>
  );
}

function BrandingPreview({
  form,
  logoUrl,
}: {
  form: FormState;
  logoUrl: string | null | undefined;
}) {
  const display = form.displayName.trim() || "Your storefront";
  const primary = HEX_REGEX.test(form.primaryColor) ? form.primaryColor : DEFAULT_PRIMARY;
  const accent = HEX_REGEX.test(form.accentColor) ? form.accentColor : DEFAULT_ACCENT;
  const faviconPreview = form.faviconUrl.trim() || null;
  return (
    <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/20 p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="size-4" aria-hidden />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-primary/90">Live preview</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Approximates your public shop header.</p>
      <div
        className="mt-4 rounded-xl border-2 bg-background/80 p-4 shadow-inner backdrop-blur-sm"
        style={{ borderColor: `${primary}55` }}
      >
        <div className="flex flex-wrap items-center gap-3">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Logo preview"
              width={48}
              height={48}
              className="size-12 rounded-lg border border-border/60 object-contain"
              unoptimized
            />
          ) : (
            <div
              className="flex size-12 items-center justify-center rounded-lg text-lg font-bold text-white shadow-sm"
              style={{ backgroundColor: primary }}
            >
              {display.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {faviconPreview ? (
                <Image
                  src={faviconPreview}
                  alt=""
                  width={20}
                  height={20}
                  className="size-5 rounded border border-border/60 object-contain"
                  unoptimized
                />
              ) : null}
              <p className="truncate text-base font-semibold" style={{ color: primary }}>
                {display}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Header + favicon as shoppers see them</p>
          </div>
          <span
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
            style={{ backgroundColor: accent }}
          >
            Sale
          </span>
        </div>
      </div>
    </div>
  );
}

function LogoSection({
  logoUrl,
  busy,
  onUpload,
  onClear,
}: {
  logoUrl: string | null | undefined;
  busy: boolean;
  onUpload: (file: File) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void onUpload(file);
    }
    event.target.value = "";
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Current logo"
            width={80}
            height={80}
            className="size-20 rounded-xl border border-border/60 bg-muted/30 object-contain shadow-sm"
            unoptimized
          />
        ) : (
          <div className="flex size-20 items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 text-xs text-muted-foreground">
            No logo
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input ref={inputRef} type="file" accept={ACCEPTED_LOGO_TYPES} className="hidden" onChange={onPick} />
          <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
            {logoUrl ? "Replace logo" : "Upload logo"}
          </Button>
          {logoUrl ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => void onClear()}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <p className={hintClass()}>PNG, JPEG, WEBP, or SVG · max 4&nbsp;MB</p>
    </div>
  );
}

function FaviconSection({
  faviconUrl,
  busy,
  onUpload,
  onClear,
}: {
  faviconUrl: string | null | undefined;
  busy: boolean;
  onUpload: (file: File) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void onUpload(file);
    }
    event.target.value = "";
  };
  const trimmed = faviconUrl?.trim() ?? "";
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {trimmed ? (
          <Image
            src={trimmed}
            alt="Current favicon"
            width={56}
            height={56}
            className="size-14 rounded-xl border border-border/60 bg-muted/30 object-contain shadow-sm"
            unoptimized
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 text-xs text-muted-foreground">
            None
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <input ref={inputRef} type="file" accept={ACCEPTED_FAVICON_TYPES} className="hidden" onChange={onPick} />
          <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
            {trimmed ? "Replace favicon" : "Upload favicon"}
          </Button>
          {trimmed ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => void onClear()}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <p className={hintClass()}>PNG, ICO, or WEBP · max 512&nbsp;KB</p>
    </div>
  );
}

function LockedNotice() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <div className="rounded-2xl border border-border/80 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="size-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Branding is restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask an owner or admin with <span className="font-mono text-xs">business.manage_settings</span> to update
          storefront branding, or open another area you have access to.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href={APP_ROUTES.business}>Back to business settings</Link>
        </Button>
      </div>
    </div>
  );
}

function RelatedLinks() {
  const links = [
    { href: APP_ROUTES.business, label: "Business", desc: "Core settings & storefront", icon: Building2 },
    { href: APP_ROUTES.businessDomains, label: "Domains", desc: "Custom hostnames", icon: Globe },
    { href: APP_ROUTES.branches, label: "Branches", desc: "Locations", icon: MapPin },
  ] as const;
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {links.map(({ href, label, desc, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group flex items-start gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all",
            "hover:border-primary/25 hover:bg-accent/40 hover:shadow-md",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-sm font-semibold">
              {label}
              <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function BrandingPage() {
  const { canManageBusinessSettings } = useDashboard();
  const [snapshot, setSnapshot] = useState<BusinessRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [faviconBusy, setFaviconBusy] = useState(false);
  const [brandingDrawerOpen, setBrandingDrawerOpen] = useState(false);
  const skipDrawerResetAfterSave = useRef(false);

  const load = useCallback(() => {
    return fetchBusiness()
      .then((next) => {
        setLoadFailed(false);
        setFeedback(null);
        setSnapshot(next);
        setForm(formFromBranding(next.branding));
      })
      .catch((error) => {
        setLoadFailed(true);
        setSnapshot(null);
        setFeedback({
          kind: "error",
          text: messageFor(error, "Could not load branding."),
        });
      });
  }, []);

  useEffect(() => {
    if (!canManageBusinessSettings) {
      return;
    }
    void load();
  }, [canManageBusinessSettings, load]);

  const resetFormFromSnapshot = useCallback(() => {
    if (!snapshot) {
      return;
    }
    setForm(formFromBranding(snapshot.branding));
  }, [snapshot]);

  const onBrandingDrawerOpenChange = (open: boolean) => {
    if (!open) {
      if (skipDrawerResetAfterSave.current) {
        skipDrawerResetAfterSave.current = false;
      } else {
        resetFormFromSnapshot();
      }
    }
    setBrandingDrawerOpen(open);
  };

  if (!canManageBusinessSettings) {
    return <LockedNotice />;
  }

  const isLoading = snapshot === null && !loadFailed;

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!HEX_REGEX.test(form.primaryColor) || !HEX_REGEX.test(form.accentColor)) {
      setFeedback({ kind: "error", text: "Colors must be valid #RRGGBB hex values." });
      return;
    }
    setIsSaving(true);
    setFeedback(null);
    try {
      const next = await updateMyBranding(buildPatch(form));
      skipDrawerResetAfterSave.current = true;
      setSnapshot(next);
      setForm(formFromBranding(next.branding));
      setBrandingDrawerOpen(false);
      setFeedback({ kind: "success", text: "Branding saved." });
    } catch (error) {
      setFeedback({ kind: "error", text: messageFor(error, "Save failed.") });
    } finally {
      setIsSaving(false);
    }
  };

  const onLogoUpload = async (file: File) => {
    if (!snapshot?.id) {
      setFeedback({ kind: "error", text: "Business not loaded yet." });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setFeedback({ kind: "error", text: "Logo exceeds the 4 MB limit." });
      return;
    }
    setLogoBusy(true);
    setFeedback(null);
    try {
      const next = await uploadMyBrandingLogo(file, snapshot.id);
      setSnapshot(next);
      setForm(formFromBranding(next.branding));
      setFeedback({ kind: "success", text: "Logo updated." });
    } catch (error) {
      setFeedback({ kind: "error", text: messageFor(error, "Upload failed.") });
    } finally {
      setLogoBusy(false);
    }
  };

  const onLogoClear = async () => {
    setLogoBusy(true);
    setFeedback(null);
    try {
      const next = await clearMyBrandingLogo();
      setSnapshot(next);
      setForm(formFromBranding(next.branding));
      setFeedback({ kind: "success", text: "Logo removed." });
    } catch (error) {
      setFeedback({ kind: "error", text: messageFor(error, "Could not remove logo.") });
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
      setSnapshot(next);
      setForm(formFromBranding(next.branding));
      setFeedback({ kind: "success", text: "Favicon updated." });
    } catch (error) {
      setFeedback({ kind: "error", text: messageFor(error, "Favicon upload failed.") });
    } finally {
      setFaviconBusy(false);
    }
  };

  const onFaviconClear = async () => {
    setFaviconBusy(true);
    setFeedback(null);
    try {
      const next = await clearMyBrandingFavicon();
      setSnapshot(next);
      setForm(formFromBranding(next.branding));
      setFeedback({ kind: "success", text: "Favicon removed." });
    } catch (error) {
      setFeedback({ kind: "error", text: messageFor(error, "Could not remove favicon.") });
    } finally {
      setFaviconBusy(false);
    }
  };

  const logoUrl = snapshot?.branding?.logoUrl ?? null;
  const faviconUrl = snapshot?.branding?.faviconUrl ?? form.faviconUrl;

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 py-24">
        <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">Loading branding…</p>
      </div>
    );
  }

  if (loadFailed && !snapshot) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <AlertCircle className="size-6" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">Could not load branding</h2>
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

  const drawerBusy = isSaving || logoBusy || faviconBusy;

  return (
    <>
      <div className={DASHBOARD_MAX}>
        <div className="space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <DashboardPageHero
              icon={Palette}
              eyebrow="Appearance"
              title="Branding"
              description={
                <>
                  Logo, colors, and display name for your storefront, sign-in screens, and tenant emails. Logo and
                  favicon uploads apply immediately; display name and colors save from the drawer with{" "}
                  <span className="font-medium text-foreground">Save branding</span>.
                </>
              }
            />
            <Button
              type="button"
              size="lg"
              className="gap-2 self-start shadow-md lg:shrink-0"
              disabled={!snapshot || drawerBusy}
              onClick={() => {
                skipDrawerResetAfterSave.current = false;
                setBrandingDrawerOpen(true);
              }}
            >
              <Pencil className="size-4" aria-hidden />
              Edit branding
            </Button>
          </div>

          <RelatedLinks />

          {feedback ? <DashboardFeedback kind={feedback.kind === "error" ? "error" : "success"} text={feedback.text} /> : null}

          <BrandingPreview form={form} logoUrl={logoUrl} />
        </div>
      </div>

      <FormDrawer
        open={brandingDrawerOpen}
        onOpenChange={onBrandingDrawerOpenChange}
        title="Edit branding"
        description={
          <>
            Logo and favicon files upload right away. Display name, colors, and favicon URL use{" "}
            <span className="font-mono text-xs">PATCH …/businesses/me/branding</span> when you save.
          </>
        }
        contextLabel="Appearance"
        icon={<Palette className="size-5 text-primary" aria-hidden />}
        width="wide"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={drawerBusy}
              onClick={() => onBrandingDrawerOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="branding-edit-form" disabled={isSaving || logoBusy || faviconBusy}>
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-4" aria-hidden />
                  Save branding
                </>
              )}
            </Button>
          </div>
        }
      >
        <form id="branding-edit-form" className="space-y-6" onSubmit={onSave}>
          <FormDrawerFields
            legend="Logo"
            hint="Shown in the shop header and emails. Square assets look sharpest."
          >
            <LogoSection logoUrl={logoUrl} busy={logoBusy} onUpload={onLogoUpload} onClear={onLogoClear} />
          </FormDrawerFields>

          <FormDrawerFields
            legend="Favicon file"
            hint="Browser tab icon. Prefer 32×32 or 48×48. Upload applies immediately."
          >
            <FaviconSection faviconUrl={faviconUrl} busy={faviconBusy} onUpload={onFaviconUpload} onClear={onFaviconClear} />
          </FormDrawerFields>

          <FormDrawerFields
            legend="Text & colors"
            hint="Display name, palette, and optional favicon URL — saved together when you click Save branding."
          >
            <div className="space-y-2">
              <label className={labelClass()} htmlFor="branding-name">
                Display name
              </label>
              <input
                id="branding-name"
                className={inputClass()}
                value={form.displayName}
                maxLength={255}
                onChange={(e) => setForm((s) => ({ ...s, displayName: e.target.value }))}
                placeholder={snapshot?.name ?? "Your storefront name"}
              />
              <p className={hintClass()}>
                Shown in the shop header and login. Falls back to your legal business name when empty.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <ColorField
                label="Primary color"
                htmlId="branding-primary"
                value={form.primaryColor}
                onChange={(v) => setForm((s) => ({ ...s, primaryColor: v }))}
              />
              <ColorField
                label="Accent color"
                htmlId="branding-accent"
                value={form.accentColor}
                onChange={(v) => setForm((s) => ({ ...s, accentColor: v }))}
              />
            </div>

            <div className="space-y-2">
              <label className={labelClass()} htmlFor="branding-favicon">
                Favicon URL <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="branding-favicon"
                className={inputClass()}
                value={form.faviconUrl}
                maxLength={1024}
                onChange={(e) => setForm((s) => ({ ...s, faviconUrl: e.target.value }))}
                placeholder="https://cdn.example.com/favicon.png"
              />
              <p className={hintClass()}>
                Use the upload section above for hosted files, or paste an external HTTPS URL here.
              </p>
            </div>
          </FormDrawerFields>
        </form>
      </FormDrawer>
    </>
  );
}
