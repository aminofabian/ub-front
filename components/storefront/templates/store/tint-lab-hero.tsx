"use client";

import Image from "next/image";
import { useMemo, useState, type CSSProperties } from "react";

import {
  StorefrontNativeHeroEditFrame,
  StorefrontNativeHeroHeadline,
  StorefrontNativeHeroLead,
} from "@/components/storefront/storefront-native-hero-copy";
import styles from "@/components/storefront/templates/store/tint-lab.module.css";
import { cn } from "@/lib/utils";

const DEFAULT_SWATCHES = [
  { color: "#E2432C", soft: "#F2C9BF", label: "Poppy" },
  { color: "#D89A3D", soft: "#F0DCB8", label: "Ochre" },
  { color: "#6E3A55", soft: "#D9C2CF", label: "Fig" },
  { color: "#4F7A70", soft: "#C4D9D3", label: "Verdigris" },
  { color: "#C97C8C", soft: "#EEDAE0", label: "Rose" },
] as const;

const DEFAULT_HEADLINE = "Color that knows your undertone.";
const DEFAULT_LEAD =
  "Formulas built from pigment ratios, not guesswork. Every shade is documented — so what looks right on the swatch looks right on you.";

export function TintLabHero({
  heroTitle,
  announcement,
  areaLabel,
  showcaseImage,
  featuredName,
  featuredSku,
  accentHex,
  headline,
}: {
  heroTitle: string;
  announcement: string | null;
  areaLabel?: string | null;
  showcaseImage: string | null;
  featuredName?: string | null;
  featuredSku?: string | null;
  accentHex?: string | null;
  headline?: string | null;
}) {
  const swatches = useMemo(() => {
    const brand = accentHex?.trim();
    if (brand && /^#[0-9a-fA-F]{6}$/.test(brand)) {
      return [
        { color: brand, soft: "#F2C9BF", label: "Brand" },
        ...DEFAULT_SWATCHES.filter(
          (s) => s.color.toLowerCase() !== brand.toLowerCase(),
        ),
      ].slice(0, 5);
    }
    return [...DEFAULT_SWATCHES];
  }, [accentHex]);

  const [active, setActive] = useState(0);
  const current = swatches[active] ?? swatches[0]!;
  const displayHeadline = headline?.trim() || DEFAULT_HEADLINE;
  const lead = announcement?.trim() || DEFAULT_LEAD;

  return (
    <StorefrontNativeHeroEditFrame>
      <section
        className={styles.hero}
        style={
          {
            ["--tint-accent" as string]: current.color,
            ["--tint-accent-soft" as string]: current.soft,
          } as CSSProperties
        }
      >
        <div>
          <div className={styles.eyebrow}>
            <span className={styles.dot} />
            {areaLabel?.trim()
              ? `New — ${areaLabel}`
              : "New — the undertone edit"}
          </div>
          <StorefrontNativeHeroHeadline value={displayHeadline} />
          <StorefrontNativeHeroLead value={lead} className={styles.lead} />
          <div className={styles.ctaRow}>
            <a className={styles.btn} href="#edit">
              Shop the edit →
            </a>
            <a className={styles.btnGhost} href="#disclosure">
              See what&apos;s inside
            </a>
          </div>
          <div className={styles.shadeStrip}>
            <span className={styles.shadeLabel}>Try a shade</span>
            <div className={styles.swatchRow} role="listbox" aria-label="Shade swatches">
              {swatches.map((swatch, index) => (
                <button
                  key={swatch.color}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  aria-label={swatch.label}
                  className={cn(
                    styles.swatch,
                    index === active && styles.swatchActive,
                  )}
                  style={{ background: swatch.color }}
                  onClick={() => setActive(index)}
                />
              ))}
            </div>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.blob} aria-hidden />
          <div className={styles.heroMedia}>
            {showcaseImage ? (
              <Image
                src={showcaseImage}
                alt={featuredName || heroTitle}
                width={420}
                height={560}
                unoptimized
                priority
              />
            ) : (
              <div
                className={styles.cardPlaceholder}
                style={{ width: "100%", height: "100%" }}
                aria-hidden
              />
            )}
          </div>
          <div className={styles.heroBadge}>
            {featuredSku?.trim() || `Shade ${String(active + 1).padStart(2, "0")}`}
            {featuredName ? ` / ${featuredName}` : ` / ${current.label}`}
          </div>
        </div>
      </section>
    </StorefrontNativeHeroEditFrame>
  );
}
