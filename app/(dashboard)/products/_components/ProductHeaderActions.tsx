"use client";

import Link from "next/link";
import { BookOpen, FileUp, PackagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  CATALOG_BTN_GHOST,
  CATALOG_BTN_OUTLINE,
  CATALOG_BTN_PRIMARY,
} from "./catalog-chrome";
import { ProductGuideDrawer } from "./ProductGuideDrawer";

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
            className={CATALOG_BTN_GHOST}
            title="How to add products"
          >
            <BookOpen className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Help</span>
          </Button>
        }
      />
      <Button asChild variant="outline" size="sm" className={CATALOG_BTN_OUTLINE}>
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
        className={CATALOG_BTN_PRIMARY}
      >
        <PackagePlus className="size-3.5" aria-hidden />
        Add product
      </Button>
    </>
  );
}
