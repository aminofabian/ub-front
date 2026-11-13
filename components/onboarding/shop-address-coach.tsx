"use client";

import type { ReactNode } from "react";

import { PLATFORM_DOMAIN } from "@/lib/config";
import { shopAddressAdvice, shorterShopHandles } from "@/lib/shop-lookup";
import { cn } from "@/lib/utils";

type ShopAddressCoachProps = {
  id?: string;
  businessName: string;
  shopSlug: string;
  onPick: (handle: string) => void;
  /** Replaces the coaching line — availability, for example. */
  message?: ReactNode;
  /** The landing field already shows `.kiosk.ke` beside the handle. */
  showHost?: boolean;
  className?: string;
  messageClassName?: string;
  chipClassName?: string;
};

export function ShopAddressCoach({
  id,
  businessName,
  shopSlug,
  onPick,
  message,
  showHost = false,
  className,
  messageClassName,
  chipClassName,
}: ShopAddressCoachProps) {
  const slug = shopSlug.trim().toLowerCase();
  const shorter = shorterShopHandles(businessName, slug);
  const advice = shopAddressAdvice(businessName, slug);

  return (
    <div className={className}>
      {showHost && slug ? (
        <p className="font-mono text-[13px] tracking-tight text-foreground">
          {slug}.{PLATFORM_DOMAIN}
        </p>
      ) : null}
      <p id={id} className={cn("text-xs leading-relaxed", messageClassName)}>
        {message ?? advice}
      </p>
      {shorter.length > 0 ? (
        <div
          className="mt-2 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Shorter addresses"
        >
          {shorter.map((handle) => (
            <button
              key={handle}
              type="button"
              onClick={() => onPick(handle)}
              className={cn(
                "min-h-10 rounded-[2px] border px-3 font-mono text-[13px] transition-colors",
                chipClassName,
              )}
            >
              {handle}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
