"use client";

import Image from "next/image";
import Link from "next/link";
import { Leaf, Sparkles, Star } from "lucide-react";
import { Suspense, type CSSProperties } from "react";

import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import { StorefrontHeroSection } from "@/components/storefront/sections/hero-section";
import {
  resolveNativeHeroHeadline,
  StorefrontNativeHeroEditFrame,
  StorefrontNativeHeroHeadline,
} from "@/components/storefront/storefront-native-hero-copy";
import { ScentStoryCard } from "@/components/storefront/templates/store/scent-story-card";
import { ScentStoryCatalog } from "@/components/storefront/templates/store/scent-story-catalog";
import { scentStoryFontVariables } from "@/components/storefront/templates/store/scent-story-fonts";
import { ScentStoryMobileSearch } from "@/components/storefront/templates/store/scent-story-header";
import styles from "@/components/storefront/templates/store/scent-story.module.css";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import {
  resolveStorefrontDesign,
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { themeOptionVars } from "@/lib/storefront-theme-options";
import { cn } from "@/lib/utils";

const DEFAULT_HEADLINE = "Every scent tells a story";
const DEFAULT_KICKER = "Crafted with passion, worn with confidence.";

const PILLARS = [
  {
    icon: Leaf,
    title: "Crafted with care",
    body: "Proudly composed for Kenyan wardrobes — heritage notes, global craft.",
  },
  {
    icon: Sparkles,
    title: "Premium ingredients",
    body: "Rare oils and lasting bases chosen for evening wear and everyday ritual.",
  },
  {
    icon: Star,
    title: "Confidence in a bottle",
    body: "Each bottle is a signature — sophistication you can wear all day.",
  },
] as const;

const MARQUEE = [
  "Discover your signature scent",
  "Curated fragrances for every mood",
  "Premium perfumes crafted with passion",
  "Elevate your everyday",
] as const;

/**
 * THESIS: A Kenyan fragrance house homepage — gold silk announce, cream salon,
 * full-bleed scent hero — not another pink beauty grid.
 * OWN-WORLD: Cream #FCF8F0, mustard gold #C5A04E, Archivo + Manrope, square CTAs.
 * STORY: Land on atmosphere → shop featured scents → read the house story → browse all.
 * FIRST VIEWPORT: Gold announce bar; centered wordmark; full-bleed hero with white/gold CTAs.
 * FORM: Scent Story · Nexus-class luxury fragrance house (brief-pinned craft bar).
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
export function ScentStoryStoreHome(props: StoreHomeTemplateProps) {
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

  const gold = accentHex?.trim() || "#c5a04e";
  const ink = primaryHex?.trim() || "#1a1714";
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const headline = resolveNativeHeroHeadline(
    heroSettings,
    announcement,
    DEFAULT_HEADLINE,
  );
  const kicker =
    heroSettings?.subheadline?.trim() ||
    landingContent?.subheadline?.trim() ||
    DEFAULT_KICKER;
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;
  const buttons = resolveStorefrontDesign(design).buttons;

  const seen = new Set<string>();
  const featuredRow: typeof catalogItems = [];
  for (const item of [...featured, ...catalogItems]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    featuredRow.push(item);
    if (featuredRow.length >= 3) break;
  }
  const catalogRest = heroOn
    ? catalogItems
    : catalogItems.filter((item) => !seen.has(item.id));

  const heroImage =
    heroBannerUrls?.find((u) => u?.trim()) ||
    showcaseImage?.trim() ||
    featuredRow[0]?.imageUrl ||
    null;

  const locality =
    [areaLabel?.trim(), branchHint?.trim()].filter(Boolean).join(" · ") || null;
  const hours = landingContent?.hours?.trim() || null;
  const address = landingContent?.address?.trim() || null;
  const storyBody =
    landingContent?.headline?.trim() ||
    `${heroTitle} celebrates rich stories and natural beauty through carefully crafted fragrances that inspire confidence and connection.`;

  return (
    <div
      className={cn(styles.root, styles.body, scentStoryFontVariables)}
      data-store-theme-id="scent-story"
      style={
        {
          ["--ss-gold" as string]: gold,
          ["--ss-ink" as string]: ink,
          ...optionVars,
        } as CSSProperties
      }
    >
      <Suspense fallback={null}>
        <ScentStoryMobileSearch />
      </Suspense>

      {heroOn ? (
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
          ctaAnchor="#catalog"
        />
      ) : (
        <StorefrontNativeHeroEditFrame>
          {heroImage ? (
            <section className={styles.hero} aria-label="Featured fragrance">
              <div className={styles.heroMedia}>
                <Image
                  src={heroImage}
                  alt=""
                  fill
                  priority
                  unoptimized
                  sizes="100vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <span className={styles.heroScrim} aria-hidden />
              <div className={styles.heroCopy}>
                <p className={styles.heroKicker}>{kicker}</p>
                <StorefrontNativeHeroHeadline
                  value={headline}
                  className={styles.heroTitle}
                  as="h1"
                />
                <div className={styles.heroCtas}>
                  <Link href="#featured" className={styles.heroPrimary}>
                    Shop Now
                  </Link>
                  <Link href="#catalog" className={styles.heroSecondary}>
                    Explore our fragrances
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <section className={styles.heroEmpty} aria-label="Featured fragrance">
              <p className={styles.heroKicker}>{kicker}</p>
              <StorefrontNativeHeroHeadline
                value={headline}
                className={styles.heroTitle}
                as="h1"
              />
              <div className={styles.heroCtas}>
                <Link href="#catalog" className={styles.heroPrimary}>
                  Shop Now
                </Link>
              </div>
            </section>
          )}
        </StorefrontNativeHeroEditFrame>
      )}

      <div className={styles.wrap}>
        {productsOn && featuredRow.length > 0 ? (
          <section id="featured" aria-labelledby="ss-featured-title">
            <div className={styles.collectionHead}>
              <h2 id="ss-featured-title" className={styles.collectionTitle}>
                Premium Collection
              </h2>
              <p className={styles.collectionBlurb}>
                Discover signature fragrances crafted for luxury, confidence, and
                individuality.
              </p>
            </div>
            <div className={styles.featuredGrid}>
              {featuredRow.map((item) => (
                <ScentStoryCard key={item.id} item={item} currency={currency} />
              ))}
            </div>
          </section>
        ) : null}

        <aside className={styles.promo} aria-label="Collection highlight">
          <h3 className={styles.promoTitle}>
            Discover the signature collection
          </h3>
          <p className={styles.promoBody}>
            Curated scents for morning ritual and evening elegance — browse the
            full house selection below.
          </p>
          <Link href="#catalog" className={styles.promoCta}>
            Shop collection
          </Link>
        </aside>

        <section className={styles.story} aria-labelledby="ss-story-title">
          <div className={cn(styles.storyVisual, "relative")}>
            {showcaseImage || featuredRow[1]?.imageUrl ? (
              <Image
                src={(showcaseImage || featuredRow[1]?.imageUrl)!}
                alt=""
                fill
                unoptimized
                sizes="(min-width: 820px) 50vw, 100vw"
                style={{ objectFit: "cover" }}
              />
            ) : null}
          </div>
          <div className={styles.storyCopy}>
            <h2 id="ss-story-title" className={styles.storyTitle}>
              Crafted in Kenya, inspired by Africa
            </h2>
            <p className={styles.storyBody}>{storyBody}</p>
            <Link href="#catalog" className={styles.storyLink}>
              Learn more
            </Link>
          </div>
        </section>

        <section aria-label="Why shop here" className={styles.pillars}>
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <article key={title} className={styles.pillar}>
              <span className={styles.pillarMark} aria-hidden>
                <Icon className="size-4" strokeWidth={1.6} />
              </span>
              <h3 className={styles.pillarTitle}>{title}</h3>
              <p className={styles.pillarBody}>{body}</p>
            </article>
          ))}
        </section>

        {productsOn ? (
          <ScentStoryCatalog
            slug={slug}
            currency={currency}
            initialItems={catalogRest}
            initialNextCursor={nextCursor}
            totalCount={totalCount}
          />
        ) : null}

        <div className={styles.marquee} aria-hidden>
          <div className={styles.marqueeTrack}>
            {[...MARQUEE, ...MARQUEE].map((line, i) => (
              <span key={`${line}-${i}`} className={styles.marqueeItem}>
                {line}
              </span>
            ))}
          </div>
        </div>

        <footer className={styles.footer}>
          <p className={styles.footerName}>{heroTitle}</p>
          {hours || address || locality ? (
            <p>{[hours, address, locality].filter(Boolean).join(" · ")}</p>
          ) : null}
          <p>Premium fragrances · Wrapped with care · Same-day Nairobi delivery</p>
        </footer>
      </div>
    </div>
  );
}
