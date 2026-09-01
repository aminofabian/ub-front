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
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-lg border",
            active
              ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] text-[var(--pos-primary,#0f766e)]"
              : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white/70 text-[color-mix(in_srgb,var(--order-ink,#15231f)_45%,transparent)]",
          )}
        >
          <Icon className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
        {loading ? (
          <Loader2
            className="size-4 animate-spin text-[color-mix(in_srgb,var(--order-ink,#15231f)_35%,transparent)]"
            aria-hidden
          />
        ) : null}
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
          {label}
        </p>
        <p className="font-heading text-[22px] font-semibold leading-none tracking-[-0.03em] text-[var(--order-ink,#15231f)] tabular-nums">
          {value}
        </p>
        <p className="text-[11px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
          {hint}
        </p>
      </div>
    </>
  );

  const className = cn(
    "relative min-w-0 flex-1 rounded-xl border px-3.5 py-3 transition-[box-shadow,border-color,transform]",
    active
      ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_22%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,white)] shadow-[0_10px_28px_-18px_color-mix(in_srgb,var(--pos-primary,#0f766e)_45%,transparent)]"
      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_88%,transparent)] hover:border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
    href && "group hover:-translate-y-px",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
        <ArrowRight
          className="absolute right-3 top-3 size-3.5 text-[color-mix(in_srgb,var(--order-ink,#15231f)_25%,transparent)] transition group-hover:text-[var(--pos-primary,#0f766e)]"
          aria-hidden
        />
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function PipelineStatsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[12%] top-[2.65rem] hidden h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] to-transparent sm:block"
      />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  );
}
