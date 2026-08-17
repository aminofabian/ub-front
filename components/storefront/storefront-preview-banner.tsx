import Link from "next/link";

import { APP_ROUTES } from "@/lib/config";

/**
 * Shown only when a merchant opened the shop via Themes → Open live.
 * Shoppers without the preview query never see this.
 */
export function StorefrontPreviewBanner({ lookName }: { lookName: string }) {
  return (
    <div className="relative z-[80] shrink-0 border-b border-amber-300/80 bg-amber-50 px-3 py-2 text-center text-xs text-amber-950 sm:px-4">
      You're peeking at <span className="font-semibold">{lookName}</span>
      {" — "}
      this is not what customers see yet. Hang it on the shop front when you{" "}
      <Link
        href={APP_ROUTES.businessThemes}
        className="font-semibold underline underline-offset-2"
      >
        show it to customers
      </Link>
      .
    </div>
  );
}
