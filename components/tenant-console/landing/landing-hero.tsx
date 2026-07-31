"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { HeroPosCart } from "./hero-pos-cart";
import { LandingDesktopDownloadLink } from "./landing-desktop-download-link";
import { goldCtaClass, ghostCtaClass } from "./landing-styles";

type LandingHeroProps = {
  onCreateShop: () => void;
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

const CAPABILITIES = [
  {
    code: "01",
    label: "Scan to sell",
    shortLabel: "Scan",
    detail: "Product barcodes",
    shortDetail: "Barcodes",
  },
  {
    code: "02",
    label: "M-Pesa",
    shortLabel: "M-Pesa",
    detail: "STK on their phone",
    shortDetail: "STK push",
  },
  {
    code: "03",
    label: "Cash / split",
    shortLabel: "Cash",
    detail: "Print the receipt",
    shortDetail: "Receipts",
  },
] as const;

const heroPrimaryCtaClass = `${goldCtaClass} shadow-[0_1px_2px_rgba(20,20,18,0.06),0_4px_14px_-2px_var(--kiosk-success-shadow)]`;

export function LandingHero({ onCreateShop }: LandingHeroProps) {
  return (
    <section className="landing-hero relative isolate flex min-h-[calc(100svh-3.75rem)] flex-col overflow-x-hidden bg-[var(--kiosk-bg)] px-4 pb-10 pt-5 max-sm:pb-[5.5rem] sm:min-h-[calc(100svh-5.7rem)] sm:px-10 sm:pb-16 sm:pt-12 lg:px-14 lg:pb-20 lg:pt-14">
      <HeroAtmosphere />

      <div className="landing-mobile-cta sm:hidden">
        <button
          type="button"
          className={`${heroPrimaryCtaClass} landing-mobile-cta-btn w-full justify-center font-medium`}
          onClick={onCreateShop}
        >
          Get Kiosk free
          <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </div>



      <div className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 flex-col justify-center">
        <div className="flex flex-col gap-6 sm:gap-14 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-14 xl:gap-x-20">
          <div className="relative z-20 order-1 flex min-w-0 flex-col max-lg:bg-[color-mix(in_srgb,var(--kiosk-bg)_88%,transparent)] lg:col-span-5 lg:bg-transparent lg:pl-2 xl:col-span-5">
            <div
              aria-hidden
              className="absolute -left-1 top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-[var(--kiosk-gold)]/35 to-transparent lg:-left-4 lg:block"
            />

            <h1 className="landing-reveal landing-reveal-delay-1 mb-3 font-heading text-[clamp(1.9rem,8.4vw,4rem)] leading-[1.05] tracking-[-0.03em] text-[var(--kiosk-text)] sm:mb-7">
              The POS
              <br />
              <span className="relative mt-0.5 inline-block font-semibold text-[var(--kiosk-gold)] sm:mt-1">
                that works as hard as you do.
              </span>
            </h1>

            <p className="landing-reveal landing-reveal-delay-2 mb-5 max-w-[26rem] text-[14px] leading-[1.55] text-[var(--kiosk-text-muted)] sm:mb-10 sm:text-[17px] sm:leading-[1.7] lg:max-w-[28rem]">
              <span className="md:hidden">
                Scan barcodes, take M-Pesa at the counter, and keep selling when
                the network drops.
              </span>
              <span className="hidden md:inline">
                Kiosk is the point of sale, inventory, and online storefront for
                Kenyan shops — scan barcodes, take M-Pesa at the counter, and
                keep selling when the network drops.
              </span>
            </p>

            <div className="landing-reveal landing-reveal-delay-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
              <button
                type="button"
                className={`${heroPrimaryCtaClass} landing-hero-cta-desktop justify-center px-5 py-3.5 font-medium sm:w-auto sm:px-6 sm:py-3`}
                onClick={onCreateShop}
              >
                Get Kiosk free
                <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
              <a
                href="#how"
                className={`${ghostCtaClass} w-full justify-center px-5 py-3.5 max-sm:border-0 max-sm:bg-transparent max-sm:px-0 max-sm:py-2 max-sm:justify-start max-sm:text-[var(--kiosk-gold)] max-sm:hover:bg-transparent sm:w-auto sm:px-6 sm:py-3`}
              >
                See how it works
              </a>
            </div>

            <div className="landing-reveal landing-reveal-delay-3 mt-4 sm:mt-5">
              <LandingDesktopDownloadLink />
            </div>

            <div className="landing-hero-stats-row landing-reveal landing-reveal-delay-4 mt-8 hidden border-t border-[var(--kiosk-border-soft)] pt-8 lg:mt-10 lg:grid lg:pt-8">
              <HeroStats />
            </div>

            <ul className="landing-hero-trust landing-reveal landing-reveal-delay-4 mt-6 hidden flex-col lg:flex">
              {TRUST_SIGNALS.map((text) => (
                <li key={text} className="landing-hero-trust-item">
                  <span className="landing-hero-trust-rule" aria-hidden />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="landing-reveal landing-reveal-delay-2 relative z-10 order-2 -mx-4 min-w-0 sm:-mx-1 lg:order-none lg:col-span-7 lg:mx-0 xl:col-span-7">
            <HeroCreativeStage />
          </div>

          <div className="landing-hero-stats-row landing-reveal landing-reveal-delay-4 order-3 mt-1 grid border-t border-[var(--kiosk-border-soft)] pt-5 lg:hidden">
            <HeroStats />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStats() {
  return (
    <>
      <div className="landing-hero-stat">
        <span className="landing-hero-stat-value">Free</span>
        <span className="landing-hero-stat-label">to start</span>
      </div>
      <div className="landing-hero-stat">
        <span className="landing-hero-stat-value">&lt; 10 min</span>
        <span className="landing-hero-stat-label">setup</span>
      </div>
      <div className="landing-hero-stat">
        <span className="landing-hero-stat-value">M-Pesa</span>
        <span className="landing-hero-stat-label">built in</span>
      </div>
    </>
  );
}

function HeroAtmosphere() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-[42%] opacity-[0.42] md:hidden">
        <div className="hero-backdrop-drift relative h-full w-full">
          <Image
            src={SCREENSHOT.src}
            alt=""
            fill
            className="object-cover object-left-top blur-2xl saturate-[1.12] contrast-[1.03]"
            sizes="100vw"
            priority
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(
              180deg,
              color-mix(in srgb, var(--kiosk-bg) 35%, transparent) 0%,
              color-mix(in srgb, var(--kiosk-bg) 78%, transparent) 55%,
              var(--kiosk-bg) 100%
            )`,
          }}
        />
      </div>

      <div className="absolute -right-[14%] top-[6%] hidden h-[min(70vh,640px)] w-[min(92%,920px)] md:block md:-right-[10%] md:top-[10%] md:h-[min(72vh,720px)]">
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
        className="absolute inset-0 hidden md:block"
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
    </div>
  );
}

function HeroCreativeStage() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-7">
      <ul className="landing-hero-caps hidden xl:grid xl:grid-cols-3">
        {CAPABILITIES.map((cap) => (
          <li key={cap.code} className="landing-hero-cap">
            <span className="landing-hero-cap-code">{cap.code}</span>
            <div className="min-w-0">
              <p className="landing-hero-cap-label">{cap.label}</p>
              <p className="landing-hero-cap-detail">{cap.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="relative px-0 sm:px-2 lg:px-0">
        <div className="mb-3 hidden items-baseline justify-between gap-4 xl:mb-4 xl:flex">
          <p className="text-[13px] text-[var(--kiosk-text-dim)]">
            The screen we use behind the counter every day
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-text-faint)]">
            Live till · offline ready
          </p>
        </div>

        <p className="mb-2.5 flex items-baseline justify-between gap-3 px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)] sm:px-0 xl:hidden">
          <span>Live till</span>
          <span>Offline ready</span>
        </p>

        <div className="hero-stage-tilt relative z-10 mx-auto w-full max-w-none sm:max-w-[520px] lg:mr-0 lg:max-w-none">
          <div
            aria-hidden
            className="absolute inset-0 hidden translate-x-[5%] translate-y-[6%] overflow-hidden border border-[var(--kiosk-border-soft)] opacity-30 sm:block"
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

          <div className="hero-border-glow p-px max-md:rounded-none">
            <div className="hero-premium-frame relative overflow-hidden border border-[var(--kiosk-border)] border-x-0 bg-[var(--kiosk-elevated)] sm:border-x">
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
      </div>

      <ul className="landing-hero-caps landing-hero-caps--mobile mx-4 grid grid-cols-3 sm:mx-0 xl:hidden">
        {CAPABILITIES.map((cap) => (
          <li key={cap.code} className="landing-hero-cap">
            <span className="landing-hero-cap-code">{cap.code}</span>
            <div className="min-w-0">
              <p className="landing-hero-cap-label">
                <span className="sm:hidden">{cap.shortLabel}</span>
                <span className="hidden sm:inline">{cap.label}</span>
              </p>
              <p className="landing-hero-cap-detail">
                <span className="sm:hidden">{cap.shortDetail}</span>
                <span className="hidden sm:inline">{cap.detail}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
