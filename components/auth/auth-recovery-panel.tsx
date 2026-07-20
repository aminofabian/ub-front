"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";

type AuthRecoveryPanelProps = {
  title?: string;
  message?: string;
};

export function AuthRecoveryPanel({
  title = "Could not load your session",
  message = "Your sign-in may not have saved on this device. Clear Safari website data for this site, then sign in again.",
}: AuthRecoveryPanelProps) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href={APP_ROUTES.staffLogin}>Back to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
