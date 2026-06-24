"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SuperAdminShell } from "@/components/super-admin/super-admin-shell";
import { APP_ROUTES } from "@/lib/config";
import { getSuperAdminAccessToken } from "@/lib/super-admin-session";

export default function SuperAdminConsoleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getSuperAdminAccessToken()) {
      router.replace(APP_ROUTES.superAdminLogin);
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4">
        <div className="size-8 animate-pulse rounded-full bg-primary/20" aria-hidden />
        <p className="text-sm text-muted-foreground">Checking session…</p>
      </div>
    );
  }

  return <SuperAdminShell>{children}</SuperAdminShell>;
}
