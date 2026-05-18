"use client";

import { goldCtaClass, ghostCtaClass } from "./landing-styles";

type LandingCtaProps = {
  onCreateShop: () => void;
};

export function LandingCta({ onCreateShop }: LandingCtaProps) {
  return (
    <section className="relative overflow-hidden px-5 py-28 text-center sm:px-10">
      {/* Grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(var(--kiosk-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--kiosk-grid-line) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse 60% 70% at 50% 50%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 70% at 50% 50%, black, transparent)",
        }}
      />
      {/* Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(ellipse, var(--kiosk-glow-gold) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[600px]">
        <h2
          className="mb-6 font-heading text-[clamp(36px,5vw,64px)] leading-[1.06] tracking-[-0.02em] text-[var(--kiosk-text)]"
        >
          Ready to unify your operation?
        </h2>
        <p className="mb-12 text-lg leading-[1.6] text-[var(--kiosk-text-soft)]">
          Start for free. No credit card, no commitment.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            className={`${goldCtaClass} !px-8 !py-3.5 !text-[15px]`}
            onClick={onCreateShop}
          >
            Start your shop
          </button>
          <span className={`${ghostCtaClass} !px-8 !py-3.5 !text-[15px]`}>
            Book a demo
          </span>
        </div>
      </div>
    </section>
  );
}
