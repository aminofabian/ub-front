import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogArticlePageView } from "@/components/blog/blog-article-page";
import { articleStaticParams, getArticle } from "@/lib/blog";
import { blogArticleMetadata } from "@/lib/blog/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return articleStaticParams();
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) {
    return { title: "Not found" };
  }
  return blogArticleMetadata(article);
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  if (!getArticle(slug)) notFound();
  return <BlogArticlePageView slug={slug} />;
}
