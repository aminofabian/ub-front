import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HelpCategoryPageView } from "@/components/help/help-category-article-pages";
import { categoryStaticParams, getCategory } from "@/lib/help";
import { helpCategoryMetadata } from "@/lib/help/seo";

type PageProps = {
  params: Promise<{ category: string }>;
};

export function generateStaticParams() {
  return categoryStaticParams("shoppers");
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = getCategory("shoppers", categorySlug);
  if (!category) {
    return { title: "Not found" };
  }
  return helpCategoryMetadata({
    audience: "shoppers",
    categoryTitle: category.title,
    categoryDescription: category.description,
    categorySlug: category.slug,
  });
}

export default async function ShoppersCategoryPage({ params }: PageProps) {
  const { category } = await params;
  if (!getCategory("shoppers", category)) notFound();
  return (
    <HelpCategoryPageView audience="shoppers" categorySlug={category} />
  );
}
