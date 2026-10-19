"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { HeroPosCart } from "./hero-pos-cart";
import { goldCtaClass, ghostCtaClass } from "./landing-styles";

type LandingHeroProps = {
  onCreateShop: () => void;
};

const SCREENSHOT = {
  src: "/home.png",
  width: 666,
  height: 375,
} as const;

const FACTS = [
  { label: "Free to start", detail: "300 products" },
  { label: "Under 10 minutes", detail: "to your first sale" },
  { label: "M-Pesa", detail: "built into the counter" },
] as const;

export function LandingHero({ onCreateShop }: LandingHeroProps) {
  return (
    <section className="landing-hero relative isolate overflow-x-clip bg-[var(--kiosk-bg)] px-5 pb-10 pt-24 sm:px-10 sm:pb-14 sm:pt-28 lg:px-14 lg:pb-16 lg:pt-32">
      <HeroAtmosphere />

      <div className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-col">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14 xl:gap-20">
          <div className="landing-reveal landing-reveal-delay-1 min-w-0 lg:col-span-6 lg:pr-4">
            <h1 className="landing-hero-title">
              <span className="block">POS for Kenya</span>
              <span className="landing-hero-title-em block">
                for the way you sell.
              </span>
            </h1>

            <p className="landing-hero-lede landing-reveal landing-reveal-delay-2">
              Barcodes, M-Pesa at the counter, offline sales, inventory, and a
              storefront from one stock count.
            </p>

            <div className="landing-reveal landing-reveal-delay-3 mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-5">
              <button
                type="button"
                className={`${goldCtaClass} landing-hero-cta justify-center px-7`}
                onClick={onCreateShop}
              >
                Start free
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover/cta:translate-x-0.5"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </button>
              <a
                href="#how"
                className={`${ghostCtaClass} justify-center border-transparent px-2 hover:border-transparent hover:bg-transparent sm:px-0`}
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="landing-reveal landing-reveal-delay-2 min-w-0 lg:col-span-6">
            <figure className="landing-hero-figure">
              <div className="landing-hero-image">
                <Image
                  src={SCREENSHOT.src}
                  alt="A cashier using the Kiosk point of sale at a Kenyan shop counter"
                  width={SCREENSHOT.width}
                  height={SCREENSHOT.height}
                  quality={95}
                  className="block h-auto w-full"
                  priority
                  sizes="(max-width: 1024px) 100vw, 48vw"
                />
                <HeroPosCart />
              </div>
              <figcaption className="landing-hero-caption">
                <span>Mirema Drive, Nairobi</span>
                <span aria-hidden>·</span>
                <span>A live Kiosk counter</span>
              </figcaption>
            </figure>
          </div>
        </div>

        <div className="landing-hero-facts landing-reveal landing-reveal-delay-4">
          {FACTS.map((fact) => (
            <div key={fact.label} className="landing-hero-fact">
              <span className="landing-hero-fact-label">{fact.label}</span>
              <span className="landing-hero-fact-detail">{fact.detail}</span>
            </div>
          ))}
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_58%_46%_at_78%_18%,color-mix(in_srgb,var(--kiosk-gold)_7%,transparent),transparent_70%)]" />
      <div className="absolute inset-y-0 right-[38%] hidden w-px bg-[color-mix(in_srgb,var(--kiosk-text)_7%,transparent)] lg:block" />
    </div>
  );
}
