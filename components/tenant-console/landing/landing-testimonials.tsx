"use client";

import { sectionLabelClass } from "./landing-styles";

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
    <section id="stories" className="px-5 py-28 sm:px-10">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-[72px]">
          <p className={`${sectionLabelClass} mb-4`}>Stories</p>
          <h2
            className="font-serif text-[clamp(32px,4.5vw,54px)] leading-[1.08] tracking-[-0.02em] text-[var(--kiosk-text)]"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Heard from the floor.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-card-bg)] p-7"
            >
              <p
                className="mb-7 text-[15px] leading-[1.7] italic text-[var(--kiosk-text-muted)]"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                &ldquo;{t.quote}&rdquo;
              </p>
              <div>
                <div className="mb-1 text-sm font-medium text-[var(--kiosk-text)]">
                  {t.name}
                </div>
                <div className="text-xs text-[var(--kiosk-text-dim)]">
                  {t.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
