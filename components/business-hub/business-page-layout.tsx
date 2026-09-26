"use client";

import type { ReactNode } from "react";

import { BusinessHubNav } from "@/components/business-hub/business-hub-nav";
import { HubMark } from "@/components/business-hub/hub-mark";
import { OnlineStoreHeaderSwitch } from "@/components/business-hub/online-store-header-switch";
import { OXANIUM_SURFACE_STYLE } from "@/lib/oxanium-surface";
import { cn } from "@/lib/utils";

export const BUSINESS_HUB_VARS = {
  ["--hub-ink" as string]: "#141414",
  ["--hub-paper" as string]: "#ffffff",
  ["--hub-bg" as string]: "#F6F7F6",
  ["--hub-accent" as string]: "#0f766e",
  ["--hub-accent-deep" as string]: "#0f766e",
  ["--hub-slip" as string]: "#ffffff",
  ["--hub-rule" as string]: "color-mix(in srgb, #141414 8%, transparent)",
} as const;

const HUB_RULE_8 = "border-[color-mix(in_srgb,var(--hub-ink)_8%,transparent)]";

/** Who the board belongs to — the shop, then the one line that places it. */
export type BusinessIdentity = {
  name: string;
  /** Shop host, currency, branch — whatever reads as the shop's location. */
  meta?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
};

function HubIdentity({ identity }: { identity: BusinessIdentity }) {
  const name = identity.name.trim() || "Your shop";
  const meta = identity.meta?.trim() || "";

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <HubMark
        name={name}
        logoUrl={identity.logoUrl}
        faviconUrl={identity.faviconUrl}
        className="size-7"
      />
      <span className="min-w-0">
        <span className="block truncate font-heading text-[15px] font-semibold leading-none tracking-[-0.02em] text-[var(--hub-ink)] sm:text-[16px]">
          {name}
        </span>
        {meta ? (
          <span className="mt-1 block truncate text-[10px] leading-none text-[color-mix(in_srgb,var(--hub-ink)_62%,transparent)]">
            {meta}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function BusinessPageLayout({
  children,
  headerActions,
  toolbarLeading,
  stage,
  stageClassName,
  className,
  title,
  description,
  showNav = true,
  setupHome = false,
  identity,
  menu,
}: {
  children: ReactNode;
  /** Trailing toolbar controls (live, refresh, settings, …). */
  headerActions?: ReactNode;
  /** The board's view lens (period). Leads the control line beside the store switch. */
  toolbarLeading?: ReactNode;
  /** Optional stage/lane picker rendered under the controls inside the sticky chrome. */
  stage?: ReactNode;
  /** Hide the stage band itself, e.g. when the stage is a phone-only rail. */
  stageClassName?: string;
  className?: string;
  /** @deprecated Eyebrows removed for a quieter header; ignored. */
  eyebrow?: string;
  title?: string | null;
  description?: string | null;
  showNav?: boolean;
  /** First-run: the home tab is the shop, not the sales pulse. */
  setupHome?: boolean;
  /** Shop name + placement line shown at the head of the board. */
  identity?: BusinessIdentity;
  /** Phone-only affordance for the hub pages, e.g. the shop menu trigger. */
  menu?: ReactNode;
}) {
  const heading = title?.trim() || "";
  const blurb = description?.trim() || "";
  const showCopy = Boolean(heading || blurb);
  // The view lens earns its own line on phones; on wider screens it shares the
  // identity row with the store switch and actions.
  const showControlLine = Boolean(toolbarLeading);

  return (
    <div
      className={cn(
        "hub-paper relative mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-col",
        // Shell already clears the tab bar — don't stack a second bottom pad.
        "px-0 pb-0 pt-0",
        "sm:px-1 sm:pb-4 sm:pt-1",
        className,
      )}
      style={{
        ...BUSINESS_HUB_VARS,
        ...OXANIUM_SURFACE_STYLE,
        backgroundColor: "var(--hub-bg)",
      }}
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-2 sm:gap-3">
        {/* `data-hub-chrome` lets in-page jumps measure the sticky header they
            have to clear, instead of guessing a fixed offset. */}
        <div
          data-hub-chrome=""
          className={cn(
            "sticky top-0 z-20 shrink-0 border-b bg-white/92",
            "border-[color-mix(in_srgb,var(--hub-ink)_8%,transparent)]",
            "backdrop-blur-xl supports-[backdrop-filter]:bg-white/80",
            // Match shell gutters on phone — avoid -mx bleed that fights the nav.
            "mx-0 rounded-none sm:rounded-xl sm:border",
          )}
        >
          {/* Tablet up: the hub's own pages. Phones use the identity row's menu. */}
          {showNav ? (
            <div className={cn("hidden border-b px-1 pt-1 sm:block", HUB_RULE_8)}>
              <BusinessHubNav setupHome={setupHome} />
            </div>
          ) : null}

          {/*
            Phone: one dense row — shop · actions · menu. Period + store sit on
            a second slim line only when needed. Desk keeps the single control line.
          */}
          <div className="flex items-center gap-2 px-3 py-2 sm:flex-wrap sm:gap-x-3 sm:gap-y-1.5 sm:px-2 sm:py-2">
            {identity ? (
              <HubIdentity identity={identity} />
            ) : (
              <span className="min-w-0 flex-1" />
            )}

            <div className="ml-auto flex shrink-0 items-center gap-1">
              <div className="hidden items-center gap-1.5 sm:flex">
                {toolbarLeading}
                <OnlineStoreHeaderSwitch />
              </div>
              {headerActions}
              {menu}
            </div>
          </div>

          {showControlLine ? (
            <div className="flex items-center gap-1.5 border-t border-[color-mix(in_srgb,var(--hub-ink)_6%,transparent)] px-3 py-1.5 sm:hidden">
              {toolbarLeading}
              <span className="min-w-0 flex-1" aria-hidden />
              <OnlineStoreHeaderSwitch />
            </div>
          ) : null}

          {stage ? (
            <div
              className={cn(
                "px-3 py-1 sm:px-2 sm:py-1.5",
                "bg-[color-mix(in_srgb,var(--hub-ink)_2.5%,white)]",
                HUB_RULE_8,
                "border-t",
                // Phone: keep the till lane picker one tap-row tall.
                "max-sm:overflow-x-auto max-sm:overflow-y-hidden",
                stageClassName,
              )}
            >
              {stage}
            </div>
          ) : null}
        </div>

        {showCopy ? (
          <header className="min-w-0 px-3 py-0.5 sm:px-0.5">
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

        <div className="min-h-0 flex-1 px-3 sm:px-0">{children}</div>
      </div>
    </div>
  );
}
