"use client";

import type { ReactNode } from "react";
import {
  Building2,
  Clock,
  CreditCard,
  FileText,
  PencilLine,
  UserPlus,
} from "lucide-react";

import type { SupplierContactRecord, SupplierRecord } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { SupplierPurchaseHistorySection } from "./SupplierPurchaseHistorySection";
import { statusBadgeClass } from "./supplier-ui-tokens";

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
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-muted/10 p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-dashed border-primary/25 bg-primary/[0.05]">
          <Building2 className="size-7 text-primary/50" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            No supplier selected
          </p>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Choose a vendor from the directory, or use{" "}
            <span className="font-medium text-foreground">New supplier</span> to
            add one.
          </p>
        </div>
      </div>
    );
  }

  const primaryContact = contacts.find((c) => c.primaryContact);
  const hasPrimaryContact = Boolean(
    primaryContact?.name?.trim() ||
    primaryContact?.email?.trim() ||
    primaryContact?.phone?.trim(),
  );

  return (
    <div className="flex flex-col gap-4">
      {/* ── Hero card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card/90 to-muted/20 p-4 shadow-sm">
        {/* Status + type badges */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
              statusBadgeClass(detail.status),
            )}
          >
            {detail.status}
          </span>
          {detail.supplierType ? (
            <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/50 px-2.5 py-1 text-[11px] font-medium capitalize text-muted-foreground">
              {detail.supplierType}
            </span>
          ) : null}
          {detail.taxExempt ? (
            <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              Tax exempt
            </span>
          ) : null}
        </div>

        {/* Name + code */}
        <h3 className="text-xl font-bold tracking-tight text-foreground leading-tight">
          {detail.name}
        </h3>
        {detail.code?.trim() ? (
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {detail.code.trim()}
          </p>
        ) : null}

        {/* Primary contact inline */}
        {hasPrimaryContact && primaryContact ? (
          <div className="mt-3 rounded-xl border border-border/40 bg-background/60 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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

        {/* Action buttons */}
        {canWrite && onEditProfile && onAddContact ? (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-3">
            <Button
              type="button"
              size="sm"
              className="h-8 flex-1 gap-1.5 rounded-xl shadow-sm shadow-primary/15"
              onClick={onEditProfile}
            >
              <PencilLine className="size-3.5" aria-hidden />
              Edit profile
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-xl px-3"
              onClick={onAddContact}
            >
              <UserPlus className="size-3.5" aria-hidden />
              Add contact
            </Button>
          </div>
        ) : null}
      </div>

      {/* ── Commercial snapshot ── */}
      <SupplierCommercialSection s={detail} />

      <SupplierPurchaseHistorySection supplierId={detail.id} />

      {/* ── Notes ── */}
      {detail.notes?.trim() ? (
        <div className="rounded-2xl border border-border/60 bg-muted/10 p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <FileText className="size-3.5 text-muted-foreground" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {detail.notes.trim()}
          </p>
        </div>
      ) : null}

      {/* ── Contacts ── */}
      <div className="rounded-2xl border border-border/60 bg-muted/10 p-3">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <UserPlus className="size-3.5 text-muted-foreground" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Contacts
            </span>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {contacts.length}
          </span>
        </div>
        {contacts.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No contacts on file yet.
          </p>
        ) : (
          <div className="space-y-1.5">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="rounded-xl bg-background px-3 py-2.5 ring-1 ring-border/60"
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
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary ring-1 ring-primary/20">
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
      </div>
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
    <div className="rounded-2xl border border-border/60 bg-muted/10 p-3">
      <div className="mb-2.5 flex items-center gap-1.5">
        <CreditCard className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Commercial
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {financials.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl bg-background px-3 py-2.5 ring-1 ring-border/60"
          >
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <span className="mt-0.5 block text-sm font-medium text-foreground">
              {value}
            </span>
          </div>
        ))}
      </div>

      {paymentDetails ? (
        <div className="mt-2 rounded-xl bg-background px-3 py-2.5 ring-1 ring-border/60">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Payment &amp; remittance
          </span>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {paymentDetails}
          </p>
        </div>
      ) : null}

      <div className="mt-2 flex items-center gap-3 px-1">
        <Clock
          className="size-3 shrink-0 text-muted-foreground/60"
          aria-hidden
        />
        <span className="text-[10px] text-muted-foreground">
          Updated {formatShortDate(s.updatedAt)} · Created{" "}
          {formatShortDate(s.createdAt)}
        </span>
      </div>
    </div>
  );
}
