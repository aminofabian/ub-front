import { DASHBOARD_MAX } from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";

function SkeletonBar({ className }: { className?: string }) {
  return (
    <span
      className={cn("block animate-pulse rounded-md bg-muted", className)}
      aria-hidden
    />
  );
}

export function BusinessSettingsSkeleton() {
  return (
    <div
      className={cn(DASHBOARD_MAX, "animate-in fade-in duration-300")}
      aria-busy="true"
      aria-label="Loading business settings"
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-start lg:justify-between">
          <header className="min-w-0 flex-1 space-y-8 border-b border-border/50 pb-10">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <SkeletonBar className="size-10 rounded-xl" />
                <SkeletonBar className="h-3 w-20" />
              </div>
              <div className="space-y-3">
                <SkeletonBar className="h-9 w-56 max-w-full sm:w-72" />
                <SkeletonBar className="h-4 w-full max-w-md" />
                <SkeletonBar className="h-4 w-4/5 max-w-sm" />
              </div>
            </div>
          </header>
          <SkeletonBar className="h-11 w-full rounded-lg sm:w-36 lg:shrink-0" />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm"
            >
              <SkeletonBar className="size-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBar className="h-4 w-24" />
                <SkeletonBar className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
            <SkeletonBar className="size-4 shrink-0 rounded" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBar className="h-4 w-40" />
              <SkeletonBar className="h-3 w-28" />
            </div>
            <SkeletonBar className="h-5 w-12 rounded-full" />
          </div>
          <div className="p-4 sm:p-5">
            <SkeletonBar className="mb-3 h-3 w-full max-w-sm" />
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-3"
                >
                  <SkeletonBar className="h-2.5 w-16" />
                  <SkeletonBar className="h-4 w-20" />
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>
    </div>
  );
}
