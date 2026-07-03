"use client";

import { CheckCircle2 } from "lucide-react";

import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function HubAllClear() {
  return (
    <section className="space-y-4">
      <h2 className={cn("text-sm font-medium", HUB_MUTED)}>Needs attention</h2>
      <div
        className={cn(
          HUB_SURFACE,
          "flex items-center gap-3 px-5 py-4 text-sm text-[#666666]",
        )}
      >
        <CheckCircle2
          className="size-4 shrink-0 text-emerald-600"
          aria-hidden
        />
        <span>All clear — nothing needs your attention right now.</span>
      </div>
    </section>
  );
}
