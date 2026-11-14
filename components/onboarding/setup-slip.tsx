"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SetupSlipLine = {
  label: string;
  /** Null until the owner reaches (and answers) that question. */
  value: ReactNode | null;
  /** The owner has moved past this question without it applying to them. */
  skipped?: boolean;
};

/**
 * The shop, written up as a till slip while the owner answers. It is the same
 * information as the progress line, shown as the thing being made — so each
 * answer visibly lands somewhere. Wide screens only; a phone has no room.
 */
export function SetupSlip({
  shopName,
  meta,
  lines,
  stamped = false,
}: {
  shopName: string;
  meta: string;
  lines: SetupSlipLine[];
  /** The shop is set up: the terracotta stamp lands on the slip. */
  stamped?: boolean;
}) {
  const written = lines.filter((line) => line.value !== null).length;
  return (
    <aside className="hidden lg:block" aria-label="Your shop so far">
      <div className="sticky top-1 [filter:drop-shadow(0_22px_26px_rgba(18,26,22,0.13))_drop-shadow(0_1px_1px_rgba(18,26,22,0.1))]">
        <div className="kiosk-setup-slip relative bg-[#FFFEFA] px-5 pb-9 pt-6">
          <p className="text-balance font-serif text-[1.4rem] font-medium leading-[1.1] text-[#121A16]">
            {shopName}
          </p>
          <p className="mt-1.5 font-mono text-[10.5px] text-[#556159]">{meta}</p>
          <div
            className="my-4 border-t border-dashed border-[rgba(18,26,22,0.28)]"
            aria-hidden
          />
          <dl className="space-y-2.5 font-mono text-[11.5px] leading-snug">
            {lines.map((line) => (
              <div key={line.label} className="flex items-baseline gap-2">
                <dt className="shrink-0 text-[#556159]">{line.label}</dt>
                <span
                  className="min-w-3 flex-1 translate-y-[-3px] border-b border-dotted border-[rgba(18,26,22,0.28)]"
                  aria-hidden
                />
                <dd
                  className={cn(
                    "max-w-[62%] text-right",
                    line.value !== null ? "text-[#121A16]" : "text-[#556159]",
                  )}
                >
                  {line.value !== null ? (
                    <span
                      key={typeof line.value === "string" ? line.value : "set"}
                      className="inline-block motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-300"
                    >
                      {line.value}
                    </span>
                  ) : line.skipped ? (
                    "not needed"
                  ) : (
                    <span className="sr-only">not yet answered</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div
            className="my-4 border-t border-dashed border-[rgba(18,26,22,0.28)]"
            aria-hidden
          />
          <p className="font-mono text-[10.5px] tabular-nums text-[#556159]">
            {written} of {lines.length} lines written
          </p>
          {stamped ? (
            <span
              className="kiosk-setup-stamp absolute bottom-9 right-4 border-[1.5px] border-[#A55237] px-2 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#A55237]"
              role="status"
            >
              Set up
            </span>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
