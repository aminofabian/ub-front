"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DashboardToaster } from "@/components/dashboard-sonner";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { logoutSuperAdmin } from "@/lib/super-admin-api";
import { getSuperAdminAccessToken } from "@/lib/super-admin-session";

export default function SuperAdminConsoleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getSuperAdminAccessToken()) {
      router.replace(APP_ROUTES.superAdminLogin);
      return;
    }
    setReady(true);
  }, [router]);

  const onSignOut = () => {
    logoutSuperAdmin();
    router.replace(APP_ROUTES.superAdminLogin);
  };

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  return (
    <>
      <header className="border-b border-border/80 bg-background/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-8">
            <Link
              href={APP_ROUTES.superAdminBusinesses}
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              UB Super-admin
            </Link>
            <nav className="flex gap-5 text-sm">
              <Link
                href={APP_ROUTES.superAdminBusinesses}
                className={
                  pathname === APP_ROUTES.superAdminBusinesses
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                Businesses
              </Link>
              <Link
                href={APP_ROUTES.superAdminSettings}
                className={
                  pathname === APP_ROUTES.superAdminSettings
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                Settings
              </Link>
            </nav>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <DashboardToaster />
    </>
  );
}
