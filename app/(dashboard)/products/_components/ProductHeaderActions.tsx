"use client";

import Link from "next/link";
import {
  BookOpen,
  FileUp,
  Globe2,
  PackagePlus,
  ScanBarcode,
} from "lucide-react";

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
  onBrowseCatalog,
  onScanToAdd,
}: {
  canCreate: boolean;
  onCreateNew: () => void;
  /** Opens the shared (global) catalog browser; omitted when the user lacks the permission. */
  onBrowseCatalog?: () => void;
  /** Opens the shared catalog with the camera on; omitted without the import permission. */
  onScanToAdd?: () => void;
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
      <Button
        asChild
        variant="outline"
        size="sm"
        className={CATALOG_BTN_OUTLINE}
      >
        <Link
          href={APP_ROUTES.businessImport}
          title="Add many products from a spreadsheet"
        >
          <FileUp className="size-3.5" aria-hidden />
          Import
        </Link>
      </Button>
      {onBrowseCatalog ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={CATALOG_BTN_OUTLINE}
          onClick={onBrowseCatalog}
          title="Ready-made products with photos and prices — add them in one tap"
        >
          <Globe2 className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Shared catalog</span>
          <span className="sm:hidden">Catalog</span>
        </Button>
      ) : null}
      {onScanToAdd ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={CATALOG_BTN_OUTLINE}
          onClick={onScanToAdd}
          title="Scan barcodes with the camera to add ready-made products from the shared catalog"
        >
          <ScanBarcode className="size-3.5" aria-hidden />
          Scan to add
        </Button>
      ) : null}
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
