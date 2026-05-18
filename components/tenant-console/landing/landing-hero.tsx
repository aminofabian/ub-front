"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";

import { LandingOnboarding } from "./landing-onboarding";
import { LandingProductPreview } from "./landing-product-preview";
import { ghostCtaClass, goldCtaClass } from "./landing-styles";

type LandingHeroProps = {
  shopHost: string;
  showOnboarding: boolean;
  businessName: string;
  errorMessage: string;
  isSubmitting: boolean;
  onCreateShop: () => void;
  onBusinessNameChange: (value: string) => void;
  onOnboardSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onOnboardingBack: () => void;
};

const TRUST_SIGNALS = [
  "Free subdomain",
  "No credit card",
  "M-Pesa ready",
] as const;

export function LandingHero({
  shopHost,
  showOnboarding,
  businessName,
  errorMessage,
  isSubmitting,
  onCreateShop,
  onBusinessNameChange,
  onOnboardSubmit,
  onOnboardingBack,
}: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden pt-[5.25rem] sm:pt-28">
      {/* ── Atmosphere ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Primary glow */}
        <div
          className="absolute left-1/2 top-[-15%] h-[560px] w-[min(110vw,880px)] -translate-x-1/2 rounded-full opacity-[0.45] animate-float-pulse"
          style={{
            background:
              "radial-gradient(ellipse 58% 48% at 50% 50%, var(--landing-gold-soft), transparent 74%)",
          }}
        />
        {/* Subtle secondary spark */}
        <div
          className="absolute left-[18%] top-[8%] h-[280px] w-[320px] rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--landing-gold-glow), transparent 70%)",
          }}
        />
        {/* Fade to paper */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to bottom, transparent 58%, var(--landing-paper) 100%)`,
          }}
        />
      </div>

      {/* ── Grid ── */}
      <div className="relative mx-auto grid max-w-[74rem] gap-12 px-5 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.88fr)] lg:items-center lg:gap-10 lg:pb-24 xl:gap-16">
        {/* ── Left column ── */}
        <div className="max-w-xl lg:max-w-none">
          {/* Badge */}
          <div className="landing-reveal inline-flex items-center gap-2 rounded-full border border-[var(--landing-border)] bg-[var(--landing-surface)]/70 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--landing-ink-muted)] backdrop-blur-sm">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "var(--landing-success)" }}
              aria-hidden
            />
            Multi-location retail OS
          </div>

          {/* Heading */}
          <h1 className="landing-reveal landing-reveal-delay-1 font-heading mt-6 text-[2.5rem] font-bold leading-[0.96] tracking-[-0.045em] sm:text-[3.35rem] xl:text-[3.9rem]">
            One inventory.
            <br />
            Every sale.
            <br />
            <span className="relative inline-block">
              <span className="relative z-[1]">Any channel.</span>
              <span
                aria-hidden
                className="absolute -inset-x-2 bottom-1 z-0 h-3 rounded-sm bg-[var(--landing-gold-soft)] sm:bottom-1.5 sm:h-3.5"
              />
            </span>
          </h1>

          {/* Subtitle */}
          <p className="landing-reveal landing-reveal-delay-2 mt-6 max-w-[38ch] text-[1.05rem] leading-[1.65] text-[var(--landing-ink-muted)] sm:text-lg">
            Kiosk unifies your point of sale, stock, and branded online
            storefront — so every register, branch, and web order runs off the
            same real-time inventory.
          </p>

          {/* Trust signals */}
          <ul className="landing-reveal landing-reveal-delay-2 mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {TRUST_SIGNALS.map((signal) => (
              <li
                key={signal}
                className="flex items-center gap-1.5 text-[13px] text-[var(--landing-ink-muted)]"
              >
                <CheckCircle2
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: "var(--landing-success)" }}
                  aria-hidden
                />
                {signal}
              </li>
            ))}
          </ul>

          {/* ── CTA or Onboarding ── */}
          {showOnboarding ? (
            <div className="mt-8 lg:mt-10">
              <LandingOnboarding
                businessName={businessName}
                errorMessage={errorMessage}
                isSubmitting={isSubmitting}
                onBusinessNameChange={onBusinessNameChange}
                onSubmit={onOnboardSubmit}
                onBack={onOnboardingBack}
              />
            </div>
          ) : (
            <>
              <div className="landing-reveal landing-reveal-delay-3 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className={`${goldCtaClass} group w-full sm:w-auto`}
                  onClick={onCreateShop}
                >
                  Create your shop
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </button>
                <Link
                  href={APP_ROUTES.login}
                  className={`${ghostCtaClass} w-full sm:w-auto`}
                >
                  Sign in to your shop
                </Link>
              </div>

              <p className="landing-reveal landing-reveal-delay-4 mt-5 text-[13px] text-[var(--landing-ink-soft)]">
                Free subdomain included ·{" "}
                <Link
                  href={APP_ROUTES.forgotPassword}
                  className="underline decoration-[var(--landing-border)] underline-offset-4 transition-colors hover:text-[var(--landing-ink)]"
                >
                  Forgot password?
                </Link>
              </p>
            </>
          )}
        </div>

        {/* ── Right column — Product preview ── */}
        {!showOnboarding ? (
          <div className="landing-reveal landing-reveal-delay-2 pb-6 lg:pb-0">
            <LandingProductPreview shopHost={shopHost} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
