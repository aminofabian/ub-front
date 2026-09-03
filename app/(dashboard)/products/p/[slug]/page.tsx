"use client";

import { useParams } from "next/navigation";

import { ProductDossierView } from "../../_components/product-dossier-view";

export default function ProductDossierPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === "string" ? params.slug : "";
  return <ProductDossierView slug={slug} />;
}
