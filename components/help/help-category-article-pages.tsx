import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  List,
  MessageCircleQuestion,
} from "lucide-react";

import { HelpArticleBody } from "@/components/help/help-article-body";
import { HelpArticleList } from "@/components/help/help-article-list";
import { HelpArticleNav } from "@/components/help/help-article-nav";
import { HelpBreadcrumbs } from "@/components/help/help-breadcrumbs";
import { HelpContactCta } from "@/components/help/help-contact-cta";
import { HelpRelated } from "@/components/help/help-related";
import {
  HelpArticleJsonLd,
  HelpBreadcrumbJsonLd,
  HelpCollectionJsonLd,
} from "@/components/help/help-structured-data";
import {
  audienceLabel,
  estimateReadingMinutes,
  extractFaqPairs,
  extractHeadings,
  getAdjacentArticles,
  getArticle,
  getCategory,
  getRelatedArticles,
  listArticles,
  type HelpAudience,
} from "@/lib/help";
import { helpAbsoluteUrl, helpSiteUrl } from "@/lib/help/seo";
import {
  landingSectionClass,
  sectionLabelPillClass,
} from "@/components/tenant-console/landing/landing-styles";

/** 1fr : 3fr reader grid — titles on the left, content on the right. */
const READER_GRID =
  "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] lg:gap-12";

function readerSectionClass(compact = false) {
  return `px-4 py-10 sm:px-10 ${compact ? "sm:py-12" : "sm:py-16"}`;
}

