"use client";

import {
  landingTemplateMeta,
  storeThemeMeta,
  type TemplateKind,
} from "@/lib/storefront-templates";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

import { ThemePreviewArt } from "@/components/storefront/theme-preview-art";

/**
 * Dashboard preview card for the selected store theme or landing template.
 * Uses illustrated sketches (iframes are often blocked by frame ancestors).
 */
export function StorefrontTemplatePreview({
  kind,
  templateId,
  previewUrl,
  className,
}: {
  kind: TemplateKind;
  templateId: string;
  /** Absolute public storefront URL for live link. */
  previewUrl?: string | null;
  className?: string;
}) {
  const meta =
    kind === "store"
      ? storeThemeMeta(templateId)
      : landingTemplateMeta(templateId);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/60 bg-muted/20",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-foreground">{meta.name}</p>
          <p className="text-[11px] text-muted-foreground">{meta.blurb}</p>
        </div>
        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            Open
            <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : null}
      </div>
      <div className="p-2">
        <ThemePreviewArt templateId={templateId} />
      </div>
    </div>
  );
}
