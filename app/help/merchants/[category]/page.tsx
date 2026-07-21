import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HelpCategoryPageView } from "@/components/help/help-category-article-pages";
import {
  categoryStaticParams,
  getCategory,
} from "@/lib/help";
import { helpCategoryMetadata } from "@/lib/help/seo";

type PageProps = {
  params: Promise<{ category: string }>;
};

export function generateStaticParams() {
  return categoryStaticParams("merchants");
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = getCategory("merchants", categorySlug);
  if (!category) {
    return { title: "Not found" };
  }
  return helpCategoryMetadata({
    audience: "merchants",
    categoryTitle: category.title,
    categoryDescription: category.description,
    categorySlug: category.slug,
  });
}

export default async function MerchantsCategoryPage({ params }: PageProps) {
  const { category } = await params;
  if (!getCategory("merchants", category)) notFound();
  return (
    <HelpCategoryPageView audience="merchants" categorySlug={category} />
  );
}
