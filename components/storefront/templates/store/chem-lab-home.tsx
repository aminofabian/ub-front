"use client";

import { Suspense } from "react";

import {
  ChemLabAssaySeal,
  ChemLabBondMark,
  ChemLabHero,
  ChemLabVial,
} from "@/components/storefront/templates/store/chem-lab-card";
import { ChemLabCatalog } from "@/components/storefront/templates/store/chem-lab-catalog";
import { chemLabFontVariables } from "@/components/storefront/templates/store/chem-lab-fonts";
import { ChemLabMobileSearch } from "@/components/storefront/templates/store/chem-lab-header";
import { ChemLabDrawers } from "@/components/storefront/templates/store/chem-lab-drawers";
import {
  chemLabPaletteVars,
  useChemLabCopy,
  useChemLabMode,
} from "@/components/storefront/templates/store/chem-lab-mode";
import styles from "@/components/storefront/templates/store/chem-lab.module.css";
import { StorefrontHeroSection } from "@/components/storefront/sections/hero-section";
import {
  resolveNativeHeroHeadline,
  StorefrontNativeHeroEditFrame,
  StorefrontNativeHeroHeadline,
} from "@/components/storefront/storefront-native-hero-copy";
import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import { themeOptionVars } from "@/lib/storefront-theme-options";
import {
  resolveStorefrontDesign,
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

/**
 * THESIS: Products are reagents on a compounding console — steel chassis,
 * amber glass with a meniscus, a stamped CoA, a numbered specimen rack.
 * OWN-WORLD: Night steel / day notebook, graph paper, lime as a status LED,
 * Space Grotesk / IBM Plex Mono, hazard tape on drawer bays.
 * STORY: Land at the instrument, read the CoA, plunge Dispense, then browse
 * the punched inventory ledger.
 * FIRST VIEWPORT: Instrument header; primary flask + CoA; specimen rack;
 * numbered drawer slots.
 * FORM: Reagent Bench · Counter comp.
 */
export function ChemLabStoreHome(props: StoreHomeTemplateProps) {
  const {
    slug,
    themeId,
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
  const clMode = useChemLabMode();
  const copy = useChemLabCopy();
  const optionVars = themeOptionVars(themeId, design?.theme ?? null);

  const neon = primaryHex?.trim() || "#84CC16";
  const amber = accentHex?.trim() || "#F59E0B";
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const headline = resolveNativeHeroHeadline(
    heroSettings,
    announcement,
    "Featured today.",
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

  return (
    <div
      className={cn(styles.root, styles.body, chemLabFontVariables)}
      data-store-theme-id="chem-lab"
      data-cl-mode={clMode}
      style={{ ...chemLabPaletteVars(neon, amber, clMode), ...optionVars }}
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
          <StorefrontNativeHeroEditFrame>
            <section className={styles.bench} aria-label="Featured product">
              <ChemLabHero item={lead} currency={currency} headline={headline} />
              {stack.length > 0 ? (
                <div className={styles.vialRack}>
                  <div className={styles.rackRail} aria-hidden>
                    <span>{copy?.rack || "Featured"}</span>
                    <span className={styles.rackRailMarks}>
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                  <div className={styles.vials}>
                    {stack.map((item, index) => (
                      <ChemLabVial
                        key={item.id}
                        item={item}
                        currency={currency}
                        slot={`V${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </StorefrontNativeHeroEditFrame>
        ) : (
          <StorefrontNativeHeroEditFrame>
            <section className={styles.bench} aria-label="Featured product">
              <article className={styles.flask}>
                <ChemLabBondMark />
                <div className={styles.flaskInner}>
                  <span className={styles.chassisScrews} aria-hidden>
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <div className={styles.flaskHead}>
                    <StorefrontNativeHeroHeadline
                      value={headline}
                      className={styles.flaskHeadline}
                    />
                  </div>
                  <div
                    className={styles.bottleVisual}
                    style={{ ["--cl-fill" as string]: "52%" }}
                    aria-hidden
                  >
                    <span className={styles.bottleCap} />
                    <span className={styles.bottleFill} />
                    <span className={styles.meniscus} />
                    <span className={styles.glassSheen} />
                    <span className={styles.bottleLabel} />
                    <span className={styles.visualPlaceholder} />
                  </div>
                  <div className={styles.coa}>
                    <ChemLabAssaySeal label={copy?.assay} />
                    <div className={styles.coaHead}>
                      <span>{copy?.coaTitle || "Details"}</span>
                      <span className={styles.coaDocId}>IDLE</span>
                    </div>
                    <div className={styles.coaRow}>
                      <span className={styles.coaKey}>{copy?.statusKey || "Status"}</span>
                      <span className={styles.coaValPlain}>
                        <span className={styles.statusLed} aria-hidden />
                        {copy?.statusIdle || "Idle"}
                      </span>
                    </div>
                    <div className={styles.coaRow}>
                      <span className={styles.coaKey}>{copy?.lotKey || "Shop"}</span>
                      <span className={styles.coaValPlain}>{heroTitle}</span>
                    </div>
                    <p className={styles.itemMeta}>
                      {copy?.empty || "Nothing here yet — new items arriving soon."}
                    </p>
                  </div>
                </div>
              </article>
            </section>
          </StorefrontNativeHeroEditFrame>
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
          <p>{copy?.footerCare || "Handle with care. Same-day pickup."}</p>
        </footer>
      </div>
    </div>
  );
}
