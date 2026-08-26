"use client";

import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import { themeOptionVars } from "@/lib/storefront-theme-options";
import { type CSSProperties } from "react";

import { BeautyEditHeroPanel } from "@/components/storefront/templates/store/beauty-edit-card";
import { BeautyEditCarousel } from "@/components/storefront/templates/store/beauty-edit-carousel";
import { BeautyEditCatalog } from "@/components/storefront/templates/store/beauty-edit-catalog";
import { beautyEditFontVariables } from "@/components/storefront/templates/store/beauty-edit-fonts";
import { BeautyEditNewsletter } from "@/components/storefront/templates/store/beauty-edit-newsletter";
import styles from "@/components/storefront/templates/store/beauty-edit.module.css";
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
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

const HERO_COPY = [
  { headline: "Curated for you", cta: "Shop now" },
  { headline: "Beauty essentials", cta: "Discover" },
  { headline: "New arrivals", cta: "Explore" },
] as const;

/**
 * THESIS: Beyond — a fashion-magazine storefront; black/white/gold editorial, never a blue UI skin.
 * OWN-WORLD: Jost + Cormorant italic; brand stripe only on the announce bar; masthead-scale logo;
 *   asymmetric 2-col hero (feature + stacked pair); hover “Add to bag”.
 * STORY: Announcement → masthead → editorial hero → bestsellers → full grid → list → footer.
 * FIRST VIEWPORT: Brand masthead + feature panel with two stacked companions, zero gutter.
 * FORM: Beauty Edit · Editorial magazine · FINISH: surface brief + detector.
 */
export function BeautyEditStoreHome(props: StoreHomeTemplateProps) {
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
    announcement,
    areaLabel,
    branchHint,
    logoUrl,
    heroBannerUrls,
    showcaseImage,
    landingContent,
    primaryHex,
    accentHex,
    design: designProp,
  } = props;
  const design = useStorefrontLiveDesign(designProp ?? null);
  const optionVars = themeOptionVars(themeId, design?.theme ?? null);

  const gold = accentHex?.trim() || "#b5853a";
  const brand = primaryHex?.trim() || "#0e0e0e";
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

  const seen = new Set<string>();
  const heroItems: typeof catalogItems = [];
  for (const item of [...featured, ...catalogItems]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    heroItems.push(item);
    if (heroItems.length >= 3) break;
  }

  const carouselItems = featured.length > 0 ? featured : catalogItems.slice(0, 8);
  const catalogRest = heroOn
    ? catalogItems
    : catalogItems.filter((item) => !seen.has(item.id));
  const wa = landingContent?.whatsapp?.replace(/\D/g, "") || "";

  return (
    <div
      className={cn(styles.root, styles.body, beautyEditFontVariables)}
      data-store-theme-id="beauty-edit"
      style={
        {
          ["--be-gold" as string]: gold,
          ["--be-ink" as string]: "#0e0e0e",
          ["--be-brand" as string]: brand,
          ...optionVars,
        } as CSSProperties
      }
    >
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
          whatsappNumber={landingContent?.whatsapp ?? landingContent?.phone ?? null}
          ctaAnchor="#catalog"
        />
      ) : (
        <StorefrontNativeHeroEditFrame>
          <section className={styles.hero} aria-label="Featured collections">
            {heroItems.length > 0 ? (
              heroItems.map((item, i) => (
                <BeautyEditHeroPanel
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
              HERO_COPY.map((copy, i) => (
                <div
                  key={i}
                  className={cn(
                    styles.heroPanel,
                    i === 0 && styles.heroPanelFeatured,
                    styles[`heroTone${i}` as keyof typeof styles],
                  )}
                  aria-hidden={i > 0}
                >
                  <span className={styles.heroPanelFallback} />
                  <span className={styles.heroGrain} aria-hidden />
                  <span className={styles.heroShade} />
                  <span className={styles.heroIndex} aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={styles.heroPanelCopy}>
                    {i === 0 ? (
                      <StorefrontNativeHeroHeadline
                        as="span"
                        value={headline}
                        className={styles.heroPanelTitle}
                      />
                    ) : (
                      <span className={styles.heroPanelTitle}>{copy.headline}</span>
                    )}
                    <span className={styles.heroPanelCta}>
                      {copy.cta}
                      <span className={styles.heroCtaRule} aria-hidden />
                    </span>
                  </span>
                </div>
              ))
            )}
          </section>
        </StorefrontNativeHeroEditFrame>
      )}

      {productsOn ? (
        <>
          <BeautyEditCarousel items={carouselItems} currency={currency} />

          <BeautyEditCatalog
            slug={slug}
            currency={currency}
            initialItems={catalogRest.length > 0 ? catalogRest : catalogItems}
            initialNextCursor={nextCursor}
            totalCount={totalCount}
          />
        </>
      ) : null}

      <BeautyEditNewsletter />

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <div className={styles.footerBrand}>{heroTitle}</div>
            <p className={styles.footerBlurb}>
              Curated fashion, beauty &amp; accessories. Shop online and pay via
              M-Pesa — we deliver nationwide.
            </p>
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
              {wa ? (
                <li>
                  <a href={`https://wa.me/${wa}`}>WhatsApp</a>
                </li>
              ) : null}
              {landingContent?.phone ? (
                <li>
                  <a href={`tel:${landingContent.phone}`}>{landingContent.phone}</a>
                </li>
              ) : null}
              {landingContent?.address ? (
                <li>{landingContent.address}</li>
              ) : null}
            </ul>
          </div>
        </div>
        <p className={styles.footerCopy}>
          © {new Date().getFullYear()} {heroTitle}
          {landingContent?.address ? ` · ${landingContent.address}` : ""}
        </p>
      </footer>
    </div>
  );
}
