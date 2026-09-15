"use client";

import type { ReactNode } from "react";

import { BusinessHubNav } from "@/components/business-hub/business-hub-nav";
import { OnlineStoreHeaderSwitch } from "@/components/business-hub/online-store-header-switch";
import { cn } from "@/lib/utils";

export const BUSINESS_HUB_VARS = {
  ["--hub-ink" as string]: "#141414",
  ["--hub-paper" as string]: "#ffffff",
  ["--hub-accent" as string]: "#0f766e",
  ["--hub-accent-deep" as string]: "#0f766e",
  ["--hub-slip" as string]: "#ffffff",
  ["--hub-rule" as string]: "color-mix(in srgb, #141414 8%, transparent)",
} as const;

export function BusinessPageLayout({
  children,
  headerActions,
  toolbarLeading,
  stage,
  className,
  title,
  description,
  showNav = true,
  setupHome = false,
}: {
  children: ReactNode;
  /** Trailing toolbar controls (live, refresh, settings, …). */
  headerActions?: ReactNode;
  /** Leading toolbar controls (period toggle). Renders left of trailing actions. */
  toolbarLeading?: ReactNode;
  /** Optional stage/lane picker rendered under the toolbar inside the sticky chrome. */
  stage?: ReactNode;
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
  const showToolbar = Boolean(toolbarLeading || headerActions);

  return (
    <div
      className={cn(
        "hub-paper relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col",
        "px-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-1.5",
        "sm:px-5 sm:pb-6 sm:pt-2.5",
        className,
      )}
      style={BUSINESS_HUB_VARS}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-2.5 sm:gap-3">
        {showNav || showToolbar || stage ? (
          <div
            className={cn(
              "sticky top-0 z-20 shrink-0 overflow-hidden border bg-white",
              "border-[color-mix(in_srgb,var(--hub-ink)_12%,transparent)]",
            )}
          >
            {showNav ? (
              <div className="p-0.5">
                <BusinessHubNav setupHome={setupHome} />
              </div>
            ) : null}

            {showToolbar ? (
              <div
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5",
                  showNav &&
                    "border-t border-[color-mix(in_srgb,var(--hub-ink)_8%,transparent)]",
                  toolbarLeading ? "justify-between" : "justify-end",
                )}
              >
                {toolbarLeading ? (
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    {toolbarLeading}
                  </div>
                ) : null}
                <div className="flex shrink-0 items-center gap-1">
                  <OnlineStoreHeaderSwitch />
                  {headerActions}
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "flex justify-end px-2 py-1.5",
                  showNav &&
                    "border-t border-[color-mix(in_srgb,var(--hub-ink)_8%,transparent)]",
                )}
              >
                <OnlineStoreHeaderSwitch />
              </div>
            )}

            {stage ? (
              <div
                className={cn(
                  "px-2 py-1.5",
                  "border-t border-[color-mix(in_srgb,var(--hub-ink)_8%,transparent)]",
                  "bg-[color-mix(in_srgb,var(--hub-ink)_2.5%,white)]",
                )}
              >
                {stage}
              </div>
            ) : null}
          </div>
        ) : null}

        {showCopy ? (
          <header className="min-w-0 py-0.5">
            {heading ? (
              <h1 className="font-heading text-lg font-semibold leading-none tracking-[-0.03em] text-[var(--hub-ink)] sm:text-xl">
                {heading}
              </h1>
            ) : (
              <h1 className="sr-only">Business</h1>
            )}
            {blurb ? (
              <p className="mt-1 max-w-xl text-[12px] leading-snug text-[color-mix(in_srgb,var(--hub-ink)_52%,transparent)] max-sm:line-clamp-2">
                {blurb}
              </p>
            ) : null}
          </header>
        ) : (
          <h1 className="sr-only">Business</h1>
        )}

        {children}
      </div>
    </div>
  );
}
