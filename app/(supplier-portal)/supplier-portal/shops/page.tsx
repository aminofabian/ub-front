"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import {
  mktChip,
  mktPosAccentBar,
  mktPosHeader,
  spEyebrow,
  spMetric,
  spPage,
  spPanel,
  spSerifTitle,
} from "@/components/supplier-portal/supplier-portal-ui";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalHubShops,
  type SupplierPortalHubShops,
} from "@/lib/marketplace-api";
import { formatMoneyCompact, resolveCurrencyCode } from "@/lib/money";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";
import { cn } from "@/lib/utils";

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
      <div className={cn(spPage, "space-y-5")}>
        <header>
          <p className={spEyebrow}>portal · overview → shops</p>
          <h2 className={cn(spSerifTitle, "mt-1")}>Shops</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Every business you are connected to.
          </p>
        </header>

        {error ? (
          <p className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}

        {hub ? (
          <div className={cn(spPanel)}>
            <div className={mktPosHeader}>
              <span>1 · Summary</span>
              <span>{hub.shopCount}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <span className={mktChip}>{hub.shopCount} shops</span>
              <span className={mktChip}>
                Outstanding {money(hub.totals.owed, currency)}
              </span>
              <span className={mktChip}>Paid {money(hub.totals.paid, currency)}</span>
            </div>
          </div>
        ) : null}

        <section className={spPanel}>
          <div className={mktPosHeader}>
            <span>2 · Connected shops</span>
            <span>{hub?.shops.length ?? 0}</span>
          </div>
          <div className="grid gap-px bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_10%,transparent)] sm:grid-cols-2">
            {(hub?.shops ?? []).map((shop) => (
              <Link
                key={shop.localSupplierId}
                href={`${APP_ROUTES.supplierPortalShops}/${shop.localSupplierId}`}
                className={cn(spMetric, "block bg-[color-mix(in_srgb,var(--card)_96%,#f7f3eb)]")}
              >
                <span className={mktPosAccentBar} />
                <div className="flex items-start justify-between gap-3 pl-2">
                  <h3 className="font-medium text-[var(--pos-ink,#1c1915)]">{shop.shopName}</h3>
                  <span className={mktChip}>{standing(shop.owed)}</span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 pl-2 text-sm">
                  <div>
                    <dt className={spEyebrow}>Outstanding</dt>
                    <dd className="mt-1 font-semibold text-[var(--pos-primary,#0f766e)] tabular-nums">
                      {money(shop.owed, currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className={spEyebrow}>Paid</dt>
                    <dd className="mt-1 font-semibold text-[var(--pos-ink,#1c1915)] tabular-nums">
                      {money(shop.paid, currency)}
                    </dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>

          {hub && hub.shops.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">
              No linked shops yet. Sign out and back in to refresh links, or open{" "}
              <Link
                href={APP_ROUTES.supplierPortalProfile}
                className="font-medium text-[var(--pos-primary,#0f766e)] underline underline-offset-2"
              >
                Profile
              </Link>{" "}
              to link a shop by phone / name match.
            </p>
          ) : null}

          {!hub && !error ? (
            <p className="px-4 py-8 text-sm text-muted-foreground">Loading shops…</p>
          ) : null}
        </section>
      </div>
    </SupplierPortalShell>
  );
}
