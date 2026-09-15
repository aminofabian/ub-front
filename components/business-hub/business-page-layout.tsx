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
        // Shell already clears the tab bar — don't stack a second bottom pad.
        "px-0 pb-0 pt-0",
        "sm:px-1 sm:pb-4 sm:pt-1",
        className,
      )}
      style={BUSINESS_HUB_VARS}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-2 sm:gap-3">
        <div
          className={cn(
            "sticky top-0 z-20 shrink-0 overflow-hidden border-b bg-white/92",
            "border-[color-mix(in_srgb,var(--hub-ink)_10%,transparent)]",
            "backdrop-blur-xl supports-[backdrop-filter]:bg-white/80",
            // Edge-flush under shell gutters on phone
            "-mx-3 sm:mx-0 sm:border",
          )}
        >
          {/* Phone: Settings/Pay/Config/Users live under More → Jump to */}
          {showNav ? (
            <div className="hidden p-0.5 sm:block">
              <BusinessHubNav setupHome={setupHome} />
            </div>
          ) : null}

          {showToolbar ? (
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 sm:px-2 sm:py-1.5",
                showNav &&
                  "sm:border-t sm:border-[color-mix(in_srgb,var(--hub-ink)_8%,transparent)]",
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
                "flex justify-end px-3 py-2 sm:px-2 sm:py-1.5",
                showNav &&
                  "sm:border-t sm:border-[color-mix(in_srgb,var(--hub-ink)_8%,transparent)]",
              )}
            >
              <OnlineStoreHeaderSwitch />
            </div>
          )}

          {stage ? (
            <div
              className={cn(
                "px-3 py-2 sm:px-2 sm:py-1.5",
                "border-t border-[color-mix(in_srgb,var(--hub-ink)_8%,transparent)]",
                "bg-[color-mix(in_srgb,var(--hub-ink)_2.5%,white)]",
              )}
            >
              {stage}
            </div>
          ) : null}
        </div>

        {showCopy ? (
          <header className="min-w-0 px-0.5 py-0.5">
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
