"use client";

import Link from "next/link";

import { TenantLogo } from "@/components/brand/tenant-logo";
import { useOptionalTenant } from "@/components/providers/tenant-provider";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import type { TenantContext } from "@/lib/public-storefront";

type Status = Exclude<TenantContext["status"], "ACTIVE">;

const COPY: Record<Status, { heading: string; body: string }> = {
  SUSPENDED: {
    heading: "This workspace is temporarily suspended",
    body: "Sign-in and storefront access are paused. Please contact your administrator or our support team to restore access.",
  },
  INACTIVE: {
    heading: "This workspace is no longer active",
    body: "The tenant has been deactivated. If you believe this is a mistake, contact your administrator.",
  },
};

export function TenantStatusPage({ status }: { status: Status }) {
  const tenant = useOptionalTenant();
  const display = tenant?.branding?.displayName ?? tenant?.tenantName ?? "Workspace";
  const primary = tenant?.branding?.primaryColor ?? undefined;
  const logo = tenant?.branding?.logoUrl ?? null;
  const { heading, body } = COPY[status];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card/95 p-10 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <TenantLogo
            brand={display}
            logoUrl={logo}
            primaryColor={primary}
            variant="auth-badge"
            size="md"
            tagline="Workspace"
            showTagline
          />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
        <div className="mt-8 flex justify-center">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={APP_ROUTES.superAdminLogin}>Super-admin sign-in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
