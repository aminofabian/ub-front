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
  "border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white",
  "lg:border-b-0 lg:border-r lg:overflow-y-auto",
);

export const CRM_MAIN = cn(
  "flex min-h-0 min-w-0 flex-col",
  "max-h-[min(72dvh,40rem)] overflow-hidden sm:max-h-[min(76dvh,44rem)]",
  "lg:max-h-none lg:flex-1",
);

export const CRM_INSPECTOR = cn(
  "flex min-h-0 min-w-0 flex-col",
  "border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white",
  "lg:border-l lg:border-t-0 lg:overflow-y-auto",
);

export const CRM_PANEL = cn(
  "overflow-hidden rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white shadow-none",
);

export const CRM_PILL_ACTIVE =
  "border border-[var(--pos-primary,#0f766e)] bg-white text-[var(--pos-primary,#0f766e)] shadow-none";

export const CRM_PILL_IDLE =
  "border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)] hover:text-[var(--order-ink,#15231f)]";

export function customerTableCheckboxClass(className?: string) {
  return cn(
    "size-4 shrink-0 rounded-none border-input accent-[var(--pos-primary,#0f766e)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]",
    className,
  );
}

export function customerTableRowClass(selected?: boolean, focused?: boolean) {
  return cn(
    "border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] transition-colors last:border-0",
    selected && "bg-white text-[var(--pos-primary,#0f766e)]",
    !selected && focused && "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)]",
    !selected && !focused && "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,transparent)]",
  );
}

export function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}
