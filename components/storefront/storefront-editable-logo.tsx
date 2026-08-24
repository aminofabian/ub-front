"use client";

import type { ComponentProps } from "react";
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
          // Avoid nesting interactive link + upload button: pass href undefined while wrapping.
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
