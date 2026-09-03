"use client";

import type { CSSProperties } from "react";

import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import { ClimaxFloorCatalog } from "@/components/storefront/templates/store/climax-floor-catalog";
import { ClimaxFloorFloats } from "@/components/storefront/templates/store/climax-floor-floats";
import { climaxFloorFontVariables } from "@/components/storefront/templates/store/climax-floor-fonts";
import styles from "@/components/storefront/templates/store/climax-floor.module.css";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import { storefrontSectionConfig } from "@/lib/storefront-design";
import { themeOptionVars } from "@/lib/storefront-theme-options";
import { cn } from "@/lib/utils";

/**
 * THESIS: A WooCommerce furniture showroom - category sidebar + dense shop grid.
 * OWN-WORLD: Forest green #006651, white paper, Sale badges, Montserrat-like sans.
 * STORY: Land in Shop, filter by category, add to cart, WhatsApp the floor.
 */
export function ClimaxFloorStoreHome(props: StoreHomeTemplateProps) {
  const {
    slug,
    themeId,
    currency,
    catalogItems,
    nextCursor,
    totalCount,
    q,
    categoryId,
    categoryHeading,
    categoryPathSlug,
    categories,
    featured,
    heroTitle,
    announcement,
    areaLabel,
    branchHint,
    landingContent,
    primaryHex,
    design: designProp,
  } = props;
  const design = useStorefrontLiveDesign(designProp ?? null);
  const optionVars = themeOptionVars(themeId, design?.theme ?? null);
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;
  const green = primaryHex?.trim() || "#006651";
  const address =
    landingContent?.address?.trim() ||
    [areaLabel?.trim(), branchHint?.trim()].filter(Boolean).join(", ") ||
    null;
  const wa =
    landingContent?.whatsapp?.replace(/\D/g, "") ||
    landingContent?.phone?.replace(/\D/g, "") ||
    "";
  const heading =
    categoryHeading?.trim() ||
    (q?.trim() ? `Results for “${q.trim()}”` : "Shop");
  const leadItems =
    catalogItems.length > 0 ? catalogItems : featured;

  return (
    <div
      className={cn(styles.root, styles.body, climaxFloorFontVariables)}
      data-store-theme-id="climax-floor"
      style={
        {
          ["--cf-green" as string]: green,
          ...optionVars,
        } as CSSProperties
      }
    >
      {productsOn ? (
        <ClimaxFloorCatalog
          slug={slug}
          currency={currency}
          heading={heading}
          initialItems={leadItems}
          initialNextCursor={nextCursor}
          totalCount={totalCount}
          q={q}
          typeId={props.typeId}
          categoryId={categoryId}
          categories={categories}
          categoryPathSlug={categoryPathSlug}
        />
      ) : (
        <div className={styles.empty}>
          {announcement?.trim() || "The floor is being reset. Check back shortly."}
        </div>
      )}

      <footer className={styles.footer}>
        Copyright | {heroTitle}
        {address ? ` | ${address}` : null}
      </footer>
      <ClimaxFloorFloats whatsappDigits={wa || null} storeName={heroTitle} />
    </div>
  );
}
