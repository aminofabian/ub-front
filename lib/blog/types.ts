export type BlogBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; tone?: "info" | "tip" | "warning"; text: string }
  | {
      type: "table";
      headers: string[];
      rows: string[][];
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
  author: string;
  /** Slugs of related posts (pillar + cross-links). */
  relatedSlugs: string[];
  /** When true, listed on the hub but body is a short placeholder. */
  listedOnly?: boolean;
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
