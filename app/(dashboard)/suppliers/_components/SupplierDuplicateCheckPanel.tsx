"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Link2, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  checkSupplierDuplicates,
  type SupplierDuplicateMatch,
} from "@/lib/marketplace-api";
import { cn } from "@/lib/utils";

import { supCardInset, supKicker } from "./supplier-ui-tokens";

const DEBOUNCE_MS = 400;

type Props = {
  name: string;
  taxId?: string;
  phone?: string;
  email?: string;
  canViewMarketplace?: boolean;
};

function matchLabel(match: SupplierDuplicateMatch): string {
  if (match.source === "marketplace") return "Marketplace supplier";
  if (match.source === "own_business") return "Already in your directory";
  return "Possible platform match";
}

function confidenceClass(confidence: string): string {
  if (confidence === "strong") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200";
  }
  return "border-muted bg-muted/40 text-muted-foreground";
}

function hasLookupInput(name: string, taxId?: string, phone?: string, email?: string): boolean {
  return Boolean(
    name.trim() || taxId?.trim() || phone?.trim() || email?.trim(),
  );
}

export function SupplierDuplicateCheckPanel({
  name,
  taxId,
  phone,
  email,
  canViewMarketplace = false,
}: Props) {
  const [matches, setMatches] = useState<SupplierDuplicateMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const lookupReady = hasLookupInput(name, taxId, phone, email);

  useEffect(() => {
    if (!lookupReady) {
      setMatches([]);
      setChecked(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      void checkSupplierDuplicates({
        name: name.trim() || undefined,
        taxId: taxId?.trim() || undefined,
        phone: phone?.trim() || undefined,
        email: email?.trim() || undefined,
      })
        .then((result) => {
          setMatches(result.matches ?? []);
          setChecked(true);
        })
        .catch(() => {
          setMatches([]);
          setChecked(true);
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [name, taxId, phone, email, lookupReady]);

  if (!lookupReady) {
    return (
      <section className="space-y-3">
        <div>
          <p className={supKicker}>Duplicate check</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter a name, tax ID, phone, or email to check your directory and the
            marketplace before creating a private supplier.
          </p>
        </div>
      </section>
    );
  }

  const marketplaceMatches = matches.filter((m) => m.marketplaceSupplierId);
  const strongMarketplace = marketplaceMatches.some((m) => m.confidence === "strong");

  return (
    <section className="space-y-3">
      <div>
        <p className={supKicker}>Duplicate check</p>
        <p className="mt-1 text-xs text-muted-foreground">
          We compare what you typed against your suppliers and the platform directory.
        </p>
      </div>

      <div className={cn(supCardInset, "space-y-3 p-4")}>
        {loading ? (
          <p className="text-xs text-muted-foreground">Checking for existing suppliers…</p>
        ) : checked && matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No close matches found. You can create this as a new private supplier.
          </p>
        ) : null}

        {!loading && matches.length > 0 ? (
          <div className="space-y-2">
            {strongMarketplace && canViewMarketplace ? (
              <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
                <p className="font-medium">This vendor may already be on the marketplace.</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Connecting imports their catalogue and enables portal purchase orders.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-2 h-8 rounded-lg">
                  <Link
                    href={`${APP_ROUTES.marketplace}?supplier=${encodeURIComponent(
                      marketplaceMatches.find((m) => m.confidence === "strong")
                        ?.marketplaceSupplierId ??
                        marketplaceMatches[0]?.marketplaceSupplierId ??
                        "",
                    )}`}
                  >
                    <Store className="mr-1.5 size-3.5" />
                    Connect from marketplace
                  </Link>
                </Button>
              </div>
            ) : null}

            <div className="flex items-center gap-2 text-sm font-medium text-amber-900 dark:text-amber-100">
              <AlertTriangle className="size-4 shrink-0" />
              {matches.length} possible match{matches.length === 1 ? "" : "es"}
            </div>
            <ul className="space-y-2">
              {matches.map((match, index) => (
                <li
                  key={`${match.source}-${match.localSupplierId ?? match.marketplaceSupplierId ?? index}`}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm",
                    confidenceClass(match.confidence),
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{match.name ?? "Unnamed supplier"}</p>
                      <p className="text-xs opacity-80">
                        {matchLabel(match)}
                        {match.confidence === "strong" ? " · strong match" : " · similar name"}
                      </p>
                      <div className="mt-1 space-y-0.5 text-xs opacity-80">
                        {match.phone ? <p>Phone: {match.phone}</p> : null}
                        {match.email ? <p>Email: {match.email}</p> : null}
                        {match.taxId ? <p>Tax ID: {match.taxId}</p> : null}
                      </div>
                    </div>
                    {match.marketplaceSupplierId ? (
                      <Link
                        href={`${APP_ROUTES.marketplace}?supplier=${encodeURIComponent(match.marketplaceSupplierId)}`}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium underline underline-offset-2"
                      >
                        <Store className="size-3" />
                        View
                      </Link>
                    ) : match.localSupplierId ? (
                      <Link
                        href={`${APP_ROUTES.suppliers}?selected=${encodeURIComponent(match.localSupplierId)}`}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium underline underline-offset-2"
                      >
                        <Link2 className="size-3" />
                        Open
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Still a different business? Continue below to create a private supplier
              record.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
