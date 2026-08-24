"use client";

import Image from "next/image";

import {
  sectionCardClass,
  sectionContainerClass,
} from "@/components/storefront/sections/shared";
import { StorefrontInlineText } from "@/components/storefront/storefront-inline-text";
import {
  StorefrontQuickEditTarget,
  useStorefrontStaffEditOptional,
} from "@/components/storefront/storefront-staff-edit";
import type {
  StorefrontAboutSectionSettings,
  StorefrontDesignBusiness,
} from "@/lib/storefront-design";

/** The shop's story — text from the business profile, optional photo. */
export function AboutSection({
  settings,
  business,
  storeName,
}: {
  settings: StorefrontAboutSectionSettings;
  business: StorefrontDesignBusiness | null | undefined;
  storeName: string;
}) {
  const staff = useStorefrontStaffEditOptional();
  const editing = Boolean(staff?.editMode);
  const text = settings.text.trim() || business?.description?.trim() || "";
  if (!text && !editing) {
    return null;
  }
  const heading = settings.heading.trim() || `About ${storeName}`;
  const imageUrl = settings.imageUrl.trim();

  return (
    <StorefrontQuickEditTarget field="about" label="about section">
      <section className={sectionContainerClass("py-3")} aria-label={heading}>
        <div
          className={sectionCardClass(
            "overflow-hidden px-5 py-6 sm:px-7 sm:py-8",
          )}
        >
          <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,0.9fr)_1.1fr]">
            {imageUrl ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[length:var(--sf-card-radius,1rem)] bg-muted">
                <Image
                  src={imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 40vw, 90vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : null}
            <div className={imageUrl ? "" : "sm:col-span-2"}>
              <StorefrontInlineText
                as="h2"
                className="font-heading text-lg font-bold tracking-[-0.02em] text-foreground sm:text-xl"
                value={heading}
                placeholder="About heading"
                onCommit={(next) => {
                  void staff?.commitInlineField("about", { heading: next });
                }}
              >
                <h2 className="font-heading text-lg font-bold tracking-[-0.02em] text-foreground sm:text-xl">
                  {heading}
                </h2>
              </StorefrontInlineText>
              <StorefrontInlineText
                as="p"
                multiline
                className="mt-2 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground"
                value={text}
                placeholder="Tell shoppers your story"
                onCommit={(next) => {
                  void staff?.commitInlineField("about", { text: next });
                }}
              >
                <p className="mt-2 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </StorefrontInlineText>
            </div>
          </div>
        </div>
      </section>
    </StorefrontQuickEditTarget>
  );
}
