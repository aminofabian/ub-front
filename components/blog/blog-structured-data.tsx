import type { BlogArticle } from "@/lib/blog";
import { PLATFORM_SITE_NAME } from "@/lib/platform-seo";

function JsonLd({ data }: { data: Record<string, unknown> | unknown[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BlogBreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

export function BlogCollectionJsonLd({
  name,
  description,
  url,
}: {
  name: string;
  description: string;
  url: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name,
        description,
        url,
        isPartOf: {
          "@type": "WebSite",
          name: PLATFORM_SITE_NAME,
        },
      }}
    />
  );
}

export function BlogArticleJsonLd({
  article,
  url,
  siteUrl,
}: {
  article: BlogArticle;
  url: string;
  siteUrl: string;
}) {
  const base = siteUrl.replace(/\/+$/, "");
  const graph: Record<string, unknown>[] = [
    {
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      headline: article.title,
      description: article.description,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      inLanguage: "en-KE",
      author: {
        "@type": "Organization",
        name: article.author,
        url: base,
      },
      publisher: {
        "@type": "Organization",
        name: PLATFORM_SITE_NAME,
        url: base,
        logo: {
          "@type": "ImageObject",
          url: `${base}/icon`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": url,
      },
      keywords: [...article.tags, ...(article.keywords ?? [])].join(", "),
      articleSection: article.category,
      about: {
        "@type": "Thing",
        name: "Point of sale systems in Kenya",
      },
      isAccessibleForFree: true,
    },
  ];

  if (article.faqs && article.faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: article.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    });
  }

  if (article.ranking && article.ranking.length > 0) {
    graph.push({
      "@type": "ItemList",
      "@id": `${url}#ranking`,
      name: article.title,
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: article.ranking.length,
      itemListElement: article.ranking.map((item) => ({
        "@type": "ListItem",
        position: item.position,
        name: item.name,
        ...(item.url ? { url: item.url } : {}),
      })),
    });
  }

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": graph,
      }}
    />
  );
}
