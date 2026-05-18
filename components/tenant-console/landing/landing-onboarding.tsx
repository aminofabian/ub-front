"use client";

import { ArrowRight } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { authInputClassName } from "@/components/auth/auth-split-shell";

import { goldCtaClass } from "./landing-styles";

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
      <div className="rounded-[1.25rem] border border-[var(--landing-border)] bg-[var(--landing-surface)] p-6 shadow-[0_20px_48px_rgba(15,15,14,0.08)] sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--landing-ink-muted)]">
          Step 1 of 2
        </p>
        <h2 className="font-heading mt-2 text-xl font-bold tracking-[-0.03em] sm:text-2xl">
          Name your business
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--landing-ink-muted)]">
          You&apos;ll claim a subdomain, become owner, and finish account setup on
          the next screen.
        </p>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="landing-business-name"
              className="mb-2 block text-xs font-medium text-[var(--landing-ink)]"
            >
              Business name
            </label>
            <input
              id="landing-business-name"
              className={authInputClassName}
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
          className="mt-4 w-full text-center text-sm text-[var(--landing-ink-muted)] transition-colors hover:text-[var(--landing-ink)]"
          onClick={onBack}
        >
          ← Back
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
