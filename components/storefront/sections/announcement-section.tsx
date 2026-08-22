import { Megaphone } from "lucide-react";

import type { StorefrontAnnouncementSectionSettings } from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

/** Slim colored bar at the top — deliveries, hours, new stock. */
export function AnnouncementSection({
  settings,
  primaryHex,
}: {
  settings: StorefrontAnnouncementSectionSettings;
  primaryHex: string | null;
}) {
  const text = settings.text.trim();
  if (!text) {
    return null;
  }
  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim())
      ? primaryHex.trim()
      : null;

  return (
    <div
      className="rounded-[length:var(--sf-card-radius,1rem)] px-4 py-2.5 sm:px-5"
      style={
        primary
          ? { backgroundColor: `color-mix(in srgb, ${primary} 10%, transparent)` }
          : undefined
      }
    >
      <p
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-center gap-2 text-center text-[12px] font-medium leading-snug sm:text-[13px]",
          primary ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <Megaphone className="size-3.5 shrink-0 opacity-70" aria-hidden />
        <span>{text}</span>
      </p>
    </div>
  );
}
