"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";

import { LandingOnboarding } from "./landing-onboarding";
import { goldCtaClass, ghostCtaClass, logoPillClass } from "./landing-styles";

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
  "Free subdomain — yourshop.kiosk.ke",
  "Barcode scanner built in",
  "Works offline — no internet, no problem",
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
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden px-5 pb-20 pt-[120px] sm:px-10 sm:pb-28">
      {/* ── Grid background ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(var(--kiosk-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--kiosk-grid-line) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 20%, black 0%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 50% 20%, black 0%, transparent 100%)",
        }}
      />

      {/* ── Golden glow ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[10%] z-0 h-[400px] w-[600px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(ellipse, var(--kiosk-glow-gold) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1100px]">
        {/* ── Beta badge ── */}
        <div className="landing-reveal mb-8">
          <span className={logoPillClass}>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "var(--kiosk-gold)" }}
            />
            Now in public beta
          </span>
        </div>

        {/* ── Heading ── */}
        <h1
          className="landing-reveal landing-reveal-delay-1 mb-8 max-w-[820px] font-serif text-[clamp(44px,7vw,88px)] leading-[1.02] tracking-[-0.02em] text-[var(--kiosk-text)]"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Every register,
          <br />
          <em style={{ color: "var(--kiosk-gold)" }}>one inventory.</em>
        </h1>

        {/* ── Subtitle ── */}
        <p className="landing-reveal landing-reveal-delay-2 mb-12 max-w-[520px] text-[clamp(16px,2vw,20px)] leading-[1.65] font-light text-[var(--kiosk-text-muted)]">
          Kiosk is a retail operating system that combines point of sale,
          inventory management, and a branded online storefront — with barcode
          scanning, M-Pesa payments, and offline support built in.
        </p>

        {/* ── CTA or Onboarding ── */}
        {showOnboarding ? (
          <div className="landing-reveal landing-reveal-delay-3">
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
            <div className="landing-reveal landing-reveal-delay-3 flex flex-wrap items-center gap-4">
              <button
                type="button"
                className={goldCtaClass}
                onClick={onCreateShop}
              >
                Start your shop
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
              <a href="#how" className={ghostCtaClass}>
                See how it works
              </a>
            </div>

            {/* Trust signals */}
            <div className="landing-reveal landing-reveal-delay-4 mt-10 flex flex-wrap items-center gap-6">
              {TRUST_SIGNALS.map((text) => (
                <div key={text} className="flex items-center gap-2">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M2 7l3.5 3.5L12 3"
                      stroke="#C8A96E"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-[13px] text-[var(--kiosk-text-soft)]">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Dashboard mockup ── */}
      {!showOnboarding ? (
        <div className="landing-reveal landing-reveal-delay-4 relative z-10 mx-auto mt-[72px] w-full max-w-[1100px]">
          <DashboardMockup />
          <div
            className="h-[60px] -mt-px rounded-b-xl"
            style={{
              background:
                "linear-gradient(to bottom, rgba(200,169,110,0.03), transparent)",
            }}
            aria-hidden
          />
        </div>
      ) : null}
    </section>
  );
}

function DashboardMockup() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--kiosk-border)]"
      style={{ backgroundColor: "var(--kiosk-elevated)", aspectRatio: "16/7" }}
      aria-hidden
    >
      {/* Browser bar */}
      <div
        className="flex h-9 items-center gap-1.5 border-b px-3.5"
        style={{
          backgroundColor: "var(--kiosk-panel)",
          borderBottomColor: "var(--kiosk-border-soft)",
        }}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "#FF5F57" }}
        />
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "#FEBC2E" }}
        />
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: "#28C840" }}
        />
        <div
          className="mx-3 flex h-5 flex-1 items-center justify-center rounded"
          style={{ backgroundColor: "var(--kiosk-card-bg)" }}
        >
          <span className="text-[11px] text-[var(--kiosk-text-dim)]">
            app.kiosk.ke/dashboard
          </span>
        </div>
      </div>

      {/* Dashboard body */}
      <div
        className="grid h-[calc(100%-36px)]"
        style={{ gridTemplateColumns: "220px 1fr" }}
      >
        {/* Sidebar */}
        <div
          className="border-r p-5"
          style={{
            backgroundColor: "var(--kiosk-surface)",
            borderRightColor: "var(--kiosk-border-soft)",
          }}
        >
          <div className="mb-6 flex items-center gap-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <rect x="3" y="3" width="8" height="8" rx="2" fill="#C8A96E" />
              <rect
                x="13"
                y="3"
                width="8"
                height="8"
                rx="2"
                fill="#C8A96E"
                opacity="0.5"
              />
              <rect
                x="3"
                y="13"
                width="8"
                height="8"
                rx="2"
                fill="#C8A96E"
                opacity="0.4"
              />
              <rect
                x="13"
                y="13"
                width="8"
                height="8"
                rx="2"
                fill="#C8A96E"
                opacity="0.2"
              />
            </svg>
            <span className="text-[13px] font-medium text-[var(--kiosk-text)]">
              Kiosk
            </span>
          </div>
          {[
            "Overview",
            "Sales",
            "Inventory",
            "Storefronts",
            "Branches",
            "Reports",
          ].map((item, i) => (
            <div
              key={item}
              className="mb-0.5 cursor-pointer rounded-md px-3 py-2 text-xs"
              style={{
                color: i === 0 ? "var(--kiosk-gold)" : "var(--kiosk-text-dim)",
                backgroundColor:
                  i === 0 ? "var(--kiosk-gold-soft)" : "transparent",
              }}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div className="overflow-hidden p-5 sm:px-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-medium text-[var(--kiosk-text)]">
                Overview
              </div>
              <div className="text-[11px] text-[var(--kiosk-text-dim)]">
                Today, 18 May 2026
              </div>
            </div>
            <div className="flex gap-2">
              <div
                className="rounded-md border px-3 py-1 text-[11px]"
                style={{
                  borderColor: "var(--kiosk-border)",
                  color: "var(--kiosk-text-soft)",
                }}
              >
                This week
              </div>
              <div
                className="rounded-md border px-3 py-1 text-[11px]"
                style={{
                  borderColor: "var(--kiosk-gold-border)",
                  color: "var(--kiosk-gold)",
                  backgroundColor: "var(--kiosk-gold-soft)",
                }}
              >
                Today
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            {[
              {
                label: "Revenue today",
                value: "KES 84,320",
                change: "+12.4%",
                up: true,
              },
              {
                label: "Orders",
                value: "247",
                change: "+8.1%",
                up: true,
              },
              {
                label: "Stock alerts",
                value: "3 items",
                change: "Low",
                up: false,
              },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-lg border p-3.5"
                style={{
                  backgroundColor: "var(--kiosk-elevated)",
                  borderColor: "var(--kiosk-border-soft)",
                }}
              >
                <div
                  className="mb-2 text-[10px]"
                  style={{ color: "var(--kiosk-text-dim)" }}
                >
                  {s.label}
                </div>
                <div className="mb-1 text-lg font-medium text-[var(--kiosk-text)]">
                  {s.value}
                </div>
                <div
                  className="text-[10px]"
                  style={{
                    color: s.up
                      ? "var(--kiosk-success)"
                      : "var(--kiosk-danger)",
                  }}
                >
                  {s.change}
                </div>
              </div>
            ))}
          </div>

          {/* Mini chart */}
          <div
            className="flex h-20 items-end gap-1 rounded-lg border px-4 py-3"
            style={{
              backgroundColor: "var(--kiosk-elevated)",
              borderColor: "var(--kiosk-border-soft)",
            }}
          >
            {[30, 55, 40, 70, 50, 85, 65, 90, 75, 95, 80, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${h * 0.56}px`,
                  backgroundColor:
                    i === 11 ? "var(--kiosk-gold)" : "var(--kiosk-gold-soft)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
