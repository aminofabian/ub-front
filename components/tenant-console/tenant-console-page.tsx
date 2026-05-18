"use client";

import { useEffect, useState } from "react";

import { setSessionTenantId } from "@/lib/auth";
import { onboardBusiness } from "@/lib/api";
import { slugDerivedShopUrl } from "@/lib/config";

import { LandingCta } from "./landing/landing-cta";
import { LandingFeatures } from "./landing/landing-features";
import { LandingFooter } from "./landing/landing-footer";
import { exampleShopHost } from "./landing/landing-host";
import { LandingHero } from "./landing/landing-hero";
import { LandingHowItWorks } from "./landing/landing-how-it-works";
import { LandingNav } from "./landing/landing-nav";
import { LandingPricing } from "./landing/landing-pricing";
import { LandingStats } from "./landing/landing-stats";
import { landingRootStyle } from "./landing/landing-styles";
import { LandingTestimonials } from "./landing/landing-testimonials";
import { LandingTrustBar } from "./landing/landing-trust-bar";

export function TenantConsolePage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shopHost, setShopHost] = useState("yourshop.kiosk.ke");

  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";

  useEffect(() => {
    setShopHost(exampleShopHost());
  }, []);

  const openOnboarding = () => {
    setShowOnboarding(true);
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onOnboardSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await onboardBusiness(host, businessName);
      if (!result?.tenantId) {
        setErrorMessage(
          "Could not create business. Please try a different name.",
        );
        return;
      }

      setSessionTenantId(result.tenantId);
      const shopUrl = slugDerivedShopUrl(result.slug);
      if (shopUrl) {
        window.location.assign(`${shopUrl}/signup`);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not create business. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="landing-page min-h-screen antialiased selection:bg-[var(--kiosk-gold-soft)] selection:text-[var(--kiosk-text)]"
      style={landingRootStyle()}
    >
      <LandingNav onCreateShop={openOnboarding} />

      <main>
        <LandingHero
          shopHost={shopHost}
          showOnboarding={showOnboarding}
          businessName={businessName}
          errorMessage={errorMessage}
          isSubmitting={isSubmitting}
          onCreateShop={openOnboarding}
          onBusinessNameChange={setBusinessName}
          onOnboardSubmit={onOnboardSubmit}
          onOnboardingBack={() => {
            setShowOnboarding(false);
            setErrorMessage("");
          }}
        />

        {!showOnboarding ? (
          <>
            <LandingTrustBar />
            <LandingFeatures />
            <LandingHowItWorks />
            <LandingStats />
            <LandingTestimonials />
            <LandingPricing />
            <LandingCta onCreateShop={openOnboarding} />
          </>
        ) : null}
      </main>

      <LandingFooter />
    </div>
  );
}
