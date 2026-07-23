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
  /** Nav lockup — green mark, no badge box, rule line, or heavy chrome. */
  plain?: boolean;
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
  plain,
}: {
  name: string;
  size: keyof typeof LOCKUP;
  variant: KioskLogoMarkProps["variant"];
  showDomain: boolean;
  plain?: boolean;
}) {
  const isLanding = variant === "landing";

  const wordmarkClass = cn(
    "kiosk-logo-wordmark font-heading font-semibold uppercase leading-none",
    plain ? "tracking-[0.14em]" : "tracking-[0.16em]",
    LOCKUP[size].word,
    isLanding ? "text-[var(--kiosk-text)]" : "text-foreground",
  );

  const tldClass = cn(
    "kiosk-logo-tld inline-flex items-center font-sans font-bold uppercase leading-none tracking-[0.12em] text-white",
    LOCKUP[size].pill,
    isLanding
      ? "rounded-none bg-[var(--kiosk-gold)] shadow-none"
      : cn(
          "rounded-md bg-gradient-to-r from-[#20863B] via-primary to-[#32B85A]",
          plain
            ? "shadow-[0_1px_4px_color-mix(in_srgb,var(--kiosk-gold)_28%,transparent)]"
            : "shadow-[0_2px_8px_color-mix(in_srgb,var(--kiosk-gold)_45%,transparent)]",
        ),
  );

  if (plain) {
    return (
      <span className="inline-flex items-baseline gap-2 leading-none">
        <span className={wordmarkClass}>{name}</span>
        {showDomain ? <span className={tldClass}>.KE</span> : null}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col justify-center leading-none">
      <span className="inline-flex items-center gap-2">
        <span className={wordmarkClass}>{name}</span>
        {showDomain ? <span className={tldClass}>.KE</span> : null}
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

  if (isLanding) {
    return (
      <span className="kiosk-logo-badge group/badge relative inline-flex">
        <span className="relative inline-flex border border-[var(--kiosk-border)] bg-[color-mix(in_srgb,var(--kiosk-elevated)_96%,#f3efe6)] px-3.5 py-2.5 sm:px-4 sm:py-3">
          {children}
        </span>
      </span>
    );
  }

  return (
    <span className="kiosk-logo-badge group/badge relative inline-flex rounded-2xl p-[1.5px]">
      <span
        aria-hidden
        className="kiosk-logo-badge-ring absolute inset-0 rounded-2xl opacity-75"
      />
      <span className="relative inline-flex rounded-[14px] border border-border/60 bg-card/85 px-4 py-2.5 shadow-lg backdrop-blur-xl sm:px-5 sm:py-3">
        {children}
      </span>
    </span>
  );
}

function LogoContent({
  size,
  variant,
  layout,
  plain,
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
  | "plain"
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
    <span
      className={cn(
        "inline-flex items-center",
        plain ? "gap-3 sm:gap-3.5" : gap,
      )}
    >
      <KioskLogoMark
        size={mark}
        variant={variant}
        plain={plain}
        className={markClassName}
      />
      <span
        className={cn(
          "flex min-w-0",
          plain ? "items-center" : "flex-col justify-center",
        )}
      >
        <LogoWordmark
          name={name}
          size={s}
          variant={variant}
          showDomain={showKe}
          plain={plain}
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
  plain = false,
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
    <LogoShell
      href={href}
      onClick={onClick}
      className={cn(plain && "kiosk-logo--plain", className)}
    >
      <span
        className={cn(
          "block transition-[transform,filter] duration-500 ease-out",
          plain
            ? "group-hover:brightness-[1.02]"
            : "group-hover:brightness-[1.03] group-active:scale-[0.98]",
        )}
      >
        <LogoContent
          size={size}
          variant={variant}
          layout={layout}
          plain={plain}
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
