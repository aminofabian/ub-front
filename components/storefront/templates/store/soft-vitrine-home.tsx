"use client";

import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import { themeOptionVars } from "@/lib/storefront-theme-options";
import { type CSSProperties } from "react";

import { SoftVitrineHeroPanel } from "@/components/storefront/templates/store/soft-vitrine-card";
import { SoftVitrineCarousel } from "@/components/storefront/templates/store/soft-vitrine-carousel";
import { SoftVitrineCatalog } from "@/components/storefront/templates/store/soft-vitrine-catalog";
import { softVitrineFontVariables } from "@/components/storefront/templates/store/soft-vitrine-fonts";
import { SoftVitrineNewsletter } from "@/components/storefront/templates/store/soft-vitrine-newsletter";
import styles from "@/components/storefront/templates/store/soft-vitrine.module.css";
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
import { readableInkOn } from "@/lib/color-contrast";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

const HERO_COPY = [
  { headline: "Real results. In seconds.", cta: "Get yours now" },
  { headline: "Shop the collection", cta: "Shop all" },
  { headline: "New arrivals", cta: "Explore" },
] as const;

/** Two sections need enough pieces to divide without leaving a lonely row. */
const SHOWCASE_MIN_PIECES = 8;
const SHOWCASE_PIECES = 4;

/**
 * THESIS: Soft vitrine — quiet-luxury beauty DTC; taupe announce, butter CTA, white paper.
 * OWN-WORLD: Jost + Cormorant; centred logo masthead; full-bleed lifestyle hero; sharp corners.
 * STORY: Announce → masthead → lifestyle hero → product rail → newsletter → taupe footer.
 * FIRST VIEWPORT: taupe bar, centred logo, full-bleed hero with butter CTA.
 * FORM: Soft vitrine · corncealer grammar · FINISH: surface brief + detector.
 */
