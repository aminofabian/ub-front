"use client";

import { useCallback, useState } from "react";
import {
  Apple,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Smartphone,
} from "lucide-react";
import Link from "next/link";

import { DesktopLanQr } from "@/components/desktop/desktop-lan-qr";
import { Button } from "@/components/ui/button";
import {
  MOBILE_APP_ROLE_LABELS,
  MOBILE_APP_ROLES,
  appForRole,
  deepLinkForRole,
  type MobileAppRole,
  type PublicMobileConfig,
} from "@/lib/public-mobile-config";
import { cn } from "@/lib/utils";

type GetTheAppPanelProps = {
  config: PublicMobileConfig;
  /** Storefront modal focuses on the shopper app; admin shows all roles. */
  variant?: "admin" | "storefront";
  className?: string;
};

function StoreBadge({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Apple;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-2 text-sm font-medium shadow-sm transition-colors",
        "hover:border-primary/30 hover:bg-accent/40",
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      {label}
      <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
    </a>
  );
}

function AppQrCard({
  config,
  role,
  compact,
}: {
  config: PublicMobileConfig;
  role: MobileAppRole;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const meta = MOBILE_APP_ROLE_LABELS[role];
  const app = appForRole(config, role);
  const deepLink = deepLinkForRole(config, role);
  const universal =
    role === "shopper"
      ? config.deepLinks.universalShop
      : config.deepLinks.universalApp;

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(deepLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [deepLink]);

  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border border-border/80 bg-card shadow-sm",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {app?.name?.trim() || `${config.displayName} ${meta.label}`}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{meta.blurb}</p>
        </div>
        {app?.whiteLabel ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            Branded
          </span>
        ) : null}
      </div>

      <div className={cn("mt-3 flex gap-3", compact ? "flex-col items-center" : "flex-col sm:flex-row sm:items-start")}>
        <div className="shrink-0 rounded-lg border border-border/60 bg-white p-2">
          <DesktopLanQr url={deepLink} size={compact ? 128 : 144} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Deep link
            </p>
            <p className="mt-0.5 break-all font-mono text-[11px] leading-snug text-foreground/90">
              {deepLink}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => void onCopy()}>
              {copied ? (
                <Check className="size-3.5 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="size-3.5" aria-hidden />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
            {universal ? (
              <Button asChild size="sm" variant="ghost" className="h-8 gap-1.5 text-xs">
                <a href={universal} target="_blank" rel="noopener noreferrer">
                  Web fallback
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </Button>
            ) : null}
          </div>
          {app?.bundleId ? (
            <p className="text-[10px] text-muted-foreground">
              Bundle ID: <span className="font-mono">{app.bundleId}</span>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function GetTheAppPanel({
  config,
  variant = "admin",
  className,
}: GetTheAppPanelProps) {
  const roles: MobileAppRole[] =
    variant === "storefront" ? ["shopper"] : [...MOBILE_APP_ROLES];
  const storeLinks = config.platformStoreLinks;
  const hasStoreLinks = Boolean(storeLinks.ios || storeLinks.android);

  return (
    <div className={cn("space-y-5", className)}>
      <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Smartphone className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-foreground">{config.displayName}</p>
            <p className="mt-0.5 text-muted-foreground">
              Scan a QR code on a phone with the app installed, or share the deep link.
              {variant === "storefront"
                ? " Opens this store in the shopper app."
                : " Staff apps use the login deep link for your tenant."}
            </p>
            {variant === "admin" ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Tenant host:{" "}
                <span className="font-mono text-foreground/80">{config.tenantHost}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {hasStoreLinks ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            App stores
          </p>
          <div className="flex flex-wrap gap-2">
            {storeLinks.ios ? (
              <StoreBadge href={storeLinks.ios} label="App Store" icon={Apple} />
            ) : null}
            {storeLinks.android ? (
              <StoreBadge href={storeLinks.android} label="Google Play" icon={Smartphone} />
            ) : null}
          </div>
        </div>
      ) : variant === "admin" ? (
        <p className="text-xs text-muted-foreground">
          App Store links are not configured yet. Set{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
            APP_MOBILE_STORE_LINK_IOS
          </code>{" "}
          and{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
            APP_MOBILE_STORE_LINK_ANDROID
          </code>{" "}
          on the API server when your builds are live.
        </p>
      ) : null}

      <div
        className={cn(
          "grid gap-3",
          variant === "admin" ? "md:grid-cols-2" : "max-w-md",
        )}
      >
        {roles.map((role) => (
          <AppQrCard
            key={role}
            config={config}
            role={role}
            compact={variant === "storefront"}
          />
        ))}
      </div>

      {variant === "storefront" ? (
        <p className="text-center text-xs text-muted-foreground">
          Staff?{" "}
          <Link href={config.deepLinks.universalApp} className="font-medium text-primary underline-offset-2 hover:underline">
            Open the staff login page
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export function GetTheAppPanelLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      Loading app links…
    </div>
  );
}

export function GetTheAppPanelError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
