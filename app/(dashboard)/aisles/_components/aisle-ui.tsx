import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const aislePanelClass =
  "overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]";

export function AislePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(aislePanelClass, className)}>{children}</div>;
}

export function AisleBar({
  pct,
  className,
  warn,
}: {
  pct: number;
  className?: string;
  warn?: boolean;
}) {
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-muted", className)}>
      <div
        className={cn(
          "h-1.5 origin-left rounded-full",
          warn ? "bg-amber-500/80" : "bg-foreground/55",
        )}
        style={{
          width: "100%",
          transform: `scaleX(${Math.min(100, Math.max(0, pct)) / 100})`,
        }}
      />
    </div>
  );
}
