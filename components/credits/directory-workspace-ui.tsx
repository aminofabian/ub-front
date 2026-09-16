import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Shared panel surface for directory / ranking workspaces */
export const directoryPanelClass =
  "overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white shadow-none";

export const directoryFrameClass =
  "flex min-h-0 flex-col overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)] shadow-none lg:h-[min(80dvh,52rem)] lg:max-h-[calc(100dvh-10.5rem)]";

export function DirectoryPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(directoryPanelClass, className)}>{children}</div>;
}

export function DirectoryColumnHeader({
  title,
  hint,
  badge,
  className,
}: {
  title: string;
  hint?: string;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-3 py-2",
        className,
      )}
    >
      <div className="min-w-0">
        <p
          className="text-[13px] font-semibold tracking-[-0.02em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {title}
        </p>
        {hint ? (
          <p className="truncate text-[11px] text-muted-foreground/90">
            {hint}
          </p>
        ) : null}
      </div>
      {badge ? (
        <span className="shrink-0 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export function DirectoryColumn({
  title,
  hint,
  badge,
  children,
  className,
}: {
  title: string;
  hint?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex min-h-0 min-w-0 flex-col", className)}>
      <DirectoryColumnHeader title={title} hint={hint} badge={badge} />
      <div className="min-h-0 flex-1 overflow-y-auto p-2">{children}</div>
    </section>
  );
}

export function DirectoryStat({
  label,
  value,
  warn,
  className,
}: {
  label: string;
  value: string;
  warn?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2.5 py-2",
        className,
      )}
    >
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-base font-semibold tabular-nums tracking-tight",
          warn ? "text-[#9a2e16]" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function DirectoryToolbar({
  icon: Icon,
  eyebrow,
  title,
  meta,
  links,
  actions,
  className,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  meta?: ReactNode;
  links?: { href: string; label: string }[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-1.5 flex flex-col gap-1", className)}>
      <header
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
          "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex size-7 shrink-0 items-center justify-center border bg-[var(--pos-primary,#0f766e)] text-white">
              <Icon className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1
                className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {title}
              </h1>
              <p className="hidden truncate text-[10px] text-muted-foreground sm:block">
                {eyebrow}
              </p>
            </div>
          </div>
          {links && links.length > 0 ? (
            <>
              <span
                aria-hidden
                className="hidden h-3.5 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
              />
              <nav className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="truncate text-muted-foreground hover:text-[var(--pos-primary,#0f766e)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1">{actions}</div>
        ) : null}
      </header>
      {meta ? (
        <p className="line-clamp-2 px-0.5 text-[11px] leading-snug text-muted-foreground">
          {meta}
        </p>
      ) : null}
    </div>
  );
}

export function DirectoryBackButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="mb-2 flex items-center gap-1.5 rounded-none px-1 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      onClick={onClick}
    >
      <span aria-hidden>←</span>
      {label}
    </button>
  );
}

export function DirectoryMobileTabs({
  tabs,
  className,
}: {
  tabs: { id: string; label: string; onClick: () => void }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className="flex-1 py-2.5 text-center text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
          onClick={tab.onClick}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function DirectoryEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <DirectoryPanel className="flex flex-col items-center px-4 py-10 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </DirectoryPanel>
  );
}
