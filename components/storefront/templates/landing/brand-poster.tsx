"use client";

import {
  ContactActions,
  LandingAccountAction,
  LandingShell,
  LANDING_STAFF_LOGIN_HREF,
  resolveLandingCopy,
} from "@/components/storefront/templates/landing/shared";
import { TenantLogo } from "@/components/brand/tenant-logo";
import type { LandingTemplateProps } from "@/components/storefront/templates/types";
import Link from "next/link";

export function BrandPosterLanding(props: LandingTemplateProps) {
  const brand = props.primaryHex || props.accentHex || "#171717";
  const accent = props.accentHex || props.primaryHex || "#525252";
  const copy = resolveLandingCopy(props.storeName, props.landingContent, {
    headline: props.storeName,
    subheadline: "More coming soon.",
    ctaLabel: "Contact us",
    hours: "",
    address: "",
  });

  return (
    <LandingShell
      templateId="brand-poster"
      storeName={props.storeName}
      className="bg-stone-100"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, ${brand} 18%, white), #f5f5f4 55%)`,
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
        <TenantLogo
          brand={props.storeName}
          logoUrl={props.logoUrl}
          primaryColor={brand}
          size="lg"
          className="shadow-sm"
        />
        <h1
          className="mt-8 text-4xl font-semibold tracking-tight sm:text-5xl"
          style={{ color: brand }}
        >
          {copy.headline}
        </h1>
        <p className="mt-4 max-w-sm text-base text-stone-600">
          {copy.subheadline}
        </p>
        {(copy.phone || copy.whatsapp) && (
          <div className="mt-8">
            <ContactActions
              phone={copy.phone}
              whatsapp={copy.whatsapp}
              ctaLabel={copy.ctaLabel}
              brand={accent}
            />
          </div>
        )}
        <div className="mt-10 flex flex-col items-center gap-1.5">
          <LandingAccountAction className="text-sm text-stone-500 underline-offset-4 hover:underline" />
          <Link
            href={LANDING_STAFF_LOGIN_HREF}
            className="text-xs text-stone-400 underline-offset-4 hover:underline"
          >
            Staff
          </Link>
        </div>
      </div>
    </LandingShell>
  );
}
