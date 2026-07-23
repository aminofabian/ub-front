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
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        author: {
          "@type": "Organization",
          name: article.author,
        },
        publisher: {
          "@type": "Organization",
          name: PLATFORM_SITE_NAME,
          url: base,
        },
        mainEntityOfPage: url,
        keywords: article.tags.join(", "),
      }}
    />
  );
}
