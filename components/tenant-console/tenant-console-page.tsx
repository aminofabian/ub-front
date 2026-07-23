"use client";

import { useState } from "react";

import { LandingCta } from "./landing/landing-cta";
import { LandingFeatures } from "./landing/landing-features";
import { LandingFindShopModal } from "./landing/landing-find-shop-modal";
import { LandingFooter } from "./landing/landing-footer";
import { LandingHero } from "./landing/landing-hero";
import { LandingHowItWorks } from "./landing/landing-how-it-works";
import { LandingNav } from "./landing/landing-nav";
import { LandingPricing } from "./landing/landing-pricing";
import { LandingSignupModal } from "./landing/landing-signup-modal";
import { LandingStats } from "./landing/landing-stats";
import { landingRootStyle } from "./landing/landing-styles";
import { LandingTestimonials } from "./landing/landing-testimonials";
import { LandingTrustBar } from "./landing/landing-trust-bar";

export function TenantConsolePage() {
  const [signupOpen, setSignupOpen] = useState(false);
  const [findShopOpen, setFindShopOpen] = useState(false);

  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";

  const openSignup = () => {
    setSignupOpen(true);
  };

  const openFindShop = () => {
    setFindShopOpen(true);
  };

  return (
    <div
      className="landing-page relative m-2.5 min-h-[calc(100dvh-1.25rem)] overflow-x-clip rounded-[1.35rem] antialiased shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_48px_-20px_rgba(0,0,0,0.45)] selection:bg-[var(--kiosk-gold-soft)] selection:text-[var(--kiosk-text)] sm:m-[0.85rem] sm:min-h-[calc(100dvh-1.7rem)] sm:rounded-[1.75rem]"
      style={landingRootStyle()}
    >
      <div className="landing-page-canvas" aria-hidden />
      <LandingNav onCreateShop={openSignup} onFindShop={openFindShop} />

      <main>
        <LandingHero onCreateShop={openSignup} />

        <LandingTrustBar />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingStats />
        <LandingTestimonials />
        <LandingPricing onCreateShop={openSignup} />
        <LandingCta onCreateShop={openSignup} />
      </main>

      <LandingFooter />

      <LandingSignupModal
        open={signupOpen}
        onOpenChange={setSignupOpen}
        host={host}
      />
      <LandingFindShopModal
        open={findShopOpen}
        onOpenChange={setFindShopOpen}
        onCreateShop={openSignup}
      />
    </div>
  );
}
