"use client";

import { LandingSectionHeader } from "./landing-section-header";
import {
  landingSectionAltClass,
  landingSectionBorderClass,
  landingSectionHeaderMb,
} from "./landing-styles";

const STEPS = [
  {
    step: "01",
    title: "Claim your subdomain",
    desc: "Sign up, name your business, and get yourshop.kiosk.ke — your own space with custom branding, users, and catalog. Add a custom domain when you're ready.",
  },
  {
    step: "02",
    title: "Stock your catalog",
    desc: "Add products one by one, scan barcodes, or import a CSV. Set prices, categories, variants, suppliers, and stock levels — everything syncs instantly.",
  },
  {
    step: "03",
    title: "Start selling",
    desc: "Open the cashier screen on any device, scan items, and accept M-Pesa or cash. Your online store goes live at the same time — one inventory, every channel.",
  },
] as const;

export function LandingHowItWorks() {
  return (
    <section
      id="how"
      className={`section-reveal ${landingSectionBorderClass} ${landingSectionAltClass}`}
    >
      <div className="relative mx-auto max-w-[1100px]">
        <LandingSectionHeader
          index="02"
          label="Getting started"
          title="Set up in an afternoon. Run it for years."
          description="Three deliberate steps — no consultants, no six-week rollout."
          className={landingSectionHeaderMb}
          titleClassName="max-w-[560px]"
        />

        <div className="landing-steps-rail grid gap-6 md:grid-cols-3 md:gap-5">
          {STEPS.map((item) => (
            <article key={item.step} className="landing-step-card">
              <span className="landing-step-number mb-5">{item.step}</span>
              <h3 className="mb-3 font-heading text-xl font-medium leading-[1.25] tracking-[-0.02em] text-[var(--kiosk-text)]">
                {item.title}
              </h3>
              <p className="text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)]">
                {item.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
