export default function ShopWindowSkeleton() {
  return (
    <section
      className="w-full border-y border-border/60 bg-muted/30 px-4 py-10 dark:bg-muted/15"
      aria-busy="true"
      aria-label="Loading shop window"
    >
      <div className="mx-auto max-w-6xl">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-6 flex gap-4 overflow-hidden">
          {["a", "b", "c"].map((k) => (
            <div
              key={k}
              className="min-w-[12.5rem] shrink-0 snap-start sm:min-w-[14rem]"
            >
              <div className="aspect-[4/5] w-full animate-pulse rounded-xl bg-muted" />
              <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
