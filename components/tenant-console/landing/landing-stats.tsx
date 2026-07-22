"use client";

import { landingDarkSectionStyle } from "./landing-styles";

const PILLARS = [
  {
    index: "01",
    name: "POS",
    label: "Barcode scanner, cash drawer, receipt printer — works offline",
  },
  {
    index: "02",
    name: "Inventory",
    label: "Stock-takes, transfers, supply batches, valuation reports",
  },
  {
    index: "03",
    name: "Storefront",
    label: "Branded online shop with cart, checkout, and M-Pesa",
  },
  {
    index: "04",
    name: "Analytics",
    label: "Revenue, P&L, category performance, staff reports",
  },
] as const;

export function LandingStats() {
  return (
    <section
      className="section-reveal landing-pillars relative overflow-hidden px-4 py-16 sm:px-10 sm:py-24"
      style={landingDarkSectionStyle()}
    >
      <div aria-hidden className="landing-pillars-glow" />
      <div className="relative z-10 mx-auto max-w-[1100px]">
        <div className="mb-10 flex flex-col gap-4 sm:mb-14 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
          <div>
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--kiosk-gold)]">
              One platform · four pillars
            </p>
            <h2 className="font-heading text-[clamp(26px,5vw,44px)] leading-[1.12] tracking-[-0.02em] text-[var(--kiosk-text)]">
              The whole shop,
              <br className="hidden sm:block" /> one till.
            </h2>
          </div>
          <p className="max-w-[22rem] text-sm leading-[1.65] text-[var(--kiosk-text-muted)]">
            Every pillar reads from the same stock count and writes to the
            same ledger — nothing to sync, nothing to reconcile.
          </p>
        </div>

        <div className="grid overflow-hidden rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-border)] gap-px sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <div key={p.name} className="landing-pillar-tile group">
              <span className="font-mono text-[11px] tabular-nums text-[var(--kiosk-text-soft)] transition-colors duration-300 group-hover:text-[var(--kiosk-gold)]">
                {p.index}
              </span>
              <div className="mt-8 font-heading text-[clamp(26px,3.5vw,38px)] leading-none tracking-[-0.03em] text-[var(--kiosk-text)] sm:mt-12">
                {p.name}
              </div>
              <span className="landing-pillar-rule" aria-hidden />
              <p className="mt-4 text-[13px] leading-[1.6] text-[var(--kiosk-text-muted)]">
                {p.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
