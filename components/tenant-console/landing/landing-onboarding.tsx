"use client";

import { ArrowRight } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";

import { goldCtaClass, sectionLabelClass } from "./landing-styles";

type LandingOnboardingProps = {
  businessName: string;
  errorMessage: string;
  isSubmitting: boolean;
  onBusinessNameChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
};

export function LandingOnboarding({
  businessName,
  errorMessage,
  isSubmitting,
  onBusinessNameChange,
  onSubmit,
  onBack,
}: LandingOnboardingProps) {
  return (
    <div className="landing-reveal landing-reveal-delay-3 w-full max-w-md animate-fade-in-up">
      <div className="rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-6 sm:p-7">
        <p className={sectionLabelClass}>Step 1 of 2</p>
        <h2
          className="mt-2 font-serif text-xl font-bold tracking-[-0.02em] text-[var(--kiosk-text)] sm:text-2xl"
        >
          Name your business
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--kiosk-text-soft)]">
          You&apos;ll claim a subdomain, become owner, and finish account setup
          on the next screen.
        </p>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="landing-business-name"
              className="mb-2 block text-xs font-medium text-[var(--kiosk-text)]"
            >
              Business name
            </label>
            <input
              id="landing-business-name"
              className="w-full rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-panel)] px-4 py-3 text-sm text-[var(--kiosk-text)] placeholder-[var(--kiosk-text-dim)] outline-none transition-colors focus:border-[var(--kiosk-gold-border)] focus:ring-2 focus:ring-[var(--kiosk-gold-soft)]"
              placeholder="Sunrise Bakery"
              value={businessName}
              onChange={(e) => onBusinessNameChange(e.target.value)}
              autoComplete="organization"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${goldCtaClass} w-full`}
          >
            {isSubmitting ? (
              "Creating your shop…"
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-[var(--kiosk-text-dim)] transition-colors hover:text-[var(--kiosk-text-muted)]"
          onClick={onBack}
        >
          &larr; Back
        </button>

        {errorMessage ? (
          <div className="mt-4">
            <AuthAlert variant="error">{errorMessage}</AuthAlert>
          </div>
        ) : null}
      </div>
    </div>
  );
}
