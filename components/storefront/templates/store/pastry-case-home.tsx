"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";

import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import { StorefrontHeroSection } from "@/components/storefront/sections/hero-section";
import {
  resolveNativeHeroHeadline,
  StorefrontNativeHeroEditFrame,
} from "@/components/storefront/storefront-native-hero-copy";
import { PastryCaseCard } from "@/components/storefront/templates/store/pastry-case-card";
import { PastryCaseCatalog } from "@/components/storefront/templates/store/pastry-case-catalog";
import { pastryCaseFontVariables } from "@/components/storefront/templates/store/pastry-case-fonts";
import styles from "@/components/storefront/templates/store/pastry-case.module.css";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import { filterShopperTypes } from "@/components/storefront/shop-type-filters";
import {
  resolveStorefrontDesign,
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { themeOptionVars } from "@/lib/storefront-theme-options";
import { shopListPath } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

/**
 * THESIS: A Kenyan cake-shop window — frosting bar, photo hero, collections —
 * not a supermarket aisle painted pink.
 * OWN-WORLD: Frosting #E56BA4 on cream paper, Jost floor + Archivo shout, round tiles.
 * STORY: Land on the cake, pick a collection, add to bag, WhatsApp if they need a custom.
 * FIRST VIEWPORT: Pink call bar, overlay nav, full-bleed bake photo, marquee.
 * FORM: Pastry case · Cake Gurus grammar, merchant identity.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
export function PastryCaseStoreHome(props: StoreHomeTemplateProps) {
  const {
    slug,
    themeId,
    currency,
    catalogItems,
    nextCursor,
    totalCount,
    q,
    categoryId,
    typeId,
    categoryHeading,
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

  const frost = primaryHex?.trim() || "#e56ba4";
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const headline = resolveNativeHeroHeadline(
    heroSettings,
    announcement,
    heroTitle,
  );
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;
  const buttons = resolveStorefrontDesign(design).buttons;

  const collections = filterShopperTypes(types).slice(0, 5);
  const listing = Boolean(q?.trim() || categoryId?.trim() || typeId?.trim());

  const seen = new Set<string>();
  const lead: typeof catalogItems = [];
  for (const item of [...featured, ...catalogItems]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    lead.push(item);
    if (lead.length >= 8) break;
  }

  const rest = catalogItems.filter((item) => !seen.has(item.id)).slice(0, 8);
  const wa =
    landingContent?.whatsapp?.replace(/\D/g, "") ||
    landingContent?.phone?.replace(/\D/g, "") ||
    "";
  const locality =
    [areaLabel?.trim(), branchHint?.trim()].filter(Boolean).join(" · ") || null;
  const hours = landingContent?.hours?.trim() || null;
  const address = landingContent?.address?.trim() || null;

  const slides = useMemo(() => {
    const urls = (heroBannerUrls ?? []).map((u) => u.trim()).filter(Boolean);
    if (urls.length) return urls;
    const shot = showcaseImage?.trim();
    if (shot) return [shot];
    return lead.map((item) => item.imageUrl).filter((u): u is string => Boolean(u));
  }, [heroBannerUrls, showcaseImage, lead]);
  const [slide, setSlide] = useState(0);
  const heroImage = slides[slide] ?? slides[0] ?? null;

  const marqueeBits = [
    heroTitle,
    locality ? `Same-day in ${locality}` : "Order for the next celebration",
    "Baked to order",
  ].filter(Boolean);

  return (
    <div
      className={cn(styles.root, styles.body, pastryCaseFontVariables)}
      data-store-theme-id="pastry-case"
      style={
        {
          ["--pc-frost" as string]: frost,
          ...optionVars,
        } as CSSProperties
      }
    >
      {listing ? (
        <PastryCaseCatalog
          slug={slug}
          currency={currency}
          heading={
            categoryHeading?.trim() ||
            (q?.trim() ? `Results for “${q.trim()}”` : "The case")
          }
          initialItems={catalogItems}
          initialNextCursor={nextCursor}
          totalCount={totalCount}
          q={q}
          typeId={typeId}
          categoryId={categoryId}
        />
      ) : heroOn ? (
        <StorefrontHeroSection
          title={heroTitle}
          tagline={
            heroSettings?.headline.trim() ? heroSettings.headline : announcement
          }
          subheadline={heroSettings?.subheadline ?? null}
          height={heroSettings?.height ?? "large"}
          overlay={heroSettings?.overlay ?? "dark"}
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
          ctaAnchor="#favorites"
        />
      ) : (
        <StorefrontNativeHeroEditFrame>
          <div className={styles.home}>
            <section className={styles.hero} aria-label={headline}>
              <div className={styles.heroMedia}>
                {heroImage ? (
                  <Image
                    src={heroImage}
                    alt=""
                    fill
                    priority
                    sizes="100vw"
                    unoptimized
                    style={{ objectFit: "cover" }}
                  />
                ) : null}
                <div className={styles.heroShade} aria-hidden />
              </div>
              {slides.length > 1 ? (
                <div className={styles.heroDots}>
                  {slides.slice(0, 6).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={styles.heroDot}
                      data-on={i === slide ? "true" : undefined}
                      aria-label={`Photo ${i + 1}`}
                      onClick={() => setSlide(i)}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </StorefrontNativeHeroEditFrame>
      )}

      {listing ? null : (
      <div className={styles.marquee} aria-hidden>
        <div className={styles.marqueeTrack}>
          {[0, 1].map((copy) => (
            <span key={copy} className={styles.marqueeItem}>
              {marqueeBits.map((bit, i) => (
                <span
                  key={`${copy}-${bit}`}
                  className={i % 2 === 1 ? styles.marqueeOutline : undefined}
                >
                  {bit}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
      )}

      {listing ? null : productsOn ? (
        <section id="favorites" className={styles.favorites}>
          <h2>Store favorites</h2>
          {collections.length > 1 ? (
            <div className={styles.tabs} aria-label="Collections">
              {collections.map((type, i) => (
                <Link
                  key={type.id}
                  href={shopListPath({ typeId: type.id })}
                  className={styles.tab}
                  data-on={i === 0 ? "true" : undefined}
                >
                  {type.label}
                </Link>
              ))}
            </div>
          ) : null}
          <p className={styles.favLead}>
            {landingContent?.subheadline?.trim() ||
              `From ${heroTitle}${locality ? ` · ${locality}` : ""}.`}
          </p>
          <div className={styles.grid}>
            {lead.map((item) => (
              <PastryCaseCard key={item.id} item={item} currency={currency} />
            ))}
          </div>
        </section>
      ) : null}

      {listing ? null : productsOn && rest.length > 0 ? (
        <section className={styles.section}>
          <h2>More from the case</h2>
          <div className={styles.grid}>
            {rest.map((item) => (
              <PastryCaseCard key={item.id} item={item} currency={currency} />
            ))}
          </div>
        </section>
      ) : null}

      {listing ? null : nextCursor ? (
        <p className={styles.more}>
          <Link href={shopListPath({})}>See the full case</Link>
        </p>
      ) : null}

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div>
            <h3>{heroTitle}</h3>
            <p>
              {address || locality || "Order for pickup — we will confirm on WhatsApp."}
            </p>
          </div>
          <div>
            <h3>Hours</h3>
            <p>{hours || "Ask on WhatsApp for today’s bake."}</p>
          </div>
          <div>
            <h3>Need help</h3>
            {wa ? (
              <p>
                <a href={`https://wa.me/${wa}`}>WhatsApp +{wa}</a>
              </p>
            ) : (
              <p>Message us from the bag when you are ready.</p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
