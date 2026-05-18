import { KioskLogo } from "@/components/brand/kiosk-logo";
import { getApiBaseUrl, getServerApiOrigin } from "@/lib/config";

export function AuthBranding() {
  const apiHint = getApiBaseUrl() || getServerApiOrigin();
  return (
    <header className="mb-6 flex flex-col items-center gap-4 text-center">
      <KioskLogo size="md" variant="default" showTagline tagline="Super admin" />
      <p className="text-xs text-muted-foreground">
        API{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.7rem]">
          {apiHint}
        </code>
      </p>
    </header>
  );
}
