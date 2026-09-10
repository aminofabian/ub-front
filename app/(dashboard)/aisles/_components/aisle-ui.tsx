export {
  directoryPanelClass as aislePanelClass,
  DirectoryPanel as AislePanel,
} from "@/components/credits/directory-workspace-ui";

import { cn } from "@/lib/utils";

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
    <div className={cn("h-1 w-full rounded-none bg-border", className)}>
      <div
        className={cn(
          "h-1 origin-left rounded-none",
          warn ? "bg-amber-500/75" : "bg-[var(--aisle-primary,#0f766e)]",
        )}
        style={{
          width: "100%",
          transform: `scaleX(${Math.min(100, Math.max(0, pct)) / 100})`,
        }}
      />
    </div>
  );
}
