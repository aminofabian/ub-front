"use client";

import { sectionContainerClass } from "@/components/storefront/sections/shared";
import {
  StorefrontQuickEditTarget,
  useStorefrontStaffEditOptional,
} from "@/components/storefront/storefront-staff-edit";
import {
  businessSocialLinks,
  type StorefrontDesignBusiness,
  type StorefrontSocialSectionSettings,
} from "@/lib/storefront-design";

/** Social row — links come from the business profile (set once). */
export function SocialSection({
  settings,
  business,
}: {
  settings: StorefrontSocialSectionSettings;
  business: StorefrontDesignBusiness | null | undefined;
}) {
  const staff = useStorefrontStaffEditOptional();
  const links = businessSocialLinks(business);
  const heading = settings.heading.trim() || "Follow us";
  const editing = Boolean(staff?.editMode);

  if (links.length === 0 && !editing) {
    return null;
  }

  return (
    <StorefrontQuickEditTarget field="social" label="social links">
      <section className={sectionContainerClass("py-3")} aria-label={heading}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[length:var(--sf-card-radius,1rem)] border border-border/70 bg-card px-5 py-4 shadow-sm">
          <h2 className="font-heading text-sm font-bold tracking-[-0.01em] text-foreground">
            {heading}
          </h2>
          {links.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <a
                  key={link.key}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center rounded-full border border-border/80 bg-background px-4 text-[13px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                  onClick={(e) => {
                    if (editing) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              Add Instagram, Facebook, or TikTok — tap to edit.
            </p>
          )}
        </div>
      </section>
    </StorefrontQuickEditTarget>
  );
}
