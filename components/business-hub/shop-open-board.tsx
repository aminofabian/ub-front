"use client";

import Link from "next/link";
import { ArrowRight, ImagePlus, Plus, User } from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import { storeThemeMeta } from "@/lib/storefront-templates";
import { cn } from "@/lib/utils";

type Props = {
  shopName: string;
  shopHost?: string | null;
  storefrontEnabled: boolean;
  themeId?: string | null;
  shopEnabled: boolean;
  canManageStorefront: boolean;
  canListUsers: boolean;
};

export function ShopOpenBoard({
  shopName,
  shopHost,
  storefrontEnabled,
  themeId,
  shopEnabled,
  canManageStorefront,
  canListUsers,
}: Props) {
  const theme = storeThemeMeta(themeId);
  const themePicked = Boolean(themeId?.trim()) && themeId !== "mart";
  const displayName = shopName.trim() || "Your shop";

  return (
    <section aria-label="Open the shop" className="space-y-3">
      <Link
        href={APP_ROUTES.products}
        className="group block text-left focus-visible:outline-none"
      >
        <span
          className={cn(
            HUB_SURFACE,
            "block transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
            "group-hover:-translate-y-0.5",
            "group-active:translate-y-0 group-active:scale-[0.99]",
            "group-focus-visible:ring-2 group-focus-visible:ring-[#B08D48]/40",
          )}
        >
          <span className="block p-4 sm:p-5">
            <span className="block text-[15px] font-semibold tracking-[-0.02em] text-[#141414]">
              Put something on the shelf
            </span>
            <span className={cn("mt-0.5 block text-[13px] leading-relaxed", HUB_MUTED)}>
              One product is enough to open the till. Name it, set a buying and
              selling price, say how many you have.
            </span>

            <span className="mt-4 flex items-start gap-3">
              <span className="flex size-[4.5rem] shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-[#E6E1D8] bg-[#FCFAF6] text-[#8A8A8A] sm:size-[5.25rem]">
                <ImagePlus className="size-5" aria-hidden />
                <span className="mt-1 text-[10px] font-medium">Photo</span>
              </span>
              <span className="min-w-0 flex-1 space-y-2">
                <span className="block h-9 rounded-lg bg-[#F7F5F1] px-3 text-[13px] leading-9 text-[#B0AAA0]">
                  e.g. Brookside 500ml
                </span>
                <span className="grid grid-cols-2 gap-2">
                  <span className="block h-8 rounded-lg bg-[#F7F5F1] px-2.5 text-[11px] leading-8 text-[#B0AAA0]">
                    Buying
                  </span>
                  <span className="block h-8 rounded-lg bg-[#F7F5F1] px-2.5 text-[11px] leading-8 text-[#B0AAA0]">
                    Selling
                  </span>
                </span>
                <span className="grid grid-cols-2 gap-2">
                  <span className="block h-8 rounded-lg bg-[#F7F5F1] px-2.5 font-mono text-[11px] leading-8 text-[#B0AAA0]">
                    Barcode
                  </span>
                  <span className="block h-8 rounded-lg bg-[#F7F5F1] px-2.5 text-[11px] leading-8 text-[#B0AAA0]">
                    How many
                  </span>
                </span>
              </span>
            </span>
          </span>
          <span className="flex items-center justify-center gap-1.5 bg-[#141414] px-4 py-3 text-[14px] font-medium text-[#F5E6C8] group-hover:bg-[#2A2A2A]">
            <Plus className="size-4" aria-hidden />
            Add your first product
          </span>
        </span>
        <span
          aria-hidden
          className="mx-auto mt-0 block h-1.5 w-[calc(100%+0.5rem)] rounded-b-sm bg-[#141414]/12"
        />
      </Link>

      <p className={cn("px-0.5 text-[12px] leading-relaxed", HUB_MUTED)}>
        Sales and the till wait here until there is something to sell.
      </p>

      {canManageStorefront && shopEnabled ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Link
            href={APP_ROUTES.businessSettings}
            className={cn(
              HUB_SURFACE,
              "group flex flex-col overflow-hidden transition-colors hover:border-[#B08D48]/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/40",
            )}
          >
            <span className="flex items-center justify-between gap-3 bg-[#141414] px-4 py-3">
              <span className="min-w-0">
                <span className="block truncate font-heading text-[15px] font-semibold tracking-[-0.02em] text-[#F5E6C8]">
                  {displayName}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-[#F5E6C8]/75">
                  {shopHost ?? "your-shop.kiosk.ke"}
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                  storefrontEnabled
                    ? "bg-[#F5E6C8] text-[#141414]"
                    : "border border-[#F5E6C8]/30 text-[#F5E6C8]/80",
                )}
              >
                {storefrontEnabled ? "Live" : "Off"}
              </span>
            </span>
            <span className="flex flex-1 flex-col p-4">
              <span className="text-[13px] font-semibold text-[#141414]">
                {storefrontEnabled
                  ? "Customers can browse on a phone"
                  : "Put the shop on the phone"}
              </span>
              <span className={cn("mt-0.5 text-[12px] leading-relaxed", HUB_MUTED)}>
                Hours, WhatsApp, and delivery. This is the window people see
                before they walk in.
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[#8A6B2E]">
                {storefrontEnabled ? "Edit storefront" : "Set up storefront"}
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </span>
          </Link>

          <Link
            href={APP_ROUTES.businessThemes}
            className={cn(
              HUB_SURFACE,
              "group flex flex-col overflow-hidden transition-colors hover:border-[#B08D48]/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/40",
            )}
          >
            <span
              className="relative flex h-[4.75rem] items-end gap-1.5 overflow-hidden px-4 pb-3 pt-4"
              style={{
                background: `linear-gradient(135deg, ${theme.previewFrom}, ${theme.previewTo})`,
              }}
              aria-hidden
            >
              <span
                className="h-8 w-7 rounded-sm opacity-90"
                style={{ background: theme.accent }}
              />
              <span className="h-11 w-8 rounded-sm bg-white/70" />
              <span
                className="h-7 w-6 rounded-sm opacity-80"
                style={{ background: theme.accent }}
              />
            </span>
            <span className="flex flex-1 flex-col p-4">
              <span className="text-[13px] font-semibold text-[#141414]">
                {themePicked ? theme.name : "Choose a look"}
              </span>
              <span className={cn("mt-0.5 text-[12px] leading-relaxed", HUB_MUTED)}>
                {themePicked
                  ? "Change the look so the shop feels like yours."
                  : "Pick a theme. Takes a few taps."}
              </span>
              <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[#8A6B2E]">
                {themePicked ? "Change theme" : "Browse themes"}
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </span>
          </Link>
        </div>
      ) : null}

      {canListUsers ? (
        <Link
          href={APP_ROUTES.users}
            className={cn(
              HUB_SURFACE,
              "group flex items-center gap-3 px-4 py-3.5 transition-colors hover:border-[#B08D48]/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/40",
            )}
        >
          <span className="flex -space-x-1.5" aria-hidden>
            <span className="flex size-9 items-center justify-center rounded-full border border-dashed border-[#E6E1D8] bg-[#FCFAF6] text-[#8A6B2E]">
              <User className="size-3.5" />
            </span>
            <span className="flex size-9 items-center justify-center rounded-full border border-dashed border-[#E6E1D8] bg-white text-[#C8C2B6]">
              <User className="size-3.5" />
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-[#141414]">
              Who will sell with you?
            </span>
            <span className={cn("block text-[12px] leading-snug", HUB_MUTED)}>
              Add a cashier or a stock person. You stay the owner.
            </span>
          </span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[#8A6B2E]">
            <span className="hidden sm:inline">Add staff</span>
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </Link>
      ) : null}
    </section>
  );
}
