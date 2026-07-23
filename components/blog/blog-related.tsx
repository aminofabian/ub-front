import Link from "next/link";

import type { BlogArticleRef } from "@/lib/blog";

type BlogRelatedProps = {
  articles: BlogArticleRef[];
  title?: string;
};

export function BlogRelated({
  articles,
  title = "Related articles",
}: BlogRelatedProps) {
  if (articles.length === 0) return null;

  return (
    <section className="mt-12 border-t border-[var(--kiosk-border-soft)] pt-10">
      <h2 className="font-heading text-2xl tracking-[-0.02em] text-[var(--kiosk-text)]">
        {title}
      </h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {articles.map((article) => (
          <li key={article.href}>
            <Link
              href={article.href}
              className="block rounded-xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] px-4 py-4 transition hover:border-[var(--kiosk-gold-border)]"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-gold)]">
                {article.category}
              </span>
              <span className="mt-1.5 block font-medium text-[var(--kiosk-text)]">
                {article.title}
              </span>
              <span className="mt-1 block text-sm text-[var(--kiosk-text-soft)] line-clamp-2">
                {article.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
