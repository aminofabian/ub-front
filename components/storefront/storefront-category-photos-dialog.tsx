"use client";

import Image from "next/image";
import { LayoutGrid } from "lucide-react";

import { StorefrontCategoryPhotoButton } from "@/components/storefront/storefront-category-photo-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PublicCategory } from "@/lib/public-storefront";
import { categoryIconImageUrl } from "@/lib/utils";

function rootAisles(categories: PublicCategory[]): PublicCategory[] {
  const roots = categories
    .filter((c) => !c.parentId?.trim())
    .sort((a, b) => a.name.localeCompare(b.name));
  return roots.length > 0
    ? roots
    : [...categories].sort((a, b) => a.name.localeCompare(b.name));
}

function CategoryPhotoRow({
  category,
  iconOverrides,
}: {
  category: PublicCategory;
  iconOverrides: Record<string, string>;
}) {
  const src =
    iconOverrides[category.id]?.trim() ||
    categoryIconImageUrl(category.icon ?? null);

  return (
    <li className="relative flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5">
      <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            className="object-cover"
            sizes="56px"
            unoptimized
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <LayoutGrid className="size-5" aria-hidden />
          </span>
        )}
        <StorefrontCategoryPhotoButton
          categoryId={category.id}
          categoryName={category.name}
          className="bottom-0.5 right-0.5 size-7"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {category.name}
        </p>
        {typeof category.itemCount === "number" ? (
          <p className="text-[11px] text-muted-foreground">
            {category.itemCount}{" "}
            {category.itemCount === 1 ? "item" : "items"}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/** List root categories so Milk Run / text-rail themes can still set aisle photos. */
export function StorefrontCategoryPhotosDialog({
  open,
  onOpenChange,
  categories,
  iconOverrides = {},
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: PublicCategory[];
  iconOverrides?: Record<string, string>;
}) {
  const aisles = rootAisles(categories);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="bottom" className="gap-4 p-5 sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Category photos</DialogTitle>
          <DialogDescription>
            Tap the camera on an aisle to set its storefront image. Mart themes
            also show the camera on the aisle tiles.
          </DialogDescription>
        </DialogHeader>

        {aisles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No categories yet. Add aisles in the dashboard first.
          </p>
        ) : (
          <ul className="flex max-h-[min(60vh,24rem)] flex-col gap-2 overflow-y-auto">
            {aisles.map((c) => (
              <CategoryPhotoRow
                key={c.id}
                category={c}
                iconOverrides={iconOverrides}
              />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
