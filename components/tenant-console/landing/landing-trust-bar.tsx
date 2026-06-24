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
    <section className="section-reveal border-t border-[var(--kiosk-border-soft)] px-4 py-12 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-[1100px] text-center">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--kiosk-text-faint)]">
          Included on every plan
        </p>
        <p className="mb-8 text-sm font-medium text-[var(--kiosk-text-soft)] sm:mb-10">
          Everything you need at the counter — no add-ons, no modules
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-2.5">
          {HIGHLIGHTS.map((name) => (
            <span key={name} className="landing-trust-pill">
              <span className="landing-trust-pill-dot" aria-hidden />
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
