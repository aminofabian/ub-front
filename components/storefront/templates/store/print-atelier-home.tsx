"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties } from "react";

import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import {
  resolveNativeHeroHeadline,
  StorefrontNativeHeroEditFrame,
  StorefrontNativeHeroHeadline,
} from "@/components/storefront/storefront-native-hero-copy";
import { PrintAtelierCard } from "@/components/storefront/templates/store/print-atelier-card";
import { PrintAtelierCatalog } from "@/components/storefront/templates/store/print-atelier-catalog";
import { printAtelierFontVariables } from "@/components/storefront/templates/store/print-atelier-fonts";
import styles from "@/components/storefront/templates/store/print-atelier.module.css";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import {
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { themeOptionVars } from "@/lib/storefront-theme-options";
import { shopListPath } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

const DEFAULT_HEADLINE = "Ultra-realistic 3D-printed art";
const DEFAULT_SUB =
  "Your premium fidget & desk accessory catalogue";

/**
 * THESIS: A clean Nairobi gift gallery — sage announce, white chrome,
 * lifestyle hero, rounded tiles — not another dark boutique grid.
 * OWN-WORLD: Paper white, mist sage #adc4c2, chocolate olive, Jost + Cormorant.
 * STORY: Land on the catalogue promise → shop new arrivals → browse collections.
 * FIRST VIEWPORT: Sage bar; logo + centered nav; full-bleed lifestyle hero + olive pill.
 * FORM: Print atelier · 3D East Africa craft bar (brief-pinned competitor look).
 * FINISH: polished hero motion, section rhythm, card lift, desk wash, PDP calm.
 */
export function PrintAtelierStoreHome(props: StoreHomeTemplateProps) {
  const {
    slug,
    themeId,
    currency,
    catalogItems,
    nextCursor,
    totalCount,
    featured,
    heroTitle,
    areaLabel,
    branchHint,
    heroBannerUrls,
    showcaseImage,
    landingContent,
    primaryHex,
    design: designProp,
  } = props;
  const design = useStorefrontLiveDesign(designProp ?? null);
  const optionVars = themeOptionVars(themeId, design?.theme ?? null);

  const ink = primaryHex?.trim() || "#1c1a16";
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
    DEFAULT_SUB;
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;

  const seen = new Set<string>();
  const arrivals: typeof catalogItems = [];
  for (const item of [...featured, ...catalogItems]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    arrivals.push(item);
    if (arrivals.length >= 16) break;
  }
  const catalogRest = catalogItems.filter((item) => !seen.has(item.id));

  const heroImage =
    heroBannerUrls?.find((u) => u?.trim()) ||
    showcaseImage?.trim() ||
    arrivals[0]?.imageUrl ||
    null;

  const locality =
    [areaLabel?.trim(), branchHint?.trim()].filter(Boolean).join(" · ") || null;
  const hours = landingContent?.hours?.trim() || null;
  const address = landingContent?.address?.trim() || null;

  const collectionTiles = arrivals.slice(0, 4).map((item, i) => ({
    item,
    label: ["New Arrivals", "Toys", "Decor", "Best Sellers"][i] ?? item.name,
  }));

  const deskImage =
    showcaseImage?.trim() ||
    arrivals[2]?.imageUrl ||
    arrivals[0]?.imageUrl ||
    null;

  return (
    <div
      className={cn(styles.root, styles.body, printAtelierFontVariables)}
      data-store-theme-id="print-atelier"
      style={
        {
          ["--pa-ink" as string]: ink,
          ...optionVars,
        } as CSSProperties
      }
    >
      {/*
        THESIS: Clean gift gallery — sage, white, rounded tiles, filament fly-to-cart.
        OWN-WORLD: #fff paper, sage announce, olive pill CTA, Jost + Cormorant.
        STORY: Catalogue hero → new arrivals → collections → desk essentials.
        FIRST VIEWPORT: Sage bar + logo/nav + lifestyle hero with olive CTA.
        FORM: Print atelier · brief-pinned 3DEA craft bar · seed n/a (canon).
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
      */}
      <StorefrontNativeHeroEditFrame>
        {heroImage ? (
          <section className={styles.hero} aria-label="Featured catalogue">
            <div className={styles.heroMedia}>
              <Image
                src={heroImage}
                alt=""
                fill
                priority
                unoptimized
                sizes="100vw"
                style={{ objectFit: "cover", objectPosition: "center" }}
              />
            </div>
            <span className={styles.heroScrim} aria-hidden />
            <div className={styles.heroCopy}>
              <StorefrontNativeHeroHeadline
                value={headline}
                className={styles.heroTitle}
                as="h1"
              />
              <p className={styles.heroSub}>{sub}</p>
              <Link href="#arrivals" className={styles.heroCta}>
                Shop the catalogue
              </Link>
            </div>
          </section>
        ) : (
          <section
            className={cn(styles.hero, styles.heroEmpty)}
            aria-label="Featured catalogue"
          >
            <div className={styles.heroCopy}>
              <StorefrontNativeHeroHeadline
                value={headline}
                className={styles.heroTitle}
                as="h1"
              />
              <p className={styles.heroSub}>{sub}</p>
              <Link href="#catalog" className={styles.heroCta}>
                Shop the catalogue
              </Link>
            </div>
          </section>
        )}
      </StorefrontNativeHeroEditFrame>

      <div className={styles.wrap}>
        {productsOn && arrivals.length > 0 ? (
          <section id="arrivals" aria-labelledby="pa-arrivals-title">
            <div className={styles.sectionHead}>
              <h2 id="pa-arrivals-title" className={styles.sectionTitle}>
                Our New Arrivals
              </h2>
            </div>
            <div className={styles.grid}>
              {arrivals.map((item) => (
                <PrintAtelierCard key={item.id} item={item} currency={currency} />
              ))}
            </div>
            <div className={styles.viewAll}>
              <Link href="#catalog" className={styles.viewAllLink}>
                View Complete Collection
              </Link>
            </div>
          </section>
        ) : null}

        {collectionTiles.length > 0 ? (
          <section className={styles.collections} aria-labelledby="pa-collections-title">
            <div className={styles.sectionHead}>
              <h2 id="pa-collections-title" className={styles.sectionTitle}>
                Shop by Collection
              </h2>
            </div>
            <div className={styles.collectionGrid}>
              {collectionTiles.map(({ item, label }) => (
                <Link
                  key={`${item.id}-${label}`}
                  href={shopListPath({})}
                  className={styles.collectionTile}
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="(min-width: 800px) 25vw, 50vw"
                      style={{ objectFit: "cover" }}
                    />
                  ) : null}
                  <span className={styles.collectionScrim} aria-hidden />
                  <span className={styles.collectionLabel}>{label}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <aside className={styles.deskBanner} aria-labelledby="pa-desk-title">
          {deskImage ? (
            <div className={styles.deskMedia}>
              <Image
                src={deskImage}
                alt=""
                fill
                unoptimized
                sizes="100vw"
                style={{ objectFit: "cover" }}
              />
            </div>
          ) : null}
          <div className={styles.deskCopy}>
            <h2 id="pa-desk-title" className={styles.deskTitle}>
              Desk Essentials
            </h2>
            <p className={styles.deskBody}>
              Minimalist printed desk accessories designed for productivity and
              style.
            </p>
            <Link href="#catalog" className={styles.deskCta}>
              Shop Now
            </Link>
          </div>
        </aside>

        {productsOn ? (
          <PrintAtelierCatalog
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
              {[hours, address, locality].filter(Boolean).join(" · ") ||
                "Printed with care · Nairobi delivery"}
            </p>
          </div>
          <div>
            <p className={styles.footerLabel}>Quick Links</p>
            <div className={styles.footerLinks}>
              <Link href="#arrivals">New Arrivals</Link>
              <Link href="#catalog">Collection</Link>
              <Link href={shopListPath({})}>Shop all</Link>
            </div>
          </div>
          <div>
            <p className={styles.footerLabel}>Stay Connected</p>
            <p className={styles.footerMeta}>
              {landingContent?.whatsapp || landingContent?.phone
                ? `WhatsApp ${landingContent.whatsapp || landingContent.phone}`
                : "Follow us for new drops"}
            </p>
          </div>
        </footer>
        <p className={styles.footerBottom}>
          © {new Date().getFullYear()} {heroTitle}
        </p>
      </div>
    </div>
  );
}
