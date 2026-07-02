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
      className={cn(
        DASHBOARD_MAX,
        "animate-in fade-in duration-300 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] 2xl:pb-20",
      )}
      aria-busy="true"
      aria-label="Loading business settings"
    >
      <div className="space-y-4 2xl:space-y-5">
        <div className="flex flex-wrap items-center gap-2 2xl:hidden">
          <SkeletonBar className="h-8 w-24 rounded-lg" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBar key={i} className="h-7 w-20 rounded-lg" />
            ))}
          </div>
        </div>

        <div className="hidden 2xl:block">
          <header className="space-y-3">
            <div className="flex items-center gap-3">
              <SkeletonBar className="size-10 rounded-xl" />
              <div className="space-y-2">
                <SkeletonBar className="h-3 w-20" />
                <SkeletonBar className="h-7 w-56 max-w-full" />
              </div>
            </div>
            <SkeletonBar className="h-4 w-full max-w-md" />
          </header>
        </div>

        <div className="hidden gap-2 2xl:grid 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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

        <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm 2xl:rounded-2xl">
          <div className="flex items-center gap-3 border-b border-border/60 bg-muted/20 px-3 py-2.5 sm:px-4 2xl:px-5 2xl:py-3">
            <SkeletonBar className="size-4 shrink-0 rounded" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBar className="h-4 w-40" />
              <SkeletonBar className="h-3 w-28" />
            </div>
            <SkeletonBar className="h-5 w-12 rounded-full" />
          </div>
          <div className="p-3 sm:p-4 2xl:p-5">
            <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2.5 sm:gap-2 sm:rounded-xl sm:px-3 sm:py-3"
                >
                  <SkeletonBar className="h-2.5 w-16" />
                  <SkeletonBar className="h-4 w-20" />
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border/80 bg-card/50 p-3 shadow-sm sm:p-4 2xl:rounded-2xl 2xl:p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-xl border border-border/50 bg-card/80 p-4"
            >
              <SkeletonBar className="h-3 w-32" />
              <SkeletonBar className="h-10 w-full rounded-lg" />
              <SkeletonBar className="h-10 w-full rounded-lg" />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <SkeletonBar className="h-10 w-24 rounded-lg" />
            <SkeletonBar className="h-10 w-32 rounded-lg" />
          </div>
        </section>
      </div>
    </div>
  );
}
