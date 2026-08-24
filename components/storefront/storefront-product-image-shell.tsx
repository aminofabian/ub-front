"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { StorefrontProductPhotoButton } from "@/components/storefront/storefront-product-photo-button";
import { useStorefrontStaffEditOptional } from "@/components/storefront/storefront-staff-edit";
import { cn } from "@/lib/utils";

/**
 * Product image well: shopper gets a Link; edit mode uses a plain div so the
 * camera / upload control is not nested inside an <a> (which steals the click).
 */
export function StorefrontProductImageShell({
  href,
  ariaLabel,
  className,
  itemId,
  itemName,
  children,
}: {
  href: string;
  ariaLabel?: string;
  className?: string;
  itemId: string;
  itemName: string;
  children: ReactNode;
}) {
  const staff = useStorefrontStaffEditOptional();
  const editing = Boolean(staff?.editMode && staff.canEditPhotos);

  if (editing) {
    return (
      <div className={cn("relative", className)}>
        {children}
        <StorefrontProductPhotoButton itemId={itemId} itemName={itemName} />
      </div>
    );
  }

  return (
    <Link href={href} className={cn("relative", className)} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
