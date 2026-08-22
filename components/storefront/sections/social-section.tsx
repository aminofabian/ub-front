import { sectionContainerClass } from "@/components/storefront/sections/shared";
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
  const links = businessSocialLinks(business);
  if (links.length === 0) {
    return null;
  }
  const heading = settings.heading.trim() || "Follow us";

  return (
    <section className={sectionContainerClass("py-3")} aria-label={heading}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[length:var(--sf-card-radius,1rem)] border border-border/70 bg-card px-5 py-4 shadow-sm">
        <h2 className="font-heading text-sm font-bold tracking-[-0.01em] text-foreground">
          {heading}
        </h2>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.key}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center rounded-full border border-border/80 bg-background px-4 text-[13px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
