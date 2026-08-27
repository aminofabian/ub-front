"use client";

import type { ReactNode } from "react";

import { BusinessHubNav } from "@/components/business-hub/business-hub-nav";
import { cn } from "@/lib/utils";

export const BUSINESS_HUB_VARS = {
  ["--hub-ink" as string]: "#141414",
  ["--hub-paper" as string]: "#faf9f7",
  ["--hub-accent" as string]: "#B08D48",
  ["--hub-accent-deep" as string]: "#8A6B2E",
  ["--hub-slip" as string]: "#ffffff",
  ["--hub-rule" as string]: "#E6E1D8",
} as const;

export function BusinessPageLayout({
  children,
  headerActions,
  className,
  eyebrow = "Your shop",
  title = "Business pulse",
  description = "Live revenue, till tape, payables, and stock health — everything that moves your shop today in one board.",
  showNav = true,
  setupHome = false,
}: {
  children: ReactNode;
  headerActions?: ReactNode;
  className?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  showNav?: boolean;
  /** First-run: the home tab is the shop, not the sales pulse. */
  setupHome?: boolean;
}) {
  return (
    <div
      className={cn(
        "hub-paper relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col px-3 pb-6 pt-3 sm:px-5 sm:pb-8 sm:pt-4",
        className,
      )}
      style={BUSINESS_HUB_VARS}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(120%_100%_at_10%_-20%,color-mix(in_srgb,var(--hub-accent)_16%,transparent),transparent_58%),linear-gradient(180deg,color-mix(in_srgb,var(--hub-paper)_88%,#fff),transparent)]"
      />

      <div className="relative flex min-h-0 flex-1 flex-col gap-4">
        {showNav ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--hub-ink)_8%,transparent)] bg-[color-mix(in_srgb,var(--hub-slip)_92%,transparent)] p-1 shadow-[0_1px_0_color-mix(in_srgb,var(--hub-ink)_6%,transparent),0_12px_40px_-24px_color-mix(in_srgb,var(--hub-ink)_18%,transparent)] backdrop-blur-sm">
            <BusinessHubNav setupHome={setupHome} />
          </div>
        ) : null}

        <header className="flex flex-wrap items-start justify-between gap-3 px-0.5 sm:px-1">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--hub-ink)_42%,transparent)]">
              {eyebrow}
            </p>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-[-0.03em] text-[var(--hub-ink)] sm:text-[1.65rem]">
              {title}
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--hub-ink)_58%,transparent)] sm:text-sm">
              {description}
            </p>
          </div>
          {headerActions ? (
            <div className="flex shrink-0 items-center gap-1.5">{headerActions}</div>
          ) : null}
        </header>

        {children}
      </div>
    </div>
  );
}
