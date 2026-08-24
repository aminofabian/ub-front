import { MERCHANT_ARTICLES, MERCHANT_CATEGORIES } from "./merchants-content";
import { SHOPPER_ARTICLES, SHOPPER_CATEGORIES } from "./shoppers-content";
import type {
  HelpArticle,
  HelpArticleRef,
  HelpAudience,
  HelpCategory,
  HelpCategoryDef,
  HelpPath,
} from "./types";

export type {
  HelpArticle,
  HelpArticleRef,
  HelpAudience,
  HelpBlock,
  HelpCategory,
  HelpCategoryDef,
  HelpCategoryIcon,
  HelpPath,
} from "./types";

const ALL_ARTICLES: HelpArticle[] = [
  ...MERCHANT_ARTICLES,
  ...SHOPPER_ARTICLES,
];

const CATEGORIES_BY_AUDIENCE: Record<HelpAudience, HelpCategoryDef[]> = {
  merchants: MERCHANT_CATEGORIES,
  shoppers: SHOPPER_CATEGORIES,
};

export const HELP_AUDIENCES: {
  id: HelpAudience;
  title: string;
  description: string;
  href: string;
}[] = [
  {
    id: "merchants",
    title: "Shop owners & staff",
    description:
      "Set up your till, take M-Pesa, manage stock, and run your online storefront.",
    href: "/help/merchants",
  },
  {
    id: "shoppers",
    title: "Online shoppers",
    description:
      "Order from a kiosk.ke shop, pay with M-Pesa, track delivery, and resolve issues.",
    href: "/help/shoppers",
  },
];

export function isHelpAudience(value: string): value is HelpAudience {
  return value === "merchants" || value === "shoppers";
}

export function audienceLabel(audience: HelpAudience): string {
  return audience === "merchants" ? "Shop owners & staff" : "Online shoppers";
}

export function articleHref(
  audience: HelpAudience,
  categorySlug: string,
  slug: string,
): string {
  return `/help/${audience}/${categorySlug}/${slug}`;
}

export function categoryHref(
  audience: HelpAudience,
  categorySlug: string,
): string {
  return `/help/${audience}/${categorySlug}`;
}

export function audienceHref(audience: HelpAudience): string {
  return `/help/${audience}`;
}

function toRef(article: HelpArticle): HelpArticleRef {
  return {
    audience: article.audience,
    categorySlug: article.categorySlug,
    slug: article.slug,
    title: article.title,
    description: article.description,
    updatedAt: article.updatedAt,
    href: articleHref(article.audience, article.categorySlug, article.slug),
  };
}

export function listCategories(audience: HelpAudience): HelpCategory[] {
  return CATEGORIES_BY_AUDIENCE[audience].map((cat) => ({
    ...cat,
    audience,
    articleCount: ALL_ARTICLES.filter(
      (a) => a.audience === audience && a.categorySlug === cat.slug,
    ).length,
  }));
}

export function getCategory(
  audience: HelpAudience,
  categorySlug: string,
): HelpCategory | null {
  return (
    listCategories(audience).find((c) => c.slug === categorySlug) ?? null
  );
}

export function listArticles(
  audience: HelpAudience,
  categorySlug?: string,
): HelpArticleRef[] {
  return ALL_ARTICLES.filter(
    (a) =>
      a.audience === audience &&
      (categorySlug ? a.categorySlug === categorySlug : true),
  ).map(toRef);
}

export function getArticle(
  audience: HelpAudience,
  categorySlug: string,
  slug: string,
): HelpArticle | null {
  return (
    ALL_ARTICLES.find(
      (a) =>
        a.audience === audience &&
        a.categorySlug === categorySlug &&
        a.slug === slug,
    ) ?? null
  );
}

/** Resolve related articles by slug within the same audience. */
export function getRelatedArticles(article: HelpArticle): HelpArticleRef[] {
  const refs: HelpArticleRef[] = [];
  for (const relatedSlug of article.relatedSlugs) {
    const match = ALL_ARTICLES.find(
      (a) => a.audience === article.audience && a.slug === relatedSlug,
    );
    if (match) {
      refs.push(toRef(match));
    }
  }
  return refs;
}

export function listPopularArticles(limit = 8): HelpArticleRef[] {
  return ALL_ARTICLES.filter((a) => a.popular)
    .slice(0, limit)
    .map(toRef);
}

