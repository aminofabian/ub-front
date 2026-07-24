"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

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
    scale: 1.35,
  },
] as const;

const SHELVES = [
  {
    code: "01",
    label: "Front bay",
    whisper: "Where the rush hits first",
    shops: SHOPS.slice(0, 4),
    startIndex: 0,
    depth: "near" as const,
  },
  {
    code: "02",
    label: "Mid aisle",
    whisper: "Steady tickets all day",
    shops: SHOPS.slice(4, 8),
    startIndex: 4,
    depth: "mid" as const,
  },
  {
    code: "03",
    label: "End cap",
    whisper: "The ones customers notice",
    shops: SHOPS.slice(8),
    startIndex: 8,
    depth: "far" as const,
  },
] as const;

type Shop = (typeof SHOPS)[number];
type ShelfDepth = (typeof SHELVES)[number]["depth"];

type HangMarkProps = {
  shop: Shop;
  index: number;
  featured?: boolean;
};

function HangMark({ shop, index, featured = false }: HangMarkProps) {
  const scale = "scale" in shop ? shop.scale : 1;
  const stringLen = 0.28 + ((index * 17) % 5) * 0.06;
  const style = {
    "--mark-i": index,
    "--logo-scale": scale,
    "--string-len": `${stringLen}rem`,
  } as CSSProperties;

  return (
    <li
      className={featured ? "floor-mark floor-mark--featured" : "floor-mark"}
      style={style}
    >
      <span className="floor-mark-string" aria-hidden />
      <span className="floor-mark-peg" aria-hidden />
      <span className="floor-mark-logo">
        <Image
          src={shop.src}
          alt={shop.name}
          width={shop.width}
          height={shop.height}
          className="floor-mark-img"
          style={{ width: "auto", height: "auto" }}
          sizes="(max-width: 767px) 22vw, 180px"
        />
      </span>
      <span className="floor-mark-name">{shop.name}</span>
    </li>
  );
}

type ShelfProps = {
  code: string;
  label: string;
  whisper: string;
  shops: readonly Shop[];
  startIndex: number;
  depth: ShelfDepth;
};

function Shelf({
  code,
  label,
  whisper,
  shops,
  startIndex,
  depth,
}: ShelfProps) {
  const featured = depth === "far";

  return (
    <article className={`floor-shelf floor-shelf--${depth}`}>
      <header className="floor-shelf-head">
        <div className="floor-shelf-title">
          <span className="floor-shelf-code" aria-hidden>
            {code}
          </span>
          <span className="floor-shelf-label">{label}</span>
          <span className="floor-shelf-rule" aria-hidden />
          <span className="floor-shelf-whisper">{whisper}</span>
        </div>
        <span className="floor-shelf-count" aria-hidden>
          {String(shops.length).padStart(2, "0")}
        </span>
      </header>

      <div className="floor-shelf-rail" aria-hidden />

      <ul className="floor-shelf-row">
        {shops.map((shop, i) => (
          <HangMark
            key={shop.src}
            shop={shop}
            index={startIndex + i}
            featured={featured}
          />
        ))}
      </ul>
    </article>
  );
}

/** Three-shelf floor walk — shops hanging quietly on the aisle. */
export function LandingHeroLogos() {
  return (
    <section
      aria-label="Shops using Kiosk"
      className="section-reveal floor-proof border-t border-[var(--kiosk-border-soft)] py-12 sm:py-16 lg:py-20"
    >
      <div className="mx-auto mb-8 max-w-[1100px] px-4 sm:mb-10 sm:px-10">
        <div className="floor-proof-head">
          <div className="floor-proof-head-copy">
            <p className="landing-trust-kicker">
              <span className="floor-proof-pulse" aria-hidden />
              Floor proof
            </p>
            <p className="landing-trust-title">
              Walk the aisle. Same till. Different counters.
            </p>
          </div>
          <p className="floor-proof-ledger" aria-hidden>
            <span>{SHOPS.length} shops live</span>
            <span className="floor-proof-ledger-dot" />
            <span>3 shelves</span>
            <span className="floor-proof-ledger-dot" />
            <span>Kenya</span>
          </p>
        </div>
      </div>

      <div className="floor-walk landing-trust-aisle">
        <div className="landing-trust-aisle-edge" aria-hidden />
        <div className="floor-walk-path" aria-hidden />
        <div className="floor-walk-ruler" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="floor-walk-scan" aria-hidden />

        <div className="floor-walk-shelves">
          {SHELVES.map((shelf) => (
            <Shelf
              key={shelf.code}
              code={shelf.code}
              label={shelf.label}
              whisper={shelf.whisper}
              shops={shelf.shops}
              startIndex={shelf.startIndex}
              depth={shelf.depth}
            />
          ))}
        </div>

        <p className="floor-walk-foot" aria-hidden>
          Ringing sales on Kiosk right now
        </p>

        <div className="landing-trust-aisle-edge" aria-hidden />
      </div>
    </section>
  );
}
