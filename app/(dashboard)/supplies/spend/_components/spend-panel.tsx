"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function SpendPanel({
  title,
  hint,
  icon: Icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  hint?: string;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--op-surface)] ring-1 ring-[var(--op-rule)]",
        className,
      )}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[var(--op-rule)] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center border border-[var(--op-rule)] text-[var(--op-accent)]">
            <Icon className="size-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[13px] font-semibold tracking-[-0.02em] text-[var(--op-ink)]">
              {title}
            </h2>
            {hint ? (
              <p className="truncate text-[11px] leading-tight text-[var(--op-muted)]">
                {hint}
              </p>
            ) : null}
          </div>
        </div>
        {action ? (
          <div className="flex shrink-0 items-center gap-1">{action}</div>
        ) : null}
      </header>
      <div className={cn("min-h-0 flex-1 p-3.5", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
