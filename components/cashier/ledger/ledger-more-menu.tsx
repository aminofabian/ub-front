"use client";

import { Children, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Full-width command row. Pass to AirtimeQuickAction as triggerClassName. */
export const MORE_ROW = cn(
  "flex min-h-12 w-full items-center gap-2.5 px-3 py-2 text-left text-[14px] font-medium text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)] sm:min-h-0 sm:py-1.5 sm:text-[13px]",
  "transition-colors",
  "hover:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)] active:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_7%,transparent)]",
  "focus-visible:outline-none focus-visible:bg-[color-mix(in_srgb,var(--pos-primary)_10%,transparent)]",
  "disabled:opacity-40",
  "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
);

/** Tinted square behind a row icon — the app-menu look on phones. */
const MORE_ICON_TILE = cn(
  "flex size-8 shrink-0 items-center justify-center rounded-none bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] text-muted-foreground transition-colors",
  "group-hover:bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] group-hover:text-[var(--pos-primary)]",
  "group-disabled:bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_4%,transparent)]",
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
    <section className="border-t border-dashed border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] first:border-t-0 dark:border-border/40">
      <h2 className="px-3 pb-1 pt-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:px-2.5">
        {label}
      </h2>
      <div className="pb-1">{items}</div>
    </section>
  );
}

/**
 * Command tiles — three per row on a phone. The till's most-used actions live
 * here instead of in a long list: a tile is a bigger, fixed target, so a
 * cashier learns where each action sits and stops reading labels at all.
 */
export function MoreGrid({ children }: { children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;
  return <div className="grid grid-cols-3 gap-1.5 px-2 pb-2">{items}</div>;
}

export function MoreTile({
  icon: Icon,
  children,
  hint,
  onClick,
  disabled,
  tone = "default",
}: {
  icon: LucideIcon;
  children: ReactNode;
  /** One plain-language line under the label — what this does. */
  hint?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  const hintText = typeof hint === "string" ? hint : undefined;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={hintText ? `${String(children)} — ${hintText}` : String(children)}
      className={cn(
        "group flex min-h-[4.75rem] flex-col items-start gap-1 border p-2 text-left transition-colors",
        "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] bg-[color-mix(in_srgb,var(--card)_94%,#f7f3eb)]",
        "hover:border-[color-mix(in_srgb,var(--pos-primary)_40%,transparent)] hover:bg-card",
        "active:bg-[color-mix(in_srgb,var(--pos-paper,#f1ece3)_50%,var(--card))]",
        "focus-visible:outline-none focus-visible:border-[color-mix(in_srgb,var(--pos-primary)_45%,transparent)] focus-visible:ring-1 focus-visible:ring-[color-mix(in_srgb,var(--pos-primary)_35%,transparent)]",
        "disabled:opacity-40",
        "dark:border-border/40 dark:bg-card",
        tone === "danger" &&
          "hover:border-red-400/60 hover:bg-red-500/5 dark:hover:border-red-800",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-none bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_6%,transparent)] text-muted-foreground transition-colors",
          "group-hover:bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] group-hover:text-[var(--pos-primary)]",
          tone === "danger" &&
            "group-hover:bg-red-500/12 group-hover:text-red-700 dark:group-hover:text-red-300",
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </span>
      <span className="w-full text-[11px] font-semibold leading-tight tracking-tight text-[color-mix(in_srgb,var(--pos-ink,#1c1915)_92%,transparent)]">
        {children}
      </span>
      {hint ? (
        <span className="line-clamp-2 w-full text-[9px] leading-snug text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </button>
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
    tone === "leave" && "text-muted-foreground hover:text-foreground",
  );
  const inner = (
    <>
      <span
        className={cn(
          MORE_ICON_TILE,
          tone === "leave" &&
            "group-hover:bg-red-500/12 group-hover:text-red-700 dark:group-hover:bg-red-950/40 dark:group-hover:text-red-300",
        )}
        aria-hidden
      >
        {/* `!text-current` lets the tile own the colour (MORE_ROW pins svg colour). */}
        <Icon className="!text-current" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{children}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11px] font-normal leading-snug text-muted-foreground line-clamp-2">
            {hint}
          </span>
        ) : null}
      </span>
      {href ? (
        <ChevronRight
          className="size-3.5 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5"
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
