"use client";

import Image from "next/image";
import {
  ArrowRight,
  Banknote,
  ScanBarcode,
  Smartphone,
  WifiOff,
} from "lucide-react";

import { HeroPosCart } from "./hero-pos-cart";
import { LandingOnboarding } from "./landing-onboarding";
import { goldCtaClass, ghostCtaClass } from "./landing-styles";

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
  "Built with shop owners",
  "M-Pesa STK at the counter",
  "Still sells when Wi‑Fi drops",
] as const;

const SCREENSHOT = {
  src: "/home.png",
  width: 666,
  height: 375,
} as const;

const BENTO_TILES = [
  {
    icon: ScanBarcode,
    label: "Scan to sell",
    sub: "Use your product barcodes",
  },
  {
    icon: Smartphone,
    label: "M-Pesa payments",
    sub: "Customer pays on their phone",
  },
  {
    icon: Banknote,
    label: "Cash or split pay",
    sub: "Print a receipt when done",
  },
] as const;

const heroPrimaryCtaClass = `${goldCtaClass} shadow-[0_1px_2px_rgba(20,20,18,0.06),0_4px_14px_-2px_var(--kiosk-success-shadow)]`;

export function LandingHero({
  showOnboarding,
  businessName,
  errorMessage,
  isSubmitting,
  onOnboardSubmit,
  onOnboardingBack,
  onCreateShop,
  onBusinessNameChange,
}: LandingHeroProps) {
  return (
    <section className="relative isolate overflow-x-hidden bg-[var(--kiosk-bg)] px-5 pb-20 pt-[116px] sm:px-10 sm:pb-24 sm:pt-[128px] md:min-h-[min(100vh,920px)] md:pb-28 md:pt-[136px] lg:px-14 lg:pb-32">
      {!showOnboarding ? <HeroAtmosphere /> : null}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] opacity-40"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 11px,
            var(--kiosk-grid-line) 11px,
            var(--kiosk-grid-line) 12px
          )`,
          maskImage:
            "linear-gradient(90deg, var(--kiosk-bg) 0%, transparent 55%)",
          WebkitMaskImage:
            "linear-gradient(90deg, var(--kiosk-bg) 0%, transparent 55%)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1280px]">
        <div
          className={
            showOnboarding
              ? "max-w-[34rem] md:pl-2"
              : "flex flex-col gap-[4.5rem] sm:gap-24 lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-16 lg:gap-y-0 xl:gap-x-24"
          }
        >
          <div
            className={
              showOnboarding
                ? "min-w-0"
                : "relative z-20 flex min-w-0 flex-col lg:col-span-5 lg:pb-16 lg:pl-2 xl:col-span-5"
            }
          >
            {!showOnboarding ? (
              <div
                aria-hidden
                className="absolute -left-1 top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-[var(--kiosk-gold)]/35 to-transparent lg:-left-4 lg:block"
              />
            ) : null}

            {!showOnboarding ? (
              <p className="landing-reveal mb-10 text-sm font-medium text-[var(--kiosk-gold)] sm:mb-12">
                By people who sell at the counter
              </p>
            ) : null}

            <h1
              className={
                showOnboarding
                  ? "landing-reveal landing-reveal-delay-1 mb-10 font-heading text-[clamp(2.5rem,7vw,5.25rem)] leading-[1.03] tracking-[-0.04em] text-[var(--kiosk-text)]"
                  : "landing-reveal landing-reveal-delay-1 mb-8 font-heading text-[clamp(2.25rem,6.2vw,4.5rem)] leading-[1.04] tracking-[-0.04em] text-[var(--kiosk-text)] sm:mb-10 md:mb-12"
              }
            >
              Your counter deserves a till
              <br />
              <span className="relative mt-1 inline-block">
                <span className="bg-gradient-to-r from-[#20863B] via-[var(--kiosk-gold)] to-[#32B85A] bg-clip-text text-transparent">
                  that works as hard as you do.
                </span>
                <span
                  aria-hidden
                  className="absolute -bottom-2 left-0 h-px w-full max-w-[14rem] bg-gradient-to-r from-[var(--kiosk-gold)]/70 to-transparent"
                />
              </span>
            </h1>

            <p
              className={
                showOnboarding
                  ? "landing-reveal landing-reveal-delay-2 mb-14 max-w-[32rem] text-lg leading-[1.75] text-[var(--kiosk-text-muted)]"
                  : "landing-reveal landing-reveal-delay-2 mb-12 max-w-[26rem] text-[15px] leading-[1.75] text-[var(--kiosk-text-muted)] sm:mb-14 sm:text-[17px] md:mb-16 lg:max-w-[28rem]"
              }
            >
              Get Kiosk free → No card needed. Set up in minutes.
            </p>

            {showOnboarding ? (
              <div className="landing-reveal landing-reveal-delay-3 pt-2">
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
                <div className="landing-reveal landing-reveal-delay-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                  <button
                    type="button"
                    className={`${heroPrimaryCtaClass} w-full justify-center font-medium sm:w-auto`}
                    onClick={onCreateShop}
                  >
                    Get Kiosk free
                    <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </button>
                  <a
                    href="#how"
                    className={`${ghostCtaClass} w-full justify-center sm:w-auto`}
                  >
                    See how it works
                  </a>
                </div>

                <div className="landing-reveal landing-reveal-delay-4 mt-14 grid grid-cols-3 gap-3 sm:mt-16 lg:hidden">
                  {BENTO_TILES.map(({ icon: Icon, label, sub }) => (
                    <div
                      key={label}
                      className="flex flex-col gap-2 rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-3.5"
                    >
                      <Icon
                        className="h-4 w-4 text-[var(--kiosk-gold)]"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-medium leading-snug text-[var(--kiosk-text)]">
                          {label}
                        </p>
                        <p className="text-[10px] leading-snug text-[var(--kiosk-text-dim)]">
                          {sub}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="landing-reveal landing-reveal-delay-4 mt-16 hidden border-t border-[var(--kiosk-border-soft)] pt-12 lg:block">
                  <ul className="flex flex-col gap-4">
                    {TRUST_SIGNALS.map((text) => (
                      <li
                        key={text}
                        className="flex items-center gap-4 text-[13px] font-medium tracking-[-0.01em] text-[var(--kiosk-text-soft)]"
                      >
                        <span
                          className="h-px w-8 shrink-0 bg-[var(--kiosk-gold)]/45"
                          aria-hidden
                        />
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          {!showOnboarding ? (
            <div className="landing-reveal landing-reveal-delay-2 relative z-10 min-w-0 lg:col-span-7 lg:pb-8 lg:pt-10 xl:col-span-7">
              <HeroCreativeStage />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function HeroAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute -right-[14%] top-[6%] h-[min(70vh,640px)] w-[min(92%,920px)] md:-right-[10%] md:top-[10%] md:h-[min(72vh,720px)]">
        <div className="hero-backdrop-drift relative h-full w-full opacity-[0.58] sm:opacity-[0.62] md:opacity-[0.68]">
          <Image
            src={SCREENSHOT.src}
            alt=""
            fill
            className="object-cover object-left-top blur-2xl saturate-[1.15] contrast-[1.04]"
            sizes="(max-width: 768px) 92vw, 920px"
            priority
          />
        </div>
      </div>

      <div
        className="absolute -right-[6%] top-[14%] hidden h-[min(56vh,500px)] w-[min(76%,780px)] opacity-[0.32] md:block lg:opacity-[0.38]"
        style={{
          maskImage:
            "radial-gradient(ellipse 88% 78% at 52% 42%, black 30%, transparent 68%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 88% 78% at 52% 42%, black 30%, transparent 68%)",
        }}
      >
        <Image
          src={SCREENSHOT.src}
          alt=""
          fill
          className="object-cover object-left-top blur-lg saturate-[1.1]"
          sizes="55vw"
          priority
        />
      </div>

      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            100deg,
            var(--kiosk-bg) 0%,
            color-mix(in srgb, var(--kiosk-bg) 88%, transparent) 34%,
            color-mix(in srgb, var(--kiosk-bg) 45%, transparent) 50%,
            transparent 72%
          )`,
        }}
      />

      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--kiosk-bg)] via-[var(--kiosk-bg)]/50 to-transparent lg:hidden" />
    </div>
  );
}

