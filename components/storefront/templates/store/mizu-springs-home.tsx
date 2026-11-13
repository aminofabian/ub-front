"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Droplets, Waves } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";

import {
  useStorefrontLiveDesign,
  useStorefrontStaffEditOptional,
} from "@/components/storefront/storefront-staff-edit";
import {
  resolveNativeHeroHeadline,
  StorefrontNativeHeroEditFrame,
  StorefrontNativeHeroHeadline,
} from "@/components/storefront/storefront-native-hero-copy";
import { StorefrontHeroSection } from "@/components/storefront/sections/hero-section";
import { filterShopperTypes } from "@/components/storefront/shop-type-filters";
import { resolveMizuTheme } from "@/components/storefront/templates/store/mizu-springs-copy";
import { MizuText } from "@/components/storefront/templates/store/mizu-springs-text";
import { MizuSpringsCard } from "@/components/storefront/templates/store/mizu-springs-card";
import { MizuSpringsCatalog } from "@/components/storefront/templates/store/mizu-springs-catalog";
import { mizuSpringsFontVariables } from "@/components/storefront/templates/store/mizu-springs-fonts";
import { mizuThemeStyle } from "@/components/storefront/templates/store/mizu-springs-palette";
import styles from "@/components/storefront/templates/store/mizu-springs.module.css";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import {
  useStorefrontAccountLink,
  useStorefrontSignUpDoor,
} from "@/components/storefront/storefront-account-link";
import {
  resolveStorefrontDesign,
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { shopListPath } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

/**
 * THESIS: Premium purified-water brand site — navy ice chrome, cyan CTAs,
 * collection cards — not a supermarket aisle painted blue.
 * OWN-WORLD: Ice #f5f8fc, navy #172554, cyan accent, Inter, wave hero.
 * STORY: Land on the sip → browse collection → bag → WhatsApp order.
 * FIRST VIEWPORT: Sticky navy bar, badge, cyan headline accent, dual CTAs, wave.
 * FORM: Mizu Springs · mizusprings.com collection grammar, merchant identity.
 */
export function MizuSpringsStoreHome(props: StoreHomeTemplateProps) {
  const {
    slug,
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
    categories,
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
  } = props;
  const design = useStorefrontLiveDesign(designProp ?? null);

  const mizu = resolveMizuTheme({
    shopName: heroTitle,
    categoryNames: [...categories.map((c) => c.name), ...types.map((t) => t.label)],
    landing: landingContent,
    options: design?.theme?.["mizu-springs"],
  });
  const { t } = mizu;
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const headline = resolveNativeHeroHeadline(
    heroSettings,
    announcement,
    mizu.headline,
  );
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;
  const buttons = resolveStorefrontDesign(design).buttons;

  const listing = Boolean(q?.trim() || categoryId?.trim() || typeId?.trim());
  const collections = filterShopperTypes(types).slice(0, 2);

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

  const heroImage = useMemo(() => {
    const urls = (heroBannerUrls ?? []).map((u) => u.trim()).filter(Boolean);
    if (urls[0]) return urls[0];
    const shot = showcaseImage?.trim();
    if (shot) return shot;
    return lead[0]?.imageUrl ?? null;
  }, [heroBannerUrls, showcaseImage, lead]);

  const subcopy =
    heroSettings?.subheadline?.trim() ||
    landingContent?.subheadline?.trim() ||
    mizu.subcopy;

  const badgeLabel = (() => {
    const raw = landingContent?.posterTagline?.trim();
    if (!raw) return null;
    return raw.length > 28 ? `${raw.slice(0, 26)}…` : raw;
  })();

  const editing = Boolean(useStorefrontStaffEditOptional()?.editMode);
  const faqs = [1, 2, 3, 4, 5]
    .map((n) => ({ n }))
    .filter(({ n }) => editing || (t[`faq${n}Q`] && t[`faq${n}A`]));
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const account = useStorefrontAccountLink();
  const signUp = useStorefrontSignUpDoor();

  const featureCards = ([0, 1] as const)
    .map((i) => {
      const type = collections[i];
      if (collections.length >= 1 && !type) return null;
      const n = i + 1;
      return {
        n,
        key: type?.id ?? `fallback-${i}`,
        title: type?.label ?? mizu.fallbackFeatureTitles[i],
        href: type ? shopListPath({ typeId: type.id }) : "#catalog",
        image: lead[i]?.imageUrl ?? lead[0]?.imageUrl ?? null,
        chips: mizu.chips[i],
      };
    })
    .filter((c) => c !== null);

  const pillarImages = [lead[0], lead[1], lead[2]].map((item) => item?.imageUrl ?? null);

  const shimmerSplit = splitShimmerWord(headline);

  const shopCategories = categories
    .filter((c) => !c.parentId && c.name.trim() && c.slug?.trim())
    .slice(0, 12);

  const aboutSection = mizu.show.about ? (
          <section id="about" className={styles.about}>
            <div className={styles.sectionIntro}>
              <MizuText as="h2" className={styles.sectionTitle} field="aboutTitle" value={t.aboutTitle} label="a heading" />
              <MizuText as="p" multiline className={styles.sectionLead} field="aboutLead" value={t.aboutLead} label="an intro" />
            </div>
            <div className={styles.pillarGrid}>
              {[1, 2, 3].map((n, i) => (
                <article key={n} className={styles.pillar}>
                  <div className={cn(styles.pillarMedia, "relative")}>
                    {pillarImages[i] ? (
                      <Image
                        src={pillarImages[i]!}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 30vw, 90vw"
                        unoptimized
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <span className={styles.pillarFallback} aria-hidden />
                    )}
                  </div>
                  <MizuText as="h3" className={styles.pillarTitle} field={`pillar${n}Title`} value={t[`pillar${n}Title`]} label="a title" />
                  <MizuText as="p" multiline className={styles.pillarCopy} field={`pillar${n}Copy`} value={t[`pillar${n}Copy`]} label="a short description" />
                </article>
              ))}
            </div>
          </section>
          ) : null;

  const collectionSection = (
<section id="collection" className={styles.collection}>
            <div className={styles.collectionHead}>
              <div>
                <MizuText as="h2" className={styles.sectionTitle} field="collectionTitle" value={t.collectionTitle} label="a heading" />
                <MizuText as="p" className={styles.collectionEyebrow} field="collectionTagline" value={t.collectionTagline} label="a short line" />
              </div>
              {wa ? (
                <a
                  href={`https://wa.me/${wa}`}
                  className={styles.waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Order on WhatsApp
                </a>
              ) : (
                <a href="#catalog" className={styles.waLink}>
                  Browse everything
                </a>
              )}
            </div>

            <div className={styles.collectionGrid}>
              {featureCards.map((card) => (
                <Link key={card.key} href={card.href} className={styles.featureCard}>
                  <div className={cn(styles.featureMedia, "relative")}>
                    {card.image ? (
                      <Image
                        src={card.image}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 40vw, 90vw"
                        unoptimized
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <span className={styles.visualPlaceholder} aria-hidden />
                    )}
                    <MizuText className={styles.featureBadge} field={`feature${card.n}Badge`} value={t[`feature${card.n}Badge`]} label="a badge" />
                  </div>
                  <h3 className={styles.featureTitle}>{card.title}</h3>
                  <MizuText as="p" multiline className={styles.featureCopy} field={`feature${card.n}Copy`} value={t[`feature${card.n}Copy`]} label="a description" />
                  {card.chips.length > 0 ? (
                    <div className={styles.chipRow}>
                      {card.chips.map((chip) => (
                        <span key={chip} className={styles.chip}>
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
  );

  const productsSection = productsOn ? (
            <section id="catalog" className={styles.catalogSection}>
              <div className={styles.catalogHead}>
                <MizuText as="h2" className={styles.catalogTitle} field="catalogTitle" value={t.catalogTitle} label="a heading" />
                <span className={styles.catalogMeta}>
                  {totalCount != null
                    ? `${totalCount} products`
                    : `${lead.length + rest.length} products`}
                </span>
              </div>
              {shopCategories.length > 0 ? (
                <nav className={styles.catChips} aria-label="Shop by category">
                  {shopCategories.map((c) => (
                    <Link
                      key={c.id}
                      href={shopListPath({ categoryPathSlug: c.slug })}
                      className={styles.catChip}
                    >
                      {c.name}
                      {c.itemCount ? <span>{c.itemCount}</span> : null}
                    </Link>
                  ))}
                </nav>
              ) : null}
              <div className={styles.grid}>
                {[...lead, ...rest].map((item) => (
                  <MizuSpringsCard
                    key={item.id}
                    item={item}
                    currency={currency}
                  />
                ))}
              </div>
              {nextCursor ? (
                <p className={styles.empty} style={{ paddingTop: "2rem" }}>
                  <Link href={shopListPath({})} className={styles.waLink}>
                    See the full collection
                  </Link>
                </p>
              ) : null}
            </section>
          ) : null;

  const customSection = mizu.show.custom ? (
          <section id="custom" className={styles.custom}>
            <div className={styles.customInner}>
              <div className={styles.customMediaShell}>
                <div className={cn(styles.customMedia, "relative")}>
                  {heroImage ? (
                    <Image
                      src={heroImage}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 36rem, 90vw"
                      unoptimized
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <span className={styles.pillarFallback} aria-hidden />
                  )}
                </div>
                {t.turnaroundValue ? (
                  <div className={styles.turnaround}>
                    <strong>
                      <MizuText field="turnaroundValue" value={t.turnaroundValue} />
                    </strong>
                    <MizuText field="turnaroundLabel" value={t.turnaroundLabel} label="a label" />
                  </div>
                ) : null}
              </div>
              <div className={styles.customCopy}>
                <MizuText as="h2" className={styles.sectionTitle} field="customTitle" value={t.customTitle} label="a heading" />
<div style={{ margin: "1rem 0 0", textAlign: "left" }}>
                  <MizuText as="p" multiline className={styles.sectionLead} field="customLead" value={t.customLead} label="an intro" />
                </div>
                <ul className={styles.checkGrid}>
                  {[1, 2, 3, 4].map((n) =>
                    t[`customItem${n}`] || editing ? (
                      <li key={n}>
                        <CheckCircle2 className={styles.checkIcon} size={20} aria-hidden />
                        <MizuText field={`customItem${n}`} value={t[`customItem${n}`]} label="a checklist item" />
                      </li>
                    ) : null,
                  )}
                </ul>
                {wa ? (
                  <a
                    href={`https://wa.me/${wa}`}
                    className={styles.ctaPrimary}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MizuText field="customCta" value={t.customCta} label="a button label" />
                  </a>
                ) : (
                  <a href="#collection" className={styles.ctaPrimary}>
                    <MizuText field="customCta" value={t.customCta} label="a button label" />
                  </a>
                )}
              </div>
            </div>
          </section>
          ) : null;

  const passSection = mizu.show.pass ? (
          <section className={styles.passCta} aria-label={t.passTitle || "Account"}>
            <span className={styles.passCtaOrb} aria-hidden />
            <div className={styles.passCtaInner}>
              {account.signedIn ? (
                <h2 className={styles.passCtaTitle}>{mizu.passTitleIn}</h2>
              ) : (
                <MizuText as="h2" className={styles.passCtaTitle} field="passTitle" value={t.passTitle} label="a heading" />
              )}
              {account.signedIn ? (
                <p className={styles.passCtaLead}>{mizu.passLeadIn}</p>
              ) : (
                <MizuText as="p" multiline className={styles.passCtaLead} field="passLead" value={t.passLead} label="a short text" />
              )}
              <div className={styles.passCtaActions}>
                {account.signedIn ? (
                  <Link href={account.href} className={styles.passCtaPrimary}>
                    Open my account
                  </Link>
                ) : (
                  <>
                    <a
                      href={signUp.href}
                      className={styles.passCtaPrimary}
                      onClick={signUp.onActivate}
                    >
                      {signUp.label}
                    </a>
                    <a
                      href={account.href}
                      className={styles.passCtaSecondary}
                      onClick={account.onActivate}
                    >
                      Sign in
                    </a>
                  </>
                )}
              </div>
            </div>
          </section>
          ) : null;

  const faqSection = mizu.show.faq ? (
          <section id="faq" className={styles.faq}>
            <div className={styles.sectionIntro}>
              <MizuText as="h2" className={styles.sectionTitle} field="faqTitle" value={t.faqTitle} label="a heading" />
              <MizuText as="p" className={styles.sectionLead} field="faqLead" value={t.faqLead} label="an intro" />
            </div>
            <div className={styles.faqList}>
              {faqs.map(({ n }, i) => (
                <div
                  key={n}
                  className={styles.faqItem}
                  data-open={openFaq === i ? "true" : undefined}
                >
                  <button
                    type="button"
                    className={styles.faqBtn}
                    aria-expanded={openFaq === i}
                    onClick={() => setOpenFaq((cur) => (cur === i ? null : i))}
                  >
                    <MizuText field={`faq${n}Q`} value={t[`faq${n}Q`]} label="a question" />
                    <svg
                      className={styles.faqChevron}
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <div className={styles.faqAnswer}>
                    <MizuText as="p" multiline field={`faq${n}A`} value={t[`faq${n}A`]} label="an answer" />
                  </div>
                </div>
              ))}
            </div>
          </section>
          ) : null;

  return (
    <div
      className={cn(styles.root, styles.home, mizuSpringsFontVariables)}
      data-store-theme-id="mizu-springs"
      data-motion={mizu.show.motion ? undefined : "off"}
      style={
        {
          ...mizuThemeStyle(primaryHex, accentHex, design?.theme),
        } as CSSProperties
      }
    >
      {listing ? (
        <MizuSpringsCatalog
          slug={slug}
          currency={currency}
          heading={
            categoryHeading?.trim() ||
            (q?.trim() ? `Results for “${q.trim()}”` : t.collectionTitle)
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
          logoDarkUrl={logoDarkUrl}
          heroBannerUrls={heroBannerUrls}
          design={design}
          whatsappNumber={landingContent?.whatsapp ?? landingContent?.phone ?? null}
          ctaAnchor="#collection"
        />
      ) : (
        <StorefrontNativeHeroEditFrame>
          <section className={styles.hero} aria-label={headline}>
            <div className={styles.heroDecor} aria-hidden>
              <span className={cn(styles.blob, styles.blobA)} />
              <span className={cn(styles.blob, styles.blobB)} />
              {mizu.kind === "water" ? (
                <>
                  <Droplets className={cn(styles.floatIcon, styles.floatA)} size={28} />
                  <Waves className={cn(styles.floatIcon, styles.floatB)} size={28} />
                </>
              ) : null}
            </div>

            <div className={styles.heroContent}>
              {badgeLabel ? (
                <span className={styles.badge}>
                  <span className={styles.badgeDot} aria-hidden />
                  {badgeLabel}
                </span>
              ) : null}

              {heroSettings?.headline.trim() ? (
                <StorefrontNativeHeroHeadline
                  as="h1"
                  value={headline}
                  className={styles.heroTitle}
                />
              ) : (
                <h1 className={styles.heroTitle}>
                  {shimmerSplit.before}
                  {shimmerSplit.word ? (
                    <span className={styles.shimmer}>{shimmerSplit.word}</span>
                  ) : (
                    headline
                  )}
                  {shimmerSplit.after}
                </h1>
              )}

              <p className={styles.heroSub}>{subcopy}</p>

              <div className={styles.heroCtas}>
                <a href="#collection" className={styles.ctaPrimary}>
                  <MizuText field="heroPrimary" value={t.heroPrimary} label="a button label" />
                </a>
                <a href="#custom" className={styles.ctaSecondary}>
                  <MizuText field="heroSecondary" value={t.heroSecondary} label="a button label" />
                </a>
              </div>
            </div>

{mizu.show.wave ? (
                        <svg
              className={styles.wave}
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                className={styles.waveBack}
                d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,229.3C960,213,1056,171,1152,165.3C1248,160,1344,192,1392,208L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              />
              <path
                className={styles.waveFront}
                d="M0,256L48,245.3C96,235,192,213,288,202.7C384,192,480,192,576,208C672,224,768,256,864,266.7C960,277,1056,267,1152,240C1248,213,1344,171,1392,149.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              />
            </svg>
            ) : null}
          </section>
        </StorefrontNativeHeroEditFrame>
      )}

      {listing ? null : (
        <>
          {aboutSection}
          {collectionSection}
          {productsSection}
          {customSection}
          {passSection}
          {faqSection}

          <footer id="contact" className={styles.footer}>
            <span className={styles.footerOrb} aria-hidden />
            <div className={styles.footerGrid}>
              <div className={styles.footerBrand}>
                <h3>{heroTitle}</h3>
                <MizuText as="p" multiline field="footerBlurb" value={t.footerBlurb} label="a footer intro" />
                {wa ? (
                  <a
                    href={`https://wa.me/${wa}`}
                    className={styles.waPill}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp: {landingContent?.whatsapp?.trim() || wa}
                  </a>
                ) : null}
              </div>
              <div className={styles.footerCol}>
                <h4>Get in touch</h4>
                <ul>
                  {address || locality ? (
                    <li>{address || locality}</li>
                  ) : null}
                  {landingContent?.phone?.trim() ? (
                    <li>
                      <a href={`tel:${landingContent.phone}`}>
                        {landingContent.phone}
                      </a>
                    </li>
                  ) : null}
                  {wa ? (
                    <li>
                      <a href={`https://wa.me/${wa}`}>WhatsApp +{wa}</a>
                    </li>
                  ) : null}
                </ul>
              </div>
              {hours ? (
                <div className={styles.footerCol}>
                  <h4>Opening hours</h4>
                  <p>{hours}</p>
                </div>
              ) : null}
            </div>
            <div className={styles.footerBar}>
              © {new Date().getFullYear()} {heroTitle}.{" "}
              <MizuText field="footerSign" value={t.footerSign} label="a sign-off" />
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

function splitShimmerWord(headline: string): {
  before: string;
  word: string | null;
  after: string;
} {
  const match = headline.match(/^(.*?)(\bunforgettable\.?)(.*)$/i);
  if (!match) {
    const parts = headline.trim().split(/\s+/);
    if (parts.length < 2) {
      return { before: headline, word: null, after: "" };
    }
    const word = parts[parts.length - 1] ?? null;
    const before = `${parts.slice(0, -1).join(" ")} `;
    return { before, word, after: "" };
  }
  return {
    before: match[1] ?? "",
    word: match[2] ?? null,
    after: match[3] ?? "",
  };
}
