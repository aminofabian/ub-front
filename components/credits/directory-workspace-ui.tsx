import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Shared panel surface for directory / ranking workspaces */
export const directoryPanelClass =
  "overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm";

export const directoryFrameClass =
  "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/40 shadow-sm backdrop-blur-[2px] lg:min-h-[min(72dvh,44rem)] lg:max-h-[calc(100dvh-10.5rem)]";

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
        "flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </p>
        {hint ? (
          <p className="truncate text-[11px] text-muted-foreground/90">{hint}</p>
        ) : null}
      </div>
      {badge ? (
        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
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
        "min-w-0 rounded-lg border border-border/60 bg-background/80 px-2.5 py-2",
        className,
      )}
    >
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-base font-semibold tabular-nums tracking-tight",
          warn ? "text-amber-700 dark:text-amber-400" : "text-foreground",
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
    <header
      className={cn(
        "mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {title}
          </h1>
          {meta ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {meta}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
        {links?.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
        {actions}
      </div>
    </header>
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
      className="mb-2 flex items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
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
        "fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 backdrop-blur-sm",
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
