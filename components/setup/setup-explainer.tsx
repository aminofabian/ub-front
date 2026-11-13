import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SetupExplainerItem = {
  label: string;
  body: ReactNode;
};

/**
 * Two short answers every "set this up first" dialog gives: what the thing is, and why the
 * shop needs it. Hairline rules, no card, per the operator shell in DESIGN.md.
 */
export function SetupExplainer({
  items,
  className,
}: {
  items: SetupExplainerItem[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "divide-y divide-[var(--op-rule,var(--border))] border-y border-[var(--op-rule,var(--border))]",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="py-2.5">
          <dt className="text-[12px] font-semibold text-[var(--op-ink,var(--foreground))]">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-[13px] leading-relaxed text-[var(--op-muted,var(--muted-foreground))]">
            {item.body}
          </dd>
        </div>
      ))}
    </dl>
  );
}
