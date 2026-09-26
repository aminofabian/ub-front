"use client";

import type { ReactNode } from "react";

import { HubSectionLabel } from "@/components/business-hub/hub-section-label";
import { cn } from "@/lib/utils";

/**
 * Right-rail “desk” under live sales / shifts: attention, payment landing,
 * trusted tills — one vertical rhythm so the floor tape stays the headline
 * and these sit as the next things to handle.
 */
export function HubDeskStack({
  attention,
  payment,
  tills,
  framed = false,
  className,
}: {
  attention?: ReactNode;
  payment?: ReactNode;
  tills?: ReactNode;
  /** Pair payment + tills in one hairline frame (side rail). */
  framed?: boolean;
  className?: string;
}) {
  const moneyBlock =
    payment || tills ? (
      framed ? (
        <div
          className={cn(
            "flex flex-col gap-px overflow-hidden",
            "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
            "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)]",
          )}
        >
          {payment ? (
            <div className="min-w-0 bg-white [&_[data-hub-card]]:border-0">
              {payment}
            </div>
          ) : null}
          {tills ? (
            <div className="min-w-0 bg-white [&_[data-hub-card]]:border-0">
              {tills}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {payment}
          {tills}
        </div>
      )
    ) : null;

  if (!attention && !moneyBlock) return null;

  return (
    <section
      aria-label="Desk — attention, payments, and tills"
      className={cn("flex flex-col gap-2.5", className)}
    >
      <HubSectionLabel
        title="On the desk"
        meta="Review · pay · tills"
        className="px-0.5"
      />
      {attention ? <div className="min-w-0">{attention}</div> : null}
      {moneyBlock}
    </section>
  );
}
