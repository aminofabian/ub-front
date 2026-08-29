"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AuthenticatedShellGate } from "@/components/auth/authenticated-shell-gate";
import { StaffPayPortalLoader } from "@/components/payroll/staff-pay-portal-loader";
import { APP_ROUTES } from "@/lib/config";
import { useDashboard } from "@/components/dashboard-provider";
import { Permission, hasPermission } from "@/lib/permissions";

type Branding = {
  shopName: string;
  primaryHex: string | null;
  accentHex: string | null;
  logoUrl: string | null;
};

function StaffPayPortalGate({
  branding,
  phoneSegment,
}: {
  branding: Branding;
  phoneSegment?: string | null;
}) {
  const router = useRouter();
  const { loading, me } = useDashboard();

  useEffect(() => {
    if (loading) return;
    if (!hasPermission(me?.permissions, Permission.PayrollSelfRead)) {
      router.replace(APP_ROUTES.overview);
    }
  }, [loading, me?.permissions, router]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!hasPermission(me?.permissions, Permission.PayrollSelfRead)) {
    return null;
  }

  return (
    <StaffPayPortalLoader
      branding={branding}
      phoneSegment={phoneSegment}
      backHref={APP_ROUTES.overview}
    />
  );
}

export function StaffPayPortalPage({
  branding,
  phoneSegment,
}: {
  branding: Branding;
  phoneSegment?: string | null;
}) {
  return (
    <AuthenticatedShellGate>
      <StaffPayPortalGate branding={branding} phoneSegment={phoneSegment} />
    </AuthenticatedShellGate>
  );
}
