import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BlogClusterBoard } from "@/components/blog/blog-cluster-board";
import {
  BlogHubSidebar,
  BlogMobileClusterStrip,
} from "@/components/blog/blog-hub-sidebar";
import {
  BlogBreadcrumbJsonLd,
  BlogCollectionJsonLd,
} from "@/components/blog/blog-structured-data";
import { HelpBreadcrumbs } from "@/components/help/help-breadcrumbs";
import {
  landingSectionClass,
  sectionLabelPillClass,
} from "@/components/tenant-console/landing/landing-styles";
import { listArticles, listClusters } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog/format-date";
import { blogAbsoluteUrl } from "@/lib/blog/seo";

export function BlogHubPage() {
  const articles = listArticles();
  const clusters = listClusters();
  const featured =
    clusters.find((cluster) => cluster.pillar && !cluster.pillar.listedOnly)
      ?.pillar ??
    articles.find((article) => !article.listedOnly) ??
    articles[0] ??
    null;
  const url = blogAbsoluteUrl("/blog");
  const countLabel =
    articles.length === 1 ? "1 article" : `${articles.length} articles`;

  return (
    <>
      <BlogCollectionJsonLd
        name="Kiosk Blog"
        description="Guides and comparisons for shop owners choosing POS and storefront tools."
        url={url}
      />
      <BlogBreadcrumbJsonLd
        items={[
          { name: "Home", url: blogAbsoluteUrl("/") },
          { name: "Blog", url },
        ]}
      />

      <section className={`${landingSectionClass} !pb-8 sm:!pb-12`}>
        <div className="mx-auto max-w-[1180px]">
          <HelpBreadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "Blog" }]}
            className="mb-8"
          />

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className={sectionLabelPillClass}>Blog</p>
              <h1 className="mt-5 font-heading text-[clamp(2rem,6vw,3.5rem)] leading-[1.08] tracking-[-0.03em] text-[var(--kiosk-text)]">
                Guides for the counter
              </h1>
              <p className="mt-4 text-base leading-[1.65] text-[var(--kiosk-text-soft)] sm:text-[17px]">
                Topic clusters for Kenyan retailers — pick a series, read the
                pillar, then follow the spokes that match your shop.
              </p>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
              {countLabel}
            </p>
          </div>

          <div className="mt-8">
            <BlogMobileClusterStrip clusters={clusters} />
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--kiosk-border-soft)] px-4 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto grid max-w-[1180px] gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <BlogHubSidebar
                clusters={clusters}
                totalArticles={articles.length}
              />
            </div>
          </div>

          <div className="min-w-0">
            {featured ? (
              <div className="mb-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
                  Featured pillar
                </p>
                <Link
                  href={featured.href}
                  className="group mt-4 block rounded-2xl border border-[var(--kiosk-border)] bg-[var(--kiosk-elevated)] p-6 transition hover:border-[var(--kiosk-gold-border)] sm:p-8"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kiosk-gold)]">
                      {featured.category}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
                      {formatBlogDate(featured.publishedAt)}
                    </span>
                  </div>
                  <h2 className="mt-3 max-w-3xl font-heading text-[clamp(1.55rem,3.8vw,2.5rem)] leading-[1.12] tracking-[-0.03em] text-[var(--kiosk-text)] transition-colors group-hover:text-[var(--kiosk-gold)]">
                    {featured.title}
                  </h2>
                  <p className="mt-3 max-w-2xl text-[15px] leading-[1.65] text-[var(--kiosk-text-soft)] sm:text-base">
                    {featured.description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--kiosk-gold)]">
                    Read article
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </div>
            ) : null}

            {clusters.map((cluster) => (
              <BlogClusterBoard key={cluster.id} cluster={cluster} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
