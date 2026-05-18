"use client";

import {
  goldCtaClass,
  ghostCtaClass,
  landingCardClass,
  sectionLabelClass,
} from "./landing-styles";

const STARTER_FEATURES = [
  "1 register",
  "1 branch",
  "Barcode scanner",
  "Basic inventory",
  "Online storefront",
  "M-Pesa payments",
] as const;

const PRO_FEATURES = [
  "Unlimited registers",
  "Up to 10 branches",
  "Advanced inventory & stock-takes",
  "Custom online storefront",
  "Staff roles & permissions",
  "Supplier & purchase orders",
  "Sales analytics & reports",
  "Priority support",
] as const;

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2 7l3.5 3.5L12 3"
        stroke="var(--kiosk-gold)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingPricing() {
  return (
    <section
      id="pricing"
      className="border-t border-[var(--kiosk-border-soft)] px-5 py-28 sm:px-10"
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-[72px]">
          <p className={`${sectionLabelClass} mb-4`}>Pricing</p>
          <h2
            className="font-serif text-[clamp(32px,4.5vw,54px)] leading-[1.08] tracking-[-0.02em] text-[var(--kiosk-text)]"
            style={{ maxWidth: "480px" }}
          >
            Simple pricing. No surprises.
          </h2>
        </div>

        <div className="mx-auto grid max-w-[800px] gap-6 md:grid-cols-2">
          {/* Starter */}
          <div className={`${landingCardClass} p-10`}>
            <p className="mb-5 text-[13px] font-medium text-[var(--kiosk-text-soft)]">
              Starter
            </p>
            <div className="mb-2 flex items-baseline gap-1.5">
              <span
                className="font-serif text-5xl text-[var(--kiosk-text)]"
              >
                Free
              </span>
            </div>
            <p className="mb-8 text-[13px] text-[var(--kiosk-text-dim)]">
              For single-location shops getting started. No credit card
              required.
            </p>
            <hr className="mb-7 border-t border-[var(--kiosk-border)]" />
            <div className="mb-9 flex flex-col gap-3.5">
              {STARTER_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <CheckIcon />
                  <span className="text-sm text-[var(--kiosk-text-muted)]">
                    {f}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={`${ghostCtaClass} w-full justify-center`}
            >
              Start your shop
            </button>
          </div>

          {/* Pro */}
          <div
            className="relative rounded-xl border p-10"
            style={{
              borderColor: "var(--kiosk-gold-border-strong)",
              backgroundColor: "var(--kiosk-gold-surface)",
            }}
          >
            <span className="absolute -top-3 left-8 rounded-full bg-[var(--kiosk-gold)] px-3 py-1 text-[11px] font-medium tracking-[0.04em] text-[var(--kiosk-cta-text)]">
              Most popular
            </span>
            <p className="mb-5 text-[13px] font-medium text-[var(--kiosk-gold)]">
              Pro
            </p>
            <div className="mb-2 flex items-baseline gap-1.5">
              <span
                className="font-serif text-5xl text-[var(--kiosk-text)]"
              >
                KES 2,900
              </span>
            </div>
            <p className="mb-8 text-[13px] text-[var(--kiosk-text-dim)]">
              Per month, per branch. Cancel anytime.
            </p>
            <hr
              className="mb-7 border-t"
              style={{ borderColor: "var(--kiosk-gold-border)" }}
            />
            <div className="mb-9 flex flex-col gap-3.5">
              {PRO_FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <CheckIcon />
                  <span className="text-sm text-[var(--kiosk-text-muted)]">
                    {f}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={`${goldCtaClass} w-full justify-center`}
            >
              Start your shop
            </button>
          </div>
        </div>

        <p className="mt-9 text-center text-[13px] text-[var(--kiosk-text-faint)]">
          Need more than 10 branches or a custom setup?{" "}
          <a
            href="#"
            className="text-[var(--kiosk-gold)] no-underline hover:underline"
          >
            Talk to us &rarr;
          </a>
        </p>
      </div>
    </section>
  );
}
