"use client";

import type { CSSProperties } from "react";

const ROW_ONE = [
  "Barcode scanner",
  "M-Pesa payments",
  "Offline-ready POS",
  "Multi-branch",
  "Stock transfers",
  "Supplier management",
  "Purchase orders",
  "Sales analytics",
] as const;

const ROW_TWO = [
  "Receipt printing",
  "Cash drawer",
  "Split payments",
  "Staff roles & shifts",
  "Stock-takes",
  "Low-stock alerts",
  "Online storefront",
  "CSV import",
] as const;

const MARQUEE_SECONDS = { slow: 38, fast: 30 } as const;

type MarqueeRowProps = {
  items: readonly string[];
  durationSeconds: number;
  reverse?: boolean;
  startIndex: number;
};

function MarqueeRow({
  items,
  durationSeconds,
  reverse,
  startIndex,
}: MarqueeRowProps) {
  const doubled = [...items, ...items];
  const style = {
    "--aisle-marquee-duration": `${durationSeconds}s`,
    animationDirection: reverse ? "reverse" : undefined,
  } as CSSProperties;

  return (
    <div className="landing-marquee-mask overflow-hidden">
      <div className="animate-aisle-marquee flex w-max items-center" style={style}>
        {doubled.map((name, i) => {
          const sku = String(startIndex + (i % items.length) + 1).padStart(
            2,
            "0",
          );
          return (
            <span
              key={`${name}-${i}`}
              className="landing-trust-sku mx-1.5 shrink-0 sm:mx-2"
              aria-hidden={i >= items.length}
            >
              <span className="landing-trust-sku-code" aria-hidden>
                {sku}
              </span>
              <span className="landing-trust-sku-label">{name}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function LandingTrustBar() {
  return (
    <section className="section-reveal border-t border-[var(--kiosk-border-soft)] py-12 sm:py-16">
      <div className="mx-auto mb-8 max-w-[1100px] px-4 sm:mb-10 sm:px-10">
        <div className="landing-trust-head">
          <p className="landing-trust-kicker">Included on every plan</p>
          <p className="landing-trust-title">
            Everything you need at the counter — no add-ons, no modules
          </p>
        </div>
      </div>

      <div className="landing-trust-aisle">
        <div className="landing-trust-aisle-edge" aria-hidden />
        <div className="flex flex-col gap-2.5 py-3 sm:gap-3 sm:py-4">
          <MarqueeRow
            items={ROW_ONE}
            durationSeconds={MARQUEE_SECONDS.slow}
            startIndex={0}
          />
          <div className="landing-trust-aisle-rule" aria-hidden />
          <MarqueeRow
            items={ROW_TWO}
            durationSeconds={MARQUEE_SECONDS.fast}
            reverse
            startIndex={ROW_ONE.length}
          />
        </div>
        <div className="landing-trust-aisle-edge" aria-hidden />
      </div>
    </section>
  );
}
