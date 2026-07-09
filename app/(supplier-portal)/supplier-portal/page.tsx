"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { APP_ROUTES } from "@/lib/config";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";

export default function SupplierPortalIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(
      getSupplierPortalAccessToken()
        ? APP_ROUTES.supplierPortalOverview
        : APP_ROUTES.supplierPortalLogin,
    );
  }, [router]);

  return null;
}
