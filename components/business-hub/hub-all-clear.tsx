"use client";

import { CheckCircle2 } from "lucide-react";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function HubAllClear() {
  return (
    <section
      className={cn(
        HUB_SURFACE,
        "flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#3A3A3A]",
      )}
    >
      <CheckCircle2
        className="size-3.5 shrink-0 text-emerald-600"
        aria-hidden
      />
      <span>All clear — nothing needs a look right now.</span>
    </section>
  );
}
