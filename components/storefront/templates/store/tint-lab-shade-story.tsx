"use client";

import { useState } from "react";

import styles from "@/components/storefront/templates/store/tint-lab.module.css";
import { cn } from "@/lib/utils";

const SHADES = [
  {
    color: "#E2432C",
    name: "Poppy",
    code: "Shade 03 — warm red, 4% pigment load",
    desc: "A true warm red built for olive and deep undertones. Sits close to blood-orange in daylight, deepens toward brick indoors.",
    tags: ["Undertone: Warm", "Finish: Satin", "Best for: Olive, Deep"],
  },
  {
    color: "#D89A3D",
    name: "Ochre",
    code: "Shade 02 — golden amber, 3% pigment load",
    desc: "A warm gold-brown built to read as sun, not sunburn. Reflects light rather than sitting flat on the skin.",
    tags: ["Undertone: Warm", "Finish: Matte", "Best for: Fair, Medium"],
  },
  {
    color: "#6E3A55",
    name: "Fig",
    code: "Shade 05 — plum wine, 5% pigment load",
    desc: "A deep plum with a cool berry cast. Reads sheer at one layer, near-black at three.",
    tags: ["Undertone: Cool", "Finish: Satin", "Best for: Any tone"],
  },
  {
    color: "#4F7A70",
    name: "Verdigris",
    code: "Shade 04 — sage calm, 2% active load",
    desc: "Not a color you wear — a formula that calms redness before your color goes on top.",
    tags: ["Type: Skincare", "Finish: Serum", "Best for: Reactive skin"],
  },
  {
    color: "#C97C8C",
    name: "Rose",
    code: "Shade 06 — dusty rose, 3% pigment load",
    desc: "A muted pink-mauve that reads as your lips, slightly better. Cool without going lilac.",
    tags: ["Undertone: Neutral", "Finish: Gloss", "Best for: Any tone"],
  },
] as const;

export function TintLabShadeStory() {
  const [active, setActive] = useState(0);
  const shade = SHADES[active]!;

  return (
    <section className={styles.section} id="shade-story">
      <div className={styles.shadeStory}>
        <div className={styles.sectionHead}>
          <h2>Shade Story</h2>
          <div className={styles.sectionSub}>
            Tap a swatch — see the formula behind the color.
          </div>
        </div>
        <div className={styles.storyGrid}>
          <div className={styles.bigBlobWrap}>
            <div
              className={styles.bigBlob}
              style={{ background: shade.color }}
              aria-hidden
            />
          </div>
          <div>
            <div className={styles.shadeName} style={{ color: shade.color }}>
              {shade.name}
            </div>
            <div className={styles.shadeCode}>{shade.code}</div>
            <p className={styles.storyDesc}>{shade.desc}</p>
            <div className={styles.storyTags}>
              {shade.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            <div
              className={cn(styles.swatchRow, styles.storySwatches)}
              role="listbox"
              aria-label="Shade stories"
            >
              {SHADES.map((entry, index) => (
                <button
                  key={entry.name}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  aria-label={entry.name}
                  className={cn(
                    styles.swatch,
                    index === active && styles.swatchActive,
                  )}
                  style={{ background: entry.color }}
                  onClick={() => setActive(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
