"use client";

import Link from "next/link";
import { BookOpen, FileUp, PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import { ProductGuideDrawer } from "./ProductGuideDrawer";

const actionBtnOutline = cn(
  "h-8 gap-1 rounded-lg border-[color-mix(in_srgb,var(--catalog-ink,#15231f)_12%,transparent)] px-2.5 text-[12px] shadow-none",
);

const actionBtnPrimary = cn(
  "h-8 gap-1.5 rounded-lg bg-[var(--catalog-ink,#15231f)] px-3 text-[12px] text-white shadow-none hover:bg-[color-mix(in_srgb,var(--catalog-ink,#15231f)_88%,#000)]",
);

export function ProductHeaderActions({
  canCreate,
  onCreateNew,
}: {
  canCreate: boolean;
  onCreateNew: () => void;
}) {
  return (
    <>
      <ProductGuideDrawer
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 rounded-lg px-2 text-[12px] text-[color-mix(in_srgb,var(--catalog-ink,#15231f)_58%,transparent)] shadow-none hover:text-[var(--catalog-ink,#15231f)]"
            title="How to add products"
          >
            <BookOpen className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Help</span>
          </Button>
        }
      />
      <Button asChild variant="outline" size="sm" className={actionBtnOutline}>
        <Link
          href={APP_ROUTES.businessImport}
          title="Add many products from a spreadsheet"
        >
          <FileUp className="size-3.5" aria-hidden />
          Import
        </Link>
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={!canCreate}
        onClick={onCreateNew}
        className={actionBtnPrimary}
      >
        <PackagePlus className="size-3.5" aria-hidden />
        Add product
      </Button>
    </>
  );
}
