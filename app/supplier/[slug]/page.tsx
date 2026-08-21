"use client";

import { use } from "react";

import { SupplierReceiveWorkspace } from "@/components/supplier-receive/supplier-receive-workspace";

type SupplierReceivePageProps = {
  params: Promise<{ slug: string }>;
};

export default function SupplierReceivePage({ params }: SupplierReceivePageProps) {
  const { slug } = use(params);
  return <SupplierReceiveWorkspace slug={decodeURIComponent(slug)} />;
}
