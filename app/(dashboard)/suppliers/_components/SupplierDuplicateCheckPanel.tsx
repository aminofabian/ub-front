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

import { SupFormSection } from "./supplier-layout-primitives";
import { supTableCell, supTableHead, supTableRow } from "./supplier-ui-tokens";

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

function confidenceBadgeClass(confidence: string): string {
  if (confidence === "strong") {
    return "border-amber-600/40 bg-amber-500/15 text-amber-900 dark:text-amber-200";
  }
  return "border-border bg-muted/40 text-muted-foreground";
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

  const marketplaceMatches = matches.filter((m) => m.marketplaceSupplierId);
  const strongMarketplace = marketplaceMatches.some((m) => m.confidence === "strong");

  return (
    <SupFormSection
      title="Duplicate check"
      hint={
        lookupReady
          ? "We compare what you typed against your suppliers and the platform directory."
          : "Enter a name, tax ID, phone, or email to check your directory and the marketplace before creating a private supplier."
      }
    >
      {lookupReady ? (
        <div className="border-t border-border">
          {loading ? (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">
              Checking for existing suppliers…
            </p>
          ) : null}

          {!loading && checked && matches.length === 0 ? (
            <p className="border-b border-border px-2.5 py-2 text-xs text-muted-foreground">
              No close matches found. You can create this as a new private supplier.
            </p>
          ) : null}

          {!loading && strongMarketplace && canViewMarketplace ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/25 bg-primary/5 px-2.5 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  This vendor may already be on the marketplace.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Connecting imports their catalogue and enables portal purchase orders.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="h-8 shrink-0 rounded-none px-3">
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

          {!loading && matches.length > 0 ? (
            <>
              <div className="flex items-center gap-2 border-b border-border bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-900 dark:text-amber-100">
                <AlertTriangle className="size-3.5 shrink-0" />
                {matches.length} possible match{matches.length === 1 ? "" : "es"}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] border-collapse text-left text-xs">
                  <thead>
                    <tr className={supTableHead}>
                      <th className={cn(supTableCell, "w-[34%]")}>Name</th>
                      <th className={cn(supTableCell, "w-[26%]")}>Source</th>
                      <th className={cn(supTableCell, "w-[22%]")}>Details</th>
                      <th className={cn(supTableCell, "w-[18%]")}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match, index) => (
                      <tr
                        key={`${match.source}-${match.localSupplierId ?? match.marketplaceSupplierId ?? index}`}
                        className={supTableRow}
                      >
                        <td className={supTableCell}>
                          <p className="font-medium text-foreground">
                            {match.name ?? "Unnamed supplier"}
                          </p>
                          <span
                            className={cn(
                              "mt-0.5 inline-block border px-1 py-px text-[10px] font-medium",
                              confidenceBadgeClass(match.confidence),
                            )}
                          >
                            {match.confidence === "strong" ? "Strong match" : "Similar name"}
                          </span>
                        </td>
                        <td className={cn(supTableCell, "text-muted-foreground")}>
                          {matchLabel(match)}
                        </td>
                        <td className={cn(supTableCell, "text-[11px] text-muted-foreground")}>
                          {match.phone ? <p>{match.phone}</p> : null}
                          {match.email ? <p>{match.email}</p> : null}
                          {match.taxId ? <p>Tax: {match.taxId}</p> : null}
                          {!match.phone && !match.email && !match.taxId ? "—" : null}
                        </td>
                        <td className={supTableCell}>
                          {match.marketplaceSupplierId ? (
                            <Link
                              href={`${APP_ROUTES.marketplace}?supplier=${encodeURIComponent(match.marketplaceSupplierId)}`}
                              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                            >
                              <Store className="size-3" />
                              View
                            </Link>
                          ) : match.localSupplierId ? (
                            <Link
                              href={`${APP_ROUTES.suppliers}?selected=${encodeURIComponent(match.localSupplierId)}`}
                              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                            >
                              <Link2 className="size-3" />
                              Open
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-border px-2.5 py-2 text-[11px] text-muted-foreground">
                Still a different business? Continue below to create a private supplier record.
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </SupFormSection>
  );
}
