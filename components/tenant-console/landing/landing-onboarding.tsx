"use client";

import { ArrowRight } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SelfServeCountrySelect } from "@/components/onboarding/selfserve-country-select";
import type { SelfServeCountry } from "@/lib/selfserve-countries";

import { goldCtaClass } from "./landing-styles";

type LandingOnboardingProps = {
  businessName: string;
  countryCode: string;
  countries: readonly SelfServeCountry[];
  errorMessage: string;
  isSubmitting: boolean;
  onBusinessNameChange: (value: string) => void;
  onCountryCodeChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
};

const inputClass =
  "w-full rounded-xl border border-[rgba(20,20,18,0.14)] bg-white px-4 py-3.5 text-base text-[#141412] shadow-[inset_0_1px_2px_rgba(20,20,18,0.04)] placeholder:text-[#8A8782] outline-none transition-colors focus:border-[rgba(40,167,69,0.45)] focus:ring-2 focus:ring-[rgba(40,167,69,0.14)]";

export function LandingOnboarding({
  businessName,
  countryCode,
  countries,
  errorMessage,
  isSubmitting,
  onBusinessNameChange,
  onCountryCodeChange,
  onSubmit,
  onBack,
}: LandingOnboardingProps) {
  return (
    <>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label
            htmlFor="landing-business-name"
            className="mb-2 block text-sm font-medium text-[#141412]"
          >
            Business name
          </label>
          <input
            id="landing-business-name"
            className={inputClass}
            placeholder="Sunrise Bakery"
            value={businessName}
            onChange={(e) => onBusinessNameChange(e.target.value)}
            autoComplete="organization"
            required
            autoFocus
          />
        </div>
        <div>
          <label
            htmlFor="landing-country"
            className="mb-2 block text-sm font-medium text-[#141412]"
          >
            Where do you operate?
          </label>
          <SelfServeCountrySelect
            id="landing-country"
            className={inputClass}
            value={countryCode}
            onChange={onCountryCodeChange}
            countries={countries}
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${goldCtaClass} w-full py-3.5 text-base shadow-[0_2px_8px_-2px_rgba(40,167,69,0.35)]`}
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
        className="mt-5 w-full text-center text-sm text-[#8A8782] transition-colors hover:text-[#5F5D58]"
        onClick={onBack}
      >
        &larr; Back
      </button>

      {errorMessage ? (
        <div className="mt-4">
          <AuthAlert variant="error">{errorMessage}</AuthAlert>
        </div>
      ) : null}
    </>
  );
}
