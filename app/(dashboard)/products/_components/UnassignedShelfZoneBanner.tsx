"use client";

import Link from "next/link";
import { MapPin, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { CATALOG_BTN, CATALOG_EDGE } from "./catalog-chrome";

const DISMISS_KEY = "palmart:shelfZoneBannerDismissed:v1";

function dismissKey(businessId: string | undefined) {
  return businessId ? `${DISMISS_KEY}:${businessId}` : DISMISS_KEY;
}

export function readShelfZoneBannerDismissed(
  businessId: string | undefined,
): boolean {
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
        "flex items-center gap-2 rounded-[2px] border border-[var(--op-rule)] bg-[var(--op-surface)] px-3 py-2",
        CATALOG_EDGE,
        className,
      )}
      role="status"
      title="Shelf zones help staff find and restock items. Filter unassigned products and bulk-assign a zone."
    >
      <MapPin
        className="size-4 shrink-0 text-[var(--op-highlight)]"
        strokeWidth={1.75}
        aria-hidden
      />
      <p className="min-w-0 flex-1 truncate text-[12.5px] font-medium tracking-[-0.01em] text-[var(--op-ink)]">
        {label}
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`${APP_ROUTES.products}?aisleUnset=1`}
          className="px-1 text-[12px] font-semibold text-[var(--op-accent)] underline-offset-4 hover:underline"
        >
          Unassigned
        </Link>
        <Link
          href={APP_ROUTES.aisles}
          className="px-1 text-[12px] font-medium text-[var(--op-muted)] underline-offset-4 hover:text-[var(--op-ink)] hover:underline"
        >
          Zones
        </Link>
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
