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
      className="border-y px-5 py-24 sm:px-10"
      style={{
        backgroundColor: "var(--kiosk-gold-surface)",
        borderTopColor: "var(--kiosk-gold-border)",
        borderBottomColor: "var(--kiosk-gold-border)",
      }}
    >
      <div className="mx-auto grid max-w-[1100px] gap-12 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label}>
            <div
              className="mb-3 font-serif text-[clamp(36px,5vw,52px)] leading-none text-[var(--kiosk-text)]"
            >
              {s.value}
            </div>
            <p className="text-sm leading-[1.5] text-[var(--kiosk-text-soft)]">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