/** Flat search index for client + server filtering. */
export function getSearchIndex(): HelpArticleRef[] {
  return ALL_ARTICLES.map(toRef);
}

export function searchHelp(query: string, limit = 20): HelpArticleRef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored = ALL_ARTICLES.map((article) => {
    const hay = [
      article.title,
      article.description,
      article.tags.join(" "),
      article.categorySlug,
      article.audience,
    ]
      .join(" ")
      .toLowerCase();
    let score = 0;
    if (article.title.toLowerCase().includes(q)) score += 5;
    if (article.description.toLowerCase().includes(q)) score += 2;
    if (article.tags.some((t) => t.toLowerCase().includes(q))) score += 3;
    if (hay.includes(q)) score += 1;
    return { article, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((x) => toRef(x.article));
}

export function allHelpPaths(): HelpPath[] {
  const paths: HelpPath[] = [
    { type: "hub", href: "/help" },
    { type: "audience", href: "/help/merchants", audience: "merchants" },
    { type: "audience", href: "/help/shoppers", audience: "shoppers" },
  ];

  for (const audience of ["merchants", "shoppers"] as const) {
    for (const cat of listCategories(audience)) {
      paths.push({
        type: "category",
        href: categoryHref(audience, cat.slug),
        audience,
        categorySlug: cat.slug,
      });
    }
    for (const article of ALL_ARTICLES.filter((a) => a.audience === audience)) {
      paths.push({
        type: "article",
        href: articleHref(audience, article.categorySlug, article.slug),
        audience,
        categorySlug: article.categorySlug,
        slug: article.slug,
        updatedAt: article.updatedAt,
      });
    }
  }

  return paths;
}

export function articleStaticParams(audience: HelpAudience) {
  return ALL_ARTICLES.filter((a) => a.audience === audience).map((a) => ({
    category: a.categorySlug,
    slug: a.slug,
  }));
}

export function categoryStaticParams(audience: HelpAudience) {
  return CATEGORIES_BY_AUDIENCE[audience].map((c) => ({
    category: c.slug,
  }));
}

export function extractFaqPairs(article: HelpArticle) {
  const pairs: { question: string; answer: string }[] = [];
  for (const block of article.body) {
    if (block.type === "faq") {
      pairs.push(...block.items);
    }
  }
  return pairs;
}

/** Stable URL-safe id for a heading (used by the on-this-page rail). */
export function headingId(text: string): string {
  const id = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id || "section";
}

/** Heading blocks in an article body, in order (for the on-this-page rail). */
export function extractHeadings(article: HelpArticle): {
  id: string;
  text: string;
}[] {
  const out: { id: string; text: string }[] = [];
  for (const block of article.body) {
    if (block.type === "heading") {
      out.push({ id: headingId(block.text), text: block.text });
    }
  }
  return out;
}

/** Rough reading time in minutes, estimated from every text block. */
export function estimateReadingMinutes(article: HelpArticle): number {
  let words = 0;
  for (const block of article.body) {
    if (
      block.type === "paragraph" ||
      block.type === "heading" ||
      block.type === "callout"
    ) {
      words += block.text.split(/\s+/).length;
    } else if (block.type === "steps" || block.type === "list") {
      words += block.items.join(" ").split(/\s+/).length;
    } else if (block.type === "faq") {
      words += block.items
        .map((i) => `${i.question} ${i.answer}`)
        .join(" ")
        .split(/\s+/).length;
    } else if (block.type === "links") {
      words += block.items
        .map((i) => `${i.label} ${i.description ?? ""}`)
        .join(" ")
        .split(/\s+/).length;
    }
  }
  return Math.max(1, Math.round(words / 200));
}

/** Previous / next article within the same category (for bottom paging). */
export function getAdjacentArticles(
  article: HelpArticle,
): { prev: HelpArticleRef | null; next: HelpArticleRef | null } {
  const sameCategory = ALL_ARTICLES.filter(
    (a) => a.audience === article.audience && a.categorySlug === article.categorySlug,
  );
  const index = sameCategory.findIndex((a) => a.slug === article.slug);
  return {
    prev: index > 0 ? toRef(sameCategory[index - 1]!) : null,
    next:
      index >= 0 && index < sameCategory.length - 1
        ? toRef(sameCategory[index + 1]!)
        : null,
  };
}

export { ALL_ARTICLES };
