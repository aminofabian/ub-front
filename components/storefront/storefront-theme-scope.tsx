"use client";

import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";

import {
  applyStorefrontThemeToDocument,
  buildStorefrontThemeVars,
  parseStorefrontHex,
} from "@/lib/storefront-theme";
import { cn } from "@/lib/utils";

export function StorefrontThemeScope({
  primaryHex,
  accentHex,
  className,
  children,
}: {
  primaryHex?: string | null;
  accentHex?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const primary = parseStorefrontHex(primaryHex);
  const accent = parseStorefrontHex(accentHex);
  const themeStyle = buildStorefrontThemeVars(primary, accent);

  useEffect(() => {
    if (!primary) return undefined;
    return applyStorefrontThemeToDocument(primary, accent);
  }, [primary, accent]);

  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col", className)}
      style={themeStyle}
    >
      {children}
    </div>
  );
}
