"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Order", description: "Build & send the purchase order" },
  { title: "Receive", description: "Goods in, against an order or walk-in" },
  { title: "Records", description: "Ledger · deliveries, bills, deposits" },
  { title: "Suppliers", description: "People · directory and wallets" },
] as const;

export function OrderBuyingJourney({ step = 1 }: { step?: number }) {
  const activeIndex = Math.min(Math.max(step, 1), STEPS.length) - 1;

  return (
    <section
      aria-label="Buying journey"
      className="rounded-2xl bg-white p-4 ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">
          Buying journey
        </p>
        <p className="text-[12px] font-semibold text-[#0f766e]">
          Step {step} of 4
        </p>
      </div>

      {/* Phones: compact horizontal stepper. */}
      <ol className="relative mt-3 grid grid-cols-4 lg:hidden">
        <span
          aria-hidden
          className="absolute left-[12.5%] right-[12.5%] top-3.5 h-px bg-[#e6eaec]"
        />
        {STEPS.map((item, index) => {
          const done = index <= activeIndex;
          return (
            <li
              key={item.title}
              className="relative z-10 flex flex-col items-center gap-1.5 px-1 text-center"
            >
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums",
                  done
                    ? "bg-[#0f766e] text-white"
                    : "bg-[#e6f4f0] text-[#98a2b3]",
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "text-[11px] leading-tight",
                  done ? "font-semibold text-[#0f766e]" : "text-[#98a2b3]",
                )}
              >
                {item.title}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Desktop: four small step cards. */}
      <div className="mt-3 hidden lg:grid lg:grid-cols-4 lg:gap-2">
        {STEPS.map((item, index) => {
          const current = index === activeIndex;
          return (
            <div
              key={item.title}
              className={cn(
                "rounded-xl p-3 ring-1 ring-black/[0.05]",
                current ? "bg-[#e9f5f1]" : "bg-white",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums",
                  current
                    ? "bg-[#0f766e] text-white"
                    : "bg-[#e6f4f0] text-[#98a2b3]",
                )}
              >
                {index + 1}
              </span>
              <p className="mt-2 text-[13px] font-semibold text-[#101828]">
                {item.title}
              </p>
              <p className="mt-0.5 text-[12px] leading-snug text-[#667085]">
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
