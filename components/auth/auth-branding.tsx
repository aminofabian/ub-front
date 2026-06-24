"use client";

import { useEffect, useState } from "react";

import { KioskLogo } from "@/components/brand/kiosk-logo";
import { getApiBaseUrl } from "@/lib/config";

type AuthBrandingProps = {
  tagline?: string;
  /** Dev-only API origin hint; rendered after mount to avoid SSR/client drift. */
  showApiHint?: boolean;
};

export function AuthBranding({
  tagline,
  showApiHint = process.env.NODE_ENV === "development",
}: AuthBrandingProps) {
  const [apiHint, setApiHint] = useState<string | null>(null);

  useEffect(() => {
    if (!showApiHint) {
      return;
    }

    const direct = getApiBaseUrl();
    if (direct) {
      setApiHint(direct);
      return;
    }

    // Browser REST calls are same-origin; Next.js rewrites /api/* to the backend.
    setApiHint(`${window.location.origin} (BFF proxy)`);
  }, [showApiHint]);

  return (
    <header className="mb-6 flex flex-col items-center gap-4 text-center">
      <KioskLogo
        size="md"
        variant="default"
        showTagline={Boolean(tagline)}
        tagline={tagline}
      />
      {apiHint ? (
        <p className="text-xs text-muted-foreground">
          API{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.7rem]">
            {apiHint}
          </code>
        </p>
      ) : null}
    </header>
  );
}
