"use client";

import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";

import {
  applyStorefrontThemeToDocument,
  buildStorefrontThemeVars,
  parseStorefrontHex,
} from "@/lib/storefront-theme";
import { resolveStorefrontDesign, type StorefrontDesign } from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

export function StorefrontThemeScope({
  primaryHex,
  accentHex,
  design,
  logoScale,
  className,
  children,
}: {
  primaryHex?: string | null;
  accentHex?: string | null;
  /** Merchant design overrides; `null` = pure theme defaults. */
  design?: StorefrontDesign | null;
  /** Header logo size vs theme default (0.5–2.5). */
  logoScale?: number | null;
  className?: string;
  children: ReactNode;
}) {
  const primary = parseStorefrontHex(primaryHex);
  const accent = parseStorefrontHex(accentHex);
  const resolved = resolveStorefrontDesign(design);
  const themeStyle = buildStorefrontThemeVars(primary, accent, design, logoScale);

  useEffect(() => {
    if (!primary && !design && logoScale == null) return undefined;
    return applyStorefrontThemeToDocument(primary, accent, design, logoScale);
  }, [primary, accent, design, logoScale]);

  const surfaceStyle: CSSProperties | undefined = resolved.surfaceHex
    ? { backgroundColor: resolved.surfaceHex }
    : undefined;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        // Sharp storefront chrome; keep radius on real buttons only. When the
        // merchant picks a soft/round look, drop the forcing so component
        // radii and the design tokens take over.
        resolved.radius === "sharp" &&
          "[&_*:not(button):not([role=button]):not([data-slot=button]):not(input[type=submit]):not(input[type=button]):not(.animate-spin)]:!rounded-none",
        className,
      )}
      style={{ ...themeStyle, ...surfaceStyle }}
    >
      {children}
    </div>
  );
}
