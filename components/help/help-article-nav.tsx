"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  ChevronDown,
  LayoutList,
  Search,
  X,
} from "lucide-react";

import { APP_ROUTES } from "@/lib/config";
import {
  audienceHref,
  listArticles,
  listCategories,
  type HelpAudience,
} from "@/lib/help";
import { cn } from "@/lib/utils";

import { HELP_CATEGORY_ICONS } from "./help-category-icons";

type HelpArticleNavProps = {
  audience: HelpAudience;
  /** Category currently being viewed — its group is expanded by default. */
  activeCategorySlug?: string;
  /** Article currently being viewed — highlighted in the list. */
  activeSlug?: string;
  className?: string;
};

/**
 * Left rail for the two-column help reader: searchable, collapsible category
 * groups listing every article title, with the active article highlighted.
 */
export function HelpArticleNav({
  audience,
  activeCategorySlug,
  activeSlug,
  className,
}: HelpArticleNavProps) {
  const categories = listCategories(audience);
  const allArticles = listArticles(audience);
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const q = query.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!q) {
      return categories.map((cat) => ({
        ...cat,
        articles: listArticles(audience, cat.slug),
      }));
    }
    return categories
      .map((cat) => ({
        ...cat,
        articles: listArticles(audience, cat.slug).filter((a) =>
          a.title.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.articles.length > 0);
  }, [categories, q, audience]);

  const matchCount = useMemo(() => {
    if (!q) return 0;
    return allArticles.filter((a) =>
      a.title.toLowerCase().includes(q),
    ).length;
  }, [q, allArticles]);

  const otherAudience = audience === "merchants" ? "shoppers" : "merchants";

  const panel = (
    <nav
      aria-label="All guides"
      className="space-y-4 rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-3"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
            All guides
          </p>
          <div className="inline-flex overflow-hidden rounded-lg border border-[var(--kiosk-border)]">
            <Link
              href={audienceHref("merchants")}
              className={cn(
                "px-2 py-0.5 text-[10px] font-semibold transition-colors",
                audience === "merchants"
                  ? "bg-[var(--kiosk-gold)] text-[var(--kiosk-cta-text)]"
                  : "text-[var(--kiosk-text-muted)] hover:text-[var(--kiosk-text)]",
              )}
            >
              Merchants
            </Link>
            <Link
              href={audienceHref("shoppers")}
              className={cn(
                "px-2 py-0.5 text-[10px] font-semibold transition-colors",
                audience === "shoppers"
                  ? "bg-[var(--kiosk-gold)] text-[var(--kiosk-cta-text)]"
                  : "text-[var(--kiosk-text-muted)] hover:text-[var(--kiosk-text)]",
              )}
            >
              Shoppers
            </Link>
          </div>
        </div>

        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--kiosk-text-faint)]"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a guide…"
            aria-label="Search guide titles"
            className="h-9 w-full rounded-lg border border-[var(--kiosk-border)] bg-[var(--kiosk-surface)] pl-9 pr-8 text-sm text-[var(--kiosk-text)] outline-none transition-colors placeholder:text-[var(--kiosk-text-faint)] focus-visible:border-[var(--kiosk-gold-border)] focus-visible:ring-1 focus-visible:ring-[var(--kiosk-gold-border)]"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[var(--kiosk-text-faint)] hover:text-[var(--kiosk-text)]"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </label>
        {q ? (
          <p className="px-1 text-[11px] text-[var(--kiosk-text-muted)]">
            {matchCount} {matchCount === 1 ? "guide" : "guides"} match “{query.trim()}”
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        {filteredCategories.map((cat) => {
          const articles = cat.articles;
          const Icon = HELP_CATEGORY_ICONS[cat.icon];
          const isActiveCategory = !q && activeCategorySlug === cat.slug;
          return (
            <details
              key={cat.slug}
              open={q ? true : isActiveCategory || !activeCategorySlug}
              className="group"
            >
              <summary className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--kiosk-gold-surface)] [&::-webkit-details-marker]:hidden">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                    isActiveCategory
                      ? "border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] text-[var(--kiosk-gold)]"
                      : "border-[var(--kiosk-border)] bg-[var(--kiosk-surface)] text-[var(--kiosk-text-muted)]",
                  )}
                >
                  <Icon className="size-3" strokeWidth={1.75} aria-hidden />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[13px] font-medium transition-colors",
                    isActiveCategory
                      ? "text-[var(--kiosk-gold)]"
                      : "text-[var(--kiosk-text)]",
                  )}
                >
                  {cat.title}
                </span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--kiosk-text-faint)]">
                  {articles.length}
                </span>
                <ChevronDown
                  className="size-3.5 shrink-0 text-[var(--kiosk-text-faint)] transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <ul className="mt-1 space-y-0.5 border-l border-[var(--kiosk-border-soft)] pl-3">
                {articles.map((article) => {
                  const active = !q && article.slug === activeSlug;
                  return (
                    <li key={article.slug}>
                      <Link
                        href={article.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group/link relative block rounded-md py-1.5 pl-3 pr-2 text-[12.5px] leading-snug transition-colors",
                          active
                            ? "font-medium text-[var(--kiosk-gold)]"
                            : "text-[var(--kiosk-text-muted)] hover:text-[var(--kiosk-text)]",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--kiosk-gold)] transition-opacity",
                            active ? "opacity-100" : "opacity-0 group-hover/link:opacity-40",
                          )}
                          aria-hidden
                        />
                        {article.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}

        {q && matchCount === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-[var(--kiosk-text-muted)]">
            No guides match “{query.trim()}”.
          </p>
        ) : null}
      </div>

      <div className="border-t border-[var(--kiosk-border-soft)] pt-3">
        <Link
          href={APP_ROUTES.helpKioskGuide}
          className="group flex items-start gap-2.5 rounded-xl border border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-3 py-2.5 transition-colors hover:bg-[var(--kiosk-gold-surface)]"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--kiosk-gold)] text-[var(--kiosk-cta-text)]">
            <BookOpenCheck className="size-3.5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-semibold text-[var(--kiosk-text)]">
              Get the most out of Kiosk
            </span>
            <span className="block text-[11px] leading-snug text-[var(--kiosk-text-soft)]">
              The master guide — every deeper guide linked from one page.
            </span>
          </span>
        </Link>
        <Link
          href={audienceHref(otherAudience)}
          className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-[var(--kiosk-border)] px-3 py-2 text-[12px] text-[var(--kiosk-text-muted)] transition-colors hover:border-[var(--kiosk-gold-border)] hover:text-[var(--kiosk-text)]"
        >
          <LayoutList className="size-3.5" aria-hidden />
          Browse {otherAudience === "merchants" ? "merchant" : "shopper"} guides
        </Link>
      </div>
    </nav>
  );

  return (
    <div className={cn("min-w-0", className)}>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        className="mb-4 flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] px-3.5 py-2.5 text-sm font-medium text-[var(--kiosk-text)] lg:hidden"
      >
        <span className="inline-flex items-center gap-2">
          <LayoutList className="size-4 text-[var(--kiosk-gold)]" aria-hidden />
          Browse all guides
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-[var(--kiosk-text-faint)] transition-transform",
            mobileOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          "lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-y-auto lg:pr-1 lg:[scrollbar-width:thin]",
          !mobileOpen && "hidden lg:block",
        )}
      >
        {panel}
      </div>
    </div>
  );
}
