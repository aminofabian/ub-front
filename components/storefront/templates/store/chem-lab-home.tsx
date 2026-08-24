"use client";

import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import { Suspense, type CSSProperties } from "react";

import {
  ChemLabHero,
  ChemLabVial,
} from "@/components/storefront/templates/store/chem-lab-card";
import { ChemLabCatalog } from "@/components/storefront/templates/store/chem-lab-catalog";
import { chemLabFontVariables } from "@/components/storefront/templates/store/chem-lab-fonts";
import { ChemLabMobileSearch } from "@/components/storefront/templates/store/chem-lab-header";
import { ChemLabDrawers } from "@/components/storefront/templates/store/chem-lab-drawers";
import styles from "@/components/storefront/templates/store/chem-lab.module.css";
import { StorefrontHeroSection } from "@/components/storefront/sections/hero-section";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import {
  resolveStorefrontDesign,
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

/**
 * THESIS: Products are reagents on a lit bench — amber bottles, compound
 * codes, hazard drawers — not a generic chemistry clipart grid.
 * OWN-WORLD: Dark bench, graph paper, neon lime glow, amber glass, Space
 * Grotesk / IBM Plex Mono, hazard tape filters.
 * STORY: Land at the bench, inspect the primary reagent, dispense vials or
 * browse full inventory below.
 * FIRST VIEWPORT: Bench header; primary flask left; three vials right; hazard
 * drawer tabs.
 * FORM: Reagent Bench · Counter comp.
 */
export function ChemLabStoreHome(props: StoreHomeTemplateProps) {
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

  const neon = primaryHex?.trim() || "#84CC16";
  const amber = accentHex?.trim() || "#F59E0B";
  const headline =
    announcement?.trim() || "Today's primary reagent.";
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
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

  return (
    <div
      className={cn(styles.root, styles.body, chemLabFontVariables)}
      data-store-theme-id="chem-lab"
      style={
        {
          ["--cl-neon" as string]: neon,
          ["--cl-amber" as string]: amber,
        } as CSSProperties
      }
    >
      <div className={styles.wrap}>
        <Suspense fallback={null}>
          <ChemLabMobileSearch />
        </Suspense>
        {productsOn ? (
          <Suspense fallback={null}>
            <ChemLabDrawers types={types} />
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
            ctaAnchor="#inventory"
          />
        ) : lead ? (
          <section className={styles.bench} aria-label="Primary reagent">
            <ChemLabHero item={lead} currency={currency} headline={headline} />
            {stack.length > 0 ? (
              <div className={styles.vials}>
                {stack.map((item) => (
                  <ChemLabVial key={item.id} item={item} currency={currency} />
                ))}
              </div>
            ) : null}
          </section>
        ) : (
          <section className={styles.bench} aria-label="Primary reagent">
            <article className={styles.flask}>
              <div className={styles.flaskInner}>
                <div className={styles.flaskHead}>
                  <span className={styles.flaskBadge}>Primary reagent · bench A1</span>
                  <h1 className={styles.flaskHeadline}>{headline}</h1>
                </div>
                <span className={styles.visualPlaceholder} aria-hidden />
                <div className={styles.flaskSpec}>
                  <p className={styles.specValPlain}>{heroTitle}</p>
                  <p className={styles.itemMeta}>
                    Bench empty — new compounds arriving soon.
                  </p>
                </div>
              </div>
            </article>
          </section>
        )}

        {productsOn ? (
          <ChemLabCatalog
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
          <p>Handle with care. Same-day bench pickup.</p>
        </footer>
      </div>
    </div>
  );
}
