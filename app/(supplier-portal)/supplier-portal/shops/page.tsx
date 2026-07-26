"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalHubShops,
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

function standing(owed: unknown): string {
  return toNum(owed) > 0 ? "Outstanding" : "Good standing";
}

export default function SupplierPortalShopsPage() {
  const router = useRouter();
  const [hub, setHub] = useState<SupplierPortalHubShops | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void fetchSupplierPortalHubShops()
      .then(setHub)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load shops"));
  }, [router]);

  const currency = hub?.currency ?? "KES";

  return (
    <SupplierPortalShell>
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight">Shops</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every business you are connected to.
          </p>
        </header>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {hub ? (
          <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            {hub.shopCount} shop{hub.shopCount === 1 ? "" : "s"} · Outstanding{" "}
            <span className="font-medium text-foreground">{money(hub.totals.owed, currency)}</span>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {(hub?.shops ?? []).map((shop) => (
            <Link
              key={shop.localSupplierId}
              href={`${APP_ROUTES.supplierPortalShops}/${shop.localSupplierId}`}
              className="rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium">{shop.shopName}</h3>
                <span className="text-xs text-muted-foreground">{standing(shop.owed)}</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Outstanding</dt>
                  <dd className="font-medium">{money(shop.owed, currency)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd className="font-medium">{money(shop.paid, currency)}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>

        {hub && hub.shops.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No linked shops yet. Link local suppliers from your profile, or wait for a shop to connect.
          </p>
        ) : null}
      </div>
    </SupplierPortalShell>
  );
}
