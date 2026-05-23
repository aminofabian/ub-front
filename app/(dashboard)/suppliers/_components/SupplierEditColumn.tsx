"use client";

import type { ReactNode } from "react";
import { Building2, Clock, PencilLine, UserPlus } from "lucide-react";

import type { SupplierContactRecord, SupplierRecord } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { SupEmptyState, SupSection } from "./supplier-layout-primitives";
import { SupplierPurchaseHistorySection } from "./SupplierPurchaseHistorySection";
import {
  statusBadgeClass,
  supCardInset,
  supMotionIn,
  supStatTile,
} from "./supplier-ui-tokens";

export function SupplierEditColumn({
  detail,
  contacts,
  canWrite,
  onEditProfile,
  onAddContact,
}: {
  detail: SupplierRecord | null;
  contacts: SupplierContactRecord[];
  canWrite: boolean;
  onEditProfile?: () => void;
  onAddContact?: () => void;
}) {
  if (!detail) {
    return (
      <SupEmptyState
        icon={Building2}
        title="No supplier selected"
        description={
          <>
            Pick a vendor from the directory on the left, or use{" "}
            <span className="font-medium text-foreground">New supplier</span> to
            add one.
          </>
        }
        className="min-h-56"
      />
    );
  }

  const primaryContact = contacts.find((c) => c.primaryContact);
  const hasPrimaryContact = Boolean(
    primaryContact?.name?.trim() ||
    primaryContact?.email?.trim() ||
    primaryContact?.phone?.trim(),
  );

  return (
    <div className={cn("flex flex-col gap-4", supMotionIn)}>
      <div className="relative overflow-hidden rounded-xl border border-border/55 bg-gradient-to-br from-card via-card to-muted/25 p-4 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04] sm:p-5">
        <div
          className="pointer-events-none absolute -right-6 -top-8 size-28 rounded-full bg-primary/[0.06] blur-2xl"
          aria-hidden
        />
        <div className="relative">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize",
                statusBadgeClass(detail.status),
              )}
            >
              {detail.status}
            </span>
            {detail.supplierType ? (
              <span className="inline-flex items-center rounded-md border border-border/50 bg-muted/40 px-2.5 py-1 text-[11px] font-medium capitalize text-muted-foreground">
                {detail.supplierType}
              </span>
            ) : null}
            {detail.taxExempt ? (
              <span className="inline-flex items-center rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                Tax exempt
              </span>
            ) : null}
          </div>

          <h3 className="font-heading text-xl font-bold tracking-tight text-foreground">
            {detail.name}
          </h3>
          {detail.code?.trim() ? (
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {detail.code.trim()}
            </p>
          ) : null}

          {hasPrimaryContact && primaryContact ? (
            <div className={cn(supCardInset, "mt-4 px-3 py-2.5")}>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Primary contact
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                {primaryContact.name?.trim() ? (
                  <span className="font-semibold text-foreground">
                    {primaryContact.name.trim()}
                  </span>
                ) : null}
                {primaryContact.roleLabel?.trim() ? (
                  <span className="text-muted-foreground">
                    {primaryContact.roleLabel.trim()}
                  </span>
                ) : null}
                {primaryContact.email?.trim() ? (
                  <a
                    href={`mailto:${primaryContact.email.trim()}`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {primaryContact.email.trim()}
                  </a>
                ) : null}
                {primaryContact.phone?.trim() ? (
                  <a
                    href={`tel:${primaryContact.phone.trim().replace(/\s+/g, "")}`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {primaryContact.phone.trim()}
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          {canWrite && onEditProfile && onAddContact ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border/40 pt-4">
              <Button
                type="button"
                size="sm"
                className="h-9 flex-1 gap-1.5 rounded-lg font-semibold shadow-sm"
                onClick={onEditProfile}
              >
                <PencilLine className="size-3.5" aria-hidden />
                Edit profile
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg px-3"
                onClick={onAddContact}
              >
                <UserPlus className="size-3.5" aria-hidden />
                Add contact
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <SupplierCommercialSection s={detail} />
      <SupplierPurchaseHistorySection supplierId={detail.id} />

      {detail.notes?.trim() ? (
        <SupSection title="Notes" hint="Internal notes for your team.">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {detail.notes.trim()}
          </p>
        </SupSection>
      ) : null}

      <SupSection
        title="Contacts"
        hint="People you reach for orders, invoices, and delivery."
        action={
          <span className="rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground ring-1 ring-border/50">
            {contacts.length}
          </span>
        }
        bodyClassName="p-3 sm:p-4"
      >
        {contacts.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No contacts on file yet.
            {canWrite && onAddContact ? (
              <>
                {" "}
                <button
                  type="button"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                  onClick={onAddContact}
                >
                  Add one
                </button>
              </>
            ) : null}
          </p>
        ) : (
          <div className="space-y-2">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-border/45 bg-background/90 px-3 py-2.5 shadow-sm transition-colors hover:border-border/65"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.name?.trim() || "Unnamed"}
                    </p>
                    {c.roleLabel?.trim() ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {c.roleLabel.trim()}
                      </p>
                    ) : null}
                  </div>
                  {c.primaryContact ? (
                    <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary ring-1 ring-primary/20">
                      Primary
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {c.email?.trim() ? (
                    <a
                      href={`mailto:${c.email.trim()}`}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {c.email.trim()}
                    </a>
                  ) : null}
                  {c.phone?.trim() ? (
                    <a
                      href={`tel:${c.phone.trim().replace(/\s+/g, "")}`}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {c.phone.trim()}
                    </a>
                  ) : null}
                  {!c.email?.trim() && !c.phone?.trim() ? (
                    <span className="text-muted-foreground">
                      No contact details
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </SupSection>
    </div>
  );
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function SupplierCommercialSection({ s }: { s: SupplierRecord }) {
  const financials: { label: string; value: ReactNode }[] = [
    { label: "VAT / tax ID", value: s.vatPin?.trim() || "—" },
    {
      label: "Credit terms",
      value: s.creditTermsDays != null ? `${s.creditTermsDays} days` : "—",
    },
    {
      label: "Credit limit",
      value:
        s.creditLimit != null && Number.isFinite(s.creditLimit)
          ? String(s.creditLimit)
          : "—",
    },
    {
      label: "Preferred payment",
      value: s.paymentMethodPreferred?.trim() || "—",
    },
    { label: "Rating", value: s.rating != null ? String(s.rating) : "—" },
  ];

  const paymentDetails = s.paymentDetails?.trim();

  return (
    <SupSection
      title="Commercial"
      hint="Terms, limits, and how you pay this vendor."
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {financials.map(({ label, value }) => (
          <div key={label} className={supStatTile}>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <span className="mt-1 block text-sm font-medium text-foreground">
              {value}
            </span>
          </div>
        ))}
      </div>

      {paymentDetails ? (
        <div className={cn(supStatTile, "mt-2 sm:col-span-3")}>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Payment &amp; remittance
          </span>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {paymentDetails}
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
        <Clock className="size-3 shrink-0 opacity-60" aria-hidden />
        <span>
          Updated {formatShortDate(s.updatedAt)} · Created{" "}
          {formatShortDate(s.createdAt)}
        </span>
      </div>
    </SupSection>
  );
}
