"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

const SHOPS = [
  {
    src: "/logos/cleanshelf.png",
    name: "Cleanshelf",
    width: 265,
    height: 78,
    scale: 1.15,
  },
  { src: "/logos/maisha.png", name: "Maisha", width: 220, height: 80 },
  { src: "/logos/all-mart.png", name: "All-Mart", width: 220, height: 80 },
  { src: "/logos/sanjor.jpeg", name: "Sanjor", width: 220, height: 80 },
  { src: "/logos/frankmatt.jpeg", name: "Frankmatt", width: 200, height: 80 },
  { src: "/logos/magunas.jpeg", name: "Magunas", width: 200, height: 80 },
  { src: "/logos/eastmatt.jpeg", name: "Eastmatt", width: 220, height: 80 },
  { src: "/logos/shrijees.jpeg", name: "Shrijee's", width: 220, height: 80 },
  { src: "/logos/viva.jpeg", name: "Viva", width: 200, height: 80 },
  {
    src: "/logos/capital-shoppers.png",
    name: "Capital Shoppers",
    width: 160,
    height: 100,
  },
  {
    src: "/logos/plamart.png",
    name: "Palmart",
    width: 180,
    height: 160,
    scale: 1.45,
  },
] as const;

const ROW_ONE = SHOPS.slice(0, 6);
const ROW_TWO = SHOPS.slice(6);

type Shop = (typeof SHOPS)[number];

type ShopMarkProps = {
  shop: Shop;
  index: number;
};

function ShopMark({ shop, index }: ShopMarkProps) {
  const sku = `S-${String(index + 1).padStart(2, "0")}`;
  const scale = "scale" in shop ? shop.scale : 1;
  const style = {
    "--mark-i": index,
    "--logo-scale": scale,
  } as CSSProperties;

  return (
    <li className="hero-floor-mark" style={style}>
      <span className="hero-floor-mark-sku" aria-hidden>
        {sku}
      </span>
      <span className="hero-floor-mark-frame">
        <Image
          src={shop.src}
          alt={shop.name}
          width={shop.width}
          height={shop.height}
          className="hero-floor-mark-img"
          sizes="200px"
        />
      </span>
      <span className="hero-floor-mark-name">{shop.name}</span>
    </li>
  );
}

type ShopRowProps = {
  shops: readonly Shop[];
  startIndex: number;
  offset?: boolean;
};

function ShopRow({ shops, startIndex, offset }: ShopRowProps) {
  return (
    <ul className={cn("hero-floor-row", offset && "hero-floor-row--offset")}>
      {shops.map((shop, i) => (
        <ShopMark key={shop.src} shop={shop} index={startIndex + i} />
      ))}
    </ul>
  );
}

/** Floor-proof logo shelf — lives below the hero, two staggered rows. */
export function LandingHeroLogos() {
  return (
    <section
      aria-label="Shops using Kiosk"
      className="section-reveal border-t border-[var(--kiosk-border-soft)] py-14 sm:py-16 lg:py-20"
    >
      <div className="mx-auto mb-8 max-w-[1100px] px-4 sm:mb-10 sm:px-10">
        <div className="landing-trust-head">
          <p className="landing-trust-kicker">Floor proof</p>
          <p className="landing-trust-title">
            Shops already ringing sales on Kiosk
          </p>
        </div>
      </div>

      <div className="landing-trust-aisle">
        <div className="landing-trust-aisle-edge" aria-hidden />
        <div className="hero-floor-shelf flex flex-col gap-3 py-4 sm:gap-3.5 sm:py-5">
          <ShopRow shops={ROW_ONE} startIndex={0} />
          <div className="landing-trust-aisle-rule" aria-hidden />
          <ShopRow shops={ROW_TWO} startIndex={ROW_ONE.length} offset />
        </div>
        <div className="landing-trust-aisle-edge" aria-hidden />
      </div>
    </section>
  );
}
