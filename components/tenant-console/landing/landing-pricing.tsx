"use client";

import { LandingSectionHeader } from "./landing-section-header";
import {
  goldCtaClass,
  ghostCtaClass,
  landingSectionAltClass,
  landingSectionBorderClass,
  landingSectionHeaderMb,
} from "./landing-styles";

const STARTER_FEATURES = [
  { qty: "01", label: "Register" },
  { qty: "01", label: "Branch" },
  { qty: "·", label: "Barcode scanner" },
  { qty: "·", label: "Basic inventory" },
  { qty: "·", label: "Online storefront" },
  { qty: "·", label: "M-Pesa payments" },
] as const;

const PRO_FEATURES = [
  { qty: "∞", label: "Registers" },
  { qty: "10", label: "Branches" },
  { qty: "·", label: "Advanced inventory & stock-takes" },
  { qty: "·", label: "Custom online storefront" },
  { qty: "·", label: "Staff roles & permissions" },
  { qty: "·", label: "Supplier & purchase orders" },
  { qty: "·", label: "Sales analytics & reports" },
  { qty: "·", label: "Priority support" },
] as const;

type LandingPricingProps = {
  onCreateShop: () => void;
};

type PlanCardProps = {
  code: string;
  name: string;
  price: string;
  unit?: string;
  blurb: string;
  features: readonly { qty: string; label: string }[];
  featured?: boolean;
  cta: string;
  onCreateShop: () => void;
};

function PlanCard({
  code,
  name,
  price,
  unit,
  blurb,
  features,
  featured = false,
  cta,
  onCreateShop,
}: PlanCardProps) {
  return (
    <article
      className={`landing-plan ${featured ? "landing-plan--featured" : ""}`}
    >
      {featured ? (
        <span className="landing-plan-stamp" aria-hidden>
          Most popular
        </span>
      ) : null}

      <header className="landing-plan-head">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="landing-plan-code">{code}</p>
            <h3 className="landing-plan-name">{name}</h3>
          </div>
          {featured ? (
            <span className="landing-plan-mark" aria-hidden>
              PRO
            </span>
          ) : null}
        </div>
        <p className="landing-plan-blurb">{blurb}</p>
      </header>

      <div className="landing-plan-dash" aria-hidden />

      <div className="landing-plan-price-block">
        <p className="landing-plan-price-label">Amount</p>
        <div className="flex items-baseline justify-between gap-3">
          <p className="landing-plan-price">{price}</p>
          {unit ? <p className="landing-plan-unit">{unit}</p> : null}
        </div>
      </div>

      <div className="landing-plan-dash" aria-hidden />

      <ul className="landing-plan-lines">
        {features.map((f) => (
          <li key={f.label} className="landing-plan-line">
            <span className="landing-plan-qty">{f.qty}</span>
            <span className="landing-plan-dots" aria-hidden />
            <span className="landing-plan-feature">{f.label}</span>
          </li>
        ))}
      </ul>

      <div className="landing-plan-rule" aria-hidden />

      <button
        type="button"
        className={`${featured ? goldCtaClass : ghostCtaClass} w-full justify-center`}
        onClick={onCreateShop}
      >
        {cta}
      </button>
    </article>
  );
}

export function LandingPricing({ onCreateShop }: LandingPricingProps) {
  return (
    <section
      id="pricing"
      className={`section-reveal ${landingSectionBorderClass} ${landingSectionAltClass}`}
    >
      <div className="relative mx-auto max-w-[1100px]">
        <LandingSectionHeader
          index="04"
          label="Pricing"
          title="Simple pricing. No surprises."
          description="Start free at one branch. Scale when you open the next door."
          className={landingSectionHeaderMb}
          titleClassName="max-w-[480px]"
        />

        <div className="mx-auto grid max-w-[820px] gap-5 md:grid-cols-2 md:gap-6">
          <PlanCard
            code="Plan 01"
            name="Starter"
            price="Free"
            blurb="For single-location shops getting started. No credit card required."
            features={STARTER_FEATURES}
            cta="Start your shop"
            onCreateShop={onCreateShop}
          />
          <PlanCard
            code="Plan 02"
            name="Pro"
            price="KES 2,900"
            unit="/ mo · branch"
            blurb="Per month, per branch. Cancel anytime."
            features={PRO_FEATURES}
            featured
            cta="Start your shop"
            onCreateShop={onCreateShop}
          />
        </div>

        <p className="mt-9 text-center text-[13px] text-[var(--kiosk-text-faint)]">
          Need more than 10 branches or a custom setup?{" "}
          <a
            href="mailto:support@kiosk.ke"
            className="text-[var(--kiosk-gold)] no-underline hover:underline"
          >
            Talk to us &rarr;
          </a>
        </p>
      </div>
    </section>
  );
}
