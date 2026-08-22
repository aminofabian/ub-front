import { Suspense, type CSSProperties } from "react";

import {
  BoutiqueShelfHero,
  BoutiqueShelfSlot,
} from "@/components/storefront/templates/store/boutique-shelf-card";
import { BoutiqueShelfCatalog } from "@/components/storefront/templates/store/boutique-shelf-catalog";
import { boutiqueShelfFontVariables } from "@/components/storefront/templates/store/boutique-shelf-fonts";
import { BoutiqueShelfMobileSearch } from "@/components/storefront/templates/store/boutique-shelf-header";
import { BoutiqueShelfLabels } from "@/components/storefront/templates/store/boutique-shelf-labels";
import styles from "@/components/storefront/templates/store/boutique-shelf.module.css";
import { StorefrontHeroSection } from "@/components/storefront/sections/hero-section";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import {
  resolveStorefrontDesign,
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

/**
 * THESIS: Products live in a velvet-lit gift counter — tissue-wrapped boxes,
 * brass plaques, alcove spotlight — not a generic pink grid.
 * OWN-WORLD: Deep aubergine velvet, warm cream boxes, gold trim, Cormorant /
 * DM Sans, radial spotlight.
 * STORY: Step to the counter, see the staff pick in the lit alcove, add smaller
 * shelf slots or browse the full shelf below.
 * FIRST VIEWPORT: Serif wordmark on velvet; lit alcove left; three gift slots
 * right; brass category plaques.
 * FORM: Velvet Alcove · Counter comp.
 */
export function BoutiqueShelfStoreHome(props: StoreHomeTemplateProps) {
  const {
    slug,
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
    types,
    logoUrl,
    heroBannerUrls,
    showcaseImage,
    landingContent,
    design,
  } = props;

  const rose = primaryHex?.trim() || "#DB2777";
  const brass = accentHex?.trim() || "#C9A227";
  const headline =
    announcement?.trim() || "Curated for the counter.";
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;
  const buttons = resolveStorefrontDesign(design).buttons;
  const lead = featured[0] ?? catalogItems[0] ?? null;
  const seen = new Set(lead ? [lead.id] : []);
  const stack: typeof catalogItems = [];
  for (const item of [...featured, ...catalogItems]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    stack.push(item);
    if (stack.length >= 3) break;
  }
  const rest = heroOn
    ? catalogItems
    : catalogItems.filter((item) => !seen.has(item.id));
  const locality =
    [areaLabel?.trim(), branchHint?.trim()].filter(Boolean).join(" · ") || null;
  const hours = landingContent?.hours?.trim() || null;
  const address = landingContent?.address?.trim() || null;

  return (
    <div
      className={cn(styles.root, styles.body, boutiqueShelfFontVariables)}
      data-store-theme-id="boutique-shelf"
      style={
        {
          ["--bs-rose" as string]: rose,
          ["--bs-brass" as string]: brass,
        } as CSSProperties
      }
    >
      <div className={styles.wrap}>
        <Suspense fallback={null}>
          <BoutiqueShelfMobileSearch />
        </Suspense>
        {productsOn ? (
          <Suspense fallback={null}>
            <BoutiqueShelfLabels types={types} />
          </Suspense>
        ) : null}

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
            ctaAnchor="#shelf"
          />
        ) : lead ? (
          <section className={styles.display} aria-label="Alcove display">
            <BoutiqueShelfHero item={lead} currency={currency} headline={headline} />
            {stack.length > 0 ? (
              <div className={styles.slots}>
                {stack.map((item) => (
                  <BoutiqueShelfSlot key={item.id} item={item} currency={currency} />
                ))}
              </div>
            ) : null}
          </section>
        ) : (
          <section className={styles.display} aria-label="Alcove display">
            <article className={styles.alcove}>
              <span className={styles.spotlight} aria-hidden />
              <div className={styles.alcoveInner}>
                <p className={styles.alcoveEyebrow}>Staff pick · alcove display</p>
                <h1 className={styles.alcoveHeadline}>{headline}</h1>
                <span className={styles.visualPlaceholder} aria-hidden />
                <div className={styles.alcoveCopy}>
                  <p className={styles.alcoveName}>{heroTitle}</p>
                  <p className={styles.itemMeta}>
                    The alcove is being restocked — check back soon.
                  </p>
                </div>
              </div>
            </article>
          </section>
        )}

        {productsOn ? (
          <BoutiqueShelfCatalog
            slug={slug}
            currency={currency}
            initialItems={rest}
            initialNextCursor={nextCursor}
            totalCount={totalCount}
          />
        ) : null}

        <footer className={styles.footer}>
          <div className={styles.footerName}>{heroTitle}</div>
          {hours || address || locality ? (
            <p>{[hours, address, locality].filter(Boolean).join(" · ")}</p>
          ) : null}
          <p>Wrapped with care. Same-day counter pickup.</p>
        </footer>
      </div>
    </div>
  );
}
