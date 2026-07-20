"use client";

import { CheckCircle2 } from "lucide-react";

import { HUB_MUTED, HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function HubAllClear() {
  return (
    <section className="space-y-2">
      <h2 className={cn("text-sm font-medium", HUB_MUTED)}>Needs attention</h2>
      <div
        className={cn(
          HUB_SURFACE,
          "flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#666666]",
        )}
      >
        <CheckCircle2
          className="size-3.5 shrink-0 text-emerald-600"
          aria-hidden
        />
        <span>All clear — nothing needs a look right now.</span>
      </div>
    </section>
  );
}
