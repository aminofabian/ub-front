"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import type { HelpArticleRef } from "@/lib/help";
import { cn } from "@/lib/utils";

type HelpSearchProps = {
  articles: HelpArticleRef[];
  className?: string;
  placeholder?: string;
  /** Prefill from `?q=` when present on the hub. */
  initialQuery?: string;
};

function filterArticles(articles: HelpArticleRef[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return articles
    .map((article) => {
      let score = 0;
      if (article.title.toLowerCase().includes(q)) score += 5;
      if (article.description.toLowerCase().includes(q)) score += 2;
      if (article.slug.includes(q) || article.categorySlug.includes(q))
        score += 1;
      return { article, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.article);
}

export function HelpSearch({
  articles,
  className,
  placeholder = "Search help articles…",
  initialQuery = "",
}: HelpSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const deferred = useDeferredValue(query);
  const results = useMemo(
    () => filterArticles(articles, deferred),
    [articles, deferred],
  );
  const showResults = deferred.trim().length > 0;

  return (
    <div className={cn("relative w-full", className)}>
      <label htmlFor="help-search" className="sr-only">
        Search help
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--kiosk-text-faint)]"
          strokeWidth={2}
          aria-hidden
        />
        <input
          id="help-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-[var(--kiosk-border-strong)] bg-[var(--kiosk-elevated)] py-3.5 pl-11 pr-11 text-[15px] text-[var(--kiosk-text)] outline-none transition focus:border-[var(--kiosk-gold-border-strong)] focus:ring-2 focus:ring-[var(--kiosk-gold-soft)] placeholder:text-[var(--kiosk-text-faint)]"
        />
        {query ? (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--kiosk-text-faint)] hover:bg-[var(--kiosk-ghost-hover-bg)] hover:text-[var(--kiosk-text)]"
            onClick={() => setQuery("")}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>

      {showResults ? (
        <div
          className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] shadow-[0_16px_40px_-20px_rgba(20,20,18,0.35)]"
          role="listbox"
          aria-label="Search results"
        >
          {results.length === 0 ? (
            <p className="px-4 py-5 text-sm text-[var(--kiosk-text-muted)]">
              No articles match “{deferred.trim()}”. Try M-Pesa, stock, or
              delivery.
            </p>
          ) : (
            <ul className="max-h-[min(24rem,60vh)] divide-y divide-[var(--kiosk-border-soft)] overflow-y-auto">
              {results.map((article) => (
                <li key={article.href}>
                  <Link
                    href={article.href}
                    className="block px-4 py-3 transition-colors hover:bg-[var(--kiosk-gold-surface)]"
                    role="option"
                    onClick={() => setQuery("")}
                  >
                    <span className="block text-sm font-medium text-[var(--kiosk-text)]">
                      {article.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--kiosk-text-dim)] line-clamp-1">
                      {article.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
