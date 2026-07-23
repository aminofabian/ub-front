"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { HeroPosCart } from "./hero-pos-cart";
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
  { code: "01", label: "Scan to sell", detail: "Product barcodes" },
  { code: "02", label: "M-Pesa", detail: "STK on their phone" },
  { code: "03", label: "Cash / split", detail: "Print the receipt" },
] as const;

const heroPrimaryCtaClass = `${goldCtaClass} shadow-[0_1px_2px_rgba(20,20,18,0.06),0_4px_14px_-2px_var(--kiosk-success-shadow)]`;

export function LandingHero({ onCreateShop }: LandingHeroProps) {
  return (
    <section className="relative isolate overflow-x-hidden bg-[var(--kiosk-bg)] px-4 pb-12 pt-8 sm:px-10 sm:pb-24 sm:pt-16 md:min-h-[min(100vh,920px)] md:pb-28 md:pt-20 lg:px-14 lg:pb-32">
      <HeroAtmosphere />

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
        <div className="flex flex-col gap-8 sm:gap-24 lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-16 lg:gap-y-0 xl:gap-x-24">
          <div className="relative z-20 flex min-w-0 flex-col max-lg:bg-[color-mix(in_srgb,var(--kiosk-bg)_92%,transparent)] max-lg:pb-1 lg:col-span-5 lg:bg-transparent lg:pb-16 lg:pl-2 xl:col-span-5">
            <div
              aria-hidden
              className="absolute -left-1 top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-[var(--kiosk-gold)]/35 to-transparent lg:-left-4 lg:block"
            />

            <p className="landing-reveal landing-hero-eyebrow mb-6 max-w-full sm:mb-11">
              <span className="landing-hero-eyebrow-stub" aria-hidden>
                <span className="landing-hero-eyebrow-scan">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                <span className="landing-hero-eyebrow-code">Till</span>
              </span>
              <span className="landing-hero-eyebrow-perf" aria-hidden />
              <span className="landing-hero-eyebrow-copy min-w-0">
                <span className="landing-hero-eyebrow-line">
                  Built at the counter
                </span>
                <span className="landing-hero-eyebrow-sub">
                  for shop owners in Kenya
                </span>
              </span>
            </p>

            <h1 className="landing-reveal landing-reveal-delay-1 mb-5 font-heading text-[clamp(1.75rem,8.2vw,4.5rem)] leading-[1.08] tracking-[-0.04em] text-[var(--kiosk-text)] sm:mb-10 md:mb-12">
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

            <p className="landing-reveal landing-reveal-delay-2 mb-8 max-w-[26rem] text-[15px] leading-[1.7] text-[var(--kiosk-text-muted)] sm:mb-14 sm:text-[17px] md:mb-16 lg:max-w-[28rem]">
              Kiosk is the point of sale, inventory, and online storefront for
              Kenyan shops — scan barcodes, take M-Pesa at the counter, and keep
              selling when the network drops.
            </p>

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

            <div className="landing-hero-stats-row landing-reveal landing-reveal-delay-4 mt-8 border-t border-[var(--kiosk-border-soft)] pt-6 lg:hidden">
              <div className="landing-hero-stat">
                <span className="landing-hero-stat-value">Free</span>
                <span className="landing-hero-stat-label">to start</span>
              </div>
              <div className="landing-hero-stat">
                <span className="landing-hero-stat-value">10 min</span>
                <span className="landing-hero-stat-label">setup</span>
              </div>
              <div className="landing-hero-stat">
                <span className="landing-hero-stat-value">M-Pesa</span>
                <span className="landing-hero-stat-label">built in</span>
              </div>
            </div>

            <div className="landing-reveal landing-reveal-delay-4 mt-16 hidden border-t border-[var(--kiosk-border-soft)] pt-12 lg:block">
              <div className="mb-10 flex gap-8">
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
              </div>
              <ul className="landing-hero-trust">
                {TRUST_SIGNALS.map((text) => (
                  <li key={text} className="landing-hero-trust-item">
                    <span className="landing-hero-trust-rule" aria-hidden />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="landing-reveal landing-reveal-delay-2 relative z-10 -mx-1 min-w-0 max-lg:mt-1 lg:col-span-7 lg:mx-0 lg:pb-8 lg:pt-10 xl:col-span-7">
            <HeroCreativeStage />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroAtmosphere() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
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

      <div
        className="absolute inset-0 md:hidden"
        style={{
          background: `linear-gradient(
            180deg,
            var(--kiosk-bg) 0%,
            var(--kiosk-bg) 50%,
            color-mix(in srgb, var(--kiosk-bg) 88%, transparent) 100%
          )`,
        }}
      />
    </div>
  );
}

function HeroCreativeStage() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8 lg:gap-10">
      <ul className="landing-hero-caps hidden lg:grid lg:grid-cols-3">
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
        <div className="mb-3 flex items-baseline justify-between gap-4 lg:mb-4">
          <p className="hidden text-[13px] text-[var(--kiosk-text-dim)] lg:block">
            The screen we use behind the counter every day
          </p>
          <p className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-text-faint)] lg:block">
            Live till · offline ready
          </p>
        </div>

        <div className="hero-stage-tilt relative z-10 mx-auto w-full max-w-[min(100%,400px)] sm:max-w-[520px] lg:mr-0 lg:max-w-none">
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

          <div className="hero-border-glow p-px">
            <div className="hero-premium-frame relative overflow-hidden border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)]">
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

      <ul className="landing-hero-caps grid grid-cols-1 sm:grid-cols-3 lg:hidden">
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
    </div>
  );
}
