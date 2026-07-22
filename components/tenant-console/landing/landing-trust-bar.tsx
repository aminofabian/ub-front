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
};

function MarqueeRow({ items, durationSeconds, reverse }: MarqueeRowProps) {
  const doubled = [...items, ...items];
  const style = {
    "--aisle-marquee-duration": `${durationSeconds}s`,
    animationDirection: reverse ? "reverse" : undefined,
  } as CSSProperties;

  return (
    <div className="landing-marquee-mask overflow-hidden">
      <div className="animate-aisle-marquee flex w-max" style={style}>
        {doubled.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="landing-trust-pill mx-[5px] shrink-0"
            aria-hidden={i >= items.length}
          >
            <span className="landing-trust-pill-dot" aria-hidden />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LandingTrustBar() {
  return (
    <section className="section-reveal border-t border-[var(--kiosk-border-soft)] py-12 sm:py-14">
      <div className="mx-auto mb-8 max-w-[1100px] px-4 text-center sm:mb-10 sm:px-10">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--kiosk-text-faint)]">
          Included on every plan
        </p>
        <p className="text-sm font-medium text-[var(--kiosk-text-soft)]">
          Everything you need at the counter — no add-ons, no modules
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <MarqueeRow items={ROW_ONE} durationSeconds={MARQUEE_SECONDS.slow} />
        <MarqueeRow
          items={ROW_TWO}
          durationSeconds={MARQUEE_SECONDS.fast}
          reverse
        />
      </div>
    </section>
  );
}
