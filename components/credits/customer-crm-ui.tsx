import { cn } from "@/lib/utils";

/** Outer workspace frame — full-height column grid on large screens */
export const CRM_WORKSPACE_SHELL = cn(
  "relative flex min-h-0 w-full min-w-0 flex-col",
  "lg:h-[calc(100dvh-7.5rem)] lg:min-h-[32rem] lg:overflow-hidden",
);

export const CRM_GRID = cn(
  "grid min-h-0 flex-1 gap-0",
  "lg:grid-cols-[minmax(16rem,18rem)_minmax(0,1fr)_minmax(17rem,20rem)]",
  "lg:items-stretch lg:overflow-hidden",
);

export const CRM_RAIL = cn(
  "flex min-h-0 min-w-0 flex-col",
  "border-b border-border/60 bg-[linear-gradient(165deg,color-mix(in_srgb,var(--muted)_42%,transparent)_0%,transparent_42%)]",
  "lg:border-b-0 lg:border-r lg:overflow-y-auto",
);

export const CRM_MAIN = cn(
  "flex min-h-0 min-w-0 flex-col",
  "max-h-[min(72dvh,40rem)] overflow-hidden sm:max-h-[min(76dvh,44rem)]",
  "lg:max-h-none lg:flex-1",
);

export const CRM_INSPECTOR = cn(
  "flex min-h-0 min-w-0 flex-col",
  "border-t border-border/60 bg-muted/10",
  "lg:border-l lg:border-t-0 lg:overflow-y-auto",
);

export const CRM_PANEL = cn(
  "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm",
  "ring-1 ring-black/[0.02] dark:ring-white/[0.04]",
);

export const CRM_PILL_ACTIVE =
  "bg-[#F9F6F0] text-[#8B6F3A] ring-1 ring-[#8B6F3A]/12 shadow-sm";

export const CRM_PILL_IDLE =
  "text-muted-foreground hover:bg-muted/70 hover:text-foreground";

export function customerTableCheckboxClass(className?: string) {
  return cn(
    "size-4 shrink-0 rounded border-input accent-[#8B6F3A]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
    className,
  );
}

export function customerTableRowClass(selected?: boolean, focused?: boolean) {
  return cn(
    "border-b border-border/40 transition-colors last:border-0",
    selected && "bg-[#8B6F3A]/[0.08] hover:bg-[#8B6F3A]/[0.1]",
    !selected && focused && "bg-muted/40",
    !selected && !focused && "hover:bg-muted/25",
  );
}

export function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}
