"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { SelfServeCountrySelect } from "@/components/onboarding/selfserve-country-select";
import { fetchTenantIdForHost } from "@/lib/api";
import { PLATFORM_DOMAIN, slugDerivedShopUrl } from "@/lib/config";
import { businessNameToSlug } from "@/lib/shop-lookup";
import type { SelfServeCountry } from "@/lib/selfserve-countries";
import { cn } from "@/lib/utils";

import { goldCtaClass } from "./landing-styles";

type Availability = "idle" | "checking" | "available" | "taken" | "invalid";

type LandingOnboardingProps = {
  businessName: string;
  shopSlug: string;
  countryCode: string;
  countries: readonly SelfServeCountry[];
  errorMessage: string;
  isSubmitting: boolean;
  onBusinessNameChange: (value: string) => void;
  onShopSlugChange: (value: string) => void;
  onCountryCodeChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
};

const inputClass =
  "w-full rounded-xl border border-[rgba(20,20,18,0.14)] bg-white px-4 py-3.5 text-base text-[#141412] shadow-[inset_0_1px_2px_rgba(20,20,18,0.04)] placeholder:text-[#8A8782] outline-none transition-colors focus:border-[rgba(40,167,69,0.45)] focus:ring-2 focus:ring-[rgba(40,167,69,0.14)]";

function hostFromSlug(slug: string): string | null {
  const url = slugDerivedShopUrl(slug);
  if (!url) {
    return slug ? `${slug}.${PLATFORM_DOMAIN}` : null;
  }
  try {
    return new URL(url).hostname;
  } catch {
    return `${slug}.${PLATFORM_DOMAIN}`;
  }
}

function suffixFromHost(host: string, slug: string): string {
  const lower = host.toLowerCase();
  const prefix = `${slug.toLowerCase()}.`;
  if (lower.startsWith(prefix)) {
    return host.slice(slug.length);
  }
  return `.${PLATFORM_DOMAIN}`;
}

export function LandingOnboarding({
  businessName,
  shopSlug,
  countryCode,
  countries,
  errorMessage,
  isSubmitting,
  onBusinessNameChange,
  onShopSlugChange,
  onCountryCodeChange,
  onSubmit,
  onBack,
}: LandingOnboardingProps) {
  const [availability, setAvailability] = useState<Availability>("idle");
  const [checkedSlug, setCheckedSlug] = useState("");

  const previewHost = useMemo(() => hostFromSlug(shopSlug), [shopSlug]);
  const suffix = previewHost && shopSlug ? suffixFromHost(previewHost, shopSlug) : `.${PLATFORM_DOMAIN}`;

  useEffect(() => {
    setAvailability("idle");
  }, [shopSlug]);

  const checkAvailability = async () => {
    const slug = businessNameToSlug(shopSlug);
    if (slug.length < 2) {
      setAvailability("invalid");
      return;
    }
    onShopSlugChange(slug);
    setAvailability("checking");
    const host = hostFromSlug(slug);
    if (!host) {
      setAvailability("invalid");
      return;
    }
    const existing = await fetchTenantIdForHost(host);
    setCheckedSlug(slug);
    setAvailability(existing ? "taken" : "available");
  };

  return (
    <>
      <form className="space-y-5" onSubmit={onSubmit}>
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
          <div className="mb-2 flex items-end justify-between gap-3">
            <label
              htmlFor="landing-shop-slug"
              className="block text-sm font-medium text-[#141412]"
            >
              Your shop address
            </label>
            <button
              type="button"
              className="text-xs font-medium text-[#20863B] transition-colors hover:text-[#166B2E] disabled:opacity-50"
              onClick={() => void checkAvailability()}
              disabled={isSubmitting || shopSlug.trim().length < 2 || availability === "checking"}
            >
              {availability === "checking" ? "Checking…" : "Check availability"}
            </button>
          </div>
          <div
            className={cn(
              "flex overflow-hidden rounded-xl border bg-white shadow-[inset_0_1px_2px_rgba(20,20,18,0.04)] transition-colors",
              availability === "taken" || availability === "invalid"
                ? "border-[rgba(185,28,28,0.35)]"
                : availability === "available"
                  ? "border-[rgba(40,167,69,0.45)]"
                  : "border-[rgba(20,20,18,0.14)]",
              "focus-within:border-[rgba(40,167,69,0.45)] focus-within:ring-2 focus-within:ring-[rgba(40,167,69,0.14)]",
            )}
          >
            <input
              id="landing-shop-slug"
              className="min-w-0 flex-1 bg-transparent px-4 py-3.5 font-mono text-[15px] tracking-tight text-[#141412] outline-none placeholder:text-[#8A8782]"
              value={shopSlug}
              onChange={(e) =>
                onShopSlugChange(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                )
              }
              spellCheck={false}
              autoComplete="off"
              aria-describedby="landing-shop-slug-help"
              required
            />
            <span className="flex items-center border-l border-[rgba(20,20,18,0.08)] bg-[#F6F5F2] px-3 font-mono text-[13px] text-[#6B6863]">
              {suffix}
            </span>
          </div>
          <p
            id="landing-shop-slug-help"
            className={cn(
              "mt-1.5 text-xs",
              availability === "taken" || availability === "invalid"
                ? "text-[#B91C1C]"
                : availability === "available"
                  ? "text-[#166B2E]"
                  : "text-[#8A8782]",
            )}
          >
            {availability === "checking" ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                Checking {previewHost}…
              </span>
            ) : availability === "available" && checkedSlug === shopSlug ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" aria-hidden />
                {previewHost} is free — continue to claim it.
              </span>
            ) : availability === "taken" ? (
              `${previewHost} is already in use. Try another handle.`
            ) : availability === "invalid" ? (
              "Use at least two letters or numbers. Hyphens are fine."
            ) : previewHost ? (
              <>This becomes your storefront: {previewHost}</>
            ) : (
              "Type a name above — we’ll suggest an address you can edit."
            )}
          </p>
        </div>

        <div>
          <label
            htmlFor="landing-country"
            className="mb-2 block text-sm font-medium text-[#141412]"
          >
            Country
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
          disabled={isSubmitting || availability === "taken" || shopSlug.trim().length < 2}
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
