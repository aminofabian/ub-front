"use client";

import { ProductsWorkspace } from "@/app/(dashboard)/products/products-workspace";

export default function ButcherProductsPage() {
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-background text-foreground">
      <ProductsWorkspace />
    </div>
  );
}
