"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Truck,
  Wallet,
} from "lucide-react";
import type { CSSProperties } from "react";

import { zetuFontVariables } from "@/app/fonts/zetu";
import {
  StorefrontNativeHeroEditFrame,
  StorefrontNativeHeroHeadline,
} from "@/components/storefront/storefront-native-hero-copy";
import { useStorefrontSignUpDoor } from "@/components/storefront/storefront-account-link";
import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import { ZetuCard } from "@/components/storefront/templates/store/zetu-card";
import { ZetuCatalog } from "@/components/storefront/templates/store/zetu-catalog";
import { ZetuFooter } from "@/components/storefront/templates/store/zetu-footer";
import {
  zetuBudgetCeiling,
  zetuCatalogueStats,
  zetuDiscount,
} from "@/components/storefront/templates/store/zetu-pricing";
import styles from "@/components/storefront/templates/store/zetu.module.css";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import { APP_ROUTES } from "@/lib/config";
import type { PublicCatalogItemCard } from "@/lib/public-storefront";
import { shopListPath, storefrontCategoryPathSlug } from "@/lib/shop-url";
import {
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { themeOptionVars } from "@/lib/storefront-theme-options";
import { cn } from "@/lib/utils";

function dedupe(items: readonly PublicCatalogItemCard[]): PublicCatalogItemCard[] {
  const seen = new Set<string>();
  const out: PublicCatalogItemCard[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function percentLine(items: PublicCatalogItemCard[]): PublicCatalogItemCard[] {
  return [...items].sort((a, b) => {
    const ap = zetuDiscount(a)?.percent ?? 0;
    const bp = zetuDiscount(b)?.percent ?? 0;
    return bp - ap;
  });
}

function SectionHead({
  kicker,
  title,
  lead,
  href,
  cta,
  dark = false,
}: {
  kicker: string;
  title: string;
  lead?: string | null;
  href: string;
  cta: string;
  dark?: boolean;
}) {
  return (
    <div className={styles.bandHead}>
      <div className={styles.bandHeadCopy}>
        <span className={cn(styles.kicker, dark && styles.kickerDark)}>
          {kicker}
        </span>
        <h2 className={cn(styles.h2, dark && styles.h2OnDark)}>{title}</h2>
        {lead ? <p className={styles.sectionLead}>{lead}</p> : null}
      </div>
      <Link
        href={href}
        className={cn(styles.viewAll, dark && styles.viewAllDark)}
      >
        {cta}
        <ArrowRight size={13} strokeWidth={2.4} aria-hidden />
      </Link>
    </div>
  );
}

/**
 * THESIS: A Kenyan fashion marketplace — black ink, acid lime, giant sale
 * numbers, editorial photography and horizontal product walls.
 * OWN-WORLD: #0E0B0C ink, #D4EF1C lime, #F7F5F2 paper, Archivo + Plus Jakarta.
 * STORY: catch the drop → scan the deal wall → bag a piece → checkout or chat.
 * FIRST VIEWPORT: dark hero with a lime offer line, image collage, deal tiles.
 * FORM: shopzetu.com homepage grammar, painted with the tenant's own catalogue.
 */
export function ZetuStoreHome(props: StoreHomeTemplateProps) {
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
    categoryPathSlug,
    categories,
    types,
    featured,
    heroTitle,
    areaLabel,
    branchHint,
    heroBannerUrls,
    showcaseImage,
    landingContent,
    design: designProp,
    postSections,
  } = props;

  const design = useStorefrontLiveDesign(designProp ?? null);
  const optionVars = themeOptionVars(themeId, design?.theme ?? null);
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection ? heroSection.enabled : true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const signUp = useStorefrontSignUpDoor();

  const all = dedupe([...featured, ...catalogItems]);
  const stats = zetuCatalogueStats(all);
  const budget = zetuBudgetCeiling(all);
  const discountLine = percentLine(all);
  const saleItems = discountLine.filter((item) => zetuDiscount(item));
  const dealRail = (saleItems.length > 0 ? saleItems : all).slice(0, 10);
  const bestSellers = (featured.length > 0 ? featured : all).slice(0, 10);
  const justLanded = (catalogItems.length > 0 ? catalogItems : all).slice(0, 6);
  const trending = all.slice(0, 8);
  const count = totalCount ?? all.length;

  const collectionSeen = new Set<string>();
  const collections = [
    ...categories
      .filter((cat) => !cat.parentId && cat.name.trim())
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        href: shopListPath({
          categoryPathSlug: storefrontCategoryPathSlug(cat),
        }),
        count: cat.itemCount ?? null,
      })),
    ...types
      .filter((type) => type.label.trim())
      .map((type) => ({
        id: `type-${type.id}`,
        name: type.label,
        href: shopListPath({ typeId: type.id }),
        count: type.itemCount ?? null,
      })),
  ]
    .filter((collection) => {
      const key = collection.name.trim().toLowerCase();
      if (collectionSeen.has(key)) return false;
      collectionSeen.add(key);
      return true;
    })
    .slice(0, 6);

  const heroImage =
    (heroBannerUrls ?? []).map((url) => url.trim()).filter(Boolean)[0] ||
    showcaseImage?.trim() ||
    all.find((item) => item.imageUrl)?.imageUrl ||
    null;
  const heroCards = all.filter((item) => item.imageUrl).slice(0, 3);
  const editorialCategory = collections[0] ?? null;
  const editorialImage =
    editorialCategory && saleItems.length > 0
      ? saleItems[0]?.imageUrl
      : all[1]?.imageUrl || heroImage;
  const editorialCards = all
    .filter((item) => item.imageUrl)
    .slice(2, 5);

  const wa =
    landingContent?.whatsapp?.replace(/\D/g, "") ||
    landingContent?.phone?.replace(/\D/g, "") ||
    "";
  const locality =
    [areaLabel?.trim(), branchHint?.trim()].filter(Boolean).join(" · ") || null;
  const promiseCopy =
    landingContent?.storyBody?.trim() ||
    `Every ${heroTitle} order is packed by hand. Pay with M-Pesa, card or cash on delivery, and track the order from your account.`;
  // The announcement bar owns urgency copy; the hero uses the merchant's
  // explicit hero section headline or a seasonal line — never the top banner
  // and never the coming-soon landing headline.
  const headline =
    heroSettings?.headline?.trim() || "New season.\nNew obsessions.";
  const subcopy =
    heroSettings?.subheadline?.trim() ||
    "Fresh fashion, beauty and accessories — styled for the week you actually have. New pieces land every week.";
  const listing = Boolean(
    q?.trim() || categoryId?.trim() || typeId?.trim() || categoryHeading?.trim(),
  );

  const rootStyle = { ...optionVars } as CSSProperties;
  const rootClass = cn(styles.root, styles.body, zetuFontVariables);

  if (listing) {
    const heading =
      categoryHeading?.trim() ||
      (q?.trim() ? `Results for “${q.trim()}”` : "All products");
    return (
      <div
        className={rootClass}
        data-store-theme-id="zetu"
        style={rootStyle}
      >
        <ZetuCatalog
          slug={slug}
          currency={currency}
          heading={heading}
          initialItems={all}
          initialNextCursor={nextCursor}
          totalCount={totalCount}
          q={q}
          typeId={typeId}
          categoryId={categoryId}
          categories={categories}
          categoryPathSlug={categoryPathSlug}
          intro={landingContent?.subheadline?.trim() || null}
        />
        {postSections}
        <ZetuFooter
          storeName={heroTitle}
          currency={currency}
          categories={categories}
          landingContent={landingContent}
          areaLabel={areaLabel}
          branchHint={branchHint}
        />
      </div>
    );
  }

  return (
    <div className={rootClass} data-store-theme-id="zetu" style={rootStyle}>
      <main className={styles.home}>
        <div className={styles.shell}>
          {heroOn ? (
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <span className={styles.heroNote}>
                New season edit {stats.maxDiscount > 0 ? <b>up to {stats.maxDiscount}% off</b> : <b>just in</b>}
              </span>
              <span className={styles.heroEyebrow}>
                <Sparkles size={11} strokeWidth={2.4} aria-hidden />
                New season
              </span>
              <StorefrontNativeHeroEditFrame>
                <StorefrontNativeHeroHeadline
                  value={headline}
                  className={styles.heroTitle}
                />
              </StorefrontNativeHeroEditFrame>
              <p className={styles.heroOffer}>
                {stats.maxDiscount > 0 ? (
                  <>
                    <span>Up to</span> {stats.maxDiscount}% off <span>the wall</span>
                  </>
                ) : (
                  <>
                    <span>Fresh drops</span> every week
                  </>
                )}
              </p>
              <p className={styles.heroSub}>{subcopy}</p>
              <div className={styles.heroActions}>
                <Link href={APP_ROUTES.shop} className={styles.heroPrimary}>
                  Shop the edit
                  <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
                </Link>
                <a href="#just-landed" className={styles.heroGhost}>
                  Just landed
                </a>
              </div>
              <div className={styles.heroTrust}>
                <span>
                  <Wallet size={13} strokeWidth={2} aria-hidden />
                  M-Pesa &amp; card
                </span>
                {locality ? (
                  <span>
                    <Truck size={13} strokeWidth={2} aria-hidden />
                    {locality}
                  </span>
                ) : null}
                <span>
                  <ShieldCheck size={13} strokeWidth={2} aria-hidden />
                  Track every order
                </span>
              </div>
            </div>

            <div className={styles.heroPhoto}>
              {heroImage ? (
                <Image
                  src={heroImage}
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 900px) 48vw, 100vw"
                  unoptimized
                />
              ) : (
                <span className={styles.heroPlaceholder} aria-hidden />
              )}
            </div>
            <span className={styles.heroShade} aria-hidden />
            {heroCards.length > 0 ? (
              <div className={styles.heroCards} aria-hidden>
                {heroCards.map((item) => (
                  <span key={item.id} className={styles.heroCard}>
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="120px"
                        unoptimized
                      />
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
          ) : null}

          <div className={styles.deals}>
            <Link href={APP_ROUTES.shop} className={cn(styles.dealCard, styles.dealDark)}>
              <span className={styles.dealKicker}>
                {stats.maxDiscount > 0 ? "Up to" : "Just in"}
              </span>
              <span className={styles.dealTitle}>
                {stats.maxDiscount > 0 ? (
                  <>
                    {stats.maxDiscount}%<small>off</small>
                  </>
                ) : (
                  "New drops"
                )}
              </span>
              <span className={styles.dealCta}>
                {stats.maxDiscount > 0 ? "Shop the sale" : "Shop new in"}
                <span className={styles.dealArrow} aria-hidden>
                  →
                </span>
              </span>
            </Link>

            <Link href={APP_ROUTES.shop} className={cn(styles.dealCard, styles.dealAccent)}>
              <span className={styles.dealKicker}>Budget friendly</span>
              <span className={styles.dealTitle}>
                {budget ? (
                  <>
                    Under<small>{currency} {budget.toLocaleString("en-KE")}</small>
                  </>
                ) : (
                  "Everyday"
                )}
              </span>
              <span className={styles.dealCta}>
                Shop the edit
                <span className={styles.dealArrow} aria-hidden>
                  →
                </span>
              </span>
            </Link>

            <Link href={APP_ROUTES.shop} className={cn(styles.dealCard, styles.dealDark)}>
              <span className={styles.dealKicker}>New this week</span>
              <span className={styles.dealTitle}>
                {count}
                <small>pieces</small>
              </span>
              <span className={styles.dealCta}>
                See what&apos;s new
                <span className={styles.dealArrow} aria-hidden>
                  →
                </span>
              </span>
            </Link>

            <Link
              href={editorialCategory?.href ?? APP_ROUTES.shop}
              className={cn(styles.dealCard, styles.dealLight)}
            >
              <span className={styles.dealKicker}>Shop by</span>
              <span className={styles.dealTitle}>
                {editorialCategory?.name ?? "Collection"}
              </span>
              <span className={styles.dealCta}>
                Browse all
                <span className={styles.dealArrow} aria-hidden>
                  →
                </span>
              </span>
            </Link>
          </div>
        </div>

        {productsOn ? (
          <section className={styles.bandLime}>
            <div className={cn(styles.shell, styles.section)}>
              <SectionHead
                kicker={saleItems.length > 0 ? "On sale now" : "New arrivals"}
                title={saleItems.length > 0 ? "Today's top deals" : "New this week"}
                lead={
                  saleItems.length > 0
                    ? "Biggest markdowns first. Prices move when stock does."
                    : "The latest pieces to land, ready to wear now."
                }
                href={APP_ROUTES.shop}
                cta={saleItems.length > 0 ? "View all deals" : "Shop all"}
              />
              <div className={styles.metaChips}>
                <span className={styles.metaChip}>
                  <b>{saleItems.length}</b> on sale
                </span>
                <span className={styles.metaChip}>
                  <b>{count}</b> pieces
                </span>
                <span className={styles.metaChip}>
                  <b>{collections.length}</b> collections
                </span>
              </div>
              {dealRail.length > 0 ? (
                <div className={styles.rail}>
                  {dealRail.map((item) => (
                    <ZetuCard
                      key={item.id}
                      item={item}
                      currency={currency}
                      brandFallback={heroTitle}
                    />
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>
                  The rail is being restyled. Check back shortly.
                </p>
              )}
            </div>
          </section>
        ) : null}

        <div className={cn(styles.shell, styles.sectionTight)}>
          <div className={styles.promise}>
            <div className={styles.promiseMark}>
              <span className={styles.promiseSquare} aria-hidden>
                {heroTitle.trim().charAt(0).toUpperCase() || "Z"}
              </span>
              <div>
                <p className={styles.kicker}>Packed by hand</p>
                <p className={styles.promiseSerif}>Pay your way.</p>
              </div>
            </div>
            <p className={styles.promiseCopy}>{promiseCopy}</p>
            {wa ? (
              <a
                href={`https://wa.me/${wa}`}
                className={styles.promiseCta}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with the shop on WhatsApp"
              >
                <MessageCircle size={18} aria-hidden />
              </a>
            ) : (
              <Link href={APP_ROUTES.shop} className={styles.promiseCta} aria-label="Shop all">
                <ArrowUpRight size={18} aria-hidden />
              </Link>
            )}
          </div>
        </div>

        <div className={cn(styles.shell, styles.sectionTight)}>
          <section className={styles.editorial}>
            <div className={styles.editorialCopy}>
              <span className={styles.editorialBadge}>The edit</span>
              <h2 className={styles.editorialTitle}>
                {editorialCategory ? (
                  <>
                    <em>{editorialCategory.name}</em> just landed.
                  </>
                ) : (
                  <>
                    <em>New season</em> just landed.
                  </>
                )}
              </h2>
              <p className={styles.editorialSub}>
                {landingContent?.storyBody?.trim() ||
                  "Our stylists pulled the pieces worth wearing now — and the price tags worth showing off."}
              </p>
              <div className={styles.editorialChips}>
                {collections.slice(0, 3).map((collection) => (
                  <Link
                    key={collection.id}
                    href={collection.href}
                    className={styles.editorialChip}
                  >
                    {collection.name}
                  </Link>
                ))}
              </div>
              <Link href={APP_ROUTES.shop} className={styles.heroPrimary}>
                Shop the edit
                <ArrowRight size={14} strokeWidth={2.5} aria-hidden />
              </Link>
            </div>
            <div className={styles.editorialMedia}>
              {editorialImage ? (
                <Image
                  src={editorialImage}
                  alt=""
                  fill
                  sizes="(min-width: 900px) 52vw, 100vw"
                  unoptimized
                />
              ) : (
                <span className={styles.heroPlaceholder} aria-hidden />
              )}
            </div>
            <span className={styles.editorialShade} aria-hidden />
            {editorialCards.length > 0 ? (
              <div className={styles.editorialCards} aria-hidden>
                {editorialCards.map((item) => (
                  <span key={item.id} className={styles.editorialCard}>
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="130px"
                        unoptimized
                      />
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <div className={cn(styles.shell, styles.sectionTight)}>
          <SectionHead
            kicker="The looks you keep coming back to"
            title="Best sellers"
            lead={null}
            href={APP_ROUTES.shop}
            cta="See what's hot"
          />
          {bestSellers.length > 0 ? (
            <div className={styles.rail}>
              {bestSellers.map((item) => (
                <ZetuCard
                  key={item.id}
                  item={item}
                  currency={currency}
                  brandFallback={heroTitle}
                />
              ))}
            </div>
          ) : (
            <p className={styles.empty}>No best sellers yet — the first drop is loading.</p>
          )}
        </div>

        <div className={styles.shell}>
          <section id="just-landed" className={styles.justLanded}>
            <div className={styles.justHead}>
              <span className={cn(styles.kicker, styles.kickerDark)}>
                New season. New obsessions.
              </span>
              <h2 className={styles.justTitle}>
                Just <em>landed!</em>
              </h2>
              <p className={styles.justSub}>
                The latest pieces have entered the chat. Be first through the door.
              </p>
              <Link href={APP_ROUTES.shop} className={styles.justCta}>
                See what&apos;s new
                <ArrowRight size={13} strokeWidth={2.5} aria-hidden />
              </Link>
            </div>
            {justLanded.length > 0 ? (
              <div className={cn(styles.rail, styles.railDark)}>
                {justLanded.map((item) => (
                  <ZetuCard
                    key={item.id}
                    item={item}
                    currency={currency}
                    brandFallback={heroTitle}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <div className={cn(styles.shell, styles.section)}>
          <SectionHead
            kicker="What everyone's buying right now"
            title="Trending"
            lead="Ranked by demand across the shop this week."
            href={APP_ROUTES.shop}
            cta="Shop trending"
          />
          {trending.length > 0 ? (
            <div className={styles.trending}>
              {trending.map((item, index) => (
                <div key={item.id} className={styles.numberWrap}>
                  <span className={styles.numberTag}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <ZetuCard
                    item={item}
                    currency={currency}
                    brandFallback={heroTitle}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {collections.length > 0 ? (
          <div className={cn(styles.shell, styles.sectionTight)}>
            <SectionHead
              kicker="Find your next favourite"
              title="Shop by category"
              lead={null}
              href={APP_ROUTES.shop}
              cta="All collections"
            />
            <div className={styles.categoryWall}>
              {collections.map((collection, index) => (
                <Link
                  key={collection.id}
                  href={collection.href}
                  className={cn(
                    styles.categoryCard,
                    index === 0 && styles.categoryCardAlt,
                  )}
                >
                  <span className={styles.categoryKicker}>
                    {collection.count != null
                      ? `${collection.count} pieces`
                      : "Collection"}
                  </span>
                  <span className={styles.categoryName}>{collection.name}</span>
                  <span className={styles.categoryFoot}>
                    Shop now
                    <span className={styles.categoryArrow} aria-hidden>
                      →
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className={cn(styles.shell, styles.sectionTight)}>
          <section className={styles.newsletter}>
            <div>
              <h2 className={styles.newsletterTitle}>First look, every drop.</h2>
              <p className={styles.newsletterCopy}>
                Create an account to save your bag, follow orders and get the
                next collection before it hits the rail.
              </p>
            </div>
            <div className={styles.newsletterForm}>
              <Link
                href={signUp.href}
                onClick={signUp.onActivate}
                className={styles.newsletterBtn}
              >
                {signUp.label || "Join the list"}
              </Link>
            </div>
          </section>
        </div>

        {postSections}
      </main>

      <ZetuFooter
        storeName={heroTitle}
        currency={currency}
        categories={categories}
        landingContent={landingContent}
        areaLabel={areaLabel}
        branchHint={branchHint}
      />
    </div>
  );
}
