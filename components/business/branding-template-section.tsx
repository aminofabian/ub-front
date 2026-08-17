"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Save } from "lucide-react";

import {
  MilkRunWhatsAppDialog,
  milkRunNeedsWhatsApp,
} from "@/components/storefront/milk-run-whatsapp-dialog";
import { TemplatePicker } from "@/components/storefront/template-picker";
import { StorefrontTemplatePreview } from "@/components/storefront/storefront-template-preview";
import { Button } from "@/components/ui/button";
import {
  fetchBusiness,
  updateBusiness,
  type BusinessRecord,
} from "@/lib/api";
import { PLATFORM_DOMAIN, slugDerivedShopUrl } from "@/lib/config";
import { storefrontPreviewUrl } from "@/lib/storefront-preview";
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
  const [waPromptOpen, setWaPromptOpen] = useState(false);
  const waPromptedRef = useRef(false);

  const landingWhatsapp =
    business?.storefront?.landingContent?.whatsapp?.trim() || "";

  useEffect(() => {
    setStoreThemeId(normalizeStoreThemeId(business?.storefront?.storeThemeId));
    setLandingTemplateId(
      normalizeLandingTemplateId(business?.storefront?.landingTemplateId),
    );
  }, [
    business?.storefront?.storeThemeId,
    business?.storefront?.landingTemplateId,
  ]);

  useEffect(() => {
    if (!enabled || waPromptedRef.current) return;
    if (milkRunNeedsWhatsApp(storeThemeId, landingWhatsapp)) {
      waPromptedRef.current = true;
      setWaPromptOpen(true);
    }
  }, [enabled, storeThemeId, landingWhatsapp]);

  const shopBase = business?.slug
    ? slugDerivedShopUrl(business.slug) ||
      `https://${business.slug}.${PLATFORM_DOMAIN}`
    : "";
  const previewUrl = shopBase
    ? storefrontPreviewUrl(
        shopBase,
        enabled ? "store" : "landing",
        enabled ? storeThemeId : landingTemplateId,
      )
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
      if (
        enabled &&
        milkRunNeedsWhatsApp(
          storeThemeId,
          next.storefront?.landingContent?.whatsapp,
        )
      ) {
        setWaPromptOpen(true);
      }
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
          if (enabled) {
            const next = normalizeStoreThemeId(id);
            setStoreThemeId(next);
            if (milkRunNeedsWhatsApp(next, landingWhatsapp)) {
              setWaPromptOpen(true);
            }
          } else {
            setLandingTemplateId(normalizeLandingTemplateId(id));
          }
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
        {enabled && storeThemeId === "milk-run" && !landingWhatsapp ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setWaPromptOpen(true)}
          >
            Add WhatsApp
          </Button>
        ) : null}
        {feedback ? (
          <p className="text-xs text-emerald-700">{feedback}</p>
        ) : null}
        {error ? (
          <p className={cn("text-xs text-destructive")} role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <MilkRunWhatsAppDialog
        open={waPromptOpen}
        onOpenChange={setWaPromptOpen}
        initialWhatsapp={landingWhatsapp}
        existingLandingContent={business?.storefront?.landingContent ?? null}
        onSaved={async () => {
          const next = await fetchBusiness();
          onSaved?.(next);
          setFeedback("WhatsApp saved for Milk Run.");
        }}
      />
    </section>
  );
}
