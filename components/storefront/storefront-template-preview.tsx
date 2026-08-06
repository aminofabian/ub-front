"use client";

import {
  landingTemplateMeta,
  storeThemeMeta,
  type TemplateKind,
} from "@/lib/storefront-templates";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

/**
 * Dashboard preview card for the selected store theme or landing template.
 * Shows a gradient swatch + optional live storefront link (iframe when URL known).
 */
export function StorefrontTemplatePreview({
  kind,
  templateId,
  previewUrl,
  className,
}: {
  kind: TemplateKind;
  templateId: string;
  /** Absolute public storefront URL for live iframe preview. */
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
        "overflow-hidden border border-border/60 bg-muted/20",
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
      {previewUrl ? (
        <div className="relative aspect-[16/10] w-full bg-background">
          <iframe
            title={`${meta.name} preview`}
            src={previewUrl}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
        </div>
      ) : (
        <div
          className="flex aspect-[16/10] items-end p-4"
          style={{
            background: `linear-gradient(145deg, ${meta.previewFrom}, ${meta.previewTo})`,
          }}
        >
          <span
            className="rounded-sm px-2 py-1 text-[11px] font-semibold text-white shadow-sm"
            style={{ backgroundColor: meta.accent }}
          >
            {kind === "store" ? "Store theme" : "Landing"}
          </span>
        </div>
      )}
    </div>
  );
}
