"use client";

import { MilkRunCatalog } from "@/components/storefront/templates/store/milk-run-catalog";
import { milkRunFontVariables } from "@/components/storefront/templates/store/milk-run-fonts";
import { MilkRunFloats } from "@/components/storefront/templates/store/milk-run-floats";
import styles from "@/components/storefront/templates/store/milk-run.module.css";
import { StorefrontHeroSection } from "@/components/storefront/sections/hero-section";
import { StorefrontInlineText } from "@/components/storefront/storefront-inline-text";
import {
  StorefrontQuickEditTarget,
  useStorefrontLiveDesign,
  useStorefrontStaffEditOptional,
} from "@/components/storefront/storefront-staff-edit";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import { themeOptionVars } from "@/lib/storefront-theme-options";
import {
  resolveStorefrontDesign,
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

/**
 * THESIS: Neighborhood cream-paper shop — flap-shelf cards over aisle grids.
 * OWN-WORLD: Cream #FFFCF5, ink borders, Baloo 2 / DM Sans / Space Mono, zigzag flaps.
 * STORY: Browse the shelf, add to cart (or WhatsApp), pay how the shop already takes payment.
 * FIRST VIEWPORT: Sticky wordmark, sunshine eyebrow, bold headline, bowl flourish, CTA to #menu.
 * FORM: Milk Run mock (user-pinned) · FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
function digitsOnly(value: string | null | undefined): string | null {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 9 ? digits : null;
}

function splitWordmark(storeName: string): { lead: string; accent: string } {
  const parts = storeName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { lead: parts[0] || "Shop", accent: "" };
  }
  return {
    lead: parts.slice(0, -1).join(" "),
    accent: parts[parts.length - 1]!,
  };
}

function BowlScene() {
  return (
    <div className={styles.bowlScene} aria-hidden>
      <svg width="180" height="150" viewBox="0 0 180 150" fill="none">
        <ellipse
          className={styles.splashRing}
          cx="90"
          cy="66"
          rx="10"
          ry="4"
          fill="none"
          stroke="#2440E0"
          strokeWidth="2"
        />
        <rect
          className={styles.milkDrop}
          x="85"
          y="8"
          width="10"
          height="34"
          rx="5"
          fill="#FFFCF5"
          stroke="#2B1810"
          strokeWidth="2"
        />
        <path
          d="M32 66C32 66 40 60 90 60C140 60 148 66 148 66L138 118C136 128 120 134 90 134C60 134 44 128 42 118L32 66Z"
          fill="#E8412C"
          stroke="#2B1810"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <ellipse
          cx="90"
          cy="66"
          rx="58"
          ry="14"
          fill="#FFC53D"
          stroke="#2B1810"
          strokeWidth="3"
        />
        <ellipse
          cx="90"
          cy="64"
          rx="48"
          ry="9"
          fill="#FFFCF5"
          stroke="#2B1810"
          strokeWidth="2"
        />
        <circle cx="72" cy="63" r="3.4" fill="#4FBF9F" />
        <circle cx="90" cy="65" r="3.4" fill="#E8412C" />
        <circle cx="106" cy="62" r="3.4" fill="#2440E0" />
        <circle cx="80" cy="66" r="3.4" fill="#FFC53D" />
        <circle cx="100" cy="67" r="3.4" fill="#4FBF9F" />
        <rect
          x="118"
          y="30"
          width="9"
          height="52"
          rx="4"
          transform="rotate(18 118 30)"
          fill="#FFFCF5"
          stroke="#2B1810"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

/** Cream-paper flap-shelf storefront — Milk Run system. */
export function MilkRunStoreHome(props: StoreHomeTemplateProps) {
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
    logoUrl,
    heroBannerUrls,
    showcaseImage,
    landingContent,
    design: designProp,
  } = props;
  const design = useStorefrontLiveDesign(designProp ?? null);
  const staff = useStorefrontStaffEditOptional();
  const optionVars = themeOptionVars(themeId, design?.theme ?? null);

  const accent = accentHex?.trim() || "#E8412C";
  const { lead, accent: nameAccent } = splitWordmark(heroTitle);
  const whatsappDigits =
    digitsOnly(landingContent?.whatsapp) || digitsOnly(landingContent?.phone);
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;
  const buttons = resolveStorefrontDesign(design).buttons;
  const hours = landingContent?.hours?.trim() || null;
  const address = landingContent?.address?.trim() || null;
  const locality =
    [areaLabel?.trim(), branchHint?.trim()].filter(Boolean).join(" · ") || null;
  const featuredIds = featured.map((f) => f.id);
  const leadCopy =
    announcement?.trim() ||
    landingContent?.subheadline?.trim() ||
    design?.business?.tagline?.trim() ||
    "Everyday essentials on the shelf. Add what you need — we'll take it from there.";

  return (
    <div
      className={cn(styles.root, styles.body, milkRunFontVariables)}
      data-store-theme-id="milk-run"
      style={{ ["--milk-accent" as string]: accent, ...optionVars }}
    >
      <div className={styles.wrap}>
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
            whatsappNumber={whatsappDigits}
            ctaAnchor="#menu"
          />
        ) : (
          <StorefrontQuickEditTarget field="hero" label="hero headline">
            <section className={styles.hero}>
              <div className={styles.heroEyebrow}>
                {locality || "Neighborhood shop · open shelf"}
              </div>
              <StorefrontInlineText
                as="h1"
                value={
                  heroSettings?.headline.trim() ||
                  [lead, nameAccent].filter(Boolean).join(" ")
                }
                placeholder="Add a headline"
                onCommit={(next) => {
                  void staff?.commitInlineField("hero", { headline: next });
                }}
              >
                <h1>
                  {lead}
                  {nameAccent ? (
                    <>
                      <br />
                      <em>{nameAccent}</em>
                    </>
                  ) : null}
                </h1>
              </StorefrontInlineText>
              <StorefrontInlineText
                as="p"
                multiline
                className={styles.heroLead}
                value={leadCopy}
                placeholder="Add a short intro"
                onCommit={(next) => {
                  void staff?.commitInlineField("tagline", { tagline: next });
                }}
              >
                <p className={styles.heroLead}>{leadCopy}</p>
              </StorefrontInlineText>
              <a className={styles.heroCta} href="#menu">
                See what&apos;s in
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
              <BowlScene />
            </section>
          </StorefrontQuickEditTarget>
        )}

        {productsOn ? (
          <>
            <MilkRunCatalog
              slug={slug}
              currency={currency}
              initialItems={catalogItems}
              initialNextCursor={nextCursor}
              totalCount={totalCount}
              featuredIds={featuredIds}
              whatsappDigits={whatsappDigits}
              storeName={heroTitle}
            />

            <section className={styles.how}>
              <h2>How ordering works</h2>
              <ol>
                <li>
                  <span className={styles.howNum}>1</span>
                  Browse the shelf and tap Add on anything you want — it goes straight
                  into your cart.
                </li>
                <li>
                  <span className={styles.howNum}>2</span>
                  Checkout when you&apos;re ready
                  {whatsappDigits
                    ? ", or ping us on WhatsApp if you prefer to chat it through"
                    : ""}
                  . Tell us pickup or delivery.
                </li>
                <li>
                  <span className={styles.howNum}>3</span>
                  Pay by M-Pesa or cash on pickup/delivery — whatever this shop already
                  takes.
                </li>
              </ol>
            </section>
          </>
        ) : null}

        <footer className={styles.footer}>
          <div className={styles.wordmark}>
            {lead}
            {nameAccent ? (
              <>
                {" "}
                <em>{nameAccent}</em>
              </>
            ) : null}
          </div>
          {announcement ? <p>{announcement}</p> : null}
          {hours || address ? (
            <p>
              {[hours, address].filter(Boolean).join(" · ")}
            </p>
          ) : locality ? (
            <p>{locality}</p>
          ) : null}
          <p>Fresh stock on the shelf — lineup changes as we restock.</p>
        </footer>
      </div>

      <MilkRunFloats whatsappDigits={whatsappDigits} storeName={heroTitle} />
    </div>
  );
}
