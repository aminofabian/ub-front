"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
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

type Notice = { tone: "info" | "error"; text: string } | null;

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
  // Backend semantics: null means "no change", empty string means "clear".
  // We always send the user's current value so the API mirrors the form.
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
    <div className="space-y-1">
      <label className="block text-sm font-medium" htmlFor={htmlId}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={htmlId}
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-12 cursor-pointer rounded border bg-background"
        />
        <input
          aria-label={`${label} hex value`}
          className="w-32 rounded-md border bg-background px-3 py-2 font-mono text-sm uppercase"
          value={value}
          maxLength={7}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
        {valid ? null : (
          <span className="text-xs text-destructive">Use #RRGGBB</span>
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
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Live preview</h3>
      <div
        className="rounded-lg border p-4 shadow-sm"
        style={{ borderColor: primary }}
      >
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Logo preview"
              width={48}
              height={48}
              className="h-12 w-12 rounded object-contain"
              unoptimized
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded text-base font-semibold text-white"
              style={{ backgroundColor: primary }}
            >
              {display.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {faviconPreview ? (
                <Image
                  src={faviconPreview}
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-sm border border-border/60 object-contain"
                  unoptimized
                />
              ) : null}
              <p className="text-base font-semibold" style={{ color: primary }}>
                {display}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Storefront header preview</p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium text-white"
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
    <div className="space-y-2">
      <label className="block text-sm font-medium">Logo</label>
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Current logo"
            width={64}
            height={64}
            className="h-16 w-16 rounded border bg-muted object-contain"
            unoptimized
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed bg-muted text-xs text-muted-foreground">
            None
          </div>
        )}
        <div className="space-x-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_LOGO_TYPES}
            className="hidden"
            onChange={onPick}
          />
          <Button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {logoUrl ? "Replace logo" : "Upload logo"}
          </Button>
          {logoUrl ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void onClear()}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        PNG, JPEG, WEBP, or SVG. Max 4&nbsp;MB. Square images render best.
      </p>
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
    <div className="space-y-2">
      <label className="block text-sm font-medium">Favicon</label>
      <div className="flex items-center gap-4">
        {trimmed ? (
          <Image
            src={trimmed}
            alt="Current favicon"
            width={48}
            height={48}
            className="h-12 w-12 rounded border bg-muted object-contain"
            unoptimized
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded border border-dashed bg-muted text-xs text-muted-foreground">
            None
          </div>
        )}
        <div className="space-x-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_FAVICON_TYPES}
            className="hidden"
            onChange={onPick}
          />
          <Button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {trimmed ? "Replace favicon" : "Upload favicon"}
          </Button>
          {trimmed ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void onClear()}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        PNG, ICO, or WEBP. Max 512&nbsp;KB. 32×32 or 48×48 works well in browser tabs.
      </p>
    </div>
  );
}

function LockedNotice() {
  return (
    <section className="max-w-2xl space-y-3">
      <h2 className="text-xl font-semibold">Branding</h2>
      <p className="text-sm text-muted-foreground">
        Ask an owner or admin (permission <code>business.manage_settings</code>) to update your storefront
        branding.
      </p>
    </section>
  );
}

