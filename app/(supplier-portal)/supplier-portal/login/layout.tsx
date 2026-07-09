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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-background to-muted/30 dark:from-slate-950 dark:via-background">
      {children}
    </div>
  );
}
