"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { TemplatePicker } from "@/components/storefront/template-picker";
import { StorefrontTemplatePreview } from "@/components/storefront/storefront-template-preview";
import { Button } from "@/components/ui/button";
import {
  fetchBusiness,
  updateBusiness,
  type BusinessRecord,
} from "@/lib/api";
import { PLATFORM_DOMAIN } from "@/lib/config";
import {
  DEFAULT_LANDING_TEMPLATE_ID,
  DEFAULT_STORE_THEME_ID,
  normalizeLandingTemplateId,
  normalizeStoreThemeId,
  type LandingTemplateId,
  type StoreThemeId,
} from "@/lib/storefront-templates";
import { cn } from "@/lib/utils";

export function BrandingTemplateSection({
  business,
  onSaved,
}: {
  business: BusinessRecord | null;
  onSaved?: (business: BusinessRecord) => void;
}) {
  const enabled = Boolean(business?.storefront?.enabled);
  const [storeThemeId, setStoreThemeId] = useState<StoreThemeId>(
    normalizeStoreThemeId(business?.storefront?.storeThemeId),
  );
  const [landingTemplateId, setLandingTemplateId] = useState<LandingTemplateId>(
    normalizeLandingTemplateId(business?.storefront?.landingTemplateId),
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStoreThemeId(normalizeStoreThemeId(business?.storefront?.storeThemeId));
    setLandingTemplateId(
      normalizeLandingTemplateId(business?.storefront?.landingTemplateId),
    );
  }, [
    business?.storefront?.storeThemeId,
    business?.storefront?.landingTemplateId,
  ]);

  const previewUrl = business?.slug
    ? `https://${business.slug}.${PLATFORM_DOMAIN}/`
    : null;

  const dirty =
    storeThemeId !==
      normalizeStoreThemeId(business?.storefront?.storeThemeId) ||
    landingTemplateId !==
      normalizeLandingTemplateId(business?.storefront?.landingTemplateId);

  const save = async () => {
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      await updateBusiness({
        storefront: {
          storeThemeId: storeThemeId || DEFAULT_STORE_THEME_ID,
          landingTemplateId: landingTemplateId || DEFAULT_LANDING_TEMPLATE_ID,
        },
      });
      const next = await fetchBusiness();
      onSaved?.(next);
      setFeedback("Template saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold tracking-tight">
          {enabled ? "Store theme" : "Landing page template"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {enabled
            ? "Choose the layout for your live online shop."
            : "Choose the public page shown while your online shop is off."}
        </p>
      </div>
      <TemplatePicker
        compact
        kind={enabled ? "store" : "landing"}
        value={enabled ? storeThemeId : landingTemplateId}
        onChange={(id) => {
          if (enabled) setStoreThemeId(normalizeStoreThemeId(id));
          else setLandingTemplateId(normalizeLandingTemplateId(id));
          setFeedback(null);
        }}
      />
      <StorefrontTemplatePreview
        kind={enabled ? "store" : "landing"}
        templateId={enabled ? storeThemeId : landingTemplateId}
        previewUrl={previewUrl}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={!dirty || saving}
          onClick={() => void save()}
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          Save template
        </Button>
        {feedback ? (
          <p className="text-xs text-emerald-700">{feedback}</p>
        ) : null}
        {error ? (
          <p className={cn("text-xs text-destructive")} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
