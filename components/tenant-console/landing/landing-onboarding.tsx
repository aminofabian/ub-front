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
};

const inputClass =
  "w-full rounded-[2px] border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] px-4 py-3.5 text-base text-[var(--kiosk-text)] shadow-[inset_0_1px_2px_rgba(20,20,18,0.04)] placeholder:text-[var(--kiosk-text-faint)] outline-none transition-colors focus:border-[var(--kiosk-gold-border-strong)] focus:ring-2 focus:ring-[var(--kiosk-gold-soft)]";

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
            className="mb-2 block text-sm font-medium text-[var(--kiosk-text)]"
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
              className="block text-sm font-medium text-[var(--kiosk-text)]"
            >
              Your shop address
            </label>
            <button
              type="button"
              className="-my-3.5 inline-flex min-h-11 items-center text-xs font-medium text-[var(--kiosk-gold)] transition-colors hover:text-[var(--kiosk-gold)] disabled:opacity-50"
              onClick={() => void checkAvailability()}
              disabled={isSubmitting || shopSlug.trim().length < 2 || availability === "checking"}
            >
              {availability === "checking" ? "Checking…" : "Check availability"}
            </button>
          </div>
          <div
            className={cn(
              "flex overflow-hidden rounded-[2px] border bg-[var(--kiosk-elevated)] shadow-[inset_0_1px_2px_rgba(20,20,18,0.04)] transition-colors",
              availability === "taken" || availability === "invalid"
                ? "border-[rgba(185,28,28,0.35)]"
                : availability === "available"
                  ? "border-[var(--kiosk-gold-border-strong)]"
                  : "border-[var(--kiosk-border)]",
              "focus-within:border-[var(--kiosk-gold-border-strong)] focus-within:ring-2 focus-within:ring-[var(--kiosk-gold-soft)]",
            )}
          >
            <input
              id="landing-shop-slug"
              className="min-w-0 flex-1 bg-transparent px-4 py-3.5 font-mono text-[15px] tracking-tight text-[var(--kiosk-text)] outline-none placeholder:text-[var(--kiosk-text-faint)]"
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
            <span className="hidden items-center border-l border-[var(--kiosk-border-soft)] bg-[var(--kiosk-surface)] px-3 font-mono text-[13px] text-[var(--kiosk-text-faint)] min-[380px]:flex">
              {suffix}
            </span>
          </div>
          <p
            id="landing-shop-slug-help"
            className={cn(
              "mt-1.5 text-xs",
              availability === "taken" || availability === "invalid"
                ? "text-[var(--kiosk-danger)]"
                : availability === "available"
                  ? "text-[var(--kiosk-gold)]"
                  : "text-[var(--kiosk-text-faint)]",
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
            className="mb-2 block text-sm font-medium text-[var(--kiosk-text)]"
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

      {errorMessage ? (
        <div className="mt-4">
          <AuthAlert variant="error">{errorMessage}</AuthAlert>
        </div>
      ) : null}
    </>
  );
}
