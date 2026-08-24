export type HelpAudience = "merchants" | "shoppers";

export type HelpLinkItem = {
  /** Link text (keep it short — it renders as a card title). */
  label: string;
  /** One-line description shown under the label. */
  description?: string;
  /** Full path, e.g. /help/merchants/inventory/how-to-add-products */
  href: string;
};

export type HelpBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "callout"; tone?: "info" | "tip" | "warning"; text: string }
  | { type: "faq"; items: { question: string; answer: string }[] }
  | {
      type: "image";
      /** Public path, e.g. /help/add-product-group.png */
      src: string;
      alt: string;
      caption?: string;
    }
  | {
      type: "links";
      /** Optional section heading rendered above the link cards. */
      title?: string;
      items: HelpLinkItem[];
    };

export type HelpCategoryDef = {
  slug: string;
  title: string;
  description: string;
  /** Lucide icon name key used by the UI map. */
  icon: HelpCategoryIcon;
};

export type HelpCategoryIcon =
  | "rocket"
  | "scan"
  | "smartphone"
  | "package"
  | "store"
  | "users"
  | "user"
  | "truck"
  | "credit-card"
  | "rotate-ccw"
  | "clipboard-list";

export type HelpArticle = {
  audience: HelpAudience;
  categorySlug: string;
  slug: string;
  title: string;
  description: string;
  /** ISO date string YYYY-MM-DD */
  updatedAt: string;
  tags: string[];
  /** Popular articles shown on the hub. */
  popular?: boolean;
  relatedSlugs: string[];
  body: HelpBlock[];
};

export type HelpCategory = HelpCategoryDef & {
  audience: HelpAudience;
  articleCount: number;
};

export type HelpArticleRef = {
  audience: HelpAudience;
  categorySlug: string;
  slug: string;
  title: string;
  description: string;
  updatedAt: string;
  href: string;
};

export type HelpPath =
  | { type: "hub"; href: "/help" }
  | { type: "audience"; href: string; audience: HelpAudience }
  | {
      type: "category";
      href: string;
      audience: HelpAudience;
      categorySlug: string;
    }
  | {
      type: "article";
      href: string;
      audience: HelpAudience;
      categorySlug: string;
      slug: string;
      updatedAt: string;
    };
