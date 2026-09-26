"use client";

import { Lightbulb } from "lucide-react";

import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

export function HubTipCard() {
  return (
    <section className={cn(HUB_SURFACE, "flex gap-3 bg-[#F1F9F8] p-3.5")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#0f766e]">
        <Lightbulb className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold tracking-[-0.02em] text-[#141414]">
          Keep your shop running
        </p>
        <p className="mt-1 text-[12px] leading-snug text-[#3F6F68]">
          Check low stock, collect credits, and clear payables to keep your
          sales on track.
        </p>
      </div>
    </section>
  );
}
