"use client";

import Link from "next/link";
import { MapPin, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  CATALOG_BTN,
  CATALOG_BTN_OUTLINE,
  CATALOG_BTN_PRIMARY,
  CATALOG_EDGE,
} from "./catalog-chrome";

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

  const label = `${count.toLocaleString()} product${count === 1 ? "" : "s"} have no shelf zone`;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-none border bg-[color-mix(in_srgb,var(--catalog-primary)_5%,var(--catalog-slip,#fff))] px-2.5 py-1.5",
        CATALOG_EDGE,
        className,
      )}
      role="status"
      title="Shelf zones help staff find and restock items. Filter unassigned products and bulk-assign a zone."
    >
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-none bg-[color-mix(in_srgb,var(--catalog-primary)_12%,transparent)]"
        aria-hidden
      >
        <MapPin className="size-3.5 text-[var(--catalog-primary,#0f766e)]" />
      </span>
      <p className="min-w-0 flex-1 truncate text-[12px] font-medium tracking-[-0.01em] text-[var(--catalog-ink,#15231f)] sm:text-[13px]">
        {label}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="sm"
          className={cn(CATALOG_BTN_PRIMARY, "h-7 px-2 text-[11px] sm:px-2.5")}
          asChild
        >
          <Link href={`${APP_ROUTES.products}?aisleUnset=1`}>Unassigned</Link>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(
            CATALOG_BTN_OUTLINE,
            "hidden h-7 px-2 text-[11px] sm:inline-flex sm:px-2.5",
          )}
          asChild
        >
          <Link href={APP_ROUTES.aisles}>Zones</Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            CATALOG_BTN,
            "size-7 shrink-0 text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_48%,transparent)] hover:bg-[color-mix(in_srgb,var(--catalog-ink,#15231f)_4%,transparent)] hover:text-[var(--catalog-ink,#15231f)]",
          )}
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
          <X className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
