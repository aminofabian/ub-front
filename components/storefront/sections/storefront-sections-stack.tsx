import { AboutSection } from "@/components/storefront/sections/about-section";
import { AnnouncementSection } from "@/components/storefront/sections/announcement-section";
import { ContactSection } from "@/components/storefront/sections/contact-section";
import { PromoSection } from "@/components/storefront/sections/promo-section";
import { SocialSection } from "@/components/storefront/sections/social-section";
import { sectionContainerClass } from "@/components/storefront/sections/shared";
import type {
  StorefrontAboutSectionSettings,
  StorefrontAnnouncementSectionSettings,
  StorefrontContactSectionSettings,
  StorefrontDesign,
  StorefrontPromoSectionSettings,
  StorefrontSectionConfig,
  StorefrontSocialSectionSettings,
} from "@/lib/storefront-design";

/**
 * Renders the merchant's configured sections for one zone (`pre` = above the
 * theme's product engine, `post` = below it). Themes are untouched — the stack
 * wraps around them, so section customization works on every theme.
 */
export function StorefrontSectionsStack({
  design,
  sections,
  storeName,
  primaryHex,
  accentHex,
}: {
  design: StorefrontDesign;
  sections: StorefrontSectionConfig[];
  storeName: string;
  primaryHex: string | null;
  accentHex: string | null;
}) {
  if (sections.length === 0) {
    return null;
  }
  return (
    <div className={sectionContainerClass("flex flex-col gap-3 py-2")}>
      {sections.map((section) => {
        switch (section.id) {
          case "announcement":
            return (
              <AnnouncementSection
                key={section.id}
                settings={section.settings as StorefrontAnnouncementSectionSettings}
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
              />
            );
          case "about":
            return (
              <AboutSection
                key={section.id}
                settings={section.settings as StorefrontAboutSectionSettings}
                business={design.business}
                storeName={storeName}
              />
            );
          case "social":
            return (
              <SocialSection
                key={section.id}
                settings={section.settings as StorefrontSocialSectionSettings}
                business={design.business}
              />
            );
          case "contact":
            return (
              <ContactSection
                key={section.id}
                settings={section.settings as StorefrontContactSectionSettings}
                business={design.business}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
