"use client";

import {
  ContactActions,
  LandingBrandHeader,
  LandingShell,
  resolveLandingCopy,
} from "@/components/storefront/templates/landing/shared";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";
import { Clock, MapPin, MessageCircle } from "lucide-react";

export function NeighborhoodBoardLanding(props: LandingTemplateProps) {
  const brand = props.primaryHex || props.accentHex || "#B45309";
  const copy = resolveLandingCopy(props.storeName, props.landingContent, {
    headline: `Welcome to ${props.storeName}`,
    subheadline: "Your neighborhood shop — open for walk-ins and WhatsApp orders.",
    ctaLabel: "Message us on WhatsApp",
    hours: "Mon–Sat 7:00–21:00 · Sun 8:00–18:00",
    address: "Ask us for directions when you visit",
  });

  return (
    <LandingShell
      templateId="neighborhood-board"
      storeName={props.storeName}
      className="bg-[#FFFBEB] text-stone-900"
    >
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <LandingBrandHeader
          storeName={props.storeName}
          logoUrl={props.logoUrl}
          primaryHex={brand}
        />
        <main className="flex flex-1 flex-col justify-center gap-8 py-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800/80">
              Neighborhood board
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">
              {copy.headline}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-stone-600">
              {copy.subheadline}
            </p>
          </div>
          <ul className="space-y-4 border border-amber-200/80 bg-white/70 p-5">
            <li className="flex gap-3 text-sm">
              <Clock className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <span>{copy.hours}</span>
            </li>
            <li className="flex gap-3 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <span>{copy.address}</span>
            </li>
            <li className="flex gap-3 text-sm">
              <MessageCircle className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <span>WhatsApp & phone orders welcome</span>
            </li>
          </ul>
          <ContactActions
            phone={copy.phone}
            whatsapp={copy.whatsapp}
            ctaLabel={copy.ctaLabel}
            brand={brand}
          />
        </main>
      </div>
    </LandingShell>
  );
}
