"use client";

import {
  ContactActions,
  LandingBrandHeader,
  LandingShell,
  resolveLandingCopy,
} from "@/components/storefront/templates/landing/shared";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";

const CUTS = [
  { name: "Beef stew", note: "Boneless cubes" },
  { name: "Goat chops", note: "Cut to thickness" },
  { name: "Chicken", note: "Whole or pieces" },
  { name: "Mince", note: "Fresh daily" },
  { name: "Offal", note: "Ask at the counter" },
  { name: "Sausages", note: "When available" },
];

export function ButcheryCutLanding(props: LandingTemplateProps) {
  const brand = props.accentHex || props.primaryHex || "#EA580C";
  const copy = resolveLandingCopy(props.storeName, props.landingContent, {
    headline: `${props.storeName} cuts`,
    subheadline: "Order by phone — we cut to your preference and hold for pickup.",
    ctaLabel: "Call to order",
    hours: "Tue–Sun 6:00–18:00",
    address: "Counter service · no appointment needed",
  });

  return (
    <LandingShell
      templateId="butchery-cut"
      storeName={props.storeName}
      className="bg-stone-950 text-stone-50"
    >
      <div className="mx-auto min-h-screen max-w-4xl px-5 py-8 sm:px-8">
        <LandingBrandHeader
          storeName={props.storeName}
          logoUrl={props.logoUrl}
          primaryHex={brand}
          light
        />
        <main className="py-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-400">
            Butchery board
          </p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{copy.headline}</h1>
          <p className="mt-4 max-w-xl text-stone-300">{copy.subheadline}</p>
          <ul className="mt-10 grid gap-px bg-stone-800 sm:grid-cols-2">
            {CUTS.map((cut) => (
              <li
                key={cut.name}
                className="flex items-baseline justify-between gap-3 bg-stone-950 px-4 py-4"
              >
                <span className="font-medium">{cut.name}</span>
                <span className="text-sm text-stone-400">{cut.note}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-stone-400">
            {copy.hours} · {copy.address}
          </p>
          <div className="mt-8">
            <ContactActions
              phone={copy.phone}
              whatsapp={copy.whatsapp}
              ctaLabel={copy.ctaLabel}
              brand={brand}
            />
          </div>
        </main>
      </div>
    </LandingShell>
  );
}
