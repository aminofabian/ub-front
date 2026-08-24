"use client";

import { useMemo } from "react";

import { AboutSection } from "@/components/storefront/sections/about-section";
import { AnnouncementSection } from "@/components/storefront/sections/announcement-section";
import { ContactSection } from "@/components/storefront/sections/contact-section";
import { PromoSection } from "@/components/storefront/sections/promo-section";
import { SocialSection } from "@/components/storefront/sections/social-section";
import { sectionContainerClass } from "@/components/storefront/sections/shared";
import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import type {
  StorefrontAboutSectionSettings,
  StorefrontAnnouncementSectionSettings,
  StorefrontContactSectionSettings,
  StorefrontDesign,
  StorefrontPromoSectionSettings,
  StorefrontSectionConfig,
  StorefrontSectionRegion,
  StorefrontSocialSectionSettings,
} from "@/lib/storefront-design";
import {
  resolveStorefrontDesign,
  storefrontSectionsInRegion,
} from "@/lib/storefront-design";

/**
 * Renders the merchant's configured sections for one zone (`pre` = above the
 * theme's product engine, `post` = below it). Themes are untouched — the stack
 * wraps around them, so section customization works on every theme.
 *
 * While staff edit mode is on, uses the working draft so toggles / copy update
 * live before Publish.
 */
export function StorefrontSectionsStack({
  design,
  sections,
  region,
  storeName,
  primaryHex,
  accentHex,
}: {
  design: StorefrontDesign;
  /** Server-rendered section list; replaced by live draft when editing. */
  sections: StorefrontSectionConfig[];
  region: StorefrontSectionRegion;
  storeName: string;
  primaryHex: string | null;
  accentHex: string | null;
}) {
  const liveDesign = useStorefrontLiveDesign(design);
  const resolvedSections = useMemo(() => {
    if (!liveDesign) return sections;
    return storefrontSectionsInRegion(liveDesign, region);
  }, [liveDesign, sections, region]);

  if (resolvedSections.length === 0) {
    return null;
  }
  const activeDesign = liveDesign ?? design;
  const buttons = resolveStorefrontDesign(activeDesign).buttons;
  return (
    <div
      className={sectionContainerClass(
        "flex flex-col gap-[calc(0.75rem*var(--sf-density,1))] py-2",
      )}
    >
      {resolvedSections.map((section) => {
        switch (section.id) {
          case "announcement":
            return (
              <AnnouncementSection
                key={section.id}
                settings={
                  section.settings as StorefrontAnnouncementSectionSettings
                }
                primaryHex={primaryHex}
              />
            );
          case "promo":
            return (
              <PromoSection
                key={section.id}
                settings={section.settings as StorefrontPromoSectionSettings}
                primaryHex={primaryHex}
                accentHex={accentHex}
                buttons={buttons}
              />
            );
          case "about":
            return (
              <AboutSection
                key={section.id}
                settings={section.settings as StorefrontAboutSectionSettings}
                business={activeDesign.business}
                storeName={storeName}
              />
            );
          case "social":
            return (
              <SocialSection
                key={section.id}
                settings={section.settings as StorefrontSocialSectionSettings}
                business={activeDesign.business}
              />
            );
          case "contact":
            return (
              <ContactSection
                key={section.id}
                settings={section.settings as StorefrontContactSectionSettings}
                business={activeDesign.business}
                buttons={buttons}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
