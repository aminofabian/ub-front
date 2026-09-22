"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Droplets, Waves } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";

import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import {
  resolveNativeHeroHeadline,
  StorefrontNativeHeroEditFrame,
  StorefrontNativeHeroHeadline,
} from "@/components/storefront/storefront-native-hero-copy";
import { StorefrontHeroSection } from "@/components/storefront/sections/hero-section";
import { filterShopperTypes } from "@/components/storefront/shop-type-filters";
import { MizuSpringsCard } from "@/components/storefront/templates/store/mizu-springs-card";
import { MizuSpringsCatalog } from "@/components/storefront/templates/store/mizu-springs-catalog";
import { mizuSpringsFontVariables } from "@/components/storefront/templates/store/mizu-springs-fonts";
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
import { themeOptionVars } from "@/lib/storefront-theme-options";
import { shopListPath } from "@/lib/shop-url";
import { cn } from "@/lib/utils";

const DEFAULT_PILLARS = [
  {
    title: "Homes & Offices",
    copy: "Reliable deliveries of everyday refreshment. Ranging from small grab-and-go bottles to large family refills.",
  },
  {
    title: "Custom Events",
    copy: "We design and print custom-branded packages tailored to your event size, making your occasion unforgettable.",
  },
  {
    title: "Strict Purity",
    copy: "Purified using strict standards to ensure it is consistently clean, safe, and deeply refreshing.",
  },
] as const;

const DEFAULT_FAQS = [
  {
    q: "Do you deliver?",
    a: "Yes, we deliver bottled water and refills around Kenya. Delivery is fast, reliable, and handled with care.",
  },
  {
    q: "Can I order custom-branded bottles in small quantities?",
    a: "Absolutely. We create packages tailored to your event size — from small family gatherings to large corporate functions.",
  },
  {
    q: "What makes your water different?",
    a: "Our water is purified using strict standards to ensure it is consistently clean, safe, and refreshing. Every drop reflects quality and care.",
  },
  {
    q: "How soon should I order for custom branding?",
    a: "We recommend placing your order at least 1–2 days in advance so we can design, print, and deliver your custom bottles in time.",
  },
  {
    q: "Do you handle large bulk orders?",
    a: "Yes. We supply bulk water for homes, offices, and events.",
  },
] as const;

const FEATURE_CHIPS = [
  ["300 ml", "500 ml", "1 L", "1.5 L"],
  ["5 L", "10 L", "20 L", "2,500 L"],
] as const;

const FEATURE_BADGES = ["Grab & Go", "Home & Office"] as const;

const CHECKLIST = [
  "Weddings & Anniversaries",
  "Corporate Functions",
  "Funeral Services",
  "Graduation Parties",
] as const;

/**
 * THESIS: Premium purified-water brand site — navy ice chrome, cyan CTAs,
 * collection cards — not a supermarket aisle painted blue.
 * OWN-WORLD: Ice #f4f9ff, navy #172554, cyan→blue pills, Inter, wave hero.
 * STORY: Land on the sip → browse collection → bag → WhatsApp order.
 * FIRST VIEWPORT: Sticky navy bar, badge, shimmer headline, dual CTAs, wave.
 * FORM: Mizu Springs · mizusprings.com collection grammar, merchant identity.
 */
