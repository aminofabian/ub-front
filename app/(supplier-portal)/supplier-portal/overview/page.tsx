"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalCapabilities,
  fetchSupplierPortalHubShops,
  fetchSupplierPortalOrders,
  fetchSupplierPortalPayments,
  type SupplierPortalHubShops,
} from "@/lib/marketplace-api";
import { formatMoneyCompact, resolveCurrencyCode } from "@/lib/money";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function money(amount: unknown, currency: string): string {
  return formatMoneyCompact(toNum(amount), resolveCurrencyCode(currency));
}

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function SupplierPortalOverviewPage() {
  const router = useRouter();
  const [hub, setHub] = useState<SupplierPortalHubShops | null>(null);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [todayCollections, setTodayCollections] = useState(0);
  const [canViewMoney, setCanViewMoney] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void (async () => {
      try {
        const caps = await fetchSupplierPortalCapabilities();
        setCanViewMoney(caps.canViewMoney);
        const orders = await fetchSupplierPortalOrders();
        setPendingOrders(orders.filter((o) => !o.supplierResponseAt).length);
        if (!caps.canViewMoney) {
          return;
        }
        const [shops, payments] = await Promise.all([
          fetchSupplierPortalHubShops(),
          fetchSupplierPortalPayments(),
        ]);
        setHub(shops);
        setTodayCollections(
          payments.filter((p) => isToday(p.paidAt)).reduce((sum, p) => sum + toNum(p.amount), 0),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load dashboard");
      }
    })();
  }, [router]);

  const currency = hub?.currency ?? "KES";

  return (
    <SupplierPortalShell>
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {canViewMoney
              ? "Balances and activity across shops you supply."
              : "Orders and catalogue activity for your supplier account."}
          </p>
        </header>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {canViewMoney ? (
            <>
              <Kpi
                label="Total shops"
                value={hub ? String(hub.shopCount) : "—"}
                href={APP_ROUTES.supplierPortalShops}
              />
              <Kpi
                label="Outstanding"
                value={hub ? money(hub.totals.owed, currency) : "—"}
                href={APP_ROUTES.supplierPortalShops}
              />
              <Kpi
                label="Today's collections"
                value={hub ? money(todayCollections, currency) : "—"}
                href={APP_ROUTES.supplierPortalPayments}
              />
              <Kpi
                label="Paid (all time)"
                value={hub ? money(hub.totals.paid, currency) : "—"}
                href={APP_ROUTES.supplierPortalPayments}
              />
              <Kpi
                label="Partial balances"
                value={hub ? money(hub.totals.pending, currency) : "—"}
                href={APP_ROUTES.supplierPortalInvoices}
              />
            </>
          ) : null}
          <Kpi
            label="Pending orders"
            value={String(pendingOrders)}
            href={APP_ROUTES.supplierPortalOrders}
          />
          {!canViewMoney ? (
            <Kpi label="Catalogue" value="Manage" href={APP_ROUTES.supplierPortalCatalog} />
          ) : null}
        </div>

        {hub && hub.shops.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium">Shops</h3>
              <Link
                href={APP_ROUTES.supplierPortalShops}
                className="text-sm font-medium text-primary underline underline-offset-2"
              >
                View all
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {hub.shops.slice(0, 4).map((shop) => (
                <Link
                  key={shop.localSupplierId}
                  href={`${APP_ROUTES.supplierPortalShops}/${shop.localSupplierId}`}
                  className="rounded-xl border bg-card p-4 transition hover:border-primary/40"
                >
                  <p className="font-medium">{shop.shopName}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Outstanding {money(shop.owed, currency)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </SupplierPortalShell>
  );
}

function Kpi({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl border bg-card p-4 transition hover:border-primary/40">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
    </Link>
  );
}
