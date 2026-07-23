import {
  BLOG_ARTICLES,
  CLUSTER_PILLAR_SLUGS,
  isClusterPillar,
  KIOSK_VS_ODOO_PILLAR_SLUG,
  PILLAR_SLUG,
  TOP_10_POS_KENYA_PILLAR_SLUG,
} from "./content";
import {
  BLOG_CLUSTER_DEFS,
  type BlogCluster,
  type BlogClusterDef,
} from "./clusters";
import type { BlogArticle, BlogArticleRef, BlogPath } from "./types";

export type {
  BlogArticle,
  BlogArticleRef,
  BlogBlock,
  BlogPath,
} from "./types";

export type { BlogCluster, BlogClusterDef } from "./clusters";

export {
  BLOG_CLUSTER_DEFS,
  CLUSTER_PILLAR_SLUGS,
  isClusterPillar,
  KIOSK_VS_ODOO_PILLAR_SLUG,
  PILLAR_SLUG,
  TOP_10_POS_KENYA_PILLAR_SLUG,
};

export function articleHref(slug: string): string {
  return `/blog/${slug}`;
}

function toRef(article: BlogArticle): BlogArticleRef {
  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    category: article.category,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    tags: article.tags,
    author: article.author,
    listedOnly: Boolean(article.listedOnly),
    href: articleHref(article.slug),
  };
}

export function listArticles(): BlogArticleRef[] {
  return [...BLOG_ARTICLES]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .map(toRef);
}

export function getArticle(slug: string): BlogArticle | null {
  return BLOG_ARTICLES.find((article) => article.slug === slug) ?? null;
}

export function getRelatedArticles(slug: string): BlogArticleRef[] {
  const article = getArticle(slug);
  if (!article) return [];

  return article.relatedSlugs
    .map((relatedSlug) => getArticle(relatedSlug))
    .filter((related): related is BlogArticle => related !== null)
    .map(toRef);
}

function refFromSlug(slug: string): BlogArticleRef | null {
  const article = getArticle(slug);
  return article ? toRef(article) : null;
}

export function listClusters(): BlogCluster[] {
  return BLOG_CLUSTER_DEFS.map((def) => {
    const pillar = refFromSlug(def.pillarSlug);
    const spokes = def.spokeSlugs
      .map(refFromSlug)
      .filter((spoke): spoke is BlogArticleRef => spoke !== null);
    const articles = [pillar, ...spokes].filter(
      (item): item is BlogArticleRef => item !== null,
    );

    return {
      ...def,
      href: `#cluster-${def.id}`,
      articleCount: articles.length,
      publishedCount: articles.filter((a) => !a.listedOnly).length,
      pillar,
      spokes,
    };
  });
}

export function getClusterForSlug(slug: string): BlogCluster | null {
  return (
    listClusters().find(
      (cluster) =>
        cluster.pillarSlug === slug || cluster.spokeSlugs.includes(slug),
    ) ?? null
  );
}

export function articleStaticParams() {
  return BLOG_ARTICLES.map((article) => ({ slug: article.slug }));
}

export function allBlogPaths(): BlogPath[] {
  const paths: BlogPath[] = [{ type: "hub", href: "/blog" }];
  for (const article of BLOG_ARTICLES) {
    paths.push({
      type: "article",
      href: articleHref(article.slug),
      slug: article.slug,
      updatedAt: article.updatedAt,
    });
  }
  return paths;
}
