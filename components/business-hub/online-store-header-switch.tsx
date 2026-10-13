"use client";

import { Store } from "lucide-react";

import { useOnlineStoreToggle } from "@/hooks/use-online-store-toggle";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const SWITCH_CLASS = cn(
  "rounded-none data-checked:bg-[#0f766e] data-unchecked:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)]",
  "[&_[data-slot=switch-thumb]]:rounded-full",
  "focus-visible:border-[#0f766e] focus-visible:ring-[#0f766e]/35",
);

/**
 * The online-store toggle. `chip` is the compact header control (tablet/desk);
 * `row` is the full-width row used inside the phone shop menu, since the phone
 * header keeps only the board lens (period + tills).
 */
export function OnlineStoreHeaderSwitch({
  variant = "chip",
  className,
}: {
  variant?: "chip" | "row";
  className?: string;
}) {
  const { canToggle, enabled, saving, setEnabled } = useOnlineStoreToggle();

  if (!canToggle) return null;

  const ariaLabel = enabled
    ? "Turn off the online store"
    : "Turn on the online store";
  const toggle = (
    <Switch
      size="sm"
      checked={enabled}
      disabled={saving}
      onCheckedChange={(next) => {
        void setEnabled(next);
      }}
      aria-label={ariaLabel}
      className={SWITCH_CLASS}
    />
  );

  if (variant === "row") {
    return (
      <div
        className={cn(
          "flex min-h-12 items-center gap-3 border border-[color-mix(in_srgb,var(--order-ink,#15231f)_7%,transparent)] bg-white px-3 py-2",
          saving && "opacity-70",
          className,
        )}
      >
        <Store className="size-4 shrink-0 text-[#0f766e]" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold tracking-[-0.01em] text-[#141414]">
            Online store
          </span>
          <span
            className={cn(
              "mt-0.5 block text-[11px] font-medium",
              enabled ? "text-[#0f766e]" : "text-[#8A8A8A]",
            )}
          >
            {saving
              ? "Saving…"
              : enabled
                ? "Live — shoppers can browse"
                : "Off — hidden from shoppers"}
          </span>
        </span>
        {toggle}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex h-9 max-w-full shrink-0 items-center gap-1 rounded-none border border-[color-mix(in_srgb,#141414_8%,transparent)] bg-white pl-1.5 pr-1 sm:h-8 sm:gap-1.5 sm:pl-2 sm:pr-1.5",
        saving && "opacity-70",
        className,
      )}
    >
      <Store className="size-3.5 shrink-0 text-[#0f766e]" aria-hidden />
      <span className="hidden min-w-0 sm:block">
        <span className="block text-[11px] font-medium leading-none tracking-[-0.01em] text-[#141414]">
          Online
        </span>
        <span
          className={cn(
            "mt-0.5 block text-[10px] font-medium leading-none",
            enabled ? "text-[#0f766e]" : "text-[#8A8A8A]",
          )}
        >
          {saving ? "Saving" : enabled ? "On" : "Off"}
        </span>
      </span>
      {toggle}
    </div>
  );
}
