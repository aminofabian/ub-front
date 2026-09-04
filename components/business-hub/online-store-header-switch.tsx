"use client";

import { Store } from "lucide-react";

import { useOnlineStoreToggle } from "@/hooks/use-online-store-toggle";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function OnlineStoreHeaderSwitch() {
  const { canToggle, enabled, saving, setEnabled } = useOnlineStoreToggle();

  if (!canToggle) return null;

  return (
    <div
      className={cn(
        "inline-flex h-8 max-w-full items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,#141414_8%,transparent)] bg-white pl-2 pr-1",
        saving && "opacity-70",
      )}
    >
      <Store className="size-3.5 shrink-0 text-[#B08D48]" aria-hidden />
      <span className="hidden min-w-0 sm:block">
        <span className="block text-[11px] font-medium leading-none tracking-[-0.01em] text-[#141414]">
          Online
        </span>
        <span
          className={cn(
            "mt-0.5 block text-[10px] font-medium leading-none",
            enabled ? "text-[#8A6B2E]" : "text-[#8A8A8A]",
          )}
        >
          {saving ? "Saving" : enabled ? "On" : "Off"}
        </span>
      </span>
      <Switch
        size="sm"
        checked={enabled}
        disabled={saving}
        onCheckedChange={(next) => {
          void setEnabled(next);
        }}
        aria-label={
          enabled ? "Turn off the online store" : "Turn on the online store"
        }
        className={cn(
          "rounded-none data-checked:bg-[#141414] data-unchecked:bg-[#E6E1D8]",
          "[&_[data-slot=switch-thumb]]:rounded-none",
          "focus-visible:border-[#B08D48] focus-visible:ring-[#B08D48]/35",
        )}
      />
    </div>
  );
}
