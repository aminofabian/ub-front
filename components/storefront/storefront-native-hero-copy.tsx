"use client";

import type { ReactNode } from "react";

import { StorefrontInlineText } from "@/components/storefront/storefront-inline-text";
import {
  StorefrontQuickEditTarget,
  useStorefrontStaffEditOptional,
} from "@/components/storefront/storefront-staff-edit";
import type { StorefrontHeroSectionSettings } from "@/lib/storefront-design";

/** Prefer merchant hero headline, then announcement, then theme default. */
export function resolveNativeHeroHeadline(
  heroSettings: StorefrontHeroSectionSettings | undefined,
  announcement: string | null | undefined,
  fallback: string,
): string {
  return (
    heroSettings?.headline?.trim() ||
    announcement?.trim() ||
    fallback
  );
}

/** Amber frame + pencil for theme-native heroes (merchant hero section off). */
export function StorefrontNativeHeroEditFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <StorefrontQuickEditTarget
      field="hero"
      label="hero headline"
      className={className}
    >
      {children}
    </StorefrontQuickEditTarget>
  );
}

/** Inline-editable H1 (or span) that stages hero.headline on commit. */
export function StorefrontNativeHeroHeadline({
  value,
  className,
  as = "h1",
  placeholder = "Add a headline",
}: {
  value: string;
  className?: string;
  as?: "h1" | "span";
  placeholder?: string;
}) {
  const staff = useStorefrontStaffEditOptional();
  return (
    <StorefrontInlineText
      as={as}
      className={className}
      value={value}
      placeholder={placeholder}
      onCommit={(next) => {
        void staff?.commitInlineField("hero", { headline: next });
      }}
    >
      {as === "h1" ? (
        <h1 className={className}>{value}</h1>
      ) : (
        <span className={className}>{value}</span>
      )}
    </StorefrontInlineText>
  );
}

/** Supporting lead / subhead → business tagline draft. */
export function StorefrontNativeHeroLead({
  value,
  className,
  placeholder = "Add a short intro",
}: {
  value: string;
  className?: string;
  placeholder?: string;
}) {
  const staff = useStorefrontStaffEditOptional();
  return (
    <StorefrontInlineText
      as="p"
      multiline
      className={className}
      value={value}
      placeholder={placeholder}
      onCommit={(next) => {
        void staff?.commitInlineField("tagline", { tagline: next });
      }}
    >
      <p className={className}>{value}</p>
    </StorefrontInlineText>
  );
}
