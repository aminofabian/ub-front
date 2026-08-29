"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import type { StorefrontForm } from "@/components/business/business-settings-types";
import { Button } from "@/components/ui/button";
import {
  patchBrandPoster,
  type BrandPosterLandingForm,
  type BrandPosterTone,
} from "@/lib/brand-poster-landing";
import { getCloudinarySignature, uploadToCloudinary } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

function inputClass() {
  return cn(
    "h-8 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm shadow-sm transition-colors",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30",
  );
}

function textareaClass() {
  return cn(
    "min-h-[88px] w-full rounded-md border border-input bg-background px-2.5 py-2 text-sm shadow-sm transition-colors",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30",
  );
}

function labelClass() {
  return "text-xs font-medium leading-none text-foreground";
}

function hintClass() {
  return "text-[11px] leading-snug text-muted-foreground";
}

function sectionTitleClass() {
  return "text-sm font-semibold tracking-tight text-foreground";
}

type PhotoFieldProps = {
  label: string;
  hint: string;
  value: string;
  businessId: string | null | undefined;
  folderSuffix: string;
  onChange: (url: string) => void;
};

function LandingPhotoField({
  label,
  hint,
  value,
  businessId,
  folderSuffix,
  onChange,
}: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (file: File) => {
    if (!businessId) {
      setError("Save your business profile first, then upload photos.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const folder = `ub/${businessId}/landing/brand-poster/${folderSuffix}`;
      const sig = await getCloudinarySignature(folder);
      const result = await uploadToCloudinary(file, sig);
      onChange(result.secure_url);
    } catch (e) {
      setError(
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not upload the photo.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
      <div>
        <p className={labelClass()}>{label}</p>
        <p className={cn(hintClass(), "mt-1")}>{hint}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onPick(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-3.5" aria-hidden />
          )}
          {value ? "Replace photo" : "Upload photo"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
          >
            <X className="size-3.5" aria-hidden />
            Remove
          </Button>
        ) : null}
      </div>
      {value ? (
        <div className="relative mt-2 aspect-[21/9] max-w-md overflow-hidden rounded-md border border-border/60 bg-muted">
          <Image
            src={value}
            alt=""
            fill
            unoptimized
            className="object-cover"
            sizes="320px"
          />
        </div>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function BrandPosterLandingEditor({
  storefront,
  setStorefront,
  storeName,
  businessId,
}: {
  storefront: StorefrontForm;
  setStorefront: React.Dispatch<React.SetStateAction<StorefrontForm>>;
  storeName: string;
  businessId?: string | null;
}) {
  const bp = storefront.brandPoster;
  const heroPhoto = storefront.frontWindow.vitrineImageUrl;

  const setBrandPoster = (
    patch:
      | Partial<BrandPosterLandingForm>
      | ((prev: BrandPosterLandingForm) => BrandPosterLandingForm),
  ) => {
    setStorefront((s) => ({
      ...s,
      brandPoster:
        typeof patch === "function"
          ? patch(s.brandPoster)
          : patchBrandPoster(s.brandPoster, patch),
    }));
  };

  const setHeroPhoto = (url: string) => {
    setStorefront((s) => ({
      ...s,
      frontWindow: { ...s.frontWindow, vitrineImageUrl: url },
    }));
  };

  return (
    <div className="space-y-6 sm:col-span-2">
      <div className="space-y-1.5">
        <p className={labelClass()}>Brand poster content</p>
        <p className={hintClass()}>
          Customize your letterpress-style poster landing — copy, photos, tone,
          and print details. Structured fields in{" "}
          <Link
            href={APP_ROUTES.businessDesign}
            className="font-medium underline underline-offset-2"
          >
            Design → Business details
          </Link>{" "}
          override hours, phone, and address when set.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 p-4">
        <h3 className={sectionTitleClass()}>Poster look</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass()} htmlFor="bp-tone">
              Print stock
            </label>
            <select
              id="bp-tone"
              className={inputClass()}
              value={bp.tone}
              onChange={(e) =>
                setBrandPoster({ tone: e.target.value as BrandPosterTone })
              }
            >
              <option value="paper">Warm paper (light)</option>
              <option value="night">Night print (dark)</option>
            </select>
            <p className={hintClass()}>
              Night print inverts the poster to a dark stock with light ink.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass()} htmlFor="bp-edition">
              Edition watermark
            </label>
            <input
              id="bp-edition"
              className={inputClass()}
              value={bp.editionText}
              placeholder={String(new Date().getFullYear())}
              onChange={(e) => setBrandPoster({ editionText: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass()} htmlFor="bp-badge">
              Status badge
            </label>
            <input
              id="bp-badge"
              className={inputClass()}
              value={bp.badgeLabel}
              placeholder="Opening soon"
              onChange={(e) => setBrandPoster({ badgeLabel: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass()} htmlFor="bp-spine">
              Spine text
            </label>
            <input
              id="bp-spine"
              className={inputClass()}
              value={bp.spineText}
              placeholder={`Coming soon · ${storeName}`}
              onChange={(e) => setBrandPoster({ spineText: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 p-4">
        <h3 className={sectionTitleClass()}>Headline</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass()} htmlFor="bp-tagline">
              Tagline
            </label>
            <input
              id="bp-tagline"
              className={inputClass()}
              value={bp.tagline}
              placeholder="Est. 2024 · Nairobi"
              onChange={(e) => setBrandPoster({ tagline: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass()} htmlFor="bp-headline">
              Headline
            </label>
            <input
              id="bp-headline"
              className={inputClass()}
              value={storefront.landingHeadline}
              placeholder={storeName}
              onChange={(e) =>
                setStorefront((s) => ({
                  ...s,
                  landingHeadline: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass()} htmlFor="bp-subheadline">
              Subheadline
            </label>
            <textarea
              id="bp-subheadline"
              className={textareaClass()}
              value={storefront.landingSubheadline}
              onChange={(e) =>
                setStorefront((s) => ({
                  ...s,
                  landingSubheadline: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass()} htmlFor="bp-cta">
              Primary button
            </label>
            <input
              id="bp-cta"
              className={inputClass()}
              value={storefront.landingCtaLabel}
              onChange={(e) =>
                setStorefront((s) => ({ ...s, landingCtaLabel: e.target.value }))
              }
            />
          </div>
        </div>
        <LandingPhotoField
          label="Hero photo"
          hint="Wide band across the poster. Leave empty to use Design → Hero photo."
          value={heroPhoto}
          businessId={businessId}
          folderSuffix="hero"
          onChange={setHeroPhoto}
        />
        <LandingPhotoField
          label="Detail photo"
          hint="Optional inset photo — product close-up, interior, or team."
          value={bp.secondaryImageUrl}
          businessId={businessId}
          folderSuffix="detail"
          onChange={(url) => setBrandPoster({ secondaryImageUrl: url })}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 p-4">
        <h3 className={sectionTitleClass()}>Visit & contact</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass()} htmlFor="bp-hours">
              Hours
            </label>
            <input
              id="bp-hours"
              className={inputClass()}
              value={storefront.landingHours}
              onChange={(e) =>
                setStorefront((s) => ({ ...s, landingHours: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass()} htmlFor="bp-address">
              Address
            </label>
            <input
              id="bp-address"
              className={inputClass()}
              value={storefront.landingAddress}
              onChange={(e) =>
                setStorefront((s) => ({ ...s, landingAddress: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass()} htmlFor="bp-phone">
              Phone
            </label>
            <input
              id="bp-phone"
              className={inputClass()}
              value={storefront.landingPhone}
              onChange={(e) =>
                setStorefront((s) => ({ ...s, landingPhone: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass()} htmlFor="bp-wa">
              WhatsApp
            </label>
            <input
              id="bp-wa"
              className={inputClass()}
              value={storefront.landingWhatsapp}
              onChange={(e) =>
                setStorefront((s) => ({
                  ...s,
                  landingWhatsapp: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass()} htmlFor="bp-contact-lead">
              Contact bar message
            </label>
            <textarea
              id="bp-contact-lead"
              className={textareaClass()}
              value={bp.contactLead}
              onChange={(e) => setBrandPoster({ contactLead: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