export default function BrandingPage() {
  const { canManageBusinessSettings } = useDashboard();
  const [snapshot, setSnapshot] = useState<BusinessRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [notice, setNotice] = useState<Notice>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [faviconBusy, setFaviconBusy] = useState(false);

  useEffect(() => {
    fetchBusiness()
      .then((next) => {
        setSnapshot(next);
        setForm(formFromBranding(next.branding));
      })
      .catch((error) =>
        setNotice({ tone: "error", text: messageFor(error, "Failed to load business.") }),
      );
  }, []);

  if (!canManageBusinessSettings) {
    return <LockedNotice />;
  }

  const onSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!HEX_REGEX.test(form.primaryColor) || !HEX_REGEX.test(form.accentColor)) {
      setNotice({ tone: "error", text: "Colors must be #RRGGBB." });
      return;
    }
    setIsSaving(true);
    setNotice(null);
    try {
      const next = await updateMyBranding(buildPatch(form));
      setSnapshot(next);
      setForm(formFromBranding(next.branding));
      setNotice({ tone: "info", text: "Branding saved." });
    } catch (error) {
      setNotice({ tone: "error", text: messageFor(error, "Save failed.") });
    } finally {
      setIsSaving(false);
    }
  };

  const onLogoUpload = async (file: File) => {
    if (file.size > MAX_LOGO_BYTES) {
      setNotice({ tone: "error", text: "Logo exceeds the 4 MB limit." });
      return;
    }
    setLogoBusy(true);
    setNotice(null);
    try {
      const next = await uploadMyBrandingLogo(file);
      setSnapshot(next);
      setForm(formFromBranding(next.branding));
      setNotice({ tone: "info", text: "Logo updated." });
    } catch (error) {
      setNotice({ tone: "error", text: messageFor(error, "Upload failed.") });
    } finally {
      setLogoBusy(false);
    }
  };

  const onLogoClear = async () => {
    setLogoBusy(true);
    setNotice(null);
    try {
      const next = await clearMyBrandingLogo();
      setSnapshot(next);
      setForm(formFromBranding(next.branding));
      setNotice({ tone: "info", text: "Logo removed." });
    } catch (error) {
      setNotice({ tone: "error", text: messageFor(error, "Could not remove logo.") });
    } finally {
      setLogoBusy(false);
    }
  };

  const onFaviconUpload = async (file: File) => {
    if (file.size > MAX_FAVICON_BYTES) {
      setNotice({ tone: "error", text: "Favicon exceeds the 512 KB limit." });
      return;
    }
    setFaviconBusy(true);
    setNotice(null);
    try {
      const next = await uploadMyBrandingFavicon(file);
      setSnapshot(next);
      setForm(formFromBranding(next.branding));
      setNotice({ tone: "info", text: "Favicon updated." });
    } catch (error) {
      setNotice({ tone: "error", text: messageFor(error, "Favicon upload failed.") });
    } finally {
      setFaviconBusy(false);
    }
  };

  const onFaviconClear = async () => {
    setFaviconBusy(true);
    setNotice(null);
    try {
      const next = await clearMyBrandingFavicon();
      setSnapshot(next);
      setForm(formFromBranding(next.branding));
      setNotice({ tone: "info", text: "Favicon removed." });
    } catch (error) {
      setNotice({ tone: "error", text: messageFor(error, "Could not remove favicon.") });
    } finally {
      setFaviconBusy(false);
    }
  };

  const logoUrl = snapshot?.branding?.logoUrl ?? null;
  const faviconUrl = snapshot?.branding?.faviconUrl ?? form.faviconUrl;

  return (
    <section className="max-w-3xl space-y-6">
      <header>
        <h2 className="text-xl font-semibold">Branding</h2>
        <p className="text-sm text-muted-foreground">
          Customize how your storefront and dashboard greet customers and staff.
          Changes apply to the public shop, login pages, and emails within a minute.
        </p>
      </header>

      <BrandingPreview form={form} logoUrl={logoUrl} />

      <LogoSection
        logoUrl={logoUrl}
        busy={logoBusy}
        onUpload={onLogoUpload}
        onClear={onLogoClear}
      />

      <FaviconSection
        faviconUrl={faviconUrl}
        busy={faviconBusy}
        onUpload={onFaviconUpload}
        onClear={onFaviconClear}
      />

      <form className="space-y-5" onSubmit={onSave}>
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="branding-name">
            Display name
          </label>
          <input
            id="branding-name"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.displayName}
            maxLength={255}
            onChange={(e) => setForm((s) => ({ ...s, displayName: e.target.value }))}
            placeholder={snapshot?.name ?? "Your storefront name"}
          />
          <p className="text-xs text-muted-foreground">
            Shown across the storefront header, login screens, and tenant emails.
            Falls back to your business name when empty.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
          <label className="block text-sm font-medium" htmlFor="branding-favicon">
            Favicon URL (optional)
          </label>
          <input
            id="branding-favicon"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.faviconUrl}
            maxLength={1024}
            onChange={(e) => setForm((s) => ({ ...s, faviconUrl: e.target.value }))}
            placeholder="https://cdn.example.com/favicon.png"
          />
          <p className="text-xs text-muted-foreground">
            Use upload above for hosted favicons, or paste an external URL here and save.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button disabled={isSaving} type="submit">
            {isSaving ? "Saving..." : "Save branding"}
          </Button>
          {notice ? (
            <p
              className={
                notice.tone === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {notice.text}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
