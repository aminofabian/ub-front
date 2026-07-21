import {
  extractFaqPairs,
  type HelpArticle,
  type HelpAudience,
  type HelpCategory,
} from "@/lib/help";
import { PLATFORM_SITE_NAME } from "@/lib/platform-seo";

function JsonLd({ data }: { data: Record<string, unknown> | unknown[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function HelpHubStructuredData({ siteUrl }: { siteUrl: string }) {
  const base = siteUrl.replace(/\/+$/, "");
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: `${PLATFORM_SITE_NAME} Help`,
        url: `${base}/help`,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${base}/help?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

export function HelpBreadcrumbJsonLd({
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

export function HelpCollectionJsonLd({
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

export function HelpArticleJsonLd({
  article,
  category,
  url,
  siteUrl,
}: {
  article: HelpArticle;
  category: HelpCategory;
  url: string;
  siteUrl: string;
  audience: HelpAudience;
}) {
  const base = siteUrl.replace(/\/+$/, "");
  const faq = extractFaqPairs(article);
  const graphs: Record<string, unknown>[] = [
    {
      "@type": "TechArticle",
      headline: article.title,
      description: article.description,
      dateModified: article.updatedAt,
      author: {
        "@type": "Organization",
        name: PLATFORM_SITE_NAME,
      },
      publisher: {
        "@type": "Organization",
        name: PLATFORM_SITE_NAME,
        url: base,
      },
      mainEntityOfPage: url,
      articleSection: category.title,
      keywords: article.tags.join(", "),
    },
  ];

  if (faq.length > 0) {
    graphs.push({
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": graphs,
      }}
    />
  );
}
