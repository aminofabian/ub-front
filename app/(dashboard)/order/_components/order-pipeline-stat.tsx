"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Loader2, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type PipelineStatProps = {
  label: string;
  value: string | number;
  hint: string;
  icon: LucideIcon;
  active?: boolean;
  href?: string;
  loading?: boolean;
};

export function PipelineStat({
  label,
  value,
  hint,
  icon: Icon,
  active = false,
  href,
  loading = false,
}: PipelineStatProps) {
  const inner = (
    <>
      <span
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-none border",
          active
            ? "border-[var(--pos-primary,#0f766e)] text-[var(--pos-primary,#0f766e)]"
            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]",
        )}
      >
        <Icon className="size-3" strokeWidth={1.75} aria-hidden />
      </span>

      {loading ? (
        <Loader2
          className="size-3 shrink-0 animate-spin text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]"
          aria-hidden
        />
      ) : (
        <p className="font-heading shrink-0 text-[13px] font-semibold leading-none tracking-[-0.03em] text-[var(--order-ink,#15231f)] tabular-nums">
          {value}
        </p>
      )}
      <p className="min-w-0 truncate text-[11px] font-medium text-[color-mix(in_srgb,var(--order-ink,#15231f)_62%,transparent)]">
        {label}
      </p>

      {href ? (
        <ArrowRight
          className="size-3 shrink-0 text-[color-mix(in_srgb,var(--order-ink,#15231f)_28%,transparent)] transition group-hover:text-[var(--pos-primary,#0f766e)]"
          aria-hidden
        />
      ) : null}
    </>
  );

  const className = cn(
    "relative flex min-w-0 flex-1 items-center gap-1.5 rounded-none border bg-white px-2 py-1 transition-[border-color] duration-150",
    active
      ? "border-[var(--pos-primary,#0f766e)]"
      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_26%,transparent)]",
    href &&
      "group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
  );

  if (href) {
    return (
      <Link href={href} className={className} title={hint}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={className} title={hint}>
      {inner}
    </div>
  );
}

export function PipelineStatsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-1 lg:grid-cols-4">{children}</div>
  );
}
