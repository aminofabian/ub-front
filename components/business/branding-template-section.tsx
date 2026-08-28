"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ThemeTryOnPhone } from "@/components/business/theme-try-on-phone";
import { Button } from "@/components/ui/button";
import type { BusinessRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import {
  landingTemplateMeta,
  normalizeLandingTemplateId,
  normalizeStoreThemeId,
  storeThemeMeta,
} from "@/lib/storefront-templates";

/**
 * Settings-side "current look" — not a second editor. Theme IDs are saved
 * only on `/business/themes` (and onboarding submit).
 */
export function BrandingTemplateSection({
  business,
}: {
  business: BusinessRecord | null;
  onSaved?: (business: BusinessRecord) => void;
}) {
  const enabled = Boolean(business?.storefront?.enabled);
  const storeThemeId = normalizeStoreThemeId(business?.storefront?.storeThemeId);
  const landingTemplateId = normalizeLandingTemplateId(
    business?.storefront?.landingTemplateId,
  );
  const meta = enabled
    ? storeThemeMeta(storeThemeId)
    : landingTemplateMeta(landingTemplateId);
  const storeName = business?.name?.trim() || "Your shop";

  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          {enabled ? "Store theme" : "Closed-sign page"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {enabled
            ? "The layout customers see on your shop. Change it in Themes."
            : "The page visitors see while selling is off. Change it in Themes."}
        </p>
      </div>
      <div className="flex items-start gap-4">
        <div className="w-28 shrink-0">
          <ThemeTryOnPhone
            item={meta}
            kind={enabled ? "store" : "landing"}
            storeName={storeName}
            logoUrl={business?.branding?.logoUrl}
            brandPrimary={business?.branding?.primaryColor}
            landingContent={business?.storefront?.landingContent}
            size="sm"
            frame="card"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold">{meta.name}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {meta.blurb}
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href={APP_ROUTES.businessThemes}>
              Change look
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
