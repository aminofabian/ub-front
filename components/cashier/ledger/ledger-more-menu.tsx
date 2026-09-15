"use client";

import { Children, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Full-width command row. Pass to AirtimeQuickAction as triggerClassName. */
export const MORE_ROW = cn(
  "flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left text-[15px] font-medium text-zinc-800 sm:min-h-0 sm:gap-2.5 sm:px-2.5 sm:py-2 sm:text-[13px]",
  "hover:bg-zinc-50 active:bg-zinc-100",
  "focus-visible:outline-none focus-visible:bg-[color-mix(in_srgb,var(--pos-primary)_8%,white)]",
  "disabled:opacity-40",
  "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-zinc-500",
);

/** Tinted square behind a row icon — the app-menu look on phones. */
const MORE_ICON_TILE = cn(
  "flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 transition-colors",
  "group-hover:bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] group-hover:text-[var(--pos-primary)]",
  "group-disabled:bg-zinc-100 group-disabled:text-zinc-400",
);

export function MoreSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const items = Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <section className="border-t border-zinc-100 first:border-t-0">
      <h2 className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 sm:px-2.5 sm:text-[11px] sm:font-medium sm:normal-case sm:tracking-normal">
        {label}
      </h2>
      <div className="divide-y divide-zinc-100/80 pb-1 sm:divide-y-0">{items}</div>
    </section>
  );
}

export function MoreRow({
  icon: Icon,
  children,
  hint,
  onClick,
  href,
  disabled,
  tone = "default",
}: {
  icon: LucideIcon;
  children: ReactNode;
  /** One plain-language line under the label — what this does. */
  hint?: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  tone?: "default" | "leave";
}) {
  const className = cn(
    MORE_ROW,
    "group",
    tone === "leave" && "text-zinc-600 hover:text-zinc-900",
  );
  const inner = (
    <>
      <span
        className={cn(
          MORE_ICON_TILE,
          tone === "leave" &&
            "group-hover:bg-red-100 group-hover:text-red-700 dark:group-hover:bg-red-950/30 dark:group-hover:text-red-300",
        )}
        aria-hidden
      >
        {/* `!text-current` lets the tile own the colour (MORE_ROW pins svg colour). */}
        <Icon className="!text-current" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{children}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] font-normal leading-snug text-zinc-500 sm:truncate">
            {hint}
          </span>
        ) : null}
      </span>
      {href ? (
        <ChevronRight
          className="text-zinc-400 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      ) : null}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={className}
        aria-disabled={disabled}
        onClick={onClick}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {inner}
    </button>
  );
}
