"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

const LOGO_WIDTH = 480;
const LOGO_HEIGHT = 180;
const MARQUEE_SECONDS = 42;

const SHOPS = [
  { src: "/logos/cleanshelf.png", name: "Cleanshelf" },
  { src: "/logos/frankmatt.png", name: "Frankmatt" },
  { src: "/logos/all-mart.png", name: "All-Mart" },
  { src: "/logos/magunas.png", name: "Magunas" },
  { src: "/logos/sanjor.png", name: "Sanjor" },
  { src: "/logos/viva.png", name: "Viva" },
  { src: "/logos/eastmatt.png", name: "Eastmatt" },
  { src: "/logos/capital-shoppers.png", name: "Capital Shoppers" },
  { src: "/logos/shrijees.png", name: "Shrijee's" },
  { src: "/logos/plamart.png", name: "Palmart" },
  { src: "/logos/maisha.png", name: "Maisha" },
] as const;

type Shop = (typeof SHOPS)[number];

function ShopLogo({ shop, hidden }: { shop: Shop; hidden?: boolean }) {
  return (
    <li className="proof-logo" aria-hidden={hidden || undefined}>
      <Image
        src={shop.src}
        alt={hidden ? "" : shop.name}
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className="proof-logo-img"
        title={shop.name}
        sizes="140px"
      />
    </li>
  );
}

/** Quiet social proof — one-line logo marquee. */
export function LandingHeroLogos() {
  const loop = [...SHOPS, ...SHOPS];
  const style = {
    "--aisle-marquee-duration": `${MARQUEE_SECONDS}s`,
  } as CSSProperties;

  return (
    <section aria-label="Shops using Kiosk" className="section-reveal proof-strip">
      <p className="proof-strip-label">
        Trusted by {SHOPS.length} shops across Kenya
      </p>
      <div className="proof-strip-slider landing-marquee-mask">
        <ul className="proof-strip-track animate-aisle-marquee" style={style}>
          {loop.map((shop, i) => (
            <ShopLogo
              key={`${shop.src}-${i}`}
              shop={shop}
              hidden={i >= SHOPS.length}
            />
          ))}
        </ul>
      </div>
      <ul className="sr-only">
        {SHOPS.map((shop) => (
          <li key={shop.src}>{shop.name}</li>
        ))}
      </ul>
    </section>
  );
}
