"use client";

import Link from "next/link";
import { MapPin, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "palmart:shelfZoneBannerDismissed:v1";

function dismissKey(businessId: string | undefined) {
  return businessId ? `${DISMISS_KEY}:${businessId}` : DISMISS_KEY;
}

export function readShelfZoneBannerDismissed(businessId: string | undefined): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(dismissKey(businessId)) === "1";
  } catch {
    return false;
  }
}

export function UnassignedShelfZoneBanner({
  count,
  businessId,
  onDismiss,
  className,
}: {
  count: number;
  businessId?: string;
  onDismiss: () => void;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--catalog-primary)_22%,transparent)] bg-[color-mix(in_srgb,var(--catalog-primary)_7%,var(--catalog-slip,#fff))] px-3.5 py-3 sm:px-4",
        className,
      )}
      role="status"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <MapPin
          className="mt-0.5 size-4 shrink-0 text-[var(--catalog-primary,#0f766e)]"
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-[var(--catalog-ink,#15231f)]">
            {count.toLocaleString()} product{count === 1 ? "" : "s"} have no shelf zone
          </p>
          <p className="text-[12px] leading-relaxed text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_62%,transparent)]">
            Shelf zones help staff find and restock items on the floor. Filter unassigned
            products and bulk-assign a zone.
          </p>
          <div className="flex flex-wrap gap-2 pt-0.5">
            <Button type="button" size="sm" className="h-8 rounded-lg text-xs" asChild>
              <Link href={`${APP_ROUTES.products}?aisleUnset=1`}>Show unassigned</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg text-xs"
              asChild
            >
              <Link href={APP_ROUTES.aisles}>Manage zones</Link>
            </Button>
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 rounded-lg text-muted-foreground"
        onClick={() => {
          try {
            window.localStorage.setItem(dismissKey(businessId), "1");
          } catch {
            /* private mode */
          }
          onDismiss();
        }}
        aria-label="Dismiss shelf zone reminder"
      >
        <X className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
