"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthBranding } from "@/components/auth/auth-branding";
import { SupplierClaimModal } from "@/components/supplier-portal/supplier-claim-modal";
import { APP_ROUTES } from "@/lib/config";

function ClaimRouteShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);
  const phone = searchParams.get("phone")?.trim() || undefined;

  useEffect(() => {
    setOpen(true);
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <AuthBranding tagline="Supplier passport" showApiHint />
      <SupplierClaimModal
        open={open}
        initialPhone={phone}
        autoSendCode={Boolean(phone)}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            router.replace(APP_ROUTES.supplierPortalLogin);
          }
        }}
      />
    </div>
  );
}

export default function SupplierPortalClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ClaimRouteShell />
    </Suspense>
  );
}
