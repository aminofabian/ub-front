import Image from "next/image";
import Link from "next/link";

import { OxideCatalog } from "@/components/storefront/templates/store/oxide-catalog";
import { oxideFontVariables } from "@/components/storefront/templates/store/oxide-fonts";
import { OxideSignup } from "@/components/storefront/templates/store/oxide-signup";
import styles from "@/components/storefront/templates/store/oxide.module.css";
import { StorefrontHeroSection } from "@/components/storefront/sections/hero-section";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import {
  resolveStorefrontDesign,
  storefrontSectionConfig,
  type StorefrontHeroSectionSettings,
} from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

function RegistrationMark({
  accent,
  className,
}: {
  accent?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(styles.reg, accent && styles.regAccent, className)}
      aria-hidden
    />
  );
}

/** Industrial archive storefront — OXIDE bone / ink / oxide-red system. */
export function OxideStoreHome(props: StoreHomeTemplateProps) {
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
    logoUrl,
    showcaseImage,
    accentHex,
    primaryHex,
    heroBannerUrls,
    landingContent,
    design,
  } = props;

  const accent = accentHex?.trim() || "#FF3D1F";
  const heroSection = storefrontSectionConfig(design, "hero");
  const heroOn = heroSection?.enabled === true;
  const heroSettings = heroSection?.settings as
    | StorefrontHeroSectionSettings
    | undefined;
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;
  const buttons = resolveStorefrontDesign(design).buttons;
  const lead = featured[0] ?? catalogItems[0] ?? null;
  const panelImage = showcaseImage || lead?.imageUrl || null;
  const year = new Date().getFullYear();

  return (
    <div
      className={cn(styles.root, styles.body, oxideFontVariables)}
      data-store-theme-id="oxide"
      style={{ ["--oxide-accent" as string]: accent }}
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
          ctaAnchor="#catalog"
        />
      ) : (
        <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroLeft}>
            <div className={styles.eyebrow}>
              <div className={styles.eyebrowLine} />
              {areaLabel?.trim()
                ? `Collection — ${areaLabel}`
                : "Collection 04 — Weather line"}
            </div>
            <h1 className={styles.headline}>
              {heroTitle.trim() ? (
                <>
                  {heroTitle}
                  <br />
                  <span className={styles.strike}>Archive</span>
                </>
              ) : (
                <>
                  Garments
                  <br />
                  Built Like
                  <br />
                  <span className={styles.strike}>Tools</span>
                </>
              )}
            </h1>
            <p className={styles.heroSub}>
              {announcement?.trim() ||
                "Cut from the same logic as work equipment: reinforced seams, honest fabric weights, and hardware that answers to use, not trend. No fashion cycle. Just a spec sheet that holds up."}
            </p>
            <div className={styles.heroCta}>
              <a className={styles.btnPrimary} href="#catalog">
                Shop the archive <span className={styles.mono}>→</span>
              </a>
              <a className={styles.btnSecondary} href="#spec">
                Read spec sheet
              </a>
            </div>
          </div>
          <div className={styles.heroDivider} aria-hidden />
          <div className={styles.heroRight}>
            <div className={styles.specPanelTitle}>
              <span>Fig. 01 / Featured</span>
              <span>{lead?.sku?.trim().toUpperCase() || "CODE OX-104"}</span>
            </div>
            <div className={styles.garmentRender}>
              <RegistrationMark className={cn(styles.corner, styles.cornerTl)} />
              <RegistrationMark className={cn(styles.corner, styles.cornerTr)} />
              <RegistrationMark className={cn(styles.corner, styles.cornerBl)} />
              <RegistrationMark
                accent
                className={cn(styles.corner, styles.cornerBr)}
              />
              {panelImage ? (
                <Image
                  src={panelImage}
                  alt={lead?.name ?? heroTitle}
                  width={640}
                  height={720}
                  className="object-cover"
                  unoptimized
                  priority
                />
              ) : logoUrl ? (
                <Image
                  src={logoUrl}
                  alt=""
                  width={320}
                  height={320}
                  className="object-contain p-10"
                  unoptimized
                />
              ) : (
                <span className={styles.itemPlaceholder} aria-hidden />
              )}
            </div>
            <div className={styles.specRows}>
              <div className={styles.specRow}>
                <span>Item</span>
                <span>{lead?.name ?? "Featured pick"}</span>
              </div>
              <div className={styles.specRow}>
                <span>Origin</span>
                <span>{areaLabel?.trim() || "Milled — Kenya"}</span>
              </div>
              <div className={styles.specRow}>
                <span>Stock</span>
                <span>
                  {lead?.qtyOnHand != null
                    ? `${lead.qtyOnHand} on hand`
                    : "Limited run"}
                </span>
              </div>
              <div className={styles.specRow}>
                <span>Price</span>
                <span>
                  {lead?.price != null
                    ? new Intl.NumberFormat("en-KE", {
                        style: "currency",
                        currency: currency || "KES",
                        maximumFractionDigits: 0,
                      }).format(lead.price)
                    : "See archive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {productsOn ? (
        <div className={styles.cutline}>
          <span>×</span>
          <div className={styles.dashLine} />
          <span>Pattern ref. 0117 — do not scale</span>
          <div className={styles.dashLine} />
          <span>×</span>
        </div>
      ) : null}

      {productsOn ? (
        <OxideCatalog
          slug={slug}
          currency={currency}
          initialItems={catalogItems}
          initialNextCursor={nextCursor}
          totalCount={totalCount}
        />
      ) : null}

      <section id="manifest">
        <div className={styles.manifest}>
          <div className={styles.manifestLabel}>
            <div className={cn(styles.sectionIndex, styles.mono)}>
              Section 02
            </div>
            <div className={styles.manifestNum}>Mfst.</div>
          </div>
          <div className={styles.manifestBody}>
            <div className={styles.manifestCol}>
              <h3>01 — Material</h3>
              <p>
                Every product is chosen for how it holds up, not how it
                photographs. Honest weights, durable finishes, and stock that
                softens with wear instead of wearing out.
              </p>
            </div>
            <div className={styles.manifestCol}>
              <h3>02 — Construction</h3>
              <p>
                Stress points reinforced, seams that last, and hardware sourced
                for use. Built to be repaired, not replaced on the next cycle.
              </p>
            </div>
            <div className={styles.manifestCol}>
              <h3>03 — Release</h3>
              <p>
                Small batches, numbered and dated. When a run sells out, it does
                not return. The archive grows; nothing gets reprinted.
              </p>
            </div>
          </div>
        </div>
      </section>

      <OxideSignup />

      <footer className={styles.footer}>
        <div className={styles.footWrap}>
          <div className={styles.footBrand}>
            <div className={styles.brand}>{heroTitle || "Store"}</div>
            <p>
              Technical goods for people who use what they buy. Designed for the
              field, tested past the point of comfort.
            </p>
          </div>
          <div className={styles.footCol}>
            <h4>Shop</h4>
            <ul>
              <li>
                <a href="#catalog">Archive</a>
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
            <h4>Support</h4>
            <ul>
              <li>
                <Link href="/shop/account">Account</Link>
              </li>
              <li>
                <a href="#spec">Dispatch list</a>
              </li>
            </ul>
          </div>
          <div className={styles.footCol}>
            <h4>Studio</h4>
            <ul>
              <li>
                <a href="#manifest">Manifest</a>
              </li>
              <li>
                <a href="#signup">Contact</a>
              </li>
            </ul>
          </div>
        </div>
        <div className={styles.footBottom}>
          <span>
            © {year} {heroTitle || "Store"} — all runs numbered
          </span>
          <span>Pattern 0117 / Nairobi</span>
        </div>
      </footer>
    </div>
  );
}
