"use client";

const STATS = [
  {
    value: "POS",
    label: "Barcode scanner, cash drawer, receipt printer — works offline",
  },
  {
    value: "Inventory",
    label: "Stock-takes, transfers, supply batches, valuation reports",
  },
  {
    value: "Storefront",
    label: "Branded online shop with cart, checkout, and M-Pesa",
  },
  {
    value: "Analytics",
    label: "Revenue, P&L, category performance, staff reports",
  },
] as const;

export function LandingStats() {
  return (
    <section
      className="section-reveal border-y px-4 py-14 sm:px-10 sm:py-24"
      style={{
        backgroundColor: "var(--kiosk-gold-surface)",
        borderTopColor: "var(--kiosk-gold-border)",
        borderBottomColor: "var(--kiosk-gold-border)",
      }}
    >
      <div className="mx-auto max-w-[1100px]">
        <p className="mb-8 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--kiosk-gold)] sm:mb-10">
          One platform · four pillars
        </p>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="landing-stat-tile">
              <div className="mb-3 font-heading text-[clamp(28px,4vw,44px)] leading-none tracking-[-0.03em] text-[var(--kiosk-text)]">
                {s.value}
              </div>
              <p className="text-sm leading-[1.55] text-[var(--kiosk-text-soft)]">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
