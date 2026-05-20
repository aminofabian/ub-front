"use client";

import { goldCtaClass, ghostCtaClass, landingSectionClass } from "./landing-styles";

type LandingCtaProps = {
  onCreateShop: () => void;
};

export function LandingCta({ onCreateShop }: LandingCtaProps) {
  return (
    <section className={`section-reveal ${landingSectionClass}`}>
      <div className="mx-auto max-w-[720px] px-1">
        <div className="landing-cta-panel relative z-10 text-center">
          <p className="relative z-[1] mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--kiosk-gold)]">
            Ready when you are
          </p>
          <h2 className="relative z-[1] mb-4 font-heading text-[clamp(28px,7vw,52px)] leading-[1.08] tracking-[-0.03em] text-[var(--kiosk-text)]">
            Ready to unify your operation?
          </h2>
          <p className="relative z-[1] mx-auto mb-8 max-w-md text-base leading-[1.65] text-[var(--kiosk-text-soft)] sm:mb-10">
            Start for free. No credit card, no commitment — your subdomain in
            minutes.
          </p>
          <div className="relative z-[1] flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
            <button
              type="button"
              className={`${goldCtaClass} w-full justify-center !px-8 !py-3.5 !text-[15px] shadow-[0_8px_24px_-6px_var(--kiosk-success-shadow)] sm:w-auto`}
              onClick={onCreateShop}
            >
              Start your shop
            </button>
            <span
              className={`${ghostCtaClass} w-full justify-center border-[var(--kiosk-border-strong)] bg-[var(--kiosk-elevated)] !px-8 !py-3.5 !text-[15px] sm:w-auto`}
            >
              Book a demo
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
