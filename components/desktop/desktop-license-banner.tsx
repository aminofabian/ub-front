"use client";

import Link from "next/link";
import { AlertTriangle, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { IS_DESKTOP } from "@/lib/runtime";
import { cn } from "@/lib/utils";

import { useDesktopLicense } from "./desktop-license-provider";

/**
 * Sticky license / trial banner for the desktop SKU (DESKTOP_INSTALLATION.md §10).
 */
export function DesktopLicenseBanner() {
  const { status, loading } = useDesktopLicense();

  if (!IS_DESKTOP || loading || !status) return null;

  const showBanner =
    status.readOnly ||
    status.state === "trial" ||
    status.state === "expired" ||
    status.state === "trial_expired" ||
    status.state === "invalid";

  if (!showBanner) return null;

  const isError =
    status.readOnly ||
    status.state === "expired" ||
    status.state === "trial_expired" ||
    status.state === "invalid";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 text-sm sm:px-6",
        isError
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
      )}
      role="status"
    >
      <div className="flex min-w-0 items-start gap-2">
        {isError ? (
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        ) : (
          <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden />
        )}
        <p className="min-w-0 leading-snug">{status.message}</p>
      </div>
      <Button asChild size="sm" variant={isError ? "destructive" : "secondary"}>
        <Link href={APP_ROUTES.desktopSettings}>
          {status.readOnly ? "Renew license" : "License settings"}
        </Link>
      </Button>
    </div>
  );
}
