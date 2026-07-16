"use client";

import type { ReactNode } from "react";
import {
  Building2,
  Clock,
  CreditCard,
  Mail,
  Phone,
  PencilLine,
  Smartphone,
  UserPlus,
  Users,
} from "lucide-react";

import type {
  SupplierContactRecord,
  SupplierPurchaseHistoryOrderRecord,
  SupplierRecord,
} from "@/lib/api";
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
  variant = "default",
  selectedInvoiceId = null,
  onSelectInvoice,
  purchaseHistoryRefreshKey = 0,
}: {
  detail: SupplierRecord | null;
  contacts: SupplierContactRecord[];
  canWrite: boolean;
  onEditProfile?: () => void;
  onAddContact?: () => void;
  variant?: "default" | "sidebar";
  selectedInvoiceId?: string | null;
  onSelectInvoice?: (order: SupplierPurchaseHistoryOrderRecord) => void;
  purchaseHistoryRefreshKey?: number;
}) {
  const compact = variant === "sidebar";
  if (!detail) {
    return (
      <SupEmptyState
        icon={Building2}
        title="No supplier selected"
        description="Choose a vendor from the directory to view profile, contacts, and purchase history."
        className="min-h-48 border-0 bg-transparent"
      />
    );
  }

  const primaryContact = contacts.find((c) => c.primaryContact);
  const hasPrimaryContact = Boolean(
    primaryContact?.name?.trim() ||
    primaryContact?.email?.trim() ||
    primaryContact?.phone?.trim(),
  );
  const showPrimaryInTopCard = hasPrimaryContact && primaryContact && !compact;

  return (
    <div
      className={cn(
        compact ? "flex min-h-0 flex-1 flex-col" : "flex flex-col gap-3",
        !compact && supMotionIn,
        compact && "gap-0",
      )}
    >
      <div
        className={cn(
          compact ? "min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pb-1" : "contents",
        )}
      >
      <div
        className={cn(
          "rounded-xl border border-border/55 bg-card",
          compact ? "p-2" : "p-4",
        )}
      >
        <div className={compact ? "space-y-1.5" : undefined}>
          {compact ? (
            <div className="flex flex-wrap items-center gap-1">
              <span
                className={cn(
                  "inline-flex items-center rounded px-1.5 py-px text-xs font-semibold capitalize",
                  statusBadgeClass(detail.status),
                )}
              >
                {detail.status}
              </span>
              {detail.supplierType ? (
                <span className="inline-flex items-center rounded border border-border/50 bg-muted/40 px-1.5 py-px text-xs font-medium capitalize text-muted-foreground">
                  {detail.supplierType}
                </span>
              ) : null}
              {detail.taxExempt ? (
                <span className="inline-flex items-center rounded border border-primary/25 bg-primary/10 px-1.5 py-px text-xs font-semibold text-primary">
                  Tax exempt
                </span>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold capitalize",
                    statusBadgeClass(detail.status),
                  )}
                >
                  {detail.status}
                </span>
                {detail.supplierType ? (
                  <span className="inline-flex items-center rounded-md border border-border/50 bg-muted/40 px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                    {detail.supplierType}
                  </span>
                ) : null}
                {detail.taxExempt ? (
                  <span className="inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    Tax exempt
                  </span>
                ) : null}
              </div>

              <h3 className="font-heading text-base font-bold tracking-tight text-foreground">
                {detail.name}
              </h3>
              {detail.code?.trim() ? (
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {detail.code.trim()}
                </p>
              ) : null}
            </>
          )}

          {showPrimaryInTopCard && primaryContact ? (
            <div className={cn(supCardInset, "mt-3 px-2.5 py-2")}>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Primary contact
              </p>
              <div className={cn("flex flex-col text-muted-foreground", "mt-1 gap-0.5 text-xs")}>
                {primaryContact.name?.trim() ? (
                  <span className="font-semibold text-foreground">
                    {primaryContact.name.trim()}
                  </span>
                ) : null}
                {primaryContact.roleLabel?.trim() ? (
                  <span>{primaryContact.roleLabel.trim()}</span>
                ) : null}
                {primaryContact.email?.trim() ? (
                  <a
                    href={`mailto:${primaryContact.email.trim()}`}
                    className="truncate font-medium text-primary underline-offset-2 hover:underline"
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
            <div
              className={cn(
                "border-t border-border/40",
                compact
                  ? "mt-1.5 grid grid-cols-2 gap-1 pt-1.5"
                  : "mt-3 flex flex-col gap-1.5 pt-3",
              )}
            >
              <Button
                type="button"
                size="sm"
                className={cn(
                  "gap-1 font-semibold shadow-sm",
                  compact ? "h-8 rounded-md px-2 text-xs" : "h-8 w-full gap-1.5 rounded-lg text-sm",
                )}
                onClick={onEditProfile}
              >
                <PencilLine className={compact ? "size-3" : "size-3.5"} aria-hidden />
                {compact ? "Edit" : "Edit profile"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  compact ? "h-8 rounded-md px-2 text-xs" : "h-8 w-full gap-1.5 rounded-lg text-sm",
                )}
                onClick={onAddContact}
              >
                <UserPlus className={compact ? "size-3" : "size-3.5"} aria-hidden />
                {compact ? "Contact" : "Add contact"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {!compact ? <SupplierCommercialSection s={detail} compact={compact} /> : null}
      <SupplierPurchaseHistorySection
        key={purchaseHistoryRefreshKey}
        supplierId={detail.id}
        variant={variant}
        selectedInvoiceId={selectedInvoiceId}
        onSelectInvoice={onSelectInvoice}
        historyLimit={compact ? 100 : 40}
      />

      {compact ? (
        <SupplierSidebarPaymentSection detail={detail} />
      ) : null}

      {detail.notes?.trim() && compact ? (
        <section className="overflow-hidden rounded-xl border border-dashed border-border/45 bg-muted/15 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Notes
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-xs leading-snug text-foreground">
            {detail.notes.trim()}
          </p>
        </section>
      ) : null}
      </div>

      {compact ? (
        <SupplierSidebarContactsDock
          contacts={contacts}
          canWrite={canWrite}
          onAddContact={onAddContact}
        />
      ) : null}

      {detail.notes?.trim() && !compact ? (
        <SupSection compact={compact} title="Notes">
          <p
            className={cn(
              "whitespace-pre-wrap text-foreground",
              compact ? "text-sm leading-snug" : "text-base leading-relaxed",
            )}
          >
            {detail.notes.trim()}
          </p>
        </SupSection>
      ) : null}

      {!compact ? (
      <SupSection
        compact={compact}
        title="Contacts"
        action={
          <span className="rounded-md bg-muted/60 px-2 py-0.5 text-sm font-semibold tabular-nums text-muted-foreground ring-1 ring-border/50">
            {contacts.length}
          </span>
        }
        bodyClassName={compact ? undefined : "p-3"}
      >
        {contacts.length === 0 ? (
          <p className={cn("text-center text-xs text-muted-foreground", compact ? "py-3" : "py-6")}>
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
                    <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-primary ring-1 ring-primary/20">
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
      ) : null}
    </div>
  );
}

function contactInitials(name: string | null | undefined): string {
  const n = name?.trim();
  if (!n) return "?";
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return n.slice(0, 2).toUpperCase();
}

function formatCreditTerms(days: number | null | undefined): string | null {
  if (days == null || !Number.isFinite(days)) return null;
  if (days === 0) return "Due on receipt";
  return `Net ${days}`;
}

function SupplierSidebarContactsDock({
  contacts,
  canWrite,
  onAddContact,
}: {
  contacts: SupplierContactRecord[];
  canWrite: boolean;
  onAddContact?: () => void;
}) {
  const sorted = [...contacts].sort((a, b) => {
    if (a.primaryContact === b.primaryContact) return 0;
    return a.primaryContact ? -1 : 1;
  });

  return (
    <section
      className={cn(
        "-mx-2 -mb-2 shrink-0 border-t border-border/50 bg-card/95 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.08)]",
        "backdrop-blur-sm dark:shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.35)]",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-2 py-1">
        <div className="flex items-center gap-1.5">
          <Users className="size-3 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Contacts
          </h3>
        </div>
        {contacts.length > 0 ? (
          <span className="rounded bg-muted/50 px-1.5 py-px text-xs font-semibold tabular-nums text-muted-foreground ring-1 ring-border/50">
            {contacts.length}
          </span>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <div className="px-2.5 py-2.5 text-center">
          <p className="text-xs text-muted-foreground">No contacts on file.</p>
          {canWrite && onAddContact ? (
            <button
              type="button"
              className="mt-1 text-xs font-semibold text-primary underline-offset-2 hover:underline"
              onClick={onAddContact}
            >
              Add a contact
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="max-h-[min(9.5rem,28vh)] divide-y divide-border/35 overflow-y-auto overscroll-contain">
          {sorted.map((c) => {
            const phone = c.phone?.trim();
            const email = c.email?.trim();
            const name = c.name?.trim() || "Unnamed";
            return (
              <li
                key={c.id}
                className="flex items-start gap-2 px-2.5 py-1.5 transition-colors hover:bg-muted/20"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    c.primaryContact
                      ? "bg-primary/12 text-primary ring-1 ring-primary/20"
                      : "bg-muted/60 text-muted-foreground ring-1 ring-border/50",
                  )}
                  aria-hidden
                >
                  {contactInitials(c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {name}
                    </p>
                    {c.primaryContact ? (
                      <span className="shrink-0 text-[8px] font-bold uppercase tracking-wide text-primary">
                        Primary
                      </span>
                    ) : null}
                  </div>
                  {c.roleLabel?.trim() ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {c.roleLabel.trim()}
                    </p>
                  ) : null}
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {phone ? (
                      <a
                        href={`tel:${phone.replace(/\s+/g, "")}`}
                        className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/50 bg-background/80 px-1.5 py-px text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
                        title={`Call ${phone}`}
                      >
                        <Phone className="size-2.5 shrink-0 text-primary" aria-hidden />
                        <span className="truncate">{phone}</span>
                      </a>
                    ) : null}
                    {email ? (
                      <a
                        href={`mailto:${email}`}
                        className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/50 bg-background/80 px-1.5 py-px text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.04]"
                        title={`Email ${email}`}
                      >
                        <Mail className="size-2.5 shrink-0 text-primary" aria-hidden />
                        <span className="truncate">{email}</span>
                      </a>
                    ) : null}
                    {!phone && !email ? (
                      <span className="text-xs text-muted-foreground">
                        No phone or email
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SupplierSidebarPaymentSection({ detail }: { detail: SupplierRecord }) {
  const paymentDetails = detail.paymentDetails?.trim();
  const creditTerms = formatCreditTerms(detail.creditTermsDays);
  const preferredPay = detail.paymentMethodPreferred?.trim();
  const payoutPhone = detail.payoutPhone?.trim();
  const vatPin = detail.vatPin?.trim();
  const creditLimit =
    detail.creditLimit != null && Number.isFinite(detail.creditLimit)
      ? detail.creditLimit.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : null;

  const payChips = [
    creditTerms ? { label: creditTerms, tone: "default" as const } : null,
    preferredPay ? { label: preferredPay, tone: "primary" as const } : null,
    detail.rating != null
      ? { label: `${detail.rating}★`, tone: "muted" as const }
      : null,
    creditLimit ? { label: `Limit ${creditLimit}`, tone: "muted" as const } : null,
  ].filter(Boolean) as { label: string; tone: "default" | "primary" | "muted" }[];

  const hasPaymentBlock =
    payChips.length > 0 ||
    Boolean(paymentDetails) ||
    Boolean(payoutPhone) ||
    Boolean(vatPin);

  if (!hasPaymentBlock) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-border/55 bg-card/90 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
      <div className="flex items-center gap-1.5 border-b border-border/45 bg-gradient-to-r from-muted/30 to-transparent px-2.5 py-1.5">
        <CreditCard className="size-3 text-muted-foreground" aria-hidden />
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Payment
        </h3>
      </div>
      <div className="space-y-2 p-2.5">
        {payChips.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {payChips.map(({ label, tone }) => (
              <span
                key={label}
                className={cn(
                  "inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                  tone === "primary" &&
                    "bg-primary/10 text-primary ring-primary/20",
                  tone === "default" &&
                    "bg-muted/50 text-foreground ring-border/50",
                  tone === "muted" &&
                    "bg-background text-muted-foreground ring-border/45",
                )}
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}

        {vatPin ? (
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="shrink-0 font-semibold uppercase tracking-wide text-muted-foreground">
              VAT / tax ID
            </span>
            <span className="truncate font-mono font-medium text-foreground">
              {vatPin}
            </span>
          </div>
        ) : null}

        {payoutPhone ? (
          <a
            href={`tel:${payoutPhone.replace(/\s+/g, "")}`}
            className="flex items-center gap-2 rounded-md border border-border/45 bg-muted/20 px-2 py-1.5 transition-colors hover:border-primary/25 hover:bg-primary/[0.04]"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Smartphone className="size-3" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
                {detail.payoutType?.trim() || "Payout"}
              </span>
              <span className="block truncate font-mono text-xs font-semibold text-foreground">
                {payoutPhone}
              </span>
            </span>
          </a>
        ) : null}

        {paymentDetails ? (
          <div className={cn(supCardInset, "px-2 py-1.5")}>
            <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Remittance details
            </p>
            <p className="mt-0.5 whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
              {paymentDetails}
            </p>
          </div>
        ) : null}
      </div>
    </section>
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

function SupplierCommercialSection({
  s,
  compact,
}: {
  s: SupplierRecord;
  compact?: boolean;
}) {
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
  const hasFinancialData = financials.some(
    ({ value }) => value !== "—" && value != null && value !== "",
  );

  if (!hasFinancialData && !paymentDetails) {
    return null;
  }

  return (
    <SupSection compact={compact} title="Commercial" bodyClassName={compact ? "space-y-2" : undefined}>
      <div className="grid grid-cols-1 gap-1.5">
        {financials.map(({ label, value }) =>
          value === "—" ? null : (
            <div key={label} className={supStatTile}>
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
              <span className="mt-0.5 block text-sm font-medium text-foreground">
                {value}
              </span>
            </div>
          ),
        )}
      </div>

      {paymentDetails ? (
        <div className={cn(supStatTile, "mt-1.5")}>
          <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Payment &amp; remittance
          </span>
          <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {paymentDetails}
          </p>
        </div>
      ) : null}

      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="size-3 shrink-0 opacity-60" aria-hidden />
        <span>
          Updated {formatShortDate(s.updatedAt)} · Created{" "}
          {formatShortDate(s.createdAt)}
        </span>
      </div>
    </SupSection>
  );
}
