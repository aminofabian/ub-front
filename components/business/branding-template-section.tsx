"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ThemeTryOnPhone } from "@/components/business/theme-try-on-phone";
import type { BusinessRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import {
  landingTemplateMeta,
  normalizeLandingTemplateId,
  normalizeStoreThemeId,
  storeThemeMeta,
} from "@/lib/storefront-templates";
import { cn } from "@/lib/utils";

/**
 * Current-look thumbnail that opens Themes. Not a second picker — IDs are
 * saved only on `/business/themes` (and onboarding submit).
 */
export function CurrentLookLink({
  enabled,
  storeThemeId,
  landingTemplateId,
  storeName,
  logoUrl,
  brandPrimary,
  hours,
  address,
  className,
}: {
  enabled: boolean;
  storeThemeId?: string | null;
  landingTemplateId?: string | null;
  storeName: string;
  logoUrl?: string | null;
  brandPrimary?: string | null;
  hours?: string | null;
  address?: string | null;
  className?: string;
}) {
  const meta = enabled
    ? storeThemeMeta(normalizeStoreThemeId(storeThemeId))
    : landingTemplateMeta(normalizeLandingTemplateId(landingTemplateId));

  return (
    <Link
      href={APP_ROUTES.businessThemes}
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5 text-left transition",
        "hover:border-foreground/25 hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
        className,
      )}
    >
      <div
        className="w-[4.75rem] shrink-0 pointer-events-none sm:w-24"
        aria-hidden
      >
        <ThemeTryOnPhone
          item={meta}
          kind={enabled ? "store" : "landing"}
          storeName={storeName}
          logoUrl={logoUrl}
          brandPrimary={brandPrimary}
          landingContent={{ hours, address }}
          size="sm"
          frame="card"
        />
      </div>
      <span className="min-w-0 flex-1 pt-0.5">
        <span className="block text-sm font-semibold text-foreground">
          {meta.name}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          Change look
        </span>
      </span>
      <ArrowRight
        className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground"
        aria-hidden
      />
    </Link>
  );
}

export function BrandingTemplateSection({
  business,
  storeName,
  logoUrl,
  brandPrimary,
}: {
  business: BusinessRecord | null;
  storeName?: string;
  logoUrl?: string | null;
  brandPrimary?: string | null;
}) {
  const enabled = Boolean(business?.storefront?.enabled);
  return (
    <CurrentLookLink
      enabled={enabled}
      storeThemeId={business?.storefront?.storeThemeId}
      landingTemplateId={business?.storefront?.landingTemplateId}
      storeName={storeName?.trim() || business?.name?.trim() || "Your shop"}
      logoUrl={logoUrl ?? business?.branding?.logoUrl}
      brandPrimary={brandPrimary ?? business?.branding?.primaryColor}
      hours={business?.storefront?.landingContent?.hours}
      address={business?.storefront?.landingContent?.address}
    />
  );
}
