import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { BlogCluster } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog/format-date";
import { cn } from "@/lib/utils";

type BlogClusterBoardProps = {
  cluster: BlogCluster;
};

export function BlogClusterBoard({ cluster }: BlogClusterBoardProps) {
  const pillar = cluster.pillar;
  if (!pillar) return null;

  return (
    <section
      id={`cluster-${cluster.id}`}
      className="scroll-mt-28 border-t border-[var(--kiosk-border-soft)] pt-12 sm:pt-16"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] tabular-nums tracking-[0.16em] text-[var(--kiosk-gold)]">
              Aisle {cluster.code}
            </span>
            <span className="h-px flex-1 max-w-[4rem] bg-[var(--kiosk-border)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
              {cluster.articleCount}{" "}
              {cluster.articleCount === 1 ? "article" : "articles"}
            </span>
          </div>
          <h2 className="mt-3 font-heading text-[clamp(1.6rem,3.5vw,2.35rem)] leading-[1.1] tracking-[-0.03em] text-[var(--kiosk-text)]">
            {cluster.title}
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)]">
            {cluster.description}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-8">
        <Link
          href={pillar.href}
          className="group relative overflow-hidden rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-6 transition hover:border-[var(--kiosk-gold-border)] sm:p-8"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--kiosk-gold-soft)] opacity-70"
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
            Pillar
          </p>
          <h3 className="mt-3 font-heading text-[clamp(1.35rem,2.8vw,1.85rem)] leading-[1.15] tracking-[-0.02em] text-[var(--kiosk-text)] transition-colors group-hover:text-[var(--kiosk-gold)]">
            {pillar.title}
          </h3>
          <p className="mt-3 max-w-lg text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)]">
            {pillar.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-text-dim)]">
              {pillar.category}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
              {formatBlogDate(pillar.publishedAt)}
            </span>
          </div>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--kiosk-gold)]">
            Read pillar
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <div className="rounded-2xl border border-[var(--kiosk-border)] bg-[color-mix(in_srgb,var(--kiosk-panel)_65%,var(--kiosk-bg))] p-5 sm:p-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h4 className="font-heading text-xl tracking-[-0.02em] text-[var(--kiosk-text)]">
              {cluster.spokes.length > 0 ? "Spoke guides" : "In this series"}
            </h4>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
              {cluster.spokes.length > 0
                ? `${cluster.spokes.length} spokes`
                : "Pillar only"}
            </span>
          </div>

          {cluster.spokes.length > 0 ? (
            <ul className="relative space-y-0 pl-4">
              <span
                aria-hidden
                className="absolute bottom-3 left-[7px] top-3 w-px bg-[var(--kiosk-border)]"
              />
              {cluster.spokes.map((spoke, index) => (
                <li key={spoke.slug} className="relative">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -left-4 top-5 h-2 w-2 rounded-full border-2 border-[var(--kiosk-gold)] bg-[var(--kiosk-elevated)]",
                    )}
                  />
                  <Link
                    href={spoke.href}
                    className="group flex items-start justify-between gap-3 rounded-lg py-3 pl-3 transition hover:bg-[var(--kiosk-elevated)]"
                  >
                    <span className="min-w-0">
                      <span className="mb-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] tabular-nums text-[var(--kiosk-text-faint)]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {spoke.listedOnly ? (
                          <span className="rounded border border-[var(--kiosk-border-soft)] px-1.5 py-0.5 text-[10px] text-[var(--kiosk-text-dim)]">
                            Soon
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-[14px] font-medium leading-snug text-[var(--kiosk-text)] transition-colors group-hover:text-[var(--kiosk-gold)]">
                        {spoke.title}
                      </span>
                    </span>
                    <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--kiosk-text-faint)] transition group-hover:translate-x-0.5 group-hover:text-[var(--kiosk-gold)]" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] leading-relaxed text-[var(--kiosk-text-soft)]">
              This series is a single deep dive for now. More spoke guides will
              branch from this ranking as we expand the cluster.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
