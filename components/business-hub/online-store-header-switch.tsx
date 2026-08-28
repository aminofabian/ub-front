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
        "inline-flex h-9 max-w-full items-center gap-2 rounded-lg border border-[#E6E1D8]/90 bg-white pl-2.5 pr-1.5",
        "shadow-[0_1px_0_rgba(20,20,20,0.04)]",
        saving && "opacity-70",
      )}
    >
      <Store className="size-3.5 shrink-0 text-[#B08D48]" aria-hidden />
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold leading-none tracking-[-0.01em] text-[#141414]">
          Online store
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
          enabled
            ? "Turn off the online store"
            : "Turn on the online store"
        }
        className={cn(
          "ml-0.5 data-checked:bg-[#141414] data-unchecked:bg-[#E6E1D8]",
          "focus-visible:border-[#B08D48] focus-visible:ring-[#B08D48]/35",
        )}
      />
    </div>
  );
}
