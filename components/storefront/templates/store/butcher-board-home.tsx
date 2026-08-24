"use client";

import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import { themeOptionVars } from "@/lib/storefront-theme-options";
import { Suspense, type CSSProperties } from "react";

import {
  ButcherBoardHero,
  ButcherBoardVignette,
} from "@/components/storefront/templates/store/butcher-board-card";
import { ButcherBoardCatalog } from "@/components/storefront/templates/store/butcher-board-catalog";
import { butcherBoardFontVariables } from "@/components/storefront/templates/store/butcher-board-fonts";
import { ButcherBoardMobileSearch } from "@/components/storefront/templates/store/butcher-board-header";
import { ButcherBoardTickets } from "@/components/storefront/templates/store/butcher-board-tickets";
import styles from "@/components/storefront/templates/store/butcher-board.module.css";
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
 * THESIS: The featured product is a six-story painted hero; the rest of the
 * catalog is smaller gold vignettes on the same sheet — not a grocery grid.
 * OWN-WORLD: Crimson-indigo airbrush sky, chrome-yellow outlined billing,
 * gold double frames, clip-path vignettes, Passion One / Archivo.
 * STORY: Land, see today's lead at poster scale, add it or pick a smaller
 * vignette, checkout.
 * FIRST VIEWPORT: Sticky billed wordmark + gold cart plate; left giant
 * painted portrait with Add; right three stacked vignettes of decreasing size.
 * FORM: Painted Hoarding (Bollywood poster challenger, seed 59693505) · Billboard.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 * finish review, the verdict, and DESIGN.md
 */
export function ButcherBoardStoreHome(props: StoreHomeTemplateProps) {
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
  const optionVars = themeOptionVars(themeId, design?.theme ?? null);

  const gold = accentHex?.trim() || "#F5C518";
  const crimson = primaryHex?.trim() || "#E31C23";
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const headline = resolveNativeHeroHeadline(
    heroSettings,
    announcement,
    "Cut to order.",
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
      className={cn(styles.root, styles.body, butcherBoardFontVariables)}
      data-store-theme-id="butcher-board"
      style={
        {
          ["--bb-accent" as string]: gold,
          ["--bb-gold" as string]: gold,
          ["--bb-crimson" as string]: crimson,
          ...optionVars,
        } as CSSProperties
      }
    >
      {/*
        THESIS: The featured product is a six-story painted hero; the catalog refuses a grocery grid.
        OWN-WORLD: Crimson-indigo sky, outlined yellow billing, gold frames, clip-path vignettes.
        STORY: See the lead at poster scale, add it, or pick a smaller vignette and checkout.
        FIRST VIEWPORT: Sticky billed wordmark + gold cart; giant portrait left; three stacked vignettes right.
        FORM: Painted Hoarding · Billboard · seed 59693505
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
      */}
      <div className={styles.wrap}>
        <Suspense fallback={null}>
          <ButcherBoardMobileSearch />
        </Suspense>
        {productsOn ? (
          <Suspense fallback={null}>
            <ButcherBoardTickets types={types} />
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
            whatsappNumber={landingContent?.whatsapp ?? landingContent?.phone ?? null}
            ctaAnchor="#board"
          />
        ) : lead ? (
          <StorefrontNativeHeroEditFrame>
            <section className={styles.billboard} aria-label="Featured on the board">
              <ButcherBoardHero
                item={lead}
                currency={currency}
                headline={headline}
              />
              {stack.length > 0 ? (
                <div className={styles.stack}>
                  {stack.map((item) => (
                    <ButcherBoardVignette
                      key={item.id}
                      item={item}
                      currency={currency}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          </StorefrontNativeHeroEditFrame>
        ) : (
          <StorefrontNativeHeroEditFrame>
            <section className={styles.billboard} aria-label="Featured on the board">
              <div className={cn(styles.hero, styles.heroGlow)}>
                <div className={styles.heroClip}>
                  <span className={styles.heroPlaceholder} aria-hidden />
                  <span className={styles.heroShade} aria-hidden />
                </div>
                <div className={styles.heroCopy}>
                  <StorefrontNativeHeroHeadline
                    value={headline}
                    className={styles.heroHeadline}
                  />
                  <p className={styles.heroProduct}>{heroTitle}</p>
                  <p className={styles.heroMeta}>
                    Nothing on the board yet — check back soon.
                  </p>
                </div>
              </div>
            </section>
          </StorefrontNativeHeroEditFrame>
        )}

        {productsOn ? (
          <ButcherBoardCatalog
            slug={slug}
            currency={currency}
            initialItems={rest}
            initialNextCursor={nextCursor}
            totalCount={totalCount}
          />
        ) : null}

        <footer className={styles.footer}>
          <div className={styles.wordmarkText}>{heroTitle}</div>
          {hours || address || locality ? (
            <p>{[hours, address, locality].filter(Boolean).join(" · ")}</p>
          ) : null}
          <p>Same-day board. What you see is what we have.</p>
        </footer>
      </div>
    </div>
  );
}
