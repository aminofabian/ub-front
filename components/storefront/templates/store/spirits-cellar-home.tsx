import { Suspense, type CSSProperties } from "react";

import {
  SpiritsCellarHero,
  SpiritsCellarSlot,
} from "@/components/storefront/templates/store/spirits-cellar-card";
import { SpiritsCellarCatalog } from "@/components/storefront/templates/store/spirits-cellar-catalog";
import { spiritsCellarFontVariables } from "@/components/storefront/templates/store/spirits-cellar-fonts";
import { SpiritsCellarMobileSearch } from "@/components/storefront/templates/store/spirits-cellar-header";
import { SpiritsCellarKeys } from "@/components/storefront/templates/store/spirits-cellar-keys";
import styles from "@/components/storefront/templates/store/spirits-cellar.module.css";
import type { StoreHomeTemplateProps } from "@/components/storefront/templates/types";
import { cn } from "@/lib/utils";

/**
 * THESIS: Products are sealed essences in a candlelit stone vault — wax
 * seals, arched niches, brass keys — not a generic dark bottle grid.
 * OWN-WORLD: Subterranean stone, sconce glow, wax crimson seals, copper
 * tags, Fraunces / Manrope, spirit-mist accent.
 * STORY: Descend the steps, see tonight's grand niche, break a seal or
 * browse deeper shelves below.
 * FIRST VIEWPORT: Vault header; grand arched niche left; three slot niches
 * right; brass key-ring category filters.
 * FORM: Essence Vault · Vault comp.
 */
export function SpiritsCellarStoreHome(props: StoreHomeTemplateProps) {
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
    landingContent,
  } = props;

  const wax = primaryHex?.trim() || "#8B2635";
  const spirit = accentHex?.trim() || "#C4B5FD";
  const headline =
    announcement?.trim() || "Tonight's sealed essence.";
  const lead = featured[0] ?? catalogItems[0] ?? null;
  const seen = new Set(lead ? [lead.id] : []);
  const stack: typeof catalogItems = [];
  for (const item of [...featured, ...catalogItems]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    stack.push(item);
    if (stack.length >= 3) break;
  }
  const rest = catalogItems.filter((item) => !seen.has(item.id));
  const locality =
    [areaLabel?.trim(), branchHint?.trim()].filter(Boolean).join(" · ") || null;
  const hours = landingContent?.hours?.trim() || null;
  const address = landingContent?.address?.trim() || null;

  return (
    <div
      className={cn(styles.root, styles.body, spiritsCellarFontVariables)}
      data-store-theme-id="spirits-cellar"
      style={
        {
          ["--sc-wax" as string]: wax,
          ["--sc-spirit" as string]: spirit,
        } as CSSProperties
      }
    >
      <div className={styles.wrap}>
        <Suspense fallback={null}>
          <SpiritsCellarMobileSearch />
        </Suspense>
        <Suspense fallback={null}>
          <SpiritsCellarKeys types={types} />
        </Suspense>

        {lead ? (
          <section className={styles.descent} aria-label="Grand niche">
            <SpiritsCellarHero item={lead} currency={currency} headline={headline} />
            {stack.length > 0 ? (
              <div className={styles.slots}>
                {stack.map((item) => (
                  <SpiritsCellarSlot key={item.id} item={item} currency={currency} />
                ))}
              </div>
            ) : null}
          </section>
        ) : (
          <section className={styles.descent} aria-label="Grand niche">
            <article className={styles.vault}>
              <div className={styles.vaultInner}>
                <div className={styles.vaultHead}>
                  <span className={styles.vaultBadge}>Grand niche · row A</span>
                  <h1 className={styles.vaultHeadline}>{headline}</h1>
                </div>
                <span className={styles.visualPlaceholder} aria-hidden />
                <div className={styles.vaultLedger}>
                  <p className={styles.ledgerValPlain}>{heroTitle}</p>
                  <p className={styles.itemMeta}>
                    The vault is quiet — new essences arriving soon.
                  </p>
                </div>
              </div>
            </article>
          </section>
        )}

        <SpiritsCellarCatalog
          slug={slug}
          currency={currency}
          initialItems={rest}
          initialNextCursor={nextCursor}
          totalCount={totalCount}
        />

        <footer className={styles.footer}>
          <div className={styles.footerName}>{heroTitle}</div>
          {hours || address || locality ? (
            <p>{[hours, address, locality].filter(Boolean).join(" · ")}</p>
          ) : null}
          <p>Sealed at source. Same-day vault release.</p>
        </footer>
      </div>
    </div>
  );
}
