"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Link2, Loader2, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  checkSupplierDuplicates,
  type SupplierDuplicateMatch,
} from "@/lib/marketplace-api";
import { cn } from "@/lib/utils";

import { plural } from "./supplier-attach";
import { SupFormSection } from "./supplier-layout-primitives";
import { supInput } from "./supplier-ui-tokens";

const DEBOUNCE_MS = 400;
/** Suggestions shown before "Show more"; strongest matches come first. */
const VISIBLE_MATCHES = 4;

type Props = {
  name: string;
  taxId?: string;
  phone?: string;
  email?: string;
  supplierNumber?: string;
  onSupplierNumberChange?: (value: string) => void;
  canViewMarketplace?: boolean;
  canConnectMarketplace?: boolean;
  /** The user picked a supplier that already exists; the parent shows the product step. */
  onChooseSupplier?: (match: SupplierDuplicateMatch) => void;
  /** Close the drawer and show a supplier the shop already has. */
  onOpenSupplier?: (localSupplierId: string) => void;
  onIdentityConflictChange?: (match: SupplierDuplicateMatch | null) => void;
};

function sourceLabel(match: SupplierDuplicateMatch): string {
  if (match.source === "marketplace") return "Global supplier";
  if (match.source === "own_business") return "Already in your directory";
  if (match.source === "platform") return "Used by another shop";
  return "Possible platform match";
}

const REASON_LABELS: Record<string, string> = {
  phone_last9: "Same phone",
  phone: "Same phone",
  email: "Same email",
  name: "Similar name",
  tax_id: "Same tax ID",
  supplier_number: "Same S-number",
};

function reasonLabels(match: SupplierDuplicateMatch): string[] {
  const out: string[] = [];
  for (const reason of match.matchReasons ?? []) {
    const label = REASON_LABELS[reason];
    if (label && out.indexOf(label) === -1) out.push(label);
  }
  if (out.length === 0) {
    out.push(match.confidence === "strong" ? "Strong match" : "Similar name");
  }
  return out;
}

function isIdentityConflict(match: SupplierDuplicateMatch): boolean {
  if (match.source !== "own_business" || match.confidence !== "strong") {
    return false;
  }
  const reasons = match.matchReasons ?? [];
  return (
    reasons.includes("phone_last9") ||
    reasons.includes("phone") ||
    reasons.includes("email")
  );
}

function identityConflictMessage(match: SupplierDuplicateMatch): string {
  const reasons = match.matchReasons ?? [];
  const name = match.name ?? "that supplier";
  if (
    reasons.includes("email") &&
    (reasons.includes("phone_last9") || reasons.includes("phone"))
  ) {
    return `Phone and email already belong to “${name}”. Open them instead of creating a duplicate.`;
  }
  if (reasons.includes("email")) {
    return `Email already belongs to “${name}”. Open them instead of creating a duplicate.`;
  }
  return `Same phone (last 9 digits) already on “${name}”. +254… and 07… count as the same number.`;
}

/** Already-yours conflicts first, then strong matches, then the rest. */
function matchRank(match: SupplierDuplicateMatch): number {
  if (isIdentityConflict(match)) return 0;
  return match.confidence === "strong" ? 1 : 2;
}

function hasLookupInput(
  name: string,
  taxId?: string,
  phone?: string,
  email?: string,
  supplierNumber?: string,
): boolean {
  return Boolean(
    name.trim() ||
      taxId?.trim() ||
      phone?.trim() ||
      email?.trim() ||
      supplierNumber?.trim(),
  );
}

function openExistingClass() {
  return "inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline";
}

