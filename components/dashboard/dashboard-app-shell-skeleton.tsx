import { BusinessSettingsSkeleton } from "@/components/dashboard/business-settings-skeleton";
import { cn } from "@/lib/utils";

function SkeletonBar({ className }: { className?: string }) {
  return (
    <span
      className={cn("block animate-pulse rounded-md bg-muted", className)}
      aria-hidden
    />
  );
}

function SidebarSkeleton() {
  return (
    <aside className="hidden md:flex sticky top-0 h-screen w-64 shrink-0 flex-col border-r bg-background">
      <div className="space-y-3 border-b p-4">
        <div className="flex items-center gap-2.5">
          <SkeletonBar className="size-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBar className="h-3.5 w-[70%]" />
            <SkeletonBar className="h-2.5 w-[45%]" />
          </div>
        </div>
        <SkeletonBar className="h-3 w-full" />
      </div>
      <nav className="flex flex-1 flex-col gap-2 overflow-hidden p-2 pb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBar key={i} className="h-8 w-full" />
        ))}
      </nav>
    </aside>
  );
}

export function DashboardAppShellSkeleton({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div
      className="flex h-[100dvh] overflow-hidden bg-muted/30"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <SidebarSkeleton />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="hidden md:flex items-center justify-between gap-4 border-b bg-background px-6 py-3">
          <SkeletonBar className="h-4 w-40" />
          <div className="flex items-center gap-3">
            <SkeletonBar className="h-8 w-28 rounded-md" />
            <SkeletonBar className="h-8 w-28 rounded-md" />
            <SkeletonBar className="h-8 w-20 rounded-md" />
          </div>
        </header>
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border/50 bg-background/95 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <SkeletonBar className="size-8 rounded-lg" />
            <SkeletonBar className="h-4 w-28" />
          </div>
          <SkeletonBar className="size-8 rounded-full" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children ?? <BusinessSettingsSkeleton />}
        </main>
      </div>
    </div>
  );
}
