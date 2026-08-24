"use client";

import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import { Suspense, type CSSProperties } from "react";

import {
  CarbonDeskHero,
  CarbonDeskSlip,
} from "@/components/storefront/templates/store/carbon-desk-card";
import { CarbonDeskCatalog } from "@/components/storefront/templates/store/carbon-desk-catalog";
import { carbonDeskFontVariables } from "@/components/storefront/templates/store/carbon-desk-fonts";
import {
  CarbonDeskMobileSearch,
} from "@/components/storefront/templates/store/carbon-desk-header";
import { CarbonDeskTabs } from "@/components/storefront/templates/store/carbon-desk-tabs";
import styles from "@/components/storefront/templates/store/carbon-desk.module.css";
import { StorefrontHeroSection } from "@/components/storefront/sections/hero-section";
import {
  resolveNativeHeroHeadline,
  StorefrontNativeHeroEditFrame,
  StorefrontNativeHeroHeadline,
} from "@/components/storefront/storefront-native-hero-copy";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import {
  resolveStorefrontDesign,
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

/**
 * THESIS: Products live on triplicate counter forms — carbon shadows, stamp
 * pricing, manila tabs — not a generic stationery grid.
 * OWN-WORLD: Ledger paper, cyan carbon offset, rubber-stamp red, Fraunces /
 * IBM Plex Mono, perforated tear edges.
 * STORY: Land at the counter, pick today's duplicate slip, issue more from
 * the file drawer below.
 * FIRST VIEWPORT: Letterhead header; giant duplicate form left; three tilted
 * slips stacked right; manila folder tabs.
 * FORM: Carbon Copy Counter · Counter comp.
 */
export function CarbonDeskStoreHome(props: StoreHomeTemplateProps) {
  const {
    slug,
    currency,
    catalogItems,
    nextCursor,
    totalCount,
    featured,
    heroTitle,
    announcement,
    areaLabel,
    branchHint,
    primaryHex,
    accentHex,
    types,
    logoUrl,
    heroBannerUrls,
    showcaseImage,
    landingContent,
    design: designProp,
  } = props;
  const design = useStorefrontLiveDesign(designProp ?? null);

  const stamp = primaryHex?.trim() || "#B91C1C";
  const carbon = accentHex?.trim() || "#3D6B9E";
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const headline = resolveNativeHeroHeadline(
    heroSettings,
    announcement,
    "Today's counter copy.",
  );
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;
  const buttons = resolveStorefrontDesign(design).buttons;
  const lead = featured[0] ?? catalogItems[0] ?? null;
  const seen = new Set(lead ? [lead.id] : []);
  const stack: typeof catalogItems = [];
  for (const item of [...featured, ...catalogItems]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    stack.push(item);
    if (stack.length >= 3) break;
  }
  const rest = heroOn
    ? catalogItems
    : catalogItems.filter((item) => !seen.has(item.id));
  const locality =
    [areaLabel?.trim(), branchHint?.trim()].filter(Boolean).join(" · ") || null;
  const hours = landingContent?.hours?.trim() || null;
  const address = landingContent?.address?.trim() || null;
  const tilts: Array<"left" | "right" | "none"> = ["left", "none", "right"];

  return (
    <div
      className={cn(styles.root, styles.body, carbonDeskFontVariables)}
      data-store-theme-id="carbon-desk"
      style={
        {
          ["--cd-stamp" as string]: stamp,
          ["--cd-carbon" as string]: carbon,
        } as CSSProperties
      }
    >
      <div className={styles.wrap}>
        <Suspense fallback={null}>
          <CarbonDeskMobileSearch />
        </Suspense>
        {productsOn ? (
          <Suspense fallback={null}>
            <CarbonDeskTabs types={types} />
          </Suspense>
        ) : null}

        {heroOn ? (
          <StorefrontHeroSection
            title={heroTitle}
            tagline={
              heroSettings?.headline.trim() ? heroSettings.headline : announcement
            }
            subheadline={heroSettings?.subheadline ?? null}
            height={heroSettings?.height ?? "medium"}
            overlay={heroSettings?.overlay ?? "none"}
            showCta={heroSettings?.showCta ?? true}
            showWhatsapp={heroSettings?.showWhatsapp ?? true}
            buttons={buttons}
            branchHint={branchHint}
            areaLabel={areaLabel}
            primaryHex={primaryHex}
            accentHex={accentHex}
            showcaseImage={showcaseImage}
            logoUrl={logoUrl}
            heroBannerUrls={heroBannerUrls}
            design={design}
            whatsappNumber={
              landingContent?.whatsapp ?? landingContent?.phone ?? null
            }
            ctaAnchor="#file"
          />
        ) : lead ? (
          <StorefrontNativeHeroEditFrame>
            <section className={styles.counter} aria-label="Counter duplicate">
              <CarbonDeskHero item={lead} currency={currency} headline={headline} />
              {stack.length > 0 ? (
                <div className={styles.stack}>
                  {stack.map((item, i) => (
                    <CarbonDeskSlip
                      key={item.id}
                      item={item}
                      currency={currency}
                      tilt={tilts[i] ?? "none"}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          </StorefrontNativeHeroEditFrame>
        ) : (
          <StorefrontNativeHeroEditFrame>
            <section className={styles.counter} aria-label="Counter duplicate">
              <article className={styles.hero}>
                <span className={styles.heroCarbon} aria-hidden />
                <div className={styles.heroInner}>
                  <div className={styles.heroHead}>
                    <span className={styles.formLabel}>Duplicate · counter copy</span>
                    <StorefrontNativeHeroHeadline
                      value={headline}
                      className={styles.heroHeadline}
                    />
                  </div>
                  <span className={styles.photoPlaceholder} aria-hidden />
                  <div className={styles.heroFields}>
                    <p className={styles.fieldValPlain}>{heroTitle}</p>
                    <p className={styles.formMeta}>
                      Drawer empty — new stock slips coming soon.
                    </p>
                  </div>
                </div>
              </article>
            </section>
          </StorefrontNativeHeroEditFrame>
        )}

        {productsOn ? (
          <CarbonDeskCatalog
            slug={slug}
            currency={currency}
            initialItems={rest}
            initialNextCursor={nextCursor}
            totalCount={totalCount}
          />
        ) : null}

        <footer className={styles.footer}>
          <div className={styles.footerName}>{heroTitle}</div>
          {hours || address || locality ? (
            <p>{[hours, address, locality].filter(Boolean).join(" · ")}</p>
          ) : null}
          <p>Counter closes when the last slip is issued.</p>
        </footer>
      </div>
    </div>
  );
}