export function MizuSpringsStoreHome(props: StoreHomeTemplateProps) {
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
    logoDarkUrl,
    heroBannerUrls,
    showcaseImage,
    landingContent,
    primaryHex,
    accentHex,
    design: designProp,
  } = props;
  const design = useStorefrontLiveDesign(designProp ?? null);
  const optionVars = themeOptionVars(themeId, design?.theme ?? null);

  const navy = primaryHex?.trim() || "#172554";
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const headline = resolveNativeHeroHeadline(
    heroSettings,
    announcement,
    "Make every sip unforgettable.",
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
    "with Pure, premium water crafted for everyday moments and the occasions that matter most.";

  const aboutLead =
    landingContent?.storyBody?.trim() ||
    `From our station to custom-branded bottled water for weddings, funerals, graduations, and corporate functions, ${heroTitle} is committed to purity, consistency, and professionalism.`;

  const badgeLabel =
    landingContent?.posterTagline?.trim() ||
    heroTitle.replace(/\s+/g, "-").toUpperCase();

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const account = useStorefrontAccountLink();
  const signUp = useStorefrontSignUpDoor();

  const featureCards = collections.length >= 1
    ? collections.map((type, i) => ({
        key: type.id,
        title: type.label,
        href: shopListPath({ typeId: type.id }),
        badge: FEATURE_BADGES[i] ?? type.label,
        copy:
          i === 0
            ? "Perfect for everyday refreshment, the gym, or the office. Available in single units or cases."
            : "Large format options for families, water dispensers, and large events requiring high volume.",
        image: lead[i]?.imageUrl ?? lead[0]?.imageUrl ?? null,
        chips: FEATURE_CHIPS[i] ?? FEATURE_CHIPS[0],
      }))
    : [
        {
          key: "personal",
          title: "Personal Hydration",
          href: "#catalog",
          badge: FEATURE_BADGES[0],
          copy: "Perfect for everyday refreshment, the gym, or the office. Available in single units or cases.",
          image: lead[0]?.imageUrl ?? null,
          chips: FEATURE_CHIPS[0],
        },
        {
          key: "bulk",
          title: "Refills & Bulk Supply",
          href: "#catalog",
          badge: FEATURE_BADGES[1],
          copy: "Large format options for families, water dispensers, and large events requiring high volume.",
          image: lead[1]?.imageUrl ?? lead[0]?.imageUrl ?? null,
          chips: FEATURE_CHIPS[1],
        },
      ];

  const pillarImages = [lead[0], lead[1], lead[2]].map((item) => item?.imageUrl ?? null);

  const shimmerSplit = splitShimmerWord(headline);

  return (
    <div
      className={cn(styles.root, styles.body, mizuSpringsFontVariables)}
      data-store-theme-id="mizu-springs"
      style={
        {
          ["--ms-navy" as string]: navy,
          ...optionVars,
        } as CSSProperties
      }
    >
      {listing ? (
        <MizuSpringsCatalog
          slug={slug}
          currency={currency}
          heading={
            categoryHeading?.trim() ||
            (q?.trim() ? `Results for “${q.trim()}”` : "Our Premium Collection")
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
              <Droplets className={cn(styles.floatIcon, styles.floatA)} size={28} />
              <Waves className={cn(styles.floatIcon, styles.floatB)} size={28} />
            </div>

            <span className={styles.badge}>
              <span className={styles.badgeDot} aria-hidden />
              {badgeLabel}
            </span>

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
                Order Delivery
              </a>
              <a href="#custom" className={styles.ctaSecondary}>
                Custom Branding
              </a>
            </div>

            <svg
              className={styles.wave}
              viewBox="0 0 1440 320"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                fill="#00B5D1"
                d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,229.3C960,213,1056,171,1152,165.3C1248,160,1344,192,1392,208L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              />
              <path
                fill="#082F49"
                d="M0,256L48,245.3C96,235,192,213,288,202.7C384,192,480,192,576,208C672,224,768,256,864,266.7C960,277,1056,267,1152,240C1248,213,1344,171,1392,149.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                opacity="0.95"
              />
            </svg>
          </section>
        </StorefrontNativeHeroEditFrame>
      )}

      {listing ? null : (
        <>
          <section id="about" className={styles.about}>
            <div className={styles.sectionIntro}>
              <h2 className={styles.sectionTitle}>About {heroTitle}</h2>
              <p className={styles.sectionLead}>{aboutLead}</p>
            </div>
            <div className={styles.pillarGrid}>
              {DEFAULT_PILLARS.map((pillar, i) => (
                <article key={pillar.title} className={styles.pillar}>
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
                  <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                  <p className={styles.pillarCopy}>{pillar.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="collection" className={styles.collection}>
            <div className={styles.collectionHead}>
              <div>
                <h2 className={styles.sectionTitle}>Our Premium Collection</h2>
                <p className={styles.collectionEyebrow}>
                  Refined. Versatile. Always premium.
                </p>
              </div>
              {wa ? (
                <a
                  href={`https://wa.me/${wa}`}
                  className={styles.waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Order Now via WhatsApp
                </a>
              ) : (
                <a href="#catalog" className={styles.waLink}>
                  Browse the collection
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
                    <span className={styles.featureBadge}>{card.badge}</span>
                  </div>
                  <h3 className={styles.featureTitle}>{card.title}</h3>
                  <p className={styles.featureCopy}>{card.copy}</p>
                  <div className={styles.chipRow}>
                    {card.chips.map((chip) => (
                      <span key={chip} className={styles.chip}>
                        {chip}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {productsOn ? (
            <section id="catalog" className={styles.catalogSection}>
              <div className={styles.catalogHead}>
                <h2 className={styles.catalogTitle}>Shop the range</h2>
                <span className={styles.catalogMeta}>
                  {totalCount != null
                    ? `${totalCount} products`
                    : `${lead.length + rest.length} products`}
                </span>
              </div>
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
          ) : null}

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
                <div className={styles.turnaround}>
                  <strong>24-48h</strong>
                  <span>Fast Turnaround</span>
                </div>
              </div>
              <div className={styles.customCopy}>
                <span className={styles.servicePill}>Service Highlight</span>
                <h2 className={styles.sectionTitle}>
                  Your Brand, Our Pure Water.
                </h2>
                <p className={styles.sectionLead} style={{ margin: "1rem 0 0", textAlign: "left" }}>
                  Elevate your weddings, corporate meetings, or family gatherings
                  with custom labels. We handle everything from design to
                  door-step delivery.
                </p>
                <ul className={styles.checkGrid}>
                  {CHECKLIST.map((item) => (
                    <li key={item}>
                      <CheckCircle2
                        className={styles.checkIcon}
                        size={20}
                        aria-hidden
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                {wa ? (
                  <a
                    href={`https://wa.me/${wa}`}
                    className={styles.ctaPrimary}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get a Custom Quote
                  </a>
                ) : (
                  <a href="#collection" className={styles.ctaPrimary}>
                    Get a Custom Quote
                  </a>
                )}
              </div>
            </div>
          </section>

          <section className={styles.passCta} aria-label="Spring pass">
            <span className={styles.passCtaOrb} aria-hidden />
            <div className={styles.passCtaInner}>
              <p className={styles.passCtaEyebrow}>Member spring</p>
              <h2 className={styles.passCtaTitle}>
                {account.signedIn
                  ? "Your spring pass is active"
                  : "Get your spring pass"}
              </h2>
              <p className={styles.passCtaLead}>
                {account.signedIn
                  ? "Track refills, custom bottles, and delivery notes in one place."
                  : "Save orders, speed up WhatsApp checkout, and never lose a refill schedule."}
              </p>
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
                      Sip in
                    </a>
                  </>
                )}
              </div>
            </div>
          </section>

          <section id="faq" className={styles.faq}>
            <div className={styles.sectionIntro}>
              <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
              <p className={styles.sectionLead}>
                Everything you need to know about our water and delivery
                services.
              </p>
            </div>
            <div className={styles.faqList}>
              {DEFAULT_FAQS.map((item, i) => (
                <div
                  key={item.q}
                  className={styles.faqItem}
                  data-open={openFaq === i ? "true" : undefined}
                >
                  <button
                    type="button"
                    className={styles.faqBtn}
                    aria-expanded={openFaq === i}
                    onClick={() => setOpenFaq((cur) => (cur === i ? null : i))}
                  >
                    {item.q}
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
                    <p>{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <footer id="contact" className={styles.footer}>
            <span className={styles.footerOrb} aria-hidden />
            <div className={styles.footerGrid}>
              <div className={styles.footerBrand}>
                <h3>{heroTitle}</h3>
                <p>
                  The highest standard of purified drinking water. Flowing
                  directly to your home, office, or special event.
                </p>
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
                <h4>Get in Touch</h4>
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
              <div className={styles.footerCol}>
                <h4>Business Hours</h4>
                <p>{hours || "Mon–Sat 8am–9pm · Holidays 10am–7pm · Sunday Closed"}</p>
              </div>
            </div>
            <div className={styles.footerBar}>
              © {new Date().getFullYear()} {heroTitle}. Bottled with precision.
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
