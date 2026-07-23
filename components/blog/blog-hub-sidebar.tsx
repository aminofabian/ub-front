import Link from "next/link";

import type { BlogCluster } from "@/lib/blog";
import { cn } from "@/lib/utils";

type BlogHubSidebarProps = {
  clusters: BlogCluster[];
  totalArticles: number;
};

export function BlogHubSidebar({
  clusters,
  totalArticles,
}: BlogHubSidebarProps) {
  return (
    <aside className="space-y-6">
      <div className="rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
          Aisle map
        </p>
        <h2 className="mt-2 font-heading text-2xl tracking-[-0.02em] text-[var(--kiosk-text)]">
          Browse by series
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--kiosk-text-soft)]">
          Guides are grouped into topic clusters — pick a series, then dig into
          the pillar or spokes.
        </p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
          {totalArticles} articles · {clusters.length} series
        </p>
      </div>

      <nav aria-label="Blog series" className="space-y-2">
        {clusters.map((cluster) => (
          <a
            key={cluster.id}
            href={cluster.href}
            className="group flex gap-3 rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] px-4 py-3.5 transition hover:border-[var(--kiosk-gold-border)]"
          >
            <span className="font-mono text-[11px] tabular-nums tracking-[0.14em] text-[var(--kiosk-gold)]">
              {cluster.code}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-[var(--kiosk-text)] transition-colors group-hover:text-[var(--kiosk-gold)]">
                {cluster.shortTitle}
              </span>
              <span className="mt-0.5 block text-[12px] text-[var(--kiosk-text-faint)]">
                {cluster.articleCount}{" "}
                {cluster.articleCount === 1 ? "piece" : "pieces"}
                {cluster.spokes.length > 0
                  ? ` · ${cluster.spokes.length} spokes`
                  : ""}
              </span>
            </span>
          </a>
        ))}
      </nav>

      <div className="rounded-2xl border border-dashed border-[var(--kiosk-border)] px-4 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
          Tip
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--kiosk-text-soft)]">
          Start with a pillar article, then follow spoke guides for the details
          that match your shop.
        </p>
        <Link
          href="/#pricing"
          className="mt-3 inline-block text-sm font-medium text-[var(--kiosk-gold)]"
        >
          Start selling →
        </Link>
      </div>
    </aside>
  );
}

type BlogMobileClusterStripProps = {
  clusters: BlogCluster[];
};

export function BlogMobileClusterStrip({
  clusters,
}: BlogMobileClusterStripProps) {
  return (
    <div className="lg:hidden">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
        Jump to series
      </p>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {clusters.map((cluster) => (
          <a
            key={cluster.id}
            href={cluster.href}
            className={cn(
              "shrink-0 rounded-full border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] px-3.5 py-2",
              "text-[13px] text-[var(--kiosk-text)] transition hover:border-[var(--kiosk-gold-border)]",
            )}
          >
            <span className="mr-2 font-mono text-[10px] text-[var(--kiosk-gold)]">
              {cluster.code}
            </span>
            {cluster.shortTitle}
          </a>
        ))}
      </div>
    </div>
  );
}
