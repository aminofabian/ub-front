"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";

import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import { StorefrontHeroSection } from "@/components/storefront/sections/hero-section";
import {
  resolveNativeHeroHeadline,
  StorefrontNativeHeroEditFrame,
  StorefrontNativeHeroHeadline,
  StorefrontNativeHeroLead,
} from "@/components/storefront/storefront-native-hero-copy";
import { ComilmartCatalog, ComilmartProductRail } from "@/components/storefront/templates/store/comilmart-catalog";
import { ComilmartFloats } from "@/components/storefront/templates/store/comilmart-floats";
import { comilmartPaletteVars } from "@/components/storefront/templates/store/comilmart-palette";
import { comilmartFontVariables } from "@/components/storefront/templates/store/comilmart-fonts";
import styles from "@/components/storefront/templates/store/comilmart.module.css";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import { filterShopperTypes } from "@/components/storefront/shop-type-filters";
import {
  resolveStorefrontDesign,
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { themeOptionVars } from "@/lib/storefront-theme-options";
import { shopListPath, storefrontCategoryPathSlug } from "@/lib/shop-url";
import { cn } from "@/lib/utils";
import { usePathname, useSearchParams } from "next/navigation";

const TRUST_BADGES = [
  { icon: "🛡️", label: "Buyer protection" },
  { icon: "✅", label: "Verified shop" },
  { icon: "🔒", label: "Secure payments" },
  { icon: "💬", label: "Direct chat" },
] as const;

function ComilmartHomeBody(props: StoreHomeTemplateProps) {
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
    categories,
    types,
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
  const paletteVars = comilmartPaletteVars(primaryHex, accentHex);
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;
  const buttons = resolveStorefrontDesign(design).buttons;
  const headline = resolveNativeHeroHeadline(
    heroSettings,
    announcement,
    "Turn your inventory into income.",
  );
  const lead =
    heroSettings?.subheadline?.trim() ||
    landingContent?.subheadline?.trim() ||
    design?.business?.tagline?.trim() ||
    "Whether you are stocking up for the week or placing a one-off order, browse verified products and checkout securely.";
  const locality =
    [areaLabel?.trim(), branchHint?.trim()].filter(Boolean).join(" · ") || null;
  const wa =
    landingContent?.whatsapp?.replace(/\D/g, "") ||
    landingContent?.phone?.replace(/\D/g, "") ||
    "";

  const pathname = usePathname();
  const sp = useSearchParams();
  const listing = Boolean(
    q?.trim() ||
      typeId?.trim() ||
      categoryId?.trim() ||
      sp.get("departmentId")?.trim() ||
      pathname.startsWith("/shop/c/"),
  );

  const slides = useMemo(() => {
    const urls = (heroBannerUrls ?? []).map((u) => u.trim()).filter(Boolean);
    if (urls.length) return urls;
    const shot = showcaseImage?.trim();
    if (shot) return [shot];
    const fromItems = [...featured, ...catalogItems]
      .map((item) => item.imageUrl)
      .filter((u): u is string => Boolean(u));
    return fromItems.slice(0, 4);
  }, [heroBannerUrls, showcaseImage, featured, catalogItems]);
  const [slide, setSlide] = useState(0);
  const heroImage = slides[slide] ?? slides[0] ?? null;

  useEffect(() => {
    if (slides.length <= 1 || heroOn || listing) return;
    const id = window.setInterval(() => {
      setSlide((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [slides.length, heroOn, listing]);

  const spotlightImage =
    showcaseImage?.trim() ||
    featured[0]?.imageUrl ||
    catalogItems[0]?.imageUrl ||
    null;
  const spotlightCategory = categories[0] ?? null;

  const newArrivals = useMemo(() => {
    const seen = new Set<string>();
    const items = [];
    for (const item of [...featured, ...catalogItems]) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
      if (items.length >= 12) break;
    }
    return items;
  }, [featured, catalogItems]);

  const shopperTypes = filterShopperTypes(types).slice(0, 12);
  const productCount = totalCount ?? catalogItems.length;

  return (
    <div
      className={cn(styles.root, styles.body, comilmartFontVariables)}
      data-store-theme-id="comilmart"
      style={{ ...paletteVars, ...optionVars } as CSSProperties}
    >
      {listing ? (
        <ComilmartCatalog
          slug={slug}
          currency={currency}
          heading={
            categoryHeading?.trim() ||
            (q?.trim() ? `Results for “${q.trim()}”` : "All products")
          }
          initialItems={catalogItems}
          initialNextCursor={nextCursor}
          totalCount={totalCount}
          q={q}
          typeId={typeId}
          categoryId={categoryId}
        />
      ) : (
        <>
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
              whatsappNumber={wa || null}
              ctaAnchor="#catalog"
            />
          ) : (
            <StorefrontNativeHeroEditFrame>
              <section className={styles.hero}>
                {heroImage ? (
                  <Image
                    src={heroImage}
                    alt=""
                    fill
                    priority
                    unoptimized
                    className={styles.heroImage}
                    sizes="100vw"
                  />
                ) : null}
                <div className={styles.heroOverlay} aria-hidden />
                <div className={styles.heroInner}>
                  <p className={styles.heroEyebrow}>Start shopping today</p>
                  <StorefrontNativeHeroHeadline
                    value={headline}
                    className={styles.heroTitle}
                  />
                  <StorefrontNativeHeroLead
                    value={lead}
                    className={styles.heroLead}
                  />
                  <div className={styles.heroCtas}>
                    <a href="#catalog" className={styles.heroCtaPrimary}>
                      Browse new arrivals
                    </a>
                    {wa ? (
                      <a
                        href={`https://wa.me/${wa}`}
                        className={styles.heroCtaGhost}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Learn how it works
                      </a>
                    ) : (
                      <a href="#categories" className={styles.heroCtaGhost}>
                        Shop by category
                      </a>
                    )}
                  </div>
                  {slides.length > 1 ? (
                    <div className={styles.heroDots}>
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          aria-label={`Go to slide ${i + 1}`}
                          className={cn(
                            styles.heroDot,
                            i === slide && styles.heroDotActive,
                          )}
                          onClick={() => setSlide(i)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            </StorefrontNativeHeroEditFrame>
          )}

          <section className={styles.stats}>
            <div>
              <strong>100%</strong>
              <span>Buyer protection</span>
            </div>
            <div>
              <strong>{productCount > 0 ? `${productCount}+` : "—"}</strong>
              <span>Products available</span>
            </div>
            <div>
              <strong>{categories.length || shopperTypes.length || "—"}</strong>
              <span>Categories</span>
            </div>
            {locality ? (
              <div>
                <strong>✓</strong>
                <span>{locality}</span>
              </div>
            ) : null}
          </section>

          <section className={styles.trustRow}>
            {TRUST_BADGES.map((badge) => (
              <span key={badge.label} className={styles.trustBadge}>
                {badge.icon} {badge.label}
              </span>
            ))}
          </section>

          {categories.length > 0 ? (
            <section id="categories" className={styles.categorySection}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Shop by category</h2>
              </div>
              <div className={styles.categoryRow}>
                {categories.slice(0, 12).map((cat) => (
                  <Link
                    key={cat.id}
                    href={shopListPath({
                      categoryPathSlug: storefrontCategoryPathSlug(cat),
                    })}
                    className={styles.categoryChip}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </section>
          ) : shopperTypes.length > 0 ? (
            <section id="categories" className={styles.categorySection}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Shop by category</h2>
              </div>
              <div className={styles.categoryRow}>
                {shopperTypes.map((type) => (
                  <Link
                    key={type.id}
                    href={shopListPath({ typeId: type.id })}
                    className={styles.categoryChip}
                  >
                    {type.label}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {!listing && (spotlightImage || spotlightCategory) ? (
            <section className={styles.spotlight}>
              <div className={styles.spotlightVisual}>
                {spotlightImage ? (
                  <Image
                    src={spotlightImage}
                    alt=""
                    fill
                    unoptimized
                    className={styles.spotlightImage}
                    sizes="(min-width: 768px) 50vw, 100vw"
                  />
                ) : null}
                <div className={styles.spotlightVisualOverlay} aria-hidden />
                <div className={styles.spotlightVisualCopy}>
                  <p>Featured category</p>
                  <h3>
                    {spotlightCategory?.name || "Shop the full catalog"}
                  </h3>
                </div>
              </div>
              <div className={styles.spotlightCards}>
                <article className={styles.spotlightCard}>
                  <h4>Shop the full catalog</h4>
                  <p>
                    Browse every product with search, filters, and secure
                    checkout.
                  </p>
                  <a href="#catalog" className={styles.spotlightLink}>
                    Go to shop →
                  </a>
                </article>
                <article className={styles.spotlightCard}>
                  <h4>
                    {spotlightCategory
                      ? `${spotlightCategory.name} essentials`
                      : "Same-day essentials"}
                  </h4>
                  <p>
                    {locality
                      ? `Everyday items for ${locality}, delivered how this shop already serves you.`
                      : "Everyday items from a shop you can trust — order online in minutes."}
                  </p>
                  {spotlightCategory ? (
                    <Link
                      href={shopListPath({
                        categoryPathSlug: storefrontCategoryPathSlug(
                          spotlightCategory,
                        ),
                      })}
                      className={styles.spotlightLink}
                    >
                      Browse category →
                    </Link>
                  ) : (
                    <a href="#categories" className={styles.spotlightLink}>
                      Browse categories →
                    </a>
                  )}
                </article>
              </div>
            </section>
          ) : null}

          {productsOn && newArrivals.length > 0 ? (
            <ComilmartProductRail
              title="New arrivals"
              items={newArrivals}
              currency={currency}
              viewAllHref="#catalog"
            />
          ) : null}

          <section className={styles.promoGrid}>
            <article className={styles.promoCard}>
              <p className={styles.promoEyebrow}>Featured</p>
              <h3>Shop the full catalog</h3>
              <p>
                Browse every product with search, filters, and secure checkout.
              </p>
              <a href="#catalog" className={styles.promoBtn}>
                Go to shop
              </a>
            </article>
            <article className={cn(styles.promoCard, styles.promoCardAlt)}>
              <p className={styles.promoEyebrow}>Need help?</p>
              <h3>Message us directly</h3>
              <p>
                {wa
                  ? "Chat on WhatsApp for custom orders, bulk pricing, or delivery questions."
                  : "Reach out for custom orders, bulk pricing, or delivery questions."}
              </p>
              {wa ? (
                <a
                  href={`https://wa.me/${wa}`}
                  className={styles.promoBtn}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Chat now
                </a>
              ) : (
                <a href="#catalog" className={styles.promoBtn}>
                  Browse products
                </a>
              )}
            </article>
          </section>

          {productsOn ? (
            <ComilmartCatalog
              slug={slug}
              currency={currency}
              heading="All products"
              initialItems={catalogItems}
              initialNextCursor={nextCursor}
              totalCount={totalCount}
            />
          ) : null}

          <footer className={styles.footer}>
            <div className={styles.footerBrand}>
              <strong>{heroTitle}</strong>
              <p>
                {announcement?.trim() ||
                  "Your neighborhood marketplace — order online, pay securely."}
              </p>
            </div>
            {locality ? <p className={styles.footerMeta}>{locality}</p> : null}
            {landingContent?.hours?.trim() ? (
              <p className={styles.footerMeta}>{landingContent.hours.trim()}</p>
            ) : null}
            {landingContent?.address?.trim() ? (
              <p className={styles.footerMeta}>{landingContent.address.trim()}</p>
            ) : null}
          </footer>
        </>
      )}

      <ComilmartFloats whatsappDigits={wa || null} storeName={heroTitle} />
    </div>
  );
}

/**
 * THESIS: B2B/B2C marketplace — navy chrome, gold CTAs, hero carousel, product rails.
 * OWN-WORLD: #0E1B2B navy, #FFC20C gold, Space Grotesk + DM Sans, cream content band.
 * STORY: Land on the hero, browse categories, scroll new arrivals, add to cart.
 * FIRST VIEWPORT: Promo bar, utility strip, search header, dark hero with gold CTA.
 */
export function ComilmartStoreHome(props: StoreHomeTemplateProps) {
  return (
    <Suspense fallback={<ComilmartHomeBody {...props} />}>
      <ComilmartHomeBody {...props} />
    </Suspense>
  );
}
