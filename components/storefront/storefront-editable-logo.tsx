"use client";

import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";
import { toast } from "sonner";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { StorefrontEditableMedia } from "@/components/storefront/storefront-editable-media";
import {
  useStorefrontDisplayLogo,
  useStorefrontStaffEditOptional,
} from "@/components/storefront/storefront-staff-edit";
import { trackStorefrontEditEvent } from "@/lib/storefront-staff-edit";

type TenantLogoProps = ComponentProps<typeof TenantLogo>;

/**
 * Tenant logo that opens a branding upload picker in storefront edit mode.
 * Logo writes save immediately (not draft/Publish).
 */
export function StorefrontEditableLogo(props: TenantLogoProps) {
  const staff = useStorefrontStaffEditOptional();
  const logoUrl = useStorefrontDisplayLogo(props.logoUrl ?? null);

  const logo = <TenantLogo {...props} logoUrl={logoUrl} />;

  if (!staff?.editMode || !staff.canEdit) {
    return logo;
  }

  return (
    <StorefrontEditableMedia
      label="logo"
      className={props.className}
      onUpload={async (file) => {
        try {
          await staff.uploadLogo(file);
        } catch (e) {
          trackStorefrontEditEvent("storefront_edit_save_failed", {
            surface: "logo",
          });
          toast.error(e instanceof Error ? e.message : "Could not upload logo");
          throw e;
        }
      }}
    >
      <TenantLogo {...props} logoUrl={logoUrl} href={undefined} />
    </StorefrontEditableMedia>
  );
}

/**
 * Theme headers that paint a small square logo Image — wrap so edit mode
 * can replace the mark without adopting TenantLogo layout.
 */
export function StorefrontEditableLogoMark({
  logoUrl,
  alt = "",
  width = 32,
  height = 32,
  className,
  fallback,
}: {
  logoUrl?: string | null;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  fallback?: ReactNode;
}) {
  const staff = useStorefrontStaffEditOptional();
  const url = useStorefrontDisplayLogo(logoUrl ?? null);
  const mark = url ? (
    <Image
      src={url}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized
    />
  ) : (
    (fallback ?? null)
  );

  if (!staff?.editMode || !staff.canEdit) {
    return <>{mark}</>;
  }

  return (
    <StorefrontEditableMedia
      label="logo"
      showBadge={false}
      className={className}
      onUpload={async (file) => {
        try {
          await staff.uploadLogo(file);
        } catch (e) {
          trackStorefrontEditEvent("storefront_edit_save_failed", {
            surface: "logo",
          });
          toast.error(e instanceof Error ? e.message : "Could not upload logo");
          throw e;
        }
      }}
    >
      {mark ?? (
        <span
          className={className}
          style={{
            display: "inline-block",
            width,
            height,
            background: "rgba(0,0,0,0.08)",
          }}
          aria-hidden
        />
      )}
    </StorefrontEditableMedia>
  );
}
