"use client";

import {
  ContactActions,
  LandingBrandHeader,
  LandingShell,
  resolveLandingCopy,
} from "@/components/storefront/templates/landing/shared";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";
import { MapPin } from "lucide-react";

export function MinimartHoursLanding(props: LandingTemplateProps) {
  const brand = props.primaryHex || props.accentHex || "#0369A1";
  const copy = resolveLandingCopy(props.storeName, props.landingContent, {
    headline: props.storeName,
    subheadline: "Everyday essentials around the corner.",
    ctaLabel: "Get directions",
    hours: "Open 6:00 – 22:00, every day",
    address: "Drop a pin — ask us for the exact street",
  });

  return (
    <LandingShell
      templateId="minimart-hours"
      storeName={props.storeName}
      className="bg-sky-50 text-slate-900"
    >
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-8 sm:px-6">
        <LandingBrandHeader
          storeName={props.storeName}
          logoUrl={props.logoUrl}
          primaryHex={brand}
        />
        <main className="flex flex-1 flex-col items-stretch justify-center gap-8 py-16 text-center">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {copy.headline}
            </h1>
            <p className="mt-3 text-slate-600">{copy.subheadline}</p>
          </div>
          <div
            className="border bg-white px-6 py-8 shadow-sm"
            style={{ borderColor: `${brand}33` }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Hours
            </p>
            <p className="mt-2 text-xl font-medium" style={{ color: brand }}>
              {copy.hours}
            </p>
          </div>
          <div className="flex items-start justify-center gap-2 text-sm text-slate-600">
            <MapPin className="mt-0.5 size-4 shrink-0" style={{ color: brand }} />
            <span>{copy.address}</span>
          </div>
          <div className="flex justify-center">
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
