"use client";

import Image from "next/image";

import { StorefrontProductPhotoButton } from "@/components/storefront/storefront-product-photo-button";
import { useStorefrontDisplayImage } from "@/components/storefront/storefront-staff-edit";
import { cn } from "@/lib/utils";

/** PDP hero image with optional staff photo upload in edit mode. */
export function ShopItemHeroMedia({
  itemId,
  itemName,
  imageUrl,
  imageAlt,
}: {
  itemId: string;
  itemName: string;
  imageUrl: string | null;
  imageAlt?: string | null;
}) {
  const displayUrl = useStorefrontDisplayImage(itemId, imageUrl);

  return (
    <div className={cn("relative aspect-square w-full overflow-hidden rounded-xl bg-muted")}>
      {displayUrl ? (
        <Image
          src={displayUrl}
          alt={imageAlt?.trim() || itemName}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 640px"
          priority
        />
      ) : (
        <div className="flex h-full items-center justify-center text-6xl font-medium text-muted-foreground/40">
          {itemName.slice(0, 1).toUpperCase()}
        </div>
      )}
      <StorefrontProductPhotoButton itemId={itemId} itemName={itemName} />
    </div>
  );
}
