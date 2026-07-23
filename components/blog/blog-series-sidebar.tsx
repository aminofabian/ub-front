import Link from "next/link";
import { ChevronDown } from "lucide-react";

import type { BlogCluster } from "@/lib/blog";
import { cn } from "@/lib/utils";

type BlogSeriesSidebarProps = {
  cluster: BlogCluster;
  activeSlug: string;
  otherClusters: BlogCluster[];
};

export function BlogSeriesSidebar({
  cluster,
  activeSlug,
  otherClusters,
}: BlogSeriesSidebarProps) {
  const pillar = cluster.pillar;
  const items = [
    ...(pillar
      ? [{ ...pillar, kind: "pillar" as const, code: "P" }]
      : []),
    ...cluster.spokes.map((spoke, index) => ({
      ...spoke,
      kind: "spoke" as const,
      code: String(index + 1).padStart(2, "0"),
    })),
  ];

  return (
    <aside className="space-y-5">
      <div className="rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
          Series {cluster.code}
        </p>
        <h2 className="mt-2 font-heading text-xl tracking-[-0.02em] text-[var(--kiosk-text)]">
          {cluster.shortTitle}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--kiosk-text-soft)]">
          {cluster.description}
        </p>

        <nav aria-label="Articles in this series" className="mt-5">
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive = item.slug === activeSlug;
              return (
                <li key={item.slug}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex gap-3 rounded-lg px-2.5 py-2.5 transition",
                      isActive
                        ? "bg-[var(--kiosk-gold-soft)]"
                        : "hover:bg-[var(--kiosk-panel)]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 font-mono text-[10px] tabular-nums tracking-[0.12em]",
                        isActive
                          ? "text-[var(--kiosk-gold)]"
                          : "text-[var(--kiosk-text-faint)]",
                      )}
                    >
                      {item.code}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-[13px] leading-snug",
                          isActive
                            ? "font-medium text-[var(--kiosk-text)]"
                            : "text-[var(--kiosk-text-soft)]",
                        )}
                      >
                        {item.title}
                      </span>
                      {item.listedOnly ? (
                        <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
                          Coming soon
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {otherClusters.length > 0 ? (
        <div className="rounded-2xl border border-[var(--kiosk-border-soft)] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
            Other series
          </p>
          <ul className="mt-3 space-y-2">
            {otherClusters.map((other) => (
              <li key={other.id}>
                <Link
                  href={other.pillar?.href ?? "/blog"}
                  className="group flex items-baseline gap-2 text-[13px] text-[var(--kiosk-text-soft)] transition-colors hover:text-[var(--kiosk-gold)]"
                >
                  <span className="font-mono text-[10px] text-[var(--kiosk-gold)]">
                    {other.code}
                  </span>
                  <span>{other.shortTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/blog"
            className="mt-4 inline-block text-[13px] font-medium text-[var(--kiosk-gold)]"
          >
            All series →
          </Link>
        </div>
      ) : null}
    </aside>
  );
}

type BlogSeriesMobileNavProps = {
  cluster: BlogCluster;
  activeSlug: string;
};

export function BlogSeriesMobileNav({
  cluster,
  activeSlug,
}: BlogSeriesMobileNavProps) {
  const pillar = cluster.pillar;
  const items = [
    ...(pillar ? [pillar] : []),
    ...cluster.spokes,
  ];

  return (
    <details className="group rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] lg:hidden">
      <summary className="cursor-pointer list-none px-4 py-3.5 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
              Series {cluster.code}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--kiosk-text)]">
              {cluster.shortTitle}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-[var(--kiosk-text-faint)] transition group-open:rotate-180" />
        </div>
      </summary>
      <nav
        aria-label="Series articles"
        className="border-t border-[var(--kiosk-border-soft)] px-2 py-2"
      >
        {items.map((item) => {
          const isActive = item.slug === activeSlug;
          return (
            <Link
              key={item.slug}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3 py-2.5 text-[13px] leading-snug",
                isActive
                  ? "bg-[var(--kiosk-gold-soft)] font-medium text-[var(--kiosk-text)]"
                  : "text-[var(--kiosk-text-soft)]",
              )}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
    </details>
  );
}
