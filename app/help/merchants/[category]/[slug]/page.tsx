import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HelpArticlePageView } from "@/components/help/help-category-article-pages";
import { articleStaticParams, getArticle } from "@/lib/help";
import { helpArticleMetadata } from "@/lib/help/seo";

type PageProps = {
  params: Promise<{ category: string; slug: string }>;
};

export function generateStaticParams() {
  return articleStaticParams("merchants");
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category, slug } = await params;
  const article = getArticle("merchants", category, slug);
  if (!article) {
    return { title: "Not found" };
  }
  return helpArticleMetadata({
    audience: "merchants",
    categorySlug: article.categorySlug,
    slug: article.slug,
    title: article.title,
    description: article.description,
    updatedAt: article.updatedAt,
  });
}

export default async function MerchantsArticlePage({ params }: PageProps) {
  const { category, slug } = await params;
  if (!getArticle("merchants", category, slug)) notFound();
  return (
    <HelpArticlePageView
      audience="merchants"
      categorySlug={category}
      slug={slug}
    />
  );
}
