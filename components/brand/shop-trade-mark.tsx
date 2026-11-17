"use client";

import { useId, type ReactNode } from "react";

import type { ShopMarkColors, ShopMarkKind } from "@/lib/shop-mark";

const LOGO_FONT =
  "var(--font-cormorant), 'Cormorant Garamond', Georgia, 'Times New Roman', serif";

const AWNING_STRIPES = [16, 27, 38, 49] as const;
const COMB_TEETH = [12, 20, 28, 36, 44, 52] as const;
const POLE_BANDS = [2, 12, 22, 32] as const;

type EmblemProps = {
  initials: string;
  colors: ShopMarkColors;
};

function Letters({
  initials,
  x,
  y,
  size,
  fill,
}: {
  initials: string;
  x: number;
  y: number;
  size: number;
  fill: string;
}) {
  const glyph = initials.slice(0, 2);
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill={fill}
      fontSize={glyph.length > 1 ? size : Math.round(size * 1.2)}
      fontWeight={700}
      fontFamily={LOGO_FONT}
      letterSpacing={glyph.length > 1 ? "-0.03em" : "0"}
    >
      {glyph}
    </text>
  );
}

function Lettermark({ initials, colors }: EmblemProps) {
  return (
    <>
      <circle cx="32" cy="32" r="30" fill={colors.plate} />
      <circle
        cx="32"
        cy="32"
        r="23"
        fill="none"
        stroke={colors.soft}
        strokeWidth="1.25"
      />
      <rect x="30.5" y="4" width="3" height="5" fill={colors.ink} />
      <rect x="30.5" y="55" width="3" height="5" fill={colors.ink} />
      <rect x="4" y="30.5" width="5" height="3" fill={colors.ink} />
      <rect x="55" y="30.5" width="5" height="3" fill={colors.ink} />
      <Letters initials={initials} x={32} y={33} size={18} fill={colors.ink} />
    </>
  );
}

function ButcherMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <path d="M4 16 H38 V52 H4 Z" fill={colors.plate} />
      <path d="M38 18 H58 C60 18 60 30 58 30 H38 Z" fill={colors.plate} />
      <Letters initials={initials} x={21} y={35} size={15} fill={colors.ink} />
    </>
  );
}

function MiniMartMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <path d="M6 14 H58 L54 28 H10 Z" fill={colors.plate} />
      {AWNING_STRIPES.map((x) => (
        <line
          key={x}
          x1={x}
          y1="15"
          x2={x}
          y2="26"
          stroke={colors.ink}
          strokeWidth="2"
        />
      ))}
      <path d="M10 28 H54 V58 H10 Z" fill={colors.deep} />
      <rect x="16" y="32" width="32" height="12" fill={colors.label} />
      <rect x="26" y="48" width="12" height="10" fill={colors.plate} />
      <Letters initials={initials} x={32} y={38} size={11} fill={colors.labelInk} />
    </>
  );
}

function GroceryMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <path
        d="M20 24 C20 10 44 10 44 24"
        fill="none"
        stroke={colors.plate}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M10 24 H54 L48 56 H16 Z" fill={colors.plate} />
      <path d="M16 32 H48" stroke={colors.soft} strokeWidth="1.5" />
      <Letters initials={initials} x={32} y={44} size={14} fill={colors.ink} />
    </>
  );
}

function FreshMarketMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <path
        d="M30 6 C46 16 56 28 48 44 C42 52 36 54 30 54 C20 52 8 44 14 30 C18 18 22 12 30 6 Z"
        fill={colors.plate}
      />
      <path d="M28 52 H34 V62 H28 Z" fill={colors.plate} />
      <path
        d="M30 16 V48 M30 30 L42 24"
        fill="none"
        stroke={colors.soft}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Letters initials={initials} x={28} y={36} size={12} fill={colors.ink} />
    </>
  );
}

function MixedShopMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <path d="M32 4 L56 18 V46 L32 60 L8 46 V18 Z" fill={colors.plate} />
      <path
        d="M32 10 L50 20 V44 L32 54 L14 44 V20 Z"
        fill="none"
        stroke={colors.soft}
        strokeWidth="1.25"
      />
      <Letters initials={initials} x={32} y={33} size={16} fill={colors.ink} />
    </>
  );
}

function CosmeticsMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <path d="M20 26 L32 6 L44 26 Z" fill={colors.plate} />
      <rect x="18" y="26" width="28" height="6" fill={colors.label} />
      <path d="M18 32 H46 V56 H18 Z" fill={colors.plate} />
      <Letters initials={initials} x={32} y={46} size={13} fill={colors.ink} />
    </>
  );
}

function WinesMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <rect x="28" y="4" width="8" height="6" fill={colors.label} />
      <path d="M26 10 H38 V20 H26 Z" fill={colors.plate} />
      <path
        d="M26 20 C26 20 14 26 14 36 V56 H50 V36 C50 26 38 20 38 20 Z"
        fill={colors.plate}
      />
      <rect x="20" y="36" width="24" height="12" fill={colors.label} />
      <Letters initials={initials} x={32} y={42} size={11} fill={colors.labelInk} />
    </>
  );
}

function PharmacyMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <circle cx="32" cy="32" r="30" fill={colors.plate} />
      <path
        d="M18 36 H46 C46 36 46 38 44 40 V42 C44 51 39 55 32 55 C25 55 20 51 20 42 V40 C18 38 18 36 18 36 Z"
        fill={colors.label}
      />
      <path
        d="M46 14 L28 34"
        fill="none"
        stroke={colors.label}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="48" cy="13" r="3.5" fill={colors.label} />
      <Letters initials={initials} x={32} y={46} size={11} fill={colors.labelInk} />
    </>
  );
}

function BarberMark({ initials, colors }: EmblemProps) {
  const clipId = useId().replace(/:/g, "");
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect x="14" y="12" width="16" height="40" rx="8" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="30" fill={colors.plate} />
      <g clipPath={`url(#${clipId})`}>
        <rect x="14" y="12" width="16" height="40" fill={colors.label} />
        {POLE_BANDS.map((shift) => (
          <rect
            key={shift}
            x={shift}
            y="4"
            width="5"
            height="56"
            fill={colors.deep}
            transform="rotate(-32 22 32)"
          />
        ))}
      </g>
      <Letters initials={initials} x={46} y={33} size={13} fill={colors.ink} />
    </>
  );
}

function SalonMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <path
        d="M10 12 H54 C56 12 56 14 56 14 V26 C56 28 54 28 54 28 H10 C8 28 8 26 8 26 V14 C8 12 10 12 10 12 Z"
        fill={colors.plate}
      />
      {COMB_TEETH.map((x) => (
        <rect key={x} x={x} y="28" width="3.2" height="22" fill={colors.plate} />
      ))}
      <Letters initials={initials} x={32} y={20} size={12} fill={colors.ink} />
    </>
  );
}

function SpaMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <path
        d="M32 4 C32 4 54 24 54 40 C54 52 44 60 32 60 C20 60 10 52 10 40 C10 24 32 4 32 4 Z"
        fill={colors.plate}
      />
      <path
        d="M22 34 C22 26 28 24 32 28"
        fill="none"
        stroke={colors.soft}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Letters initials={initials} x={32} y={42} size={15} fill={colors.ink} />
    </>
  );
}

function NailMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <rect x="26" y="6" width="12" height="8" fill={colors.plate} />
      <path d="M28 14 H36 V20 H28 Z" fill={colors.plate} />
      <path d="M18 20 H46 V50 C46 58 18 58 18 50 Z" fill={colors.plate} />
      <Letters initials={initials} x={32} y={40} size={14} fill={colors.ink} />
    </>
  );
}

function BeautyMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <circle cx="32" cy="22" r="18" fill={colors.plate} />
      <circle
        cx="32"
        cy="22"
        r="13"
        fill="none"
        stroke={colors.ink}
        strokeWidth="1.5"
      />
      <path d="M28 38 H36 V56 C36 60 28 60 28 56 Z" fill={colors.plate} />
      <Letters initials={initials} x={32} y={23} size={12} fill={colors.ink} />
    </>
  );
}

function RestaurantMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <path
        d="M10 40 C10 16 20 8 32 8 C44 8 54 16 54 40 Z"
        fill={colors.plate}
      />
      <circle cx="32" cy="10" r="3.2" fill={colors.ink} />
      <path d="M6 40 H58 V46 C58 48 6 48 6 46 Z" fill={colors.plate} />
      <Letters initials={initials} x={32} y={30} size={15} fill={colors.ink} />
    </>
  );
}

function CafeMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <path
        d="M24 8 C22 12 27 13 24 17"
        fill="none"
        stroke={colors.plate}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M36 6 C34 11 40 12 37 17"
        fill="none"
        stroke={colors.plate}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M14 18 H50 V24 H14 Z" fill={colors.plate} />
      <path d="M18 24 H46 L42 48 H22 Z" fill={colors.plate} />
      <path
        d="M46 28 C58 28 58 44 46 46"
        fill="none"
        stroke={colors.plate}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M12 50 H52 V54 C52 57 12 57 12 54 Z" fill={colors.plate} />
      <Letters initials={initials} x={32} y={37} size={13} fill={colors.ink} />
    </>
  );
}

function TakeawayMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <path d="M14 22 L32 10 L50 22 L46 28 L32 18 L18 28 Z" fill={colors.plate} />
      <path d="M16 28 H48 L44 56 H20 Z" fill={colors.plate} />
      <path d="M18 28 H46" stroke={colors.ink} strokeWidth="1.5" />
      <Letters initials={initials} x={32} y={44} size={14} fill={colors.ink} />
    </>
  );
}

function BarMark({ initials, colors }: EmblemProps) {
  return (
    <>
      <path d="M16 8 H48 L38 34 H26 Z" fill={colors.plate} />
      <path d="M29 34 H35 V48 H29 Z" fill={colors.plate} />
      <path d="M18 48 H46 V53 C46 56 18 56 18 53 Z" fill={colors.plate} />
      <Letters initials={initials} x={32} y={20} size={12} fill={colors.ink} />
    </>
  );
}

const EMBLEMS: Record<ShopMarkKind, (props: EmblemProps) => ReactNode> = {
  lettermark: Lettermark,
  butchery: ButcherMark,
  "mini-mart": MiniMartMark,
  "full-grocery": GroceryMark,
  "fresh-market": FreshMarketMark,
  "mixed-shop": MixedShopMark,
  cosmetics: CosmeticsMark,
  "wines-spirits": WinesMark,
  pharmacy: PharmacyMark,
  barbershop: BarberMark,
  salon: SalonMark,
  spa: SpaMark,
  "nail-studio": NailMark,
  "beauty-parlour": BeautyMark,
  restaurant: RestaurantMark,
  cafe: CafeMark,
  "fast-food": TakeawayMark,
  bar: BarMark,
  // A guest house has no bespoke emblem yet; its monogram stands in (Slice 3 may draw one).
  lodging: Lettermark,
};

export function ShopTradeMark({
  kind,
  initials,
  colors,
}: {
  kind: ShopMarkKind;
  initials: string;
  colors: ShopMarkColors;
}) {
  const Emblem = EMBLEMS[kind];
  return (
    <svg
      viewBox="0 0 64 64"
      className="block h-full w-full overflow-visible"
      aria-hidden
      data-shop-mark={kind}
    >
      <Emblem initials={initials} colors={colors} />
    </svg>
  );
}
