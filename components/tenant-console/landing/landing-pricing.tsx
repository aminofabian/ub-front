"use client";

import { LandingSectionHeader } from "./landing-section-header";
import { LandingSetupContact } from "./landing-setup-contact";
import {
  goldCtaClass,
  ghostCtaClass,
  landingSectionAltClass,
  landingSectionBorderClass,
  landingSectionHeaderMb,
} from "./landing-styles";

type PlanFeature = { qty: string; label: string };

type Plan = {
  name: string;
  price: string;
  unit?: string;
  blurb: string;
  features: readonly PlanFeature[];
  featured?: boolean;
  mark?: string;
  cta: string;
  href?: string;
  talkToUs?: boolean;
};

const PLANS: readonly Plan[] = [
  {
    name: "Free",
    price: "Free",
    blurb: "Try the till with a small catalog. No credit card required.",
    features: [
      { qty: "300", label: "Products" },
      { qty: "1", label: "Cashier" },
      { qty: "·", label: "Barcode scanner" },
      { qty: "·", label: "Basic inventory" },
      { qty: "·", label: "Online storefront" },
      { qty: "·", label: "M-Pesa payments" },
    ],
    cta: "Start free",
  },
  {
    name: "Starter",
    price: "KES 300",
    unit: "/ mo",
    blurb: "For shops ready to grow past the free catalog limit.",
    features: [
      { qty: "1,000", label: "Products" },
      { qty: "3", label: "Cashiers" },
      { qty: "·", label: "Barcode scanner" },
      { qty: "·", label: "Inventory & stock alerts" },
      { qty: "·", label: "Online storefront" },
      { qty: "·", label: "M-Pesa payments" },
    ],
    cta: "Start your shop",
  },
  {
    name: "Business",
    price: "KES 800",
    unit: "/ mo",
    blurb: "The everyday plan for busy counters and small teams.",
    features: [
      { qty: "2,500", label: "Products" },
      { qty: "5", label: "Cashiers" },
      { qty: "·", label: "Staff roles & permissions" },
      { qty: "·", label: "Stock-takes & transfers" },
      { qty: "·", label: "Sales analytics" },
      { qty: "·", label: "M-Pesa payments" },
    ],
    featured: true,
    mark: "BIZ",
    cta: "Start your shop",
  },
  {
    name: "Growth",
    price: "KES 1,500",
    unit: "/ mo",
    blurb: "For larger catalogs and more tills under one roof.",
    features: [
      { qty: "5,000", label: "Products" },
      { qty: "10", label: "Cashiers" },
      { qty: "·", label: "Advanced inventory" },
      { qty: "·", label: "Supplier & purchase orders" },
      { qty: "·", label: "Sales analytics & reports" },
      { qty: "·", label: "Priority support" },
    ],
    cta: "Start your shop",
  },
  {
    name: "Enterprise",
    price: "KES 3,000+",
    unit: "/ mo · custom",
    blurb: "Unlimited scale. Typically KES 3,000–5,000+ depending on needs.",
    features: [
      { qty: "∞", label: "Products" },
      { qty: "∞", label: "Cashiers" },
      { qty: "·", label: "On-site POS installation" },
      { qty: "·", label: "Custom setup & onboarding" },
      { qty: "·", label: "Multi-location support" },
      { qty: "·", label: "Dedicated assistance" },
    ],
    cta: "Talk to us",
    talkToUs: true,
  },
] as const;

type LandingPricingProps = {
  onCreateShop: () => void;
  onTalkToUs: () => void;
};

type PlanCardProps = {
  plan: Plan;
  onCreateShop: () => void;
  onTalkToUs: () => void;
};

function PlanCard({ plan, onCreateShop, onTalkToUs }: PlanCardProps) {
  const {
    name,
    price,
    unit,
    blurb,
    features,
    featured = false,
    mark,
    cta,
    href,
    talkToUs,
  } = plan;
  const ctaClass = `${featured ? goldCtaClass : ghostCtaClass} w-full justify-center`;

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
            <h3 className="landing-plan-name">{name}</h3>
          </div>
          {mark ? (
            <span className="landing-plan-mark" aria-hidden>
              {mark}
            </span>
          ) : null}
        </div>
        <p className="landing-plan-blurb">{blurb}</p>
      </header>

      <div className="landing-plan-dash" aria-hidden />

      <div className="landing-plan-price-block">
        <p className="landing-plan-price-label">Monthly</p>
        <div className="flex items-baseline justify-between gap-3">
          <p className="landing-plan-price">{price}</p>
          {unit ? <p className="landing-plan-unit">{unit}</p> : null}
        </div>
      </div>

      <div className="landing-plan-dash" aria-hidden />

      <ul className="landing-plan-lines flex-1">
        {features.map((f) => (
          <li key={f.label} className="landing-plan-line">
            <span className="landing-plan-qty">{f.qty}</span>
            <span className="landing-plan-dots" aria-hidden />
            <span className="landing-plan-feature">{f.label}</span>
          </li>
        ))}
      </ul>

      <div className="landing-plan-rule mt-auto" aria-hidden />

      {talkToUs ? (
        <button type="button" className={ctaClass} onClick={onTalkToUs}>
          {cta}
        </button>
      ) : href ? (
        <a href={href} className={ctaClass}>
          {cta}
        </a>
      ) : (
        <button type="button" className={ctaClass} onClick={onCreateShop}>
          {cta}
        </button>
      )}
    </article>
  );
}

export function LandingPricing({ onCreateShop, onTalkToUs }: LandingPricingProps) {
  return (
    <section
      id="pricing"
      className={`section-reveal ${landingSectionBorderClass} ${landingSectionAltClass}`}
    >
      <div className="relative mx-auto max-w-[1200px]">
        <LandingSectionHeader
          label="Pricing"
          title="POS pricing in Kenya. No surprises."
          description="Start free with 300 products and one cashier. Paid plans in KES when your catalog or team grows."
          className={landingSectionHeaderMb}
          titleClassName="max-w-[520px]"
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 xl:gap-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              onCreateShop={onCreateShop}
              onTalkToUs={onTalkToUs}
            />
          ))}
        </div>

        <p className="mt-9 text-center text-[13px] text-[var(--kiosk-text-faint)]">
          Need a custom Enterprise setup?{" "}
          <button
            type="button"
            onClick={onTalkToUs}
            className="text-[var(--kiosk-gold)] no-underline hover:underline"
          >
            Talk to us &rarr;
          </button>
        </p>

        <LandingSetupContact
          className="mt-10"
          onTalkToUs={onTalkToUs}
          asSection
        />
      </div>
    </section>
  );
}
