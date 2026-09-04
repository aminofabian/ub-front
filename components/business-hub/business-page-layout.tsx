"use client";

import type { ReactNode } from "react";

import { BusinessHubNav } from "@/components/business-hub/business-hub-nav";
import { OnlineStoreHeaderSwitch } from "@/components/business-hub/online-store-header-switch";
import { cn } from "@/lib/utils";

export const BUSINESS_HUB_VARS = {
  ["--hub-ink" as string]: "#141414",
  ["--hub-paper" as string]: "#f7f6f3",
  ["--hub-accent" as string]: "#B08D48",
  ["--hub-accent-deep" as string]: "#8A6B2E",
  ["--hub-slip" as string]: "#ffffff",
  ["--hub-rule" as string]: "color-mix(in srgb, #141414 8%, transparent)",
} as const;

export function BusinessPageLayout({
  children,
  headerActions,
  className,
  title = "Business pulse",
  description = "Live revenue, till tape, payables, and stock health — everything that moves your shop today in one board.",
  showNav = true,
  setupHome = false,
}: {
  children: ReactNode;
  headerActions?: ReactNode;
  className?: string;
  /** @deprecated Eyebrows removed for a quieter header; ignored. */
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
      <div className="relative flex min-h-0 flex-1 flex-col gap-5">
        {showNav ? (
          <div className="rounded-2xl bg-[color-mix(in_srgb,var(--hub-slip)_78%,transparent)] p-1 ring-1 ring-[color-mix(in_srgb,var(--hub-ink)_6%,transparent)] backdrop-blur-sm">
            <BusinessHubNav setupHome={setupHome} />
          </div>
        ) : null}

        <header className="flex flex-wrap items-end justify-between gap-3 px-0.5 sm:px-1">
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-[1.55rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--hub-ink)] sm:text-[1.7rem]">
              {title}
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[color-mix(in_srgb,var(--hub-ink)_55%,transparent)] sm:text-sm">
              {description}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 pb-0.5">
            <OnlineStoreHeaderSwitch />
            {headerActions}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
