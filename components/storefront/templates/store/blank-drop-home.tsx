"use client";

import { type CSSProperties } from "react";

import { useStorefrontLiveDesign } from "@/components/storefront/storefront-staff-edit";
import { BlankDropCatalog } from "@/components/storefront/templates/store/blank-drop-catalog";
import { blankDropFontVariables } from "@/components/storefront/templates/store/blank-drop-fonts";
import styles from "@/components/storefront/templates/store/blank-drop.module.css";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import { storefrontSectionConfig } from "@/lib/storefront-design";
import { themeOptionVars } from "@/lib/storefront-theme-options";
import { cn } from "@/lib/utils";

/**
 * THESIS: A stark utilitarian catalogue grid — white void, mono codes, no
 * lifestyle hero — not a gift boutique or mart aisle.
 * OWN-WORLD: Pure white, black ink, Geist Mono uppercase, six-up SKU grid,
 * contain photos, + / filters / bag chrome.
 * STORY: Scan codes → open a piece → bag → checkout.
 * FIRST VIEWPORT: Sticky + · type filters · bag; dense product code grid.
 * FORM: Blank drop · brief-pinned yeezy.com craft bar · seed n/a (canon).
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
export function BlankDropStoreHome(props: StoreHomeTemplateProps) {
  const {
    slug,
    themeId,
    currency,
    catalogItems,
    nextCursor,
    totalCount,
    featured,
    primaryHex,
    design: designProp,
  } = props;
  const design = useStorefrontLiveDesign(designProp ?? null);
  const optionVars = themeOptionVars(themeId, design?.theme ?? null);
  const ink = primaryHex?.trim() || "#000000";
  const productsConfig = storefrontSectionConfig(design, "products");
  const productsOn = productsConfig ? productsConfig.enabled : true;

  const seen = new Set<string>();
  const items: typeof catalogItems = [];
  for (const item of [...featured, ...catalogItems]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }
  const rest = catalogItems.filter((i) => !seen.has(i.id));
  const allItems = [...items, ...rest];

  return (
    <div
      id="top"
      className={cn(styles.root, styles.body, blankDropFontVariables)}
      data-store-theme-id="blank-drop"
      style={
        {
          ["--bd-ink" as string]: ink,
          ...optionVars,
        } as CSSProperties
      }
    >
      {/*
        THESIS: Stark white SKU catalogue — mono, sparse, utilitarian.
        OWN-WORLD: #fff / #000 / Geist Mono / contain tiles / no hero.
        STORY: Scan → open → bag → pay.
        FIRST VIEWPORT: + filters bag + six-up code grid.
        FORM: Blank drop · yeezy.com craft bar · seed n/a (canon).
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
      */}
      <div className={styles.home}>
        {productsOn ? (
          <BlankDropCatalog
            slug={slug}
            currency={currency}
            initialItems={allItems}
            initialNextCursor={nextCursor}
            totalCount={totalCount}
          />
        ) : (
          <div className={styles.empty}>Catalogue offline</div>
        )}
      </div>
    </div>
  );
}
