"use client";

import Link from "next/link";
import { type CSSProperties } from "react";

import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import {
  resolveNativeHeroHeadline,
  StorefrontNativeHeroEditFrame,
  StorefrontNativeHeroHeadline,
} from "@/components/storefront/storefront-native-hero-copy";
import { DailyGazetteCard } from "@/components/storefront/templates/store/daily-gazette-card";
import { DailyGazetteCatalog } from "@/components/storefront/templates/store/daily-gazette-catalog";
import { gazettePlateName } from "@/components/storefront/templates/store/daily-gazette-copy";
import { dailyGazetteFontVariables } from "@/components/storefront/templates/store/daily-gazette-fonts";
import styles from "@/components/storefront/templates/store/daily-gazette.module.css";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import {
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { formatDisplayPrice } from "@/lib/public-storefront";
import { themeOptionVars } from "@/lib/storefront-theme-options";
import { shopListPath } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

const DEFAULT_HEADLINE = "Announcing a new era for";
const DEFAULT_SUB = "Everyday goods. Fair prices. In this edition.";

/**
 * THESIS: The shop is today's newspaper, not a grocery grid with kraft paint.
 * OWN-WORLD: Kraft pulp, double rules, condensed billing, orange prices, boxed ads.
 * STORY: Land on the masthead, read the announcement, pick a classified, pay.
 * FIRST VIEWPORT: Nameplate + folio; huge condensed headline; 2x3 classified boxes.
 * FORM: Daily Maven kraft broadsheet (brief-pinned).
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
 */
export function DailyGazetteStoreHome(props: StoreHomeTemplateProps) {
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
    landingContent,
    primaryHex,
    design: designProp,
  } = props;
  const design = useStorefrontLiveDesign(designProp ?? null);
  const optionVars = themeOptionVars(themeId, design?.theme ?? null);
  const orange = primaryHex?.trim() || "#e24e04";
  const plate = gazettePlateName(heroTitle);
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const headline = resolveNativeHeroHeadline(
    heroSettings,
    null,
    DEFAULT_HEADLINE,
  );
  const sub =
    heroSettings?.subheadline?.trim() ||
    landingContent?.subheadline?.trim() ||
    announcement?.trim() ||
    DEFAULT_SUB;
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;

  const seen = new Set<string>();
  const frontPage: typeof catalogItems = [];
  for (const item of [...featured, ...catalogItems]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    frontPage.push(item);
    if (frontPage.length >= 6) break;
  }
  const catalogRest = catalogItems.filter((item) => !seen.has(item.id));

  const saleLead = [...featured, ...catalogItems].find(
    (item) =>
      item.regularPrice != null &&
      item.price != null &&
      item.regularPrice > item.price,
  );
  const burstItem = saleLead ?? frontPage[0] ?? null;
  const burstPrice =
    burstItem?.price != null
      ? formatDisplayPrice(currency, burstItem.price)
      : null;

  const locality =
    [areaLabel?.trim(), branchHint?.trim()].filter(Boolean).join(", ") || null;
  const hours = landingContent?.hours?.trim() || null;
  const address = landingContent?.address?.trim() || null;

  return (
    <div
      className={cn(styles.root, styles.body, dailyGazetteFontVariables)}
      data-store-theme-id="daily-gazette"
      style={
        {
          ["--dg-orange" as string]: orange,
          ...optionVars,
        } as CSSProperties
      }
    >
      {/*
        THESIS: The shop is today's newspaper, not a grocery grid with kraft paint.
        OWN-WORLD: Kraft pulp, double rules, condensed billing, orange prices, boxed ads.
        STORY: Read the announcement, pick a classified, pay.
        FIRST VIEWPORT: Nameplate + folio; huge condensed headline; 2x3 classified boxes.
        FORM: Daily Maven kraft broadsheet · brief-pinned
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
      */}
      <div className={styles.wrap}>
        <StorefrontNativeHeroEditFrame>
          <section className={styles.hero} aria-label="Today's edition">
            {burstPrice ? (
              <span className={styles.burst} aria-hidden>
                <span className={styles.burstLabel}>
                  {saleLead ? "Sale from" : "From"}
                </span>
                <span className={styles.burstPrice}>{burstPrice}</span>
              </span>
            ) : null}
            <StorefrontNativeHeroHeadline
              value={headline}
              className={styles.heroKicker}
              as="h1"
            />
            <span className={styles.heroName}>{plate}</span>
            <p className={styles.heroSub}>{sub}</p>
          </section>
        </StorefrontNativeHeroEditFrame>

        {productsOn && frontPage.length > 0 ? (
          <div className={styles.grid}>
            {frontPage.map((item) => (
              <DailyGazetteCard key={item.id} item={item} currency={currency} />
            ))}
          </div>
        ) : productsOn ? (
          <div className={styles.empty}>The next edition is still at the press.</div>
        ) : null}

        {productsOn ? (
          <DailyGazetteCatalog
            slug={slug}
            currency={currency}
            initialItems={catalogRest}
            initialNextCursor={nextCursor}
            totalCount={totalCount}
          />
        ) : null}

        <footer className={styles.footer}>
          <div>
            <p className={styles.footerName}>{heroTitle}</p>
            <p className={styles.footerMeta}>
              {[hours, address, locality].filter(Boolean).join(", ") ||
                "Printed daily, local pickup"}
            </p>
          </div>
          <div>
            <p className={styles.footerLabel}>In this edition</p>
            <div className={styles.footerLinks}>
              <Link href="#catalog">Classifieds</Link>
              <Link href={shopListPath({})}>Shop all</Link>
            </div>
          </div>
          <div>
            <p className={styles.footerLabel}>Desk</p>
            <p className={styles.footerMeta}>
              {landingContent?.whatsapp || landingContent?.phone
                ? `WhatsApp ${landingContent.whatsapp || landingContent.phone}`
                : "Hold at the counter"}
            </p>
          </div>
        </footer>
        <p className={styles.footerBottom}>
          {new Date().getFullYear()} {heroTitle}
        </p>
      </div>
    </div>
  );
}
