import Link from "next/link";

import { TintLabCatalog } from "@/components/storefront/templates/store/tint-lab-catalog";
import { tintFontVariables } from "@/components/storefront/templates/store/tint-lab-fonts";
import { TintLabHero } from "@/components/storefront/templates/store/tint-lab-hero";
import { TintLabShadeStory } from "@/components/storefront/templates/store/tint-lab-shade-story";
import { TintLabSignup } from "@/components/storefront/templates/store/tint-lab-signup";
import styles from "@/components/storefront/templates/store/tint-lab.module.css";
import { StorefrontHeroSection } from "@/components/storefront/sections/hero-section";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import {
  resolveStorefrontDesign,
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

const INGREDIENTS = [
  {
    name: "Sodium Hyaluronate",
    plain:
      "Holds up to 1,000× its weight in water — keeps skin plump through the day.",
  },
  {
    name: "Niacinamide 5%",
    plain:
      "Calms visible redness and evens tone without irritating reactive skin.",
  },
  {
    name: "Centella Asiatica",
    plain:
      "A wound-healing herb extract that settles inflammation and barrier stress.",
  },
  {
    name: "Iron Oxide Pigments",
    plain:
      "Mineral-based color, the same family used in medical-grade skin tints.",
  },
  {
    name: "Candelilla Wax",
    plain:
      "Plant-based structure that keeps color from bleeding into fine lines.",
  },
] as const;

/** Soft cosmetics / color-lab storefront — Tint Lab paper + accent system. */
export function TintLabStoreHome(props: StoreHomeTemplateProps) {
  const {
    slug,
    currency,
    catalogItems,
    nextCursor,
    featured,
    heroTitle,
    announcement,
    areaLabel,
    branchHint,
    showcaseImage,
    accentHex,
    primaryHex,
    logoUrl,
    heroBannerUrls,
    landingContent,
    design,
  } = props;

  const lead = featured[0] ?? catalogItems[0] ?? null;
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;
  const buttons = resolveStorefrontDesign(design).buttons;
  const year = new Date().getFullYear();
  const nameParts = heroTitle.trim().split(/\s+/);
  const brandFirst = nameParts[0] || "Tint";
  const brandRest = nameParts.slice(1).join(" ") || "Lab";

  return (
    <div
      className={cn(styles.root, styles.body, tintFontVariables)}
      data-store-theme-id="tint-lab"
      style={
        accentHex
          ? ({ ["--tint-accent" as string]: accentHex } as Record<string, string>)
          : undefined
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
          whatsappNumber={
            landingContent?.whatsapp ?? landingContent?.phone ?? null
          }
          ctaAnchor="#edit"
        />
      ) : (
        <TintLabHero
          heroTitle={heroTitle}
          announcement={announcement}
          areaLabel={areaLabel}
          showcaseImage={showcaseImage || lead?.imageUrl || null}
          featuredName={lead?.name}
          featuredSku={lead?.sku}
          accentHex={accentHex}
        />
      )}

      <div className={styles.noteStrip}>
        Formulated without parabens, sulfates, or mystery fragrance — every
        batch lot-coded
      </div>

      {productsOn ? (
        <TintLabCatalog
          slug={slug}
          currency={currency}
          initialItems={catalogItems}
          initialNextCursor={nextCursor}
        />
      ) : null}

      <TintLabShadeStory />

      <section className={styles.section} id="disclosure">
        <div className={styles.disclosure}>
          <div className={styles.disclosureLeft}>
            <h2>Full disclosure.</h2>
            <p>
              Every formula lists its actives in plain language, not just INCI
              names. If we wouldn&apos;t explain it to your face, it isn&apos;t
              in the bottle.
            </p>
          </div>
          <div className={styles.ingList}>
            {INGREDIENTS.map((row) => (
              <div key={row.name} className={styles.ingRow}>
                <div className={styles.ingName}>{row.name}</div>
                <div className={styles.ingPlain}>{row.plain}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TintLabSignup />

      <footer className={styles.footer}>
        <div className={styles.footWrap}>
          <div className={styles.footBrand}>
            <div className={styles.brand}>
              {brandFirst} <em className={styles.brandEm}>{brandRest}</em>
            </div>
            <p>
              A color cosmetics lab built on pigment transparency. Every shade
              documented, every batch lot-coded.
            </p>
          </div>
          <div className={styles.footCol}>
            <h4>Shop</h4>
            <ul>
              <li>
                <a href="#edit">The Edit</a>
              </li>
              <li>
                <Link href="/shop">Full catalog</Link>
              </li>
              <li>
                <Link href="/shop/cart">Cart</Link>
              </li>
            </ul>
          </div>
          <div className={styles.footCol}>
            <h4>Learn</h4>
            <ul>
              <li>
                <a href="#disclosure">Ingredients</a>
              </li>
              <li>
                <a href="#shade-story">Shade guide</a>
              </li>
            </ul>
          </div>
          <div className={styles.footCol}>
            <h4>Support</h4>
            <ul>
              <li>
                <Link href="/shop/account">Account</Link>
              </li>
              <li>
                <a href="#signup">Journal</a>
              </li>
            </ul>
          </div>
        </div>
        <div className={styles.footBottom}>
          <span>
            © {year} {heroTitle || "Tint Lab"}
          </span>
          <span>All shades lot-coded / Nairobi</span>
        </div>
      </footer>
    </div>
  );
}