export function SoftVitrineStoreHome(props: StoreHomeTemplateProps) {
  const {
    slug,
    themeId,
    currency,
    catalogItems,
    nextCursor,
    totalCount,
    featured,
    heroTitle,
    types,
    q,
    categoryId,
    typeId,
    categoryHeading,
    announcement,
    areaLabel,
    branchHint,
    logoUrl,
    logoDarkUrl,
    heroBannerUrls,
    showcaseImage,
    landingContent,
    primaryHex,
    accentHex,
    design: designProp,
    postSections,
  } = props;
  const design = useStorefrontLiveDesign(designProp ?? null);
  const optionVars = themeOptionVars(themeId, design?.theme ?? null);

  const gold = accentHex?.trim() || "#7b5e4f";
  const brand = primaryHex?.trim() || "#7b5e4f";
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const headline = resolveNativeHeroHeadline(
    heroSettings,
    announcement,
    HERO_COPY[0].headline,
  );
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;
  const buttons = resolveStorefrontDesign(design).buttons;
  // Fashion edit wants presence — a small grocery hero reads as a short banner.
  const heroHeight =
    heroSettings?.height === "small" ? "medium" : (heroSettings?.height ?? "large");
  const description = design?.business?.description?.trim() || null;

  const seen = new Set<string>();
  const heroItems: typeof catalogItems = [];
  for (const item of [...featured, ...catalogItems]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    heroItems.push(item);
    // Soft vitrine is one full-bleed lifestyle plane, not a magazine collage.
    if (heroItems.length >= 1) break;
  }

  const filtered = Boolean(q || typeId || categoryId);
  const splitShowcase = !filtered && catalogItems.length >= SHOWCASE_MIN_PIECES;
  const carouselItems = splitShowcase
    ? (featured.length > 0 ? featured : catalogItems).slice(0, SHOWCASE_PIECES)
    : [];
  const carouselIds = new Set(carouselItems.map((item) => item.id));
  // The item-panel hero only renders when the merchant's hero is off and the
  // shopper is not filtering; only then must its three pieces leave the grid.
  const heroPanelsShown = !heroOn && !filtered;
  const catalogRest = catalogItems.filter((item) => {
    if (carouselIds.has(item.id)) return false;
    if (heroPanelsShown && seen.has(item.id)) return false;
    return true;
  });
  const wa = landingContent?.whatsapp?.replace(/\D/g, "") || "";
  const footerBlurb =
    description ||
    "Get early access to new launches, exclusive offers, and tips from the community.";

  return (
    <div
      className={cn(styles.root, styles.body, styles.home, softVitrineFontVariables)}
      data-store-theme-id="soft-vitrine"
      style={
        {
          ["--sv-gold" as string]: gold,
          ["--sv-ink" as string]: "#1a1714",
          ["--sv-brand" as string]: brand,
          ["--sv-announce-bg" as string]: brand,
          ["--sv-announce-ink" as string]: readableInkOn(brand),
          ...optionVars,
        } as CSSProperties
      }
    >
      {heroOn && !filtered ? (
        <div className={styles.merchantHero}>
          <StorefrontHeroSection
            title={heroTitle}
            tagline={
              heroSettings?.headline.trim() ? heroSettings.headline : announcement
            }
            subheadline={heroSettings?.subheadline ?? null}
            height={heroHeight}
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
            logoDarkUrl={logoDarkUrl}
            heroBannerUrls={heroBannerUrls}
            design={design}
            whatsappNumber={landingContent?.whatsapp ?? landingContent?.phone ?? null}
            ctaAnchor="#catalog"
            chrome="editorial"
          />
        </div>
      ) : !heroOn && !filtered ? (
        <StorefrontNativeHeroEditFrame>
          <section className={styles.hero} aria-label="Featured collections">
            {heroItems.length > 0 ? (
              heroItems.map((item, i) => (
                <SoftVitrineHeroPanel
                  key={item.id}
                  item={item}
                  currency={currency}
                  index={i}
                  featured={i === 0}
                  headline={
                    i === 0
                      ? headline
                      : (HERO_COPY[i]?.headline ?? item.name)
                  }
                  cta={HERO_COPY[i]?.cta ?? "Shop now"}
                  editableHeadline={i === 0}
                />
              ))
            ) : (
              <div
                className={cn(
                  styles.heroPanel,
                  styles.heroPanelFeatured,
                  styles.heroTone0,
                )}
              >
                <span className={styles.heroPanelFallback} />
                <span className={styles.heroGrain} aria-hidden />
                <span className={styles.heroShade} />
                <span className={styles.heroPanelCopy}>
                  <StorefrontNativeHeroHeadline
                    as="span"
                    value={headline}
                    className={styles.heroPanelTitle}
                  />
                  <span className={styles.heroPanelCta}>
                    {HERO_COPY[0].cta}
                  </span>
                </span>
              </div>
            )}
          </section>
        </StorefrontNativeHeroEditFrame>
      ) : null}

      {productsOn ? (
        <>
          {carouselItems.length > 0 ? (
            <SoftVitrineCarousel
              items={carouselItems}
              currency={currency}
              totalCount={totalCount}
            />
          ) : null}

          <SoftVitrineCatalog
            slug={slug}
            currency={currency}
            initialItems={catalogRest.length > 0 ? catalogRest : catalogItems}
            initialNextCursor={nextCursor}
            heading={
              q?.trim() ? `Results for “${q.trim()}”` : categoryHeading
            }
            filtered={filtered}
            query={q}
          />
        </>
      ) : null}

      {filtered ? null : <SoftVitrineNewsletter />}

      {!filtered && postSections ? (
        <div className={styles.postSections}>{postSections}</div>
      ) : null}

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrandCol}>
            <div className={styles.footerBrand}>{heroTitle}</div>
            <p className={styles.footerBlurb}>{footerBlurb}</p>
            {wa ? (
              <a
                className={styles.footerWa}
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp +{wa}
              </a>
            ) : null}
          </div>
          <div className={styles.footerCol}>
            <h3>Shop</h3>
            <ul className={styles.footerLinks}>
              <li>
                <a href={APP_ROUTES.shop}>All products</a>
              </li>
              {types.slice(0, 6).map((type) => (
                <li key={type.id}>
                  <a href={`${APP_ROUTES.shop}?typeId=${encodeURIComponent(type.id)}`}>
                    {type.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h3>Connect</h3>
            <ul className={styles.footerLinks}>
              {landingContent?.phone ? (
                <li>
                  <a href={`tel:${landingContent.phone}`}>{landingContent.phone}</a>
                </li>
              ) : null}
              {landingContent?.address ? (
                <li>{landingContent.address}</li>
              ) : null}
              {areaLabel ? <li>{areaLabel}</li> : null}
            </ul>
          </div>
        </div>
        <p className={styles.footerCopy}>
          © {new Date().getFullYear()} {heroTitle}
          <span aria-hidden> · </span>
          Pay with M-Pesa
        </p>
      </footer>
    </div>
  );
}
