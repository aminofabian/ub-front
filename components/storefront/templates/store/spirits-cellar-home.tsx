"use client";

import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import { Suspense, type CSSProperties } from "react";

import {
  SpiritsCellarHero,
  SpiritsCellarSlot,
} from "@/components/storefront/templates/store/spirits-cellar-card";
import { SpiritsCellarCatalog } from "@/components/storefront/templates/store/spirits-cellar-catalog";
import { spiritsCellarFontVariables } from "@/components/storefront/templates/store/spirits-cellar-fonts";
import { SpiritsCellarMobileSearch } from "@/components/storefront/templates/store/spirits-cellar-header";
import { SpiritsCellarKeys } from "@/components/storefront/templates/store/spirits-cellar-keys";
import styles from "@/components/storefront/templates/store/spirits-cellar.module.css";
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
 * THESIS: Products are sealed essences in a candlelit stone vault — wax
 * seals, arched niches, brass keys — not a generic dark bottle grid.
 * OWN-WORLD: Subterranean stone, sconce glow, wax crimson seals, copper
 * tags, Fraunces / Manrope, spirit-mist accent.
 * STORY: Descend the steps, see tonight's grand niche, break a seal or
 * browse deeper shelves below.
 * FIRST VIEWPORT: Vault header; grand arched niche left; three slot niches
 * right; brass key-ring category filters.
 * FORM: Essence Vault · Vault comp.
 */
export function SpiritsCellarStoreHome(props: StoreHomeTemplateProps) {
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

  const wax = primaryHex?.trim() || "#8B2635";
  const spirit = accentHex?.trim() || "#C4B5FD";
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const headline = resolveNativeHeroHeadline(
    heroSettings,
    announcement,
    "Tonight's sealed essence.",
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
      className={cn(styles.root, styles.body, spiritsCellarFontVariables)}
      data-store-theme-id="spirits-cellar"
      style={
        {
          ["--sc-wax" as string]: wax,
          ["--sc-spirit" as string]: spirit,
        } as CSSProperties
      }
    >
      <div className={styles.wrap}>
        <Suspense fallback={null}>
          <SpiritsCellarMobileSearch />
        </Suspense>
        {productsOn ? (
          <Suspense fallback={null}>
            <SpiritsCellarKeys types={types} />
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
            ctaAnchor="#vault-catalog"
          />
        ) : lead ? (
          <StorefrontNativeHeroEditFrame>
            <section className={styles.descent} aria-label="Grand niche">
              <SpiritsCellarHero item={lead} currency={currency} headline={headline} />
              {stack.length > 0 ? (
                <div className={styles.slots}>
                  {stack.map((item) => (
                    <SpiritsCellarSlot key={item.id} item={item} currency={currency} />
                  ))}
                </div>
              ) : null}
            </section>
          </StorefrontNativeHeroEditFrame>
        ) : (
          <StorefrontNativeHeroEditFrame>
            <section className={styles.descent} aria-label="Grand niche">
              <article className={styles.vault}>
                <div className={styles.vaultInner}>
                  <div className={styles.vaultHead}>
                    <span className={styles.vaultBadge}>Grand niche · row A</span>
                    <StorefrontNativeHeroHeadline
                      value={headline}
                      className={styles.vaultHeadline}
                    />
                  </div>
                  <span className={styles.visualPlaceholder} aria-hidden />
                  <div className={styles.vaultLedger}>
                    <p className={styles.ledgerValPlain}>{heroTitle}</p>
                    <p className={styles.itemMeta}>
                      The vault is quiet — new essences arriving soon.
                    </p>
                  </div>
                </div>
              </article>
            </section>
          </StorefrontNativeHeroEditFrame>
        )}

        {productsOn ? (
          <SpiritsCellarCatalog
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
          <p>Sealed at source. Same-day vault release.</p>
        </footer>
      </div>
    </div>
  );
}
