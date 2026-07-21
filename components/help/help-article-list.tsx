import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { HelpArticleRef } from "@/lib/help";

type HelpArticleListProps = {
  articles: HelpArticleRef[];
  emptyLabel?: string;
};

export function HelpArticleList({
  articles,
  emptyLabel = "No articles in this category yet.",
}: HelpArticleListProps) {
  if (articles.length === 0) {
    return (
      <p className="text-sm text-[var(--kiosk-text-muted)]">{emptyLabel}</p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--kiosk-border-soft)] border-y border-[var(--kiosk-border-soft)]">
      {articles.map((article) => (
        <li key={article.href}>
          <Link
            href={article.href}
            className="group flex items-start justify-between gap-4 py-5 transition-colors hover:bg-[var(--kiosk-gold-surface)] sm:px-2"
          >
            <div className="min-w-0">
              <h3 className="font-heading text-lg font-medium tracking-[-0.02em] text-[var(--kiosk-text)] group-hover:text-[var(--kiosk-gold)] sm:text-xl">
                {article.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--kiosk-text-soft)]">
                {article.description}
              </p>
            </div>
            <ArrowUpRight
              className="mt-1 h-4 w-4 shrink-0 text-[var(--kiosk-text-faint)] transition group-hover:text-[var(--kiosk-gold)]"
              strokeWidth={2}
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