export function SupplierDuplicateCheckPanel({
  name,
  taxId,
  phone,
  email,
  supplierNumber = "",
  onSupplierNumberChange,
  canViewMarketplace = false,
  canConnectMarketplace = false,
  onChooseSupplier,
  onOpenSupplier,
  onIdentityConflictChange,
}: Props) {
  const [matches, setMatches] = useState<SupplierDuplicateMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const lookupReady = hasLookupInput(name, taxId, phone, email, supplierNumber);
  const identityConflicts = matches.filter(isIdentityConflict);
  const blocked = identityConflicts.length > 0;
  const primaryConflict = identityConflicts[0] ?? null;
  const conflictKey = primaryConflict
    ? `${primaryConflict.localSupplierId ?? ""}:${(primaryConflict.matchReasons ?? []).join(",")}`
    : "";

  useEffect(() => {
    onIdentityConflictChange?.(blocked ? primaryConflict : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- notify on identity key changes only
  }, [blocked, conflictKey, onIdentityConflictChange]);

  useEffect(() => {
    if (!lookupReady) {
      setMatches([]);
      setChecked(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void checkSupplierDuplicates({
        name: name.trim() || undefined,
        taxId: taxId?.trim() || undefined,
        phone: phone?.trim() || undefined,
        email: email?.trim() || undefined,
        supplierNumber: supplierNumber.trim() || undefined,
      })
        .then((result) => {
          if (cancelled) return;
          setMatches(result.matches ?? []);
          setFailed(false);
          setChecked(true);
          setExpanded(false);
        })
        .catch(() => {
          if (cancelled) return;
          setMatches([]);
          setFailed(true);
          setChecked(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, taxId, phone, email, supplierNumber, lookupReady]);

  const sorted = [...matches].sort((a, b) => matchRank(a) - matchRank(b));
  const listed = expanded ? sorted : sorted.slice(0, VISIBLE_MATCHES);
  const hiddenCount = sorted.length - listed.length;
  const likelyGlobal = sorted.some(
    (m) => m.marketplaceSupplierId && m.confidence === "strong",
  );

  function renderAction(match: SupplierDuplicateMatch) {
    if (match.source === "own_business" && match.localSupplierId) {
      const id = match.localSupplierId;
      return onOpenSupplier ? (
        <button
          type="button"
          className={openExistingClass()}
          onClick={() => onOpenSupplier(id)}
        >
          <Link2 className="size-3" aria-hidden />
          Open
        </button>
      ) : (
        <Link
          href={`${APP_ROUTES.suppliers}?selected=${encodeURIComponent(id)}`}
          className={openExistingClass()}
        >
          <Link2 className="size-3" aria-hidden />
          Open
        </Link>
      );
    }
    const addable =
      Boolean(match.marketplaceSupplierId) ||
      (match.source === "platform" && Boolean(match.localSupplierId));
    if (addable && canConnectMarketplace && onChooseSupplier) {
      return (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-full rounded-xl px-3 sm:w-auto"
          aria-label={`Add ${match.name ?? "this supplier"}`}
          onClick={() => onChooseSupplier(match)}
        >
          <Store className="mr-1 size-3.5" aria-hidden />
          Add supplier
        </Button>
      );
    }
    if (match.marketplaceSupplierId && canViewMarketplace) {
      return (
        <Link href={APP_ROUTES.findSuppliers} className={openExistingClass()}>
          <Store className="size-3" aria-hidden />
          View
        </Link>
      );
    }
    return null;
  }

  return (
    <SupFormSection
      title="Already on Kiosk?"
      hint={
        lookupReady
          ? "Phones match on the last 9 digits (+254… = 07…). Emails match exactly."
          : "Type a name, phone, email, tax ID or S-number and matching suppliers show up here."
      }
    >
      <div className="border-t border-border px-2.5 py-2">
        <label
          htmlFor="supplier-lookup-number"
          className="mb-1 block text-[11px] font-medium text-muted-foreground"
        >
          Global supplier number
        </label>
        <input
          id="supplier-lookup-number"
          className={supInput}
          value={supplierNumber}
          onChange={(e) => onSupplierNumberChange?.(e.target.value)}
          placeholder="S-0001"
          maxLength={16}
        />
      </div>

      {lookupReady ? (
        <div className="border-t border-border" aria-live="polite">
          {loading ? (
            <p className="flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Looking for matches…
            </p>
          ) : null}

          {!loading && failed ? (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">
              Could not check for existing suppliers just now. You can still
              create this one.
            </p>
          ) : null}

          {!loading && checked && !failed && matches.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">
              No match yet. Creating this supplier also registers it on Kiosk
              with a new S-number.
            </p>
          ) : null}

          {!loading && blocked && primaryConflict ? (
            <div className="border-b border-destructive/30 bg-destructive/5 px-2.5 py-2">
              <p className="text-sm font-medium text-destructive">
                {identityConflictMessage(primaryConflict)}
              </p>
              {primaryConflict.localSupplierId ? (
                <p className="mt-1">
                  {onOpenSupplier ? (
                    <button
                      type="button"
                      className={openExistingClass()}
                      onClick={() =>
                        onOpenSupplier(primaryConflict.localSupplierId ?? "")
                      }
                    >
                      <Link2 className="size-3" aria-hidden />
                      Open {primaryConflict.name ?? "existing supplier"}
                    </button>
                  ) : (
                    <Link
                      href={`${APP_ROUTES.suppliers}?selected=${encodeURIComponent(primaryConflict.localSupplierId)}`}
                      className={openExistingClass()}
                    >
                      <Link2 className="size-3" aria-hidden />
                      Open {primaryConflict.name ?? "existing supplier"}
                    </Link>
                  )}
                </p>
              ) : null}
            </div>
          ) : null}

          {!loading && sorted.length > 0 ? (
            <>
              <p className="border-b border-border px-2.5 py-1.5 text-xs font-medium text-foreground">
                {sorted.length} {plural(sorted.length, "supplier")} already on
                Kiosk
                {!blocked && likelyGlobal && canConnectMarketplace
                  ? ". Add one instead of creating a duplicate, and choose which products come with it."
                  : "."}
              </p>
              <ul>
                {listed.map((match, index) => {
                  const conflict = isIdentityConflict(match);
                  const details = [
                    sourceLabel(match),
                    match.phone,
                    match.email,
                    match.taxId ? `Tax ID ${match.taxId}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li
                      key={`${match.source}-${match.localSupplierId ?? match.marketplaceSupplierId ?? index}`}
                      className={cn(
                        "flex flex-col gap-2 border-b border-border px-2.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3",
                        conflict && "bg-destructive/5",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <p className="text-sm font-medium text-foreground">
                            {match.name ?? "Unnamed supplier"}
                          </p>
                          {match.supplierNumber ? (
                            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                              {match.supplierNumber}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {details}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {conflict ? (
                            <span className="border border-destructive/40 bg-destructive/10 px-1.5 py-px text-[10px] font-medium text-destructive">
                              Already yours
                            </span>
                          ) : null}
                          {reasonLabels(match).map((label) => (
                            <span
                              key={label}
                              className={cn(
                                "border px-1.5 py-px text-[10px] font-medium",
                                match.confidence === "strong"
                                  ? "border-primary/30 bg-primary/5 text-primary"
                                  : "border-border text-muted-foreground",
                              )}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0">{renderAction(match)}</div>
                    </li>
                  );
                })}
              </ul>
              {hiddenCount > 0 ? (
                <button
                  type="button"
                  className="w-full border-b border-border px-2.5 py-2 text-xs font-medium text-primary hover:bg-muted/40"
                  onClick={() => setExpanded(true)}
                >
                  Show {hiddenCount} more
                </button>
              ) : null}
              <p className="px-2.5 py-2 text-[11px] text-muted-foreground">
                {blocked
                  ? "Creating is blocked while this phone or email is already on a supplier in your shop."
                  : "None of these? Carry on below and create a new supplier. It gets its own S-number."}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </SupFormSection>
  );
}