function HeroCreativeStage() {
  return (
    <div className="flex flex-col gap-12 lg:gap-14">
      <div className="hidden gap-5 lg:grid lg:grid-cols-3 lg:gap-6">
        {BENTO_TILES.map(({ icon: Icon, label, sub }, index) => (
          <div
            key={label}
            className="group flex flex-col gap-4 rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)]/95 p-5 shadow-sm backdrop-blur-sm transition-colors hover:border-[var(--kiosk-gold-border)]"
            style={{ marginTop: index === 1 ? "1rem" : 0 }}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--kiosk-gold-soft)]">
              <Icon
                className="h-[18px] w-[18px] text-[var(--kiosk-gold)]"
                strokeWidth={1.75}
                aria-hidden
              />
            </span>
            <div className="space-y-1">
              <p className="text-[14px] font-medium leading-snug text-[var(--kiosk-text)]">
                {label}
              </p>
              <p className="text-[12px] leading-relaxed text-[var(--kiosk-text-dim)]">
                {sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative px-1 sm:px-2 lg:px-4">
        <p className="mb-4 hidden text-[13px] text-[var(--kiosk-text-dim)] lg:block">
          The screen we use behind the counter every day
        </p>

        <div className="hero-stage-tilt relative z-10 mx-auto max-w-[620px] lg:mr-0 lg:max-w-none">
          <div
            aria-hidden
            className="absolute inset-0 translate-x-[5%] translate-y-[6%] overflow-hidden rounded-2xl border border-[var(--kiosk-border-soft)] opacity-30"
            style={{ transform: "rotate(2deg)" }}
          >
            <Image
              src={SCREENSHOT.src}
              alt=""
              width={SCREENSHOT.width}
              height={SCREENSHOT.height}
              className="h-full w-full object-cover object-left-top"
            />
          </div>

          <div className="hero-border-glow rounded-[20px] p-[1.5px]">
            <div className="hero-premium-frame relative overflow-hidden rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)]">
              <Image
                src={SCREENSHOT.src}
                alt="Kiosk point of sale built by shop owners — scan, M-Pesa STK, and in-store checkout"
                width={SCREENSHOT.width}
                height={SCREENSHOT.height}
                quality={95}
                className="relative z-[1] block h-auto w-full"
                priority
                sizes="(max-width: 1024px) 100vw, 52vw"
              />
              <HeroPosCart />
            </div>
          </div>
        </div>

        <div
          aria-hidden
          className="absolute -bottom-8 left-[12%] right-[12%] h-16 rounded-full bg-[var(--kiosk-text)]/[0.06] blur-3xl lg:-bottom-10"
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 lg:justify-end lg:gap-4 lg:pr-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] px-4 py-2 text-[11px] font-medium text-[var(--kiosk-text-soft)]">
          <ScanBarcode className="h-3.5 w-3.5 text-[var(--kiosk-gold)]" aria-hidden />
          Scan products
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] px-4 py-2 text-[11px] font-medium text-[var(--kiosk-text-soft)]">
          <WifiOff className="h-3.5 w-3.5 text-[var(--kiosk-text-dim)]" aria-hidden />
          Works offline
        </span>
      </div>
    </div>
  );
}
