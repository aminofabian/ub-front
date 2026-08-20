"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { SupplierSignupFlow } from "@/components/supplier-portal/supplier-signup-flow";

function ClaimRouteShell() {
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone")?.trim() || undefined;

  return <SupplierSignupFlow initialPhone={phone} autoSendCode={Boolean(phone)} />;
}

export default function SupplierPortalClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-sm text-[#4a5c4c]">
          Opening sign-up…
        </div>
      }
    >
      <ClaimRouteShell />
    </Suspense>
  );
}
