"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { APP_ROUTES } from "@/lib/config";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";

export default function SupplierPortalAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalOverview);
    }
  }, [router]);

  return <>{children}</>;
}
