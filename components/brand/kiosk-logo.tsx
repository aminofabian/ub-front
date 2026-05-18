"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { PLATFORM_DOMAIN } from "@/lib/config";
import { cn } from "@/lib/utils";

import { KioskLogoMark, type KioskLogoMarkProps } from "./kiosk-logo-mark";

const LOCKUP = {
  sm: {
    mark: 36,
    word: "text-[16px]",
    pill: "text-[9px] px-1.5 py-[3px]",
    gap: "gap-3",
  },
  md: {
    mark: 44,
    word: "text-[1.2rem]",
    pill: "text-[10px] px-1.5 py-[3px]",
    gap: "gap-3.5",
  },
  lg: {
    mark: 52,
    word: "text-[1.45rem]",
    pill: "text-[11px] px-2 py-[4px]",
    gap: "gap-4",
  },
} as const;

const TAGLINE_CLASS = {
  sm: "text-[8px] tracking-[0.22em]",
  md: "text-[9px] tracking-[0.22em]",
  lg: "text-[10px] tracking-[0.24em]",
} as const;

export type KioskLogoProps = {
  size?: keyof typeof LOCKUP;
  variant?: KioskLogoMarkProps["variant"];
  layout?: "inline" | "badge";
  wordmark?: string;
  showDomain?: boolean;
  tagline?: string;
  showTagline?: boolean;
  href?: string;
  className?: string;
  markClassName?: string;
  onClick?: () => void;
};

function LogoWordmark({
  name,
  size,
  variant,
  showDomain,
}: {
  name: string;
  size: keyof typeof LOCKUP;
  variant: KioskLogoMarkProps["variant"];
  showDomain: boolean;
}) {
  const isLanding = variant === "landing";

  return (
    <span className="inline-flex flex-col justify-center leading-none">
      <span className="inline-flex items-center gap-2">
        <span
          className={cn(
            "kiosk-logo-wordmark font-heading font-semibold uppercase leading-none tracking-[0.16em]",
            LOCKUP[size].word,
            isLanding
              ? "text-[var(--kiosk-text)]"
              : "text-foreground",
          )}
        >
          {name}
        </span>
        {showDomain ? (
          <span
            className={cn(
              "kiosk-logo-tld inline-flex items-center rounded-md font-sans font-bold uppercase leading-none tracking-[0.12em] text-white shadow-[0_2px_8px_color-mix(in_srgb,var(--kiosk-gold)_45%,transparent)]",
              LOCKUP[size].pill,
              isLanding
                ? "bg-gradient-to-r from-[#20863B] via-[var(--kiosk-gold)] to-[#32B85A]"
                : "bg-gradient-to-r from-[#20863B] via-primary to-[#32B85A]",
            )}
          >
            .KE
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "kiosk-logo-rule mt-2 h-px w-full max-w-[5.5rem]",
          isLanding ? "opacity-80" : "opacity-70",
        )}
      />
    </span>
  );
}

function PremiumBadge({
  variant,
  children,
}: {
  variant: KioskLogoMarkProps["variant"];
  children: ReactNode;
}) {
  const isLanding = variant === "landing";

  return (
    <span className="kiosk-logo-badge group/badge relative inline-flex rounded-2xl p-[1.5px]">
      <span
        aria-hidden
        className={cn(
          "kiosk-logo-badge-ring absolute inset-0 rounded-2xl",
          isLanding ? "opacity-90" : "opacity-75",
        )}
      />
      <span
        className={cn(
          "relative inline-flex rounded-[14px] px-4 py-2.5 sm:px-5 sm:py-3",
          isLanding
            ? "border border-[color-mix(in_srgb,var(--kiosk-gold)_12%,transparent)] bg-[color-mix(in_srgb,var(--kiosk-elevated)_88%,transparent)] shadow-[0_8px_32px_color-mix(in_srgb,var(--kiosk-gold)_10%,transparent),0_2px_8px_rgba(20,20,18,0.04),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl"
            : "border border-border/60 bg-card/85 shadow-lg backdrop-blur-xl",
        )}
      >
        {children}
      </span>
    </span>
  );
}

function LogoContent({
  size,
  variant,
  layout,
  wordmark,
  showDomain,
  tagline,
  showTagline,
  markClassName,
}: Pick<
  KioskLogoProps,
  | "size"
  | "variant"
  | "layout"
  | "wordmark"
  | "showDomain"
  | "tagline"
  | "showTagline"
  | "markClassName"
>) {
  const s = size ?? "md";
  const name = (wordmark ?? "Kiosk").toUpperCase();
  const sub = (tagline ?? PLATFORM_DOMAIN).toUpperCase();
  const isPlatformName = name === "KIOSK";
  const showKe = showDomain !== false && isPlatformName;
  const { mark, gap } = LOCKUP[s];

  const taglineColor =
    variant === "landing"
      ? "text-[var(--kiosk-text-dim)]"
      : "text-muted-foreground";

  const lockup = (
    <span className={cn("inline-flex items-center", gap)}>
      <KioskLogoMark size={mark} variant={variant} className={markClassName} />
      <span className="flex min-w-0 flex-col justify-center">
        <LogoWordmark
          name={name}
          size={s}
          variant={variant}
          showDomain={showKe}
        />
        {showTagline ? (
          <span
            className={cn(
              "mt-2.5 font-sans font-medium uppercase",
              TAGLINE_CLASS[s],
              taglineColor,
            )}
          >
            {sub}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (layout === "badge") {
    return <PremiumBadge variant={variant}>{lockup}</PremiumBadge>;
  }

  return lockup;
}

function LogoShell({
  href,
  onClick,
  className,
  children,
}: {
  href?: string;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const shellClass = cn(
    "kiosk-logo group inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--kiosk-gold)_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kiosk-bg)]",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shellClass} aria-label="Kiosk home">
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(shellClass, "text-left")}
        aria-label="Kiosk"
      >
        {children}
      </button>
    );
  }

  return <span className={shellClass}>{children}</span>;
}

/** Full Kiosk logo — premium monogram lockup with optional glass badge. */
export function KioskLogo({
  size = "md",
  variant = "default",
  layout = "inline",
  wordmark,
  showDomain,
  tagline,
  showTagline = false,
  href,
  className,
  markClassName,
  onClick,
}: KioskLogoProps) {
  return (
    <LogoShell href={href} onClick={onClick} className={className}>
      <span className="block transition-[transform,filter] duration-500 ease-out group-hover:brightness-[1.03] group-active:scale-[0.98]">
        <LogoContent
          size={size}
          variant={variant}
          layout={layout}
          wordmark={wordmark}
          showDomain={showDomain}
          tagline={tagline}
          showTagline={showTagline}
          markClassName={markClassName}
        />
      </span>
    </LogoShell>
  );
}
