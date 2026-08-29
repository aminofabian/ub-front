"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import type { StorefrontForm } from "@/components/business/business-settings-types";
import { Button } from "@/components/ui/button";
import {
  FRONT_WINDOW_HIGHLIGHT_SLOTS,
  type FrontWindowLandingForm,
} from "@/lib/front-window-landing";
import {
  getCloudinarySignature,
  uploadToCloudinary,
} from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import Link from "next/link";
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
      const folder = `ub/${businessId}/landing/front-window/${folderSuffix}`;
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
          className="hidden"
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
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-4" aria-hidden />
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
            <X className="size-4" aria-hidden />
            Remove
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {value ? (
        <div className="relative aspect-[4/3] max-w-xs overflow-hidden rounded-md border border-border/70 bg-background">
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
    </div>
  );
}

function patchFrontWindow(
  form: FrontWindowLandingForm,
  patch: Partial<FrontWindowLandingForm>,
): FrontWindowLandingForm {
  return { ...form, ...patch };
}

export function FrontWindowLandingEditor({
  storefront,
  setStorefront,
  storeName,
  businessId,
  showTemplateSections = true,
}: {
  storefront: StorefrontForm;
  setStorefront: React.Dispatch<React.SetStateAction<StorefrontForm>>;
  storeName: string;
  businessId?: string | null;
  /** Front-window-only sections (story, carry, visit layout). Shared hero/contact fields always show. */
  showTemplateSections?: boolean;
}) {
  const fw = storefront.frontWindow;

  const setFrontWindow = (
    patch:
      | Partial<FrontWindowLandingForm>
      | ((prev: FrontWindowLandingForm) => FrontWindowLandingForm),
  ) => {
    setStorefront((s) => ({
      ...s,
      frontWindow:
        typeof patch === "function"
          ? patch(s.frontWindow)
          : patchFrontWindow(s.frontWindow, patch),
    }));
  };

  const setHighlight = (
    index: number,
    field: "title" | "note" | "imageUrl",
    value: string,
  ) => {
    setFrontWindow((prev) => ({
      ...prev,
      highlights: prev.highlights.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  return (
    <div className="space-y-6 sm:col-span-2">
      <div className="space-y-1.5">
        <p className={labelClass()}>Landing page content</p>
        <p className={hintClass()}>
          {showTemplateSections
            ? "Customize every section of your shop window landing."
            : "Headline, hero photo, hours, and contact apply to every coming-soon landing theme."}{" "}
          Structured fields in{" "}
          <Link
            href={APP_ROUTES.businessDesign}
            className="font-medium underline underline-offset-2"
          >
            Design → Business details
          </Link>{" "}
          override tagline, hours, phone, and address when set.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 p-4">
        <h3 className={sectionTitleClass()}>Hero</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass()} htmlFor="fw-headline">
              Headline
            </label>
            <input
              id="fw-headline"
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
            <label className={labelClass()} htmlFor="fw-subheadline">
              Subheadline
            </label>
            <textarea
              id="fw-subheadline"
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
            <label className={labelClass()} htmlFor="fw-cta">
              Primary button
            </label>
            <input
              id="fw-cta"
              className={inputClass()}
              value={storefront.landingCtaLabel}
              onChange={(e) =>
                setStorefront((s) => ({ ...s, landingCtaLabel: e.target.value }))
              }
            />
          </div>
          {showTemplateSections ? (
            <div className="space-y-1.5">
              <label className={labelClass()} htmlFor="fw-secondary-cta">
                Secondary button
              </label>
              <input
                id="fw-secondary-cta"
                className={inputClass()}
                value={fw.secondaryCtaLabel}
                onChange={(e) =>
                  setFrontWindow({ secondaryCtaLabel: e.target.value })
                }
              />
            </div>
          ) : null}
        </div>
        <LandingPhotoField
          label={showTemplateSections ? "Shop window photo" : "Hero photo"}
          hint={
            showTemplateSections
              ? "The lit vitrine in your hero. Leave empty to use Design → Hero photo or a default."
              : "Used as the main hero image on every coming-soon landing. Leave empty to use Design → Hero photo."
          }
          value={fw.vitrineImageUrl}
          businessId={businessId}
          folderSuffix="vitrine"
          onChange={(url) => setFrontWindow({ vitrineImageUrl: url })}
        />
      </div>

      {!showTemplateSections ? (
        <div className="space-y-3 rounded-xl border border-border/70 p-4">
          <h3 className={sectionTitleClass()}>Visit & contact</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className={labelClass()} htmlFor="fw-hours-shared">
                Hours
              </label>
              <input
                id="fw-hours-shared"
                className={inputClass()}
                value={storefront.landingHours}
                onChange={(e) =>
                  setStorefront((s) => ({ ...s, landingHours: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className={labelClass()} htmlFor="fw-address-shared">
                Address
              </label>
              <input
                id="fw-address-shared"
                className={inputClass()}
                value={storefront.landingAddress}
                onChange={(e) =>
                  setStorefront((s) => ({ ...s, landingAddress: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass()} htmlFor="fw-phone-shared">
                Phone
              </label>
              <input
                id="fw-phone-shared"
                className={inputClass()}
                value={storefront.landingPhone}
                onChange={(e) =>
                  setStorefront((s) => ({ ...s, landingPhone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass()} htmlFor="fw-wa-shared">
                WhatsApp
              </label>
              <input
                id="fw-wa-shared"
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
          </div>
        </div>
      ) : null}

      {showTemplateSections ? (
        <>
      <div className="space-y-3 rounded-xl border border-border/70 p-4">
        <h3 className={sectionTitleClass()}>Our story</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass()} htmlFor="fw-story-title">
              Section title
            </label>
            <input
              id="fw-story-title"
              className={inputClass()}
              value={fw.storyTitle}
              onChange={(e) => setFrontWindow({ storyTitle: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass()} htmlFor="fw-story-body">
              Body copy
            </label>
            <textarea
              id="fw-story-body"
              className={textareaClass()}
              value={fw.storyBody}
              onChange={(e) => setFrontWindow({ storyBody: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass()} htmlFor="fw-story-quote">
              Pull quote
            </label>
            <textarea
              id="fw-story-quote"
              className={textareaClass()}
              value={fw.storyQuote}
              onChange={(e) => setFrontWindow({ storyQuote: e.target.value })}
            />
          </div>
        </div>
        <LandingPhotoField
          label="Story photo"
          hint="Counter or interior shot beside your story."
          value={fw.storyImageUrl}
          businessId={businessId}
          folderSuffix="story"
          onChange={(url) => setFrontWindow({ storyImageUrl: url })}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 p-4">
        <h3 className={sectionTitleClass()}>What we carry</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass()} htmlFor="fw-carry-title">
              Section title
            </label>
            <input
              id="fw-carry-title"
              className={inputClass()}
              value={fw.carryTitle}
              onChange={(e) => setFrontWindow({ carryTitle: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass()} htmlFor="fw-carry-lead">
              Lead paragraph
            </label>
            <textarea
              id="fw-carry-lead"
              className={textareaClass()}
              value={fw.carryLead}
              onChange={(e) => setFrontWindow({ carryLead: e.target.value })}
            />
          </div>
        </div>
        <p className={hintClass()}>
          When your catalog has products, live items appear instead of these
          highlights. Use these as placeholders or for categories you do not
          list online yet.
        </p>
        <div className="space-y-3">
          {Array.from({ length: FRONT_WINDOW_HIGHLIGHT_SLOTS }, (_, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-2"
            >
              <div className="space-y-1.5">
                <label className={labelClass()} htmlFor={`fw-hl-title-${index}`}>
                  Item {index + 1} title
                </label>
                <input
                  id={`fw-hl-title-${index}`}
                  className={inputClass()}
                  value={fw.highlights[index]?.title ?? ""}
                  onChange={(e) =>
                    setHighlight(index, "title", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className={labelClass()} htmlFor={`fw-hl-note-${index}`}>
                  Item {index + 1} description
                </label>
                <input
                  id={`fw-hl-note-${index}`}
                  className={inputClass()}
                  value={fw.highlights[index]?.note ?? ""}
                  onChange={(e) => setHighlight(index, "note", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 p-4">
        <h3 className={sectionTitleClass()}>Visit</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={labelClass()} htmlFor="fw-visit-title">
              Section title
            </label>
            <input
              id="fw-visit-title"
              className={inputClass()}
              value={fw.visitTitle}
              onChange={(e) => setFrontWindow({ visitTitle: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass()} htmlFor="fw-hours">
              Hours
            </label>
            <input
              id="fw-hours"
              className={inputClass()}
              value={storefront.landingHours}
              onChange={(e) =>
                setStorefront((s) => ({ ...s, landingHours: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass()} htmlFor="fw-address">
              Address
            </label>
            <input
              id="fw-address"
              className={inputClass()}
              value={storefront.landingAddress}
              onChange={(e) =>
                setStorefront((s) => ({ ...s, landingAddress: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass()} htmlFor="fw-hold-note">
              Hold at the counter note
            </label>
            <textarea
              id="fw-hold-note"
              className={textareaClass()}
              value={fw.holdAtCounterNote}
              onChange={(e) =>
                setFrontWindow({ holdAtCounterNote: e.target.value })
              }
            />
          </div>
        </div>
        <LandingPhotoField
          label="Street photo"
          hint="Exterior or street-view beside your visit details."
          value={fw.visitImageUrl}
          businessId={businessId}
          folderSuffix="visit"
          onChange={(url) => setFrontWindow({ visitImageUrl: url })}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 p-4">
        <h3 className={sectionTitleClass()}>Contact</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass()} htmlFor="fw-contact-title">
              Section title
            </label>
            <input
              id="fw-contact-title"
              className={inputClass()}
              value={fw.contactTitle}
              onChange={(e) => setFrontWindow({ contactTitle: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelClass()} htmlFor="fw-contact-body">
              Body copy
            </label>
            <textarea
              id="fw-contact-body"
              className={textareaClass()}
              value={fw.contactBody}
              onChange={(e) => setFrontWindow({ contactBody: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass()} htmlFor="fw-phone">
              Phone
            </label>
            <input
              id="fw-phone"
              className={inputClass()}
              value={storefront.landingPhone}
              onChange={(e) =>
                setStorefront((s) => ({ ...s, landingPhone: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass()} htmlFor="fw-wa">
              WhatsApp
            </label>
            <input
              id="fw-wa"
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
        </div>
      </div>

      <details className="rounded-xl border border-border/70 p-4">
        <summary className="cursor-pointer text-sm font-semibold tracking-tight text-foreground">
          Navigation labels
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["navStoryLabel", "Our story link", "fw-nav-story"],
              ["navCarryLabel", "What we carry link", "fw-nav-carry"],
              ["navVisitLabel", "Visit link", "fw-nav-visit"],
              ["navContactLabel", "Contact link", "fw-nav-contact"],
            ] as const
          ).map(([field, label, id]) => (
            <div key={field} className="space-y-1.5">
              <label className={labelClass()} htmlFor={id}>
                {label}
              </label>
              <input
                id={id}
                className={inputClass()}
                value={fw[field]}
                onChange={(e) =>
                  setFrontWindow({ [field]: e.target.value })
                }
              />
            </div>
          ))}
        </div>
      </details>
        </>
      ) : null}
    </div>
  );
}
