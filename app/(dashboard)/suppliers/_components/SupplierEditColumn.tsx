"use client";

import type { ReactNode } from "react";
import { Building2, PencilLine, UserPlus } from "lucide-react";

import type {
  SupplierContactRecord,
  SupplierPurchaseHistoryOrderRecord,
  SupplierRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import {
  SupEmptyState,
  SupFieldTable,
  SupSection,
} from "./supplier-layout-primitives";
import { SupplierPurchaseHistorySection } from "./SupplierPurchaseHistorySection";
import {
  statusBadgeClass,
  supKvLabel,
  supKvTable,
  supKvValue,
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
        compact ? "flex min-h-0 flex-1 flex-col gap-0" : "flex flex-col gap-2",
      )}
    >
      <div
        className={cn(
          compact
            ? "min-h-0 flex-1 space-y-0 overflow-y-auto overscroll-contain"
            : "contents",
        )}
      >
      {compact ? (
        <div className="space-y-0">
          <SupFieldTable
            rows={[
              { label: "Name", value: detail.name },
              {
                label: "Code",
                value: (
                  <span className="font-mono">
                    {detail.code?.trim() || "—"}
                  </span>
                ),
              },
              {
                label: "Status",
                value: (
                  <span
                    className={cn(
                      "inline-flex px-1 py-px text-[10px] font-semibold capitalize",
                      statusBadgeClass(detail.status),
                    )}
                  >
                    {detail.status}
                  </span>
                ),
              },
              {
                label: "Type",
                value: detail.supplierType?.trim() || "—",
              },
              {
                label: "Tax",
                value: detail.taxExempt ? "Exempt" : "Standard",
              },
            ]}
          />
          {canWrite && onEditProfile && onAddContact ? (
            <div className="grid grid-cols-2 border-x border-b border-border">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1 rounded-none border-r border-border text-xs font-semibold"
                onClick={onEditProfile}
              >
                <PencilLine className="size-3" aria-hidden />
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1 rounded-none text-xs font-semibold"
                onClick={onAddContact}
              >
                <UserPlus className="size-3" aria-hidden />
                Contact
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="border border-border">
          <table className={supKvTable}>
            <tbody>
              <tr>
                <th scope="row" className={supKvLabel}>
                  Name
                </th>
                <td className={cn(supKvValue, "font-semibold")}>{detail.name}</td>
              </tr>
              <tr>
                <th scope="row" className={supKvLabel}>
                  Code
                </th>
                <td className={cn(supKvValue, "font-mono")}>
                  {detail.code?.trim() || "—"}
                </td>
              </tr>
              <tr>
                <th scope="row" className={supKvLabel}>
                  Status
                </th>
                <td className={supKvValue}>
                  <span
                    className={cn(
                      "inline-flex px-1 py-px text-[10px] font-semibold capitalize",
                      statusBadgeClass(detail.status),
                    )}
                  >
                    {detail.status}
                  </span>
                  {detail.supplierType ? (
                    <span className="ml-2 text-muted-foreground capitalize">
                      {detail.supplierType}
                    </span>
                  ) : null}
                  {detail.taxExempt ? (
                    <span className="ml-2 text-[10px] font-semibold text-primary">
                      Tax exempt
                    </span>
                  ) : null}
                </td>
              </tr>
              {showPrimaryInTopCard && primaryContact ? (
                <>
                  <tr>
                    <th scope="row" className={supKvLabel}>
                      Contact
                    </th>
                    <td className={supKvValue}>
                      {primaryContact.name?.trim() || "—"}
                      {primaryContact.roleLabel?.trim()
                        ? ` · ${primaryContact.roleLabel.trim()}`
                        : ""}
                    </td>
                  </tr>
                  {primaryContact.email?.trim() ? (
                    <tr>
                      <th scope="row" className={supKvLabel}>
                        Email
                      </th>
                      <td className={supKvValue}>
                        <a
                          href={`mailto:${primaryContact.email.trim()}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {primaryContact.email.trim()}
                        </a>
                      </td>
                    </tr>
                  ) : null}
                  {primaryContact.phone?.trim() ? (
                    <tr>
                      <th scope="row" className={supKvLabel}>
                        Phone
                      </th>
                      <td className={supKvValue}>
                        <a
                          href={`tel:${primaryContact.phone.trim().replace(/\s+/g, "")}`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {primaryContact.phone.trim()}
                        </a>
                      </td>
                    </tr>
                  ) : null}
                </>
              ) : null}
            </tbody>
          </table>
          {canWrite && onEditProfile && onAddContact ? (
            <div className="grid grid-cols-2 border-t border-border">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 rounded-none border-r border-border text-sm font-semibold"
                onClick={onEditProfile}
              >
                <PencilLine className="size-3.5" aria-hidden />
                Edit profile
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 rounded-none text-sm font-semibold"
                onClick={onAddContact}
              >
                <UserPlus className="size-3.5" aria-hidden />
                Add contact
              </Button>
            </div>
          ) : null}
        </div>
      )}

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
        <SupFieldTable
          rows={[
            {
              label: "Notes",
              value: (
                <span className="whitespace-pre-wrap">
                  {detail.notes.trim()}
                </span>
              ),
            },
          ]}
        />
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
        <SupSection compact={compact} title="Notes" bodyClassName="p-0">
          <SupFieldTable
            rows={[
              {
                label: "Notes",
                value: (
                  <span className="whitespace-pre-wrap">
                    {detail.notes.trim()}
                  </span>
                ),
              },
            ]}
          />
        </SupSection>
      ) : null}

      {!compact ? (
      <SupSection
        compact={compact}
        title="Contacts"
        action={
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {contacts.length}
          </span>
        }
        bodyClassName="p-0"
      >
        {contacts.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
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
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-[#dce6f0] dark:bg-muted/50">
              <tr>
                <th className="border border-border px-2 py-1 font-semibold">Name</th>
                <th className="border border-border px-2 py-1 font-semibold">Role</th>
                <th className="border border-border px-2 py-1 font-semibold">Phone</th>
                <th className="border border-border px-2 py-1 font-semibold">Email</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-[#e8f0fe] dark:hover:bg-muted/30">
                  <td className="border border-border/70 px-2 py-1 font-medium">
                    {c.name?.trim() || "Unnamed"}
                    {c.primaryContact ? (
                      <span className="ml-1 text-[10px] font-bold text-primary">*</span>
                    ) : null}
                  </td>
                  <td className="border border-border/70 px-2 py-1 text-muted-foreground">
                    {c.roleLabel?.trim() || "—"}
                  </td>
                  <td className="border border-border/70 px-2 py-1">
                    {c.phone?.trim() ? (
                      <a
                        href={`tel:${c.phone.trim().replace(/\s+/g, "")}`}
                        className="text-primary hover:underline"
                      >
                        {c.phone.trim()}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border border-border/70 px-2 py-1">
                    {c.email?.trim() ? (
                      <a
                        href={`mailto:${c.email.trim()}`}
                        className="text-primary hover:underline"
                      >
                        {c.email.trim()}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SupSection>
      ) : null}
    </div>
  );
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
    <section className="shrink-0 border-t border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-[#e8eef5] px-2 py-1 dark:bg-muted/40">
        <h3 className="text-[11px] font-semibold tracking-tight text-foreground">
          Contacts
        </h3>
        <div className="flex items-center gap-1.5">
          {contacts.length > 0 ? (
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {contacts.length}
            </span>
          ) : null}
          {canWrite && onAddContact ? (
            <button
              type="button"
              className="text-[10px] font-semibold text-primary underline-offset-2 hover:underline"
              onClick={onAddContact}
            >
              + Add
            </button>
          ) : null}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="px-2 py-2 text-center text-[11px] text-muted-foreground">
          No contacts on file.
        </p>
      ) : (
        <div className="max-h-[min(9rem,26vh)] overflow-y-auto overscroll-contain">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead className="sticky top-0 bg-[#dce6f0] dark:bg-muted/50">
              <tr>
                <th className="border border-border px-1.5 py-0.5 font-semibold">
                  Name
                </th>
                <th className="border border-border px-1.5 py-0.5 font-semibold">
                  Phone
                </th>
                <th className="border border-border px-1.5 py-0.5 font-semibold">
                  Email
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const phone = c.phone?.trim();
                const email = c.email?.trim();
                const name = c.name?.trim() || "Unnamed";
                return (
                  <tr key={c.id} className="hover:bg-[#e8f0fe] dark:hover:bg-muted/30">
                    <td className="max-w-0 border border-border/70 px-1.5 py-0.5">
                      <span className="block truncate font-medium">
                        {name}
                        {c.primaryContact ? (
                          <span className="ml-1 text-[9px] font-bold text-primary">
                            *
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="max-w-0 border border-border/70 px-1.5 py-0.5">
                      {phone ? (
                        <a
                          href={`tel:${phone.replace(/\s+/g, "")}`}
                          className="block truncate text-primary hover:underline"
                        >
                          {phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="max-w-0 border border-border/70 px-1.5 py-0.5">
                      {email ? (
                        <a
                          href={`mailto:${email}`}
                          className="block truncate text-primary hover:underline"
                        >
                          {email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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

  const rows: { label: string; value: ReactNode }[] = [
    creditTerms ? { label: "Terms", value: creditTerms } : null,
    preferredPay ? { label: "Method", value: preferredPay } : null,
    creditLimit ? { label: "Limit", value: creditLimit } : null,
    detail.rating != null
      ? { label: "Rating", value: String(detail.rating) }
      : null,
    vatPin
      ? {
          label: "VAT / tax ID",
          value: <span className="font-mono">{vatPin}</span>,
        }
      : null,
    payoutPhone
      ? {
          label: detail.payoutType?.trim() || "Payout",
          value: (
            <a
              href={`tel:${payoutPhone.replace(/\s+/g, "")}`}
              className="font-mono text-primary hover:underline"
            >
              {payoutPhone}
            </a>
          ),
        }
      : null,
    paymentDetails
      ? {
          label: "Remittance",
          value: (
            <span className="whitespace-pre-wrap font-mono text-[11px]">
              {paymentDetails}
            </span>
          ),
        }
      : null,
  ].filter(Boolean) as { label: string; value: ReactNode }[];

  if (rows.length === 0) return null;

  return (
    <section>
      <div className="border border-b-0 border-border bg-[#e8eef5] px-2 py-1 dark:bg-muted/40">
        <h3 className="text-[11px] font-semibold tracking-tight text-foreground">
          Payment
        </h3>
      </div>
      <SupFieldTable rows={rows} />
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

  const rows = [
    ...financials.filter(({ value }) => value !== "—" && value != null && value !== ""),
    ...(paymentDetails
      ? [
          {
            label: "Payment & remittance",
            value: (
              <span className="whitespace-pre-wrap">{paymentDetails}</span>
            ),
          },
        ]
      : []),
    {
      label: "Updated",
      value: formatShortDate(s.updatedAt),
    },
    {
      label: "Created",
      value: formatShortDate(s.createdAt),
    },
  ];

  return (
    <SupSection compact={compact} title="Commercial" bodyClassName="p-0">
      <SupFieldTable rows={rows} />
    </SupSection>
  );
}
