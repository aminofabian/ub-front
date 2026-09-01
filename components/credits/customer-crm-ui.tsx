import { cn } from "@/lib/utils";

/** Shared checkbox styling for customer list / segment tables */
export function customerTableCheckboxClass(className?: string) {
  return cn(
    "size-4 shrink-0 rounded border-input accent-primary",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
    className,
  );
}

export function customerTableRowClass(selected?: boolean) {
  return cn(
    "border-b border-border/40 transition-colors last:border-0",
    selected
      ? "bg-primary/[0.06] hover:bg-primary/[0.08]"
      : "hover:bg-muted/25",
  );
}
