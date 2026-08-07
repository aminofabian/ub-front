export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; tone?: "info" | "tip" | "warning"; text: string }
  | {
      type: "table";
      headers: string[];
      rows: string[][];
    }
  | {
      type: "links";
      items: { label: string; href: string; blurb?: string }[];
    };

export type BlogArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  /** ISO date string YYYY-MM-DD */
  publishedAt: string;
  /** ISO date string YYYY-MM-DD */
  updatedAt: string;
  tags: string[];
  /** Extra SERP/keyword phrases beyond tags. */
  keywords?: string[];
  author: string;
  /** Slugs of related posts (pillar + cross-links). */
  relatedSlugs: string[];
  /** When true, listed on the hub but body is a short placeholder. */
  listedOnly?: boolean;
  /** FAQPage JSON-LD + optional FAQ section at end of article. */
  faqs?: BlogFaq[];
  /** Ranked ItemList for comparison / top-N articles. */
  ranking?: { name: string; position: number; url?: string }[];
  body: BlogBlock[];
};

export type BlogArticleRef = {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  updatedAt: string;
  tags: string[];
  author: string;
  listedOnly: boolean;
  href: string;
};

export type BlogPath =
  | { type: "hub"; href: "/blog" }
  | {
      type: "article";
      href: string;
      slug: string;
      updatedAt: string;
    };
