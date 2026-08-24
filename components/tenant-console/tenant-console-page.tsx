"use client";

import { useState } from "react";

import { TalkToUsModal } from "@/components/contact/talk-to-us-modal";

import { LandingCta } from "./landing/landing-cta";
import { LandingFaq } from "./landing/landing-faq";
import { LandingFeatures } from "./landing/landing-features";
import {
  LandingSignInModal,
} from "./landing/landing-sign-in-modal";
import { LandingFooter } from "./landing/landing-footer";
import { LandingGuides } from "./landing/landing-guides";
import { LandingHero } from "./landing/landing-hero";
import { LandingHeroLogos } from "./landing/landing-hero-logos";
import { LandingHowItWorks } from "./landing/landing-how-it-works";
import { LandingKenya } from "./landing/landing-kenya";
import { LandingNav } from "./landing/landing-nav";
import { LandingPricing } from "./landing/landing-pricing";
import { LandingSignupModal } from "./landing/landing-signup-modal";
import { LandingStats } from "./landing/landing-stats";
import { landingRootStyle } from "./landing/landing-styles";
import { LandingTestimonials } from "./landing/landing-testimonials";

export function TenantConsolePage() {
  const [signupOpen, setSignupOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);

  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";

  const openSignup = () => {
    setSignupOpen(true);
  };

  const openSignIn = () => {
    setSignInOpen(true);
  };

  const openTalk = () => {
    setTalkOpen(true);
  };

  return (
    <div
      className="landing-page relative min-h-dvh overflow-x-clip antialiased selection:bg-[var(--kiosk-gold-soft)] selection:text-[var(--kiosk-text)] max-sm:pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:m-[0.85rem] sm:min-h-[calc(100dvh-1.7rem)] sm:rounded-[1.75rem] sm:pb-0 sm:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_48px_-20px_rgba(0,0,0,0.45)]"
      style={landingRootStyle()}
    >
      <div className="landing-page-canvas" aria-hidden />
      <LandingNav
        onCreateShop={openSignup}
        onFindShop={openSignIn}
        onSignIn={openSignIn}
      />

      <main>
        <LandingHero onCreateShop={openSignup} />
        <LandingHeroLogos />
        <LandingFeatures onCreateShop={openSignup} />
        <LandingKenya />
        <LandingHowItWorks />
        <LandingStats />
        <LandingTestimonials />
        <LandingPricing onCreateShop={openSignup} onTalkToUs={openTalk} />
        <LandingFaq />
        <LandingGuides />
        <LandingCta onCreateShop={openSignup} onTalkToUs={openTalk} />
      </main>

      <LandingFooter onTalkToUs={openTalk} />

      <LandingSignupModal
        open={signupOpen}
        onOpenChange={setSignupOpen}
        host={host}
      />
      <LandingSignInModal
        open={signInOpen}
        onOpenChange={setSignInOpen}
        onCreateShop={openSignup}
      />
      <TalkToUsModal
        open={talkOpen}
        onOpenChange={setTalkOpen}
        destination="platform"
        title="Talk to us"
        description="Questions about Kiosk, pricing, or demos — send a message."
      />
    </div>
  );
}
