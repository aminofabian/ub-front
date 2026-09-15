"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu } from "lucide-react";

import { HubMark } from "@/components/business-hub/hub-mark";
import {
  BUSINESS_HUB_TABS,
  hubTabCopy,
} from "@/components/business-hub/business-hub-nav";
import type { BusinessIdentity } from "@/components/business-hub/business-page-layout";
import { FormDrawer } from "@/components/form-drawer";
import { HUB_BTN, HUB_ICON_BTN } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

/**
 * Phone-only shop menu: the pages the tablet strip carries inline, plus the
 * shop's own identity at the head of the sheet. Sits last in the identity row
 * so refresh and live status stay reachable without opening anything.
 */
export function BusinessHubMenuButton({
  setupHome = false,
  identity,
}: {
  setupHome?: boolean;
  identity: BusinessIdentity;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const name = identity.name.trim() || "Your shop";
  const meta = identity.meta?.trim() || "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(HUB_ICON_BTN, "sm:hidden")}
        aria-label="Open the shop menu"
        title="Shop menu"
      >
        <Menu className="size-3.5" aria-hidden />
      </button>

      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="Shop menu"
        description="Every Business page in one place."
        headerDensity="compact"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)] px-3 py-2.5">
            <HubMark
              name={name}
              logoUrl={identity.logoUrl}
              faviconUrl={identity.faviconUrl}
              className="size-10"
              letterClassName="text-[15px]"
            />
            <span className="min-w-0">
              <span className="block truncate font-heading text-[15px] font-semibold leading-none tracking-[-0.02em] text-[var(--hub-ink,#141414)]">
                {name}
              </span>
              {meta ? (
                <span className="mt-1 block truncate text-[10px] leading-none text-[color-mix(in_srgb,var(--hub-ink,#141414)_60%,transparent)]">
                  {meta}
                </span>
              ) : null}
            </span>
          </div>

          <nav
            aria-label="Your shop pages"
            className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
          >
            {BUSINESS_HUB_TABS.map((tab) => {
              const copy = hubTabCopy(tab, setupHome);
              const active = tab.match(pathname);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    HUB_BTN,
                    "flex min-h-12 items-center gap-3 px-3 py-2.5",
                    active
                      ? "bg-[color-mix(in_srgb,#0f766e_6%,white)]"
                      : "hover:bg-[color-mix(in_srgb,#141414_2.5%,white)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center border",
                      active
                        ? "border-[#0f766e] bg-[#0f766e] text-white"
                        : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[#0f766e]",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold tracking-[-0.015em] text-[#141414]">
                      {copy.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-[#6F6F6F]">
                      {copy.hint}
                    </span>
                  </span>
                  {active ? (
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-[#0f766e]">
                      Here
                    </span>
                  ) : (
                    <ChevronRight
                      className="size-4 shrink-0 text-[#C8C2B6]"
                      aria-hidden
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </FormDrawer>
    </>
  );
}
