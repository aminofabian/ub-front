"use client";

import type { ReactNode } from "react";

import { BusinessHubNav } from "@/components/business-hub/business-hub-nav";
import { OnlineStoreHeaderSwitch } from "@/components/business-hub/online-store-header-switch";
import { cn } from "@/lib/utils";

export const BUSINESS_HUB_VARS = {
  ["--hub-ink" as string]: "#141414",
  ["--hub-paper" as string]: "#f3f1ec",
  ["--hub-accent" as string]: "#B08D48",
  ["--hub-accent-deep" as string]: "#8A6B2E",
  ["--hub-slip" as string]: "#ffffff",
  ["--hub-rule" as string]: "color-mix(in srgb, #141414 8%, transparent)",
} as const;

export function BusinessPageLayout({
  children,
  headerActions,
  className,
  title,
  description,
  showNav = true,
  setupHome = false,
}: {
  children: ReactNode;
  headerActions?: ReactNode;
  className?: string;
  /** @deprecated Eyebrows removed for a quieter header; ignored. */
  eyebrow?: string;
  title?: string | null;
  description?: string | null;
  showNav?: boolean;
  /** First-run: the home tab is the shop, not the sales pulse. */
  setupHome?: boolean;
}) {
  const heading = title?.trim() || "";
  const blurb = description?.trim() || "";
  const showCopy = Boolean(heading || blurb);

  return (
    <div
      className={cn(
        "hub-paper relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col px-3 pb-5 pt-2 sm:px-5 sm:pb-6 sm:pt-2.5",
        className,
      )}
      style={BUSINESS_HUB_VARS}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-2">
        {showNav ? (
          <div
            className={cn(
              "shrink-0 overflow-hidden rounded-none border bg-white/95 p-0.5",
              "border-[color-mix(in_srgb,var(--hub-ink)_8%,transparent)]",
              "shadow-[0_1px_0_rgba(20,20,20,0.035),0_8px_22px_-14px_rgba(20,20,20,0.12)]",
            )}
          >
            <BusinessHubNav setupHome={setupHome} />
          </div>
        ) : null}

        <header
          className={cn(
            "flex flex-wrap items-center gap-2",
            showCopy ? "justify-between" : "justify-end",
          )}
        >
          {showCopy ? (
            <div className="min-w-0 flex-1 py-0.5">
              {heading ? (
                <h1 className="font-heading text-lg font-semibold leading-none tracking-[-0.03em] text-[var(--hub-ink)] sm:text-xl">
                  {heading}
                </h1>
              ) : null}
              {blurb ? (
                <p className="mt-1 max-w-xl text-[12px] leading-snug text-[color-mix(in_srgb,var(--hub-ink)_52%,transparent)]">
                  {blurb}
                </p>
              ) : null}
            </div>
          ) : (
            <h1 className="sr-only">Business</h1>
          )}
          <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-1">
            <OnlineStoreHeaderSwitch />
            {headerActions}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
