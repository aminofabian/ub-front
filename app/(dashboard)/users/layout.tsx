"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";

export default function UsersSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, canListUsers, me } = useDashboard();
  const router = useRouter();

  useEffect(() => {
    if (loading || !me) {
      return;
    }
    if (!canListUsers) {
      router.replace(APP_ROUTES.products);
    }
  }, [loading, canListUsers, me, router]);

  if (loading || !me) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }
  if (!canListUsers) {
    return null;
  }

  return <>{children}</>;
}
