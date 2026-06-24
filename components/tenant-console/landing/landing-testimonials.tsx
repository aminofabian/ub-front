"use client";

import { LandingSectionHeader } from "./landing-section-header";
import {
  landingBentoCardClass,
  landingSectionAltClass,
  landingSectionClass,
  landingSectionHeaderMb,
} from "./landing-styles";

const TESTIMONIALS = [
  {
    quote:
      "Running two branches with one inventory used to mean a person reconciling stock every evening. Kiosk makes that role unnecessary.",
    name: "Multi-branch retailers",
    role: "Real-time stock across locations",
  },
  {
    quote:
      "We needed a POS that works when the internet doesn't. Kiosk's offline mode keeps us selling through outages — sales sync automatically when we're back online.",
    name: "High-volume counters",
    role: "Offline-ready point of sale",
  },
  {
    quote:
      "Our customers can now browse and order online from the same inventory our cashiers see at the register. One system, one stock count, zero confusion.",
    name: "Shops going online",
    role: "Storefront + POS, unified",
  },
] as const;

export function LandingTestimonials() {
  return (
    <section
      id="stories"
      className={`section-reveal ${landingSectionClass} ${landingSectionAltClass}`}
    >
      <div className="relative mx-auto max-w-[1100px]">
        <LandingSectionHeader
          index="03"
          label="Stories"
          title="Heard from the floor."
          description="Scenarios we built for — told in the language of people who actually run the till."
          className={landingSectionHeaderMb}
        />

        <div className="grid gap-5 md:grid-cols-3 md:gap-6">
          {TESTIMONIALS.map((t) => (
            <article
              key={t.name}
              className={`landing-quote-card ${landingBentoCardClass} p-6 sm:p-7`}
            >
              <p className="relative z-[1] mb-7 text-[15px] leading-[1.7] text-[var(--kiosk-text-muted)]">
                {t.quote}
              </p>
              <footer className="relative z-[1] border-t border-[var(--kiosk-border-soft)] pt-4">
                <div className="mb-1 text-sm font-medium text-[var(--kiosk-text)]">
                  {t.name}
                </div>
                <div className="text-xs text-[var(--kiosk-text-dim)]">{t.role}</div>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
