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
          "inline-flex size-6 shrink-0 items-center justify-center rounded-md border",
          active
            ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] text-[var(--pos-primary,#0f766e)]"
            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white/70 text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]",
        )}
      >
        <Icon className="size-3" strokeWidth={1.75} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <p className="truncate text-[8px] font-bold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
            {label}
          </p>
          {loading ? (
            <Loader2
              className="size-3 shrink-0 animate-spin text-[color-mix(in_srgb,var(--order-ink,#15231f)_35%,transparent)]"
              aria-hidden
            />
          ) : (
            <p className="font-heading shrink-0 text-[15px] font-semibold leading-none tracking-[-0.03em] text-[var(--order-ink,#15231f)] tabular-nums">
              {value}
            </p>
          )}
        </div>
        <p className="mt-0.5 truncate text-[10px] leading-none text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
          {hint}
        </p>
      </div>

      {href ? (
        <ArrowRight
          className="size-3 shrink-0 text-[color-mix(in_srgb,var(--order-ink,#15231f)_25%,transparent)] transition group-hover:text-[var(--pos-primary,#0f766e)]"
          aria-hidden
        />
      ) : null}
    </>
  );

  const className = cn(
    "relative flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2 py-1.5 transition-[box-shadow,border-color,transform] duration-150 ease-out",
    active
      ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_22%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,white)] shadow-[0_6px_16px_-12px_color-mix(in_srgb,var(--pos-primary,#0f766e)_45%,transparent)]"
      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_88%,transparent)] hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
    href &&
      "group hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pos-primary,#0f766e)] active:scale-[0.99]",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function PipelineStatsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}
