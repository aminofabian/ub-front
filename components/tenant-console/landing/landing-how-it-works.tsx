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
    meta: "2 min",
  },
  {
    step: "02",
    title: "Stock your catalog",
    desc: "Add products one by one, scan barcodes, or import a CSV. Set prices, categories, variants, suppliers, and stock levels — everything syncs instantly.",
    meta: "Afternoon",
  },
  {
    step: "03",
    title: "Start selling",
    desc: "Open the cashier screen on any device, scan items, and accept M-Pesa or cash. Your online store goes live at the same time — one inventory, every channel.",
    meta: "Same day",
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

        <ol className="landing-setup">
          {STEPS.map((item, i) => (
            <li key={item.step} className="landing-setup-row">
              <div className="landing-setup-index" aria-hidden>
                <span className="landing-setup-num">{item.step}</span>
                {i < STEPS.length - 1 ? (
                  <span className="landing-setup-rail" />
                ) : null}
              </div>
              <div className="landing-setup-body">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-heading text-[clamp(1.35rem,3vw,1.75rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--kiosk-text)]">
                    {item.title}
                  </h3>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-text-faint)]">
                    {item.meta}
                  </span>
                </div>
                <p className="mt-2 max-w-[36rem] text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)]">
                  {item.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
