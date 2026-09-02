"use client";

import type { ReactNode } from "react";
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
          "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
          active
            ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_14%,transparent)] text-[var(--pos-primary,#0f766e)]"
            : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]",
        )}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-[16px] font-semibold leading-none tracking-[-0.03em] text-[var(--order-ink,#15231f)] tabular-nums">
          {value}
        </span>
        <span className="mt-0.5 block truncate text-[9px] font-bold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_44%,transparent)]">
          {label}
        </span>
      </span>
      {href ? (
        <ArrowRight
          className="size-3 shrink-0 text-[color-mix(in_srgb,var(--order-ink,#15231f)_22%,transparent)] transition group-hover:text-[var(--pos-primary,#0f766e)]"
          aria-hidden
        />
      ) : null}
    </>
  );

  const className = cn(
    "group flex min-h-[2.75rem] min-w-0 flex-1 items-center gap-2 bg-[var(--order-slip,#fff)] px-2.5 py-1.5 transition-[background-color,transform] duration-150 ease-out",
    href &&
      "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--pos-primary,#0f766e)] active:scale-[0.99]",
    active &&
      "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]",
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
    <div className="grid min-w-0 flex-1 grid-cols-2 gap-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] sm:flex sm:gap-0 sm:divide-x sm:bg-transparent sm:divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
      {children}
    </div>
  );
}

export function OrderInstrumentShell({
  label,
  ledger,
  live,
}: {
  label: string;
  ledger: ReactNode;
  live: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className="overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-slip,#fff)_92%,transparent)] shadow-[0_12px_32px_-22px_color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]"
    >
      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.95fr)]">
        {ledger}
        {live}
      </div>
    </section>
  );
}
