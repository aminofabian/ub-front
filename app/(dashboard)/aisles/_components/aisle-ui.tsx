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
    <div className={cn("h-1 w-full rounded-full bg-muted/80", className)}>
      <div
        className={cn(
          "h-1 origin-left rounded-full",
          warn ? "bg-amber-500/75" : "bg-foreground/45",
        )}
        style={{
          width: "100%",
          transform: `scaleX(${Math.min(100, Math.max(0, pct)) / 100})`,
        }}
      />
    </div>
  );
}
