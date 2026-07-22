"use client";

import { useState } from "react";

import { LandingCta } from "./landing/landing-cta";
import { LandingFeatures } from "./landing/landing-features";
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

  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";

  const openSignup = () => {
    setSignupOpen(true);
  };

  return (
    <div
      className="landing-page relative min-h-screen overflow-x-hidden antialiased selection:bg-[var(--kiosk-gold-soft)] selection:text-[var(--kiosk-text)]"
      style={landingRootStyle()}
    >
      <div className="landing-page-canvas" aria-hidden />
      <LandingNav onCreateShop={openSignup} />

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
    </div>
  );
}
