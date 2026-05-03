"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import { logoutRemote } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { useOnlineStatus } from "@/hooks/use-online-status";

type CashierShellProps = {
  children: React.ReactNode;
};

export function CashierShell({ children }: CashierShellProps) {
  const router = useRouter();
  const online = useOnlineStatus();
  const { business, loading } = useDashboard();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {loading ? "Loading…" : (business?.name?.trim() || "Cashier")}
            </span>
            <span
              className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                online ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
              }`}
            >
              {online ? "Online" : "Offline"}
            </span>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
              <Link href={APP_ROUTES.salesQuick}>Admin quick sale</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href={APP_ROUTES.business}>Full app</Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 text-xs"
              onClick={() =>
                logoutRemote()
                  .catch(() => undefined)
                  .finally(() => {
                    router.replace(APP_ROUTES.login);
                  })
              }
            >
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-3 py-4 sm:px-4 md:max-w-3xl">{children}</main>
    </div>
  );
}
