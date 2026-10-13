"use client";

import { CheckCircle2 } from "lucide-react";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function HubAllClear() {
  return (
    <section
      className={cn(
        HUB_SURFACE,
        "flex items-center gap-2.5 px-4 py-3 text-[13px] text-[#344054]",
      )}
    >
      <CheckCircle2
        className="size-4 shrink-0 text-[#0e9f6e]"
        aria-hidden
      />
      <span>All clear — nothing needs a look right now.</span>
    </section>
  );
}
