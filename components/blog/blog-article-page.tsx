import Link from "next/link";
import { notFound } from "next/navigation";

import { BlogArticleBody } from "@/components/blog/blog-article-body";
import { BlogRelated } from "@/components/blog/blog-related";
import {
  BlogSeriesMobileNav,
  BlogSeriesSidebar,
} from "@/components/blog/blog-series-sidebar";
import {
  BlogArticleJsonLd,
  BlogBreadcrumbJsonLd,
} from "@/components/blog/blog-structured-data";
import { HelpBreadcrumbs } from "@/components/help/help-breadcrumbs";
import {
  ghostCtaClass,
  goldCtaClass,
  landingSectionClass,
  sectionLabelPillClass,
} from "@/components/tenant-console/landing/landing-styles";
import {
  getArticle,
  getClusterForSlug,
  getRelatedArticles,
  isClusterPillar,
  listClusters,
} from "@/lib/blog";
import { formatBlogDateLong } from "@/lib/blog/format-date";
import { blogAbsoluteUrl, blogSiteUrl } from "@/lib/blog/seo";

export function BlogArticlePageView({ slug }: { slug: string }) {
  const article = getArticle(slug);
  if (!article) notFound();

  const related = getRelatedArticles(slug);
  const cluster = getClusterForSlug(slug);
  const otherClusters = listClusters().filter((c) => c.id !== cluster?.id);
  const url = blogAbsoluteUrl(`/blog/${slug}`);
  const siteUrl = blogSiteUrl();
  const relatedTitle = isClusterPillar(slug)
    ? "More from this series"
    : "Related articles";

  return (
    <>
      <BlogArticleJsonLd article={article} url={url} siteUrl={siteUrl} />
      <BlogBreadcrumbJsonLd
        items={[
          { name: "Home", url: blogAbsoluteUrl("/") },
          { name: "Blog", url: blogAbsoluteUrl("/blog") },
          { name: article.title, url },
        ]}
      />

      <article className={`${landingSectionClass} !pt-10 sm:!pt-14`}>
        <div className="mx-auto max-w-[1180px]">
          <HelpBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Blog", href: "/blog" },
              ...(cluster
                ? [
                    {
                      label: cluster.shortTitle,
                      href: `/blog#cluster-${cluster.id}`,
                    },
                  ]
                : []),
              { label: article.title },
            ]}
            className="mb-8"
          />

          {cluster ? (
            <div className="mb-8">
              <BlogSeriesMobileNav cluster={cluster} activeSlug={slug} />
            </div>
          ) : null}

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 max-w-[720px]">
              <p className={sectionLabelPillClass}>{article.category}</p>
              <h1 className="mt-5 font-heading text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.12] tracking-[-0.03em] text-[var(--kiosk-text)]">
                {article.title}
              </h1>
              <p className="mt-4 text-base leading-[1.65] text-[var(--kiosk-text-soft)]">
                {article.description}
              </p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
                {formatBlogDateLong(article.publishedAt)} · {article.author}
                {article.listedOnly ? " · Coming soon" : ""}
              </p>

              <div className="mt-10">
                <BlogArticleBody body={article.body} />
              </div>

              <BlogRelated
                articles={related.filter((item) => item.slug !== slug)}
                title={relatedTitle}
              />

              <section className="mt-14 rounded-2xl border border-[var(--kiosk-border)] bg-[color-mix(in_srgb,var(--kiosk-panel)_70%,var(--kiosk-bg))] px-5 py-8 sm:px-8 sm:py-10">
                <h2 className="font-heading text-[clamp(22px,4vw,32px)] tracking-[-0.02em] text-[var(--kiosk-text)]">
                  Ready to sell today?
                </h2>
                <p className="mt-3 max-w-xl text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)]">
                  Claim your shop on Kiosk, sync stock with your counter, and
                  take M-Pesa without waiting weeks for an ERP rollout.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/#pricing" className={goldCtaClass}>
                    Start selling on Kiosk
                  </Link>
                  <Link href="/blog" className={ghostCtaClass}>
                    Back to blog
                  </Link>
                </div>
              </section>
            </div>

            {cluster ? (
              <div className="hidden lg:block">
                <div className="sticky top-28">
                  <BlogSeriesSidebar
                    cluster={cluster}
                    activeSlug={slug}
                    otherClusters={otherClusters}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </>
  );
}
