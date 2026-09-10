import { BusinessPageLayout } from "@/components/business-hub/business-page-layout";
import { HUB_SURFACE } from "@/lib/business-hub/constants";
import { cn } from "@/lib/utils";

function SkeletonBar({ className }: { className?: string }) {
  return (
    <span
      className={cn("block animate-pulse rounded-none bg-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,white)]", className)}
      aria-hidden
    />
  );
}

export function BusinessSettingsSkeleton() {
  return (
    <BusinessPageLayout
      title="Business settings"
      description="Profile, storefront, and delivery — inventory and till policies live under Configuration."
    >
      <div
        className="space-y-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-2"
        aria-busy="true"
        aria-label="Loading business settings"
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn(HUB_SURFACE, "flex items-start gap-3 p-3.5")}>
              <SkeletonBar className="size-9 shrink-0 rounded-none" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBar className="h-4 w-24" />
                <SkeletonBar className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>

        <section className={HUB_SURFACE}>
          <div className="flex items-center gap-3 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-4 py-3">
            <SkeletonBar className="h-4 w-40" />
            <SkeletonBar className="h-5 w-12 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 bg-white px-3 py-3">
                <SkeletonBar className="h-2.5 w-16" />
                <SkeletonBar className="h-4 w-20" />
              </div>
            ))}
          </div>
        </section>

        <section className={cn(HUB_SURFACE, "space-y-4 p-4")}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white p-4"
            >
              <SkeletonBar className="h-3 w-32" />
              <SkeletonBar className="h-10 w-full rounded-none" />
              <SkeletonBar className="h-10 w-full rounded-none" />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <SkeletonBar className="h-10 w-24 rounded-none" />
            <SkeletonBar className="h-10 w-32 rounded-none" />
          </div>
        </section>
      </div>
    </BusinessPageLayout>
  );
}
