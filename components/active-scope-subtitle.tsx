"use client";

import {
  ALL_DEPARTMENTS_LABEL,
  ALL_SHELF_ZONES_LABEL,
  useSessionBranch,
  useSessionItemType,
  useSessionAisle,
} from "@/hooks/use-session-scope";
import { cn } from "@/lib/utils";

/**
 * Page hero subtitle showing the active global branch and department scope.
 * Example: "Mirema Drive · Retail Shop"
 */
export function ActiveScopeSubtitle({
  className,
}: {
  className?: string;
}) {
  const { branchName } = useSessionBranch();
  const { itemTypeLabel } = useSessionItemType();
  const { aisleLabel } = useSessionAisle();

  const parts: string[] = [];
  if (branchName) parts.push(branchName);
  if (itemTypeLabel) {
    parts.push(
      itemTypeLabel === ALL_DEPARTMENTS_LABEL
        ? ALL_DEPARTMENTS_LABEL
        : itemTypeLabel,
    );
  }
  if (aisleLabel && aisleLabel !== ALL_SHELF_ZONES_LABEL) {
    parts.push(aisleLabel);
  }

  if (parts.length === 0) return null;

  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {parts.join(" · ")}
    </p>
  );
}