export function HelpCategoryPageView({
  audience,
  categorySlug,
}: {
  audience: HelpAudience;
  categorySlug: string;
}) {
  const category = getCategory(audience, categorySlug);
  if (!category) notFound();

  const articles = listArticles(audience, categorySlug);
  const url = helpAbsoluteUrl(`/help/${audience}/${categorySlug}`);
  const label = audienceLabel(audience);

  return (
    <>
      <HelpCollectionJsonLd
        name={`${category.title} — ${label}`}
        description={category.description}
        url={url}
      />
      <HelpBreadcrumbJsonLd
        items={[
          { name: "Home", url: helpAbsoluteUrl("/") },
          { name: "Help", url: helpAbsoluteUrl("/help") },
          { name: label, url: helpAbsoluteUrl(`/help/${audience}`) },
          { name: category.title, url },
        ]}
      />

      <section className={landingSectionClass}>
        <div className="mx-auto max-w-[1100px]">
          <HelpBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Help", href: "/help" },
              { label, href: `/help/${audience}` },
              { label: category.title },
            ]}
            className="mb-8"
          />

          <div className={READER_GRID}>
            <HelpArticleNav
              audience={audience}
              activeCategorySlug={categorySlug}
            />

            <div className="min-w-0">
              <p className={sectionLabelPillClass}>{label}</p>
              <h1 className="mt-5 font-heading text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.1] tracking-[-0.03em] text-[var(--kiosk-text)]">
                {category.title}
              </h1>
              <p className="mt-4 text-base leading-[1.65] text-[var(--kiosk-text-soft)]">
                {category.description}
              </p>

              <div className="mt-8">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                  {articles.length}{" "}
                  {articles.length === 1 ? "guide" : "guides"} in this topic
                </p>
                <HelpArticleList articles={articles} />
              </div>

              <div className="mt-12">
                <HelpContactCta
                  variant={audience === "merchants" ? "merchant" : "shopper"}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function HelpArticlePageView({
  audience,
  categorySlug,
  slug,
}: {
  audience: HelpAudience;
  categorySlug: string;
  slug: string;
}) {
  const article = getArticle(audience, categorySlug, slug);
  const category = getCategory(audience, categorySlug);
  if (!article || !category) notFound();

  const related = getRelatedArticles(article);
  const headings = extractHeadings(article);
  const faqCount = extractFaqPairs(article).length;
  const readingMinutes = estimateReadingMinutes(article);
  const { prev, next } = getAdjacentArticles(article);
  const url = helpAbsoluteUrl(`/help/${audience}/${categorySlug}/${slug}`);
  const label = audienceLabel(audience);
  const siteUrl = helpSiteUrl();

  const meta = [
    { icon: CalendarDays, label: `Updated ${article.updatedAt}` },
    { icon: Clock, label: `${readingMinutes} min read` },
    ...(headings.length > 0
      ? [{ icon: List, label: `${headings.length} sections` }]
      : []),
    ...(faqCount > 0
      ? [{ icon: MessageCircleQuestion, label: `${faqCount} FAQ` }]
      : []),
  ];

  return (
    <>
      <HelpArticleJsonLd
        article={article}
        category={category}
        url={url}
        siteUrl={siteUrl}
        audience={audience}
      />
      <HelpBreadcrumbJsonLd
        items={[
          { name: "Home", url: helpAbsoluteUrl("/") },
          { name: "Help", url: helpAbsoluteUrl("/help") },
          { name: label, url: helpAbsoluteUrl(`/help/${audience}`) },
          {
            name: category.title,
            url: helpAbsoluteUrl(`/help/${audience}/${categorySlug}`),
          },
          { name: article.title, url },
        ]}
      />

      <article className={readerSectionClass()}>
        <div className="mx-auto max-w-[1100px]">
          <HelpBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Help", href: "/help" },
              { label, href: `/help/${audience}` },
              {
                label: category.title,
                href: `/help/${audience}/${categorySlug}`,
              },
              { label: article.title },
            ]}
            className="mb-8"
          />

          <div className={READER_GRID}>
            <HelpArticleNav
              audience={audience}
              activeCategorySlug={categorySlug}
              activeSlug={slug}
            />

            <div className="min-w-0">
              <p className={sectionLabelPillClass}>{category.title}</p>
              <h1 className="mt-5 font-heading text-[clamp(1.85rem,5vw,2.85rem)] leading-[1.12] tracking-[-0.03em] text-[var(--kiosk-text)]">
                {article.title}
              </h1>
              <p className="mt-4 text-base leading-[1.65] text-[var(--kiosk-text-soft)]">
                {article.description}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {meta.map(({ icon: Icon, label: text }) => (
                  <span
                    key={text}
                    className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-[var(--kiosk-text-faint)]"
                  >
                    <Icon className="size-3.5" aria-hidden />
                    {text}
                  </span>
                ))}
              </div>

              {headings.length > 0 ? (
                <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)]">
                  <p className="border-b border-[var(--kiosk-border-soft)] bg-[var(--kiosk-gold-soft)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
                    On this page
                  </p>
                  <ul className="grid gap-px bg-[var(--kiosk-border-soft)] sm:grid-cols-2">
                    {headings.map((heading, index) => (
                      <li
                        key={heading.id}
                        className="bg-[var(--kiosk-elevated)]"
                      >
                        <a
                          href={`#${heading.id}`}
                          className="group flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[var(--kiosk-text-soft)] transition-colors hover:bg-[var(--kiosk-gold-surface)] hover:text-[var(--kiosk-text)]"
                        >
                          <span className="font-mono text-[10px] tabular-nums text-[var(--kiosk-gold)]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0 truncate">
                            {heading.text}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-10">
                <HelpArticleBody body={article.body} />
              </div>

              <HelpRelated articles={related} />

              {(prev || next) && category.articleCount > 1 ? (
                <nav
                  aria-label="Adjacent guides"
                  className="mt-12 grid gap-3 border-t border-[var(--kiosk-border-soft)] pt-8 sm:grid-cols-2"
                >
                  {prev ? (
                    <Link
                      href={prev.href}
                      className="group rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-4 transition-colors hover:border-[var(--kiosk-gold-border)]"
                    >
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
                        <ArrowLeft
                          className="size-3 transition-transform group-hover:-translate-x-0.5"
                          aria-hidden
                        />
                        Previous guide
                      </span>
                      <span className="mt-1.5 block text-[15px] font-medium leading-snug text-[var(--kiosk-text)] group-hover:text-[var(--kiosk-gold)]">
                        {prev.title}
                      </span>
                    </Link>
                  ) : (
                    <span />
                  )}
                  {next ? (
                    <Link
                      href={next.href}
                      className="group rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-4 text-right transition-colors hover:border-[var(--kiosk-gold-border)]"
                    >
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
                        Next guide
                        <ArrowRight
                          className="size-3 transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </span>
                      <span className="mt-1.5 block text-[15px] font-medium leading-snug text-[var(--kiosk-text)] group-hover:text-[var(--kiosk-gold)]">
                        {next.title}
                      </span>
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              ) : null}

              <div className="mt-10">
                <HelpContactCta
                  variant={audience === "merchants" ? "merchant" : "shopper"}
                />
              </div>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
