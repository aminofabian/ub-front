"use client";

const HIGHLIGHTS = [
  "Barcode scanner",
  "M-Pesa payments",
  "Offline-ready POS",
  "Multi-branch",
  "Stock transfers",
  "Supplier management",
  "Purchase orders",
  "Sales analytics",
] as const;

export function LandingTrustBar() {
  return (
    <section className="border-t border-[var(--kiosk-border-soft)] px-5 py-16 sm:px-10">
      <p className="mb-9 text-center text-xs uppercase tracking-[0.10em] text-[var(--kiosk-text-faint)]">
        Everything included — no add-ons, no modules
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
        {HIGHLIGHTS.map((name) => (
          <span
            key={name}
            className="text-sm font-medium tracking-[0.02em] text-[var(--kiosk-brand-muted)]"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
