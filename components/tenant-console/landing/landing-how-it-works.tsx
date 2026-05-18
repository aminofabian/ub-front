"use client";

import { sectionLabelClass } from "./landing-styles";

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
      className="border-t border-[var(--kiosk-border-soft)] px-5 py-28 sm:px-10"
    >
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-20">
          <p className={`${sectionLabelClass} mb-4`}>Getting started</p>
          <h2
            className="font-serif text-[clamp(32px,4.5vw,54px)] leading-[1.08] tracking-[-0.02em] text-[var(--kiosk-text)]"
            style={{
              fontFamily: "'DM Serif Display', serif",
              maxWidth: "560px",
            }}
          >
            Set up in an afternoon. Run it for years.
          </h2>
        </div>

        <div className="grid gap-12 md:grid-cols-3">
          {STEPS.map((item) => (
            <div key={item.step}>
              <p className="mb-6 text-[11px] font-medium tracking-[0.10em] text-[var(--kiosk-text-faint)]">
                {item.step}
              </p>
              <hr className="mb-6 border-t border-[var(--kiosk-border)]" />
              <h3 className="mb-3.5 text-xl font-medium leading-[1.3] text-[var(--kiosk-text)]">
                {item.title}
              </h3>
              <p className="text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
