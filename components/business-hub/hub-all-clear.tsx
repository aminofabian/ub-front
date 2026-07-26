"use client";

import { CheckCircle2 } from "lucide-react";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function HubAllClear() {
  return (
    <section
      className={cn(
        HUB_SURFACE,
        "relative flex items-center gap-2.5 overflow-hidden px-3.5 py-2.5 text-xs text-[#3A3A3A]",
      )}
    >
      <span className="absolute inset-y-0 left-0 w-0.5 bg-emerald-500" aria-hidden />
      <CheckCircle2
        className="ml-1 size-3.5 shrink-0 text-emerald-600"
        aria-hidden
      />
      <span>All clear — nothing needs a look right now.</span>
    </section>
  );
}
