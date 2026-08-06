"use client";

import Image from "next/image";

import {
  ContactActions,
  LandingBrandHeader,
  LandingShell,
  resolveLandingCopy,
} from "@/components/storefront/templates/landing/shared";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";

const HIGHLIGHTS = [
  "Seasonal produce",
  "Dairy & eggs",
  "Fresh herbs",
  "Weekly specials",
];

export function FreshMarketLanding(props: LandingTemplateProps) {
  const brand = props.primaryHex || props.accentHex || "#15803D";
  const copy = resolveLandingCopy(props.storeName, props.landingContent, {
    headline: `${props.storeName} market`,
    subheadline: "Farm-fresh picks, stacked daily. Come early for the best crates.",
    ctaLabel: "Order today's box",
    hours: "Open daily 6:30–19:00",
    address: "Find us at the market row",
  });

  return (
    <LandingShell
      templateId="fresh-market"
      storeName={props.storeName}
      className="bg-emerald-50 text-stone-900"
    >
      <div className="relative min-h-screen">
        <div className="absolute inset-0">
          <Image
            src="/hello/fudowakira0-paprika-638654_1920.jpg"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/85 via-emerald-950/45 to-emerald-950/20" />
        </div>
        <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col px-5 py-8 text-white sm:px-8">
          <LandingBrandHeader
            storeName={props.storeName}
            logoUrl={props.logoUrl}
            primaryHex={brand}
            light
          />
          <main className="flex flex-1 flex-col justify-end gap-6 pb-10 pt-24">
            <h1 className="max-w-xl font-serif text-4xl leading-tight sm:text-6xl">
              {copy.headline}
            </h1>
            <p className="max-w-lg text-base text-emerald-50/90">
              {copy.subheadline}
            </p>
            <div className="flex flex-wrap gap-2">
              {HIGHLIGHTS.map((item) => (
                <span
                  key={item}
                  className="border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium tracking-wide"
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="text-sm text-emerald-100/80">
              {copy.hours} · {copy.address}
            </p>
            <ContactActions
              phone={copy.phone}
              whatsapp={copy.whatsapp}
              ctaLabel={copy.ctaLabel}
              brand={brand}
            />
          </main>
        </div>
      </div>
    </LandingShell>
  );
}
