import { notFound } from "next/navigation";

import { HelpArticleBody } from "@/components/help/help-article-body";
import { HelpArticleList } from "@/components/help/help-article-list";
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
        <div className="mx-auto max-w-[800px]">
          <HelpBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Help", href: "/help" },
              { label, href: `/help/${audience}` },
              { label: category.title },
            ]}
            className="mb-8"
          />
          <p className={sectionLabelPillClass}>{label}</p>
          <h1 className="mt-5 font-heading text-[clamp(1.85rem,5vw,3rem)] leading-[1.1] tracking-[-0.03em] text-[var(--kiosk-text)]">
            {category.title}
          </h1>
          <p className="mt-4 text-base leading-[1.65] text-[var(--kiosk-text-soft)]">
            {category.description}
          </p>
          <div className="mt-10">
            <HelpArticleList articles={articles} />
          </div>
          <HelpContactCta
            variant={audience === "merchants" ? "merchant" : "shopper"}
          />
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
  const url = helpAbsoluteUrl(
    `/help/${audience}/${categorySlug}/${slug}`,
  );
  const label = audienceLabel(audience);
  const siteUrl = helpSiteUrl();

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

      <article className={landingSectionClass}>
        <div className="mx-auto max-w-[720px]">
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

          <p className={sectionLabelPillClass}>{category.title}</p>
          <h1 className="mt-5 font-heading text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.12] tracking-[-0.03em] text-[var(--kiosk-text)]">
            {article.title}
          </h1>
          <p className="mt-4 text-base leading-[1.65] text-[var(--kiosk-text-soft)]">
            {article.description}
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)]">
            Updated {article.updatedAt}
          </p>

          <div className="mt-10">
            <HelpArticleBody body={article.body} />
          </div>

          <HelpRelated articles={related} />
          <HelpContactCta
            variant={audience === "merchants" ? "merchant" : "shopper"}
          />
        </div>
      </article>
    </>
  );
}
