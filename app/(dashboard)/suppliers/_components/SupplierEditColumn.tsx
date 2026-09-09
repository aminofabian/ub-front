"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Building2, ChevronDown, Pencil, PencilLine, Send, Trash2, UserPlus, Wallet } from "lucide-react";
import { toast } from "sonner";

import type {
  SupplierContactRecord,
  SupplierPurchaseHistoryOrderRecord,
  SupplierRecord,
} from "@/lib/api";
import { inviteSupplierToPortal } from "@/lib/api";
import { SupplierDisplayName } from "@/components/suppliers/supplier-display-name";
import { isSystemUnassignedSupplier } from "@/lib/supplier-display";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TelLink } from "@/components/tel-link";
import {
  formatSupplyMoney,
  supplyN,
} from "../../supplies/_components/supplies-shared";

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
  supTableHead,
  supTableRow,
} from "./supplier-ui-tokens";

export function SupplierEditColumn({
  detail,
  contacts,
  canWrite,
  canDeposit = false,
  currency = "KES",
  onEditProfile,
  onAddContact,
  onEditContact,
  onDeleteContact,
  deletingContactId = null,
  onDeposit,
  onSavePayout,
  variant = "default",
  selectedInvoiceId = null,
  onSelectInvoice,
  purchaseHistoryRefreshKey = 0,
}: {
  detail: SupplierRecord | null;
  contacts: SupplierContactRecord[];
  canWrite: boolean;
  canDeposit?: boolean;
  currency?: string;
  onEditProfile?: () => void;
  onAddContact?: () => void;
  onEditContact?: (contact: SupplierContactRecord) => void;
  onDeleteContact?: (contact: SupplierContactRecord) => void;
  deletingContactId?: string | null;
  onDeposit?: () => void;
  /** Persist KopoKopo payout settings from the supplier sidebar. */
  onSavePayout?: (input: {
    payoutType: "manual" | "mobile_wallet" | "till" | "paybill";
    payoutPhone: string | null;
    payoutTillNumber: string | null;
    payoutPaybillNumber: string | null;
    payoutPaybillAccount: string | null;
  }) => Promise<void>;
  variant?: "default" | "sidebar";
  selectedInvoiceId?: string | null;
  onSelectInvoice?: (order: SupplierPurchaseHistoryOrderRecord) => void;
  purchaseHistoryRefreshKey?: number;
}) {
  const compact = variant === "sidebar";
  const [inviteBusy, setInviteBusy] = useState(false);
  const walletCredit = detail ? supplyN(detail.prepaymentBalance) : 0;

  const onInvite = async () => {
    if (!detail) return;
    setInviteBusy(true);
    try {
      const res = await inviteSupplierToPortal(detail.id, { sendSms: true });
      toast.success(
        res.smsSent
          ? `Invite SMS sent. Code ${res.claimCode}`
          : `Invite created. Code ${res.claimCode}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send portal invite");
    } finally {
      setInviteBusy(false);
    }
  };

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
  const isPlaceholderSupplier = isSystemUnassignedSupplier({
    code: detail.code,
    name: detail.name,
  });
  const hasPrimaryContact = Boolean(
    primaryContact?.name?.trim() ||
    primaryContact?.email?.trim() ||
    primaryContact?.phone?.trim(),
  );
  const showPrimaryInTopCard = hasPrimaryContact && primaryContact && !compact;

  return (
    <div
      className={cn(
        compact ? "flex min-h-0 flex-1 flex-col gap-0 bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_28%,white)]" : "flex flex-col gap-2",
      )}
    >
      {compact ? (
        <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white">
          <div className="px-3 py-3">
            <h2 className="text-balance text-[15px] font-semibold leading-snug tracking-tight text-[var(--order-ink,#15231f)]">
              <SupplierDisplayName name={detail.name} code={detail.code} />
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold capitalize",
                  statusBadgeClass(detail.status),
                )}
              >
                {detail.status}
              </span>
              {!isPlaceholderSupplier && detail.code?.trim() ? (
                <span className="font-mono text-[10px] tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                  {detail.code.trim()}
                </span>
              ) : null}
              {detail.supplierType?.trim() ? (
                <span className="rounded-md bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_80%,transparent)] px-1.5 py-0.5 text-[10px] font-medium capitalize text-[color-mix(in_srgb,var(--order-ink,#15231f)_58%,transparent)]">
                  {detail.supplierType.trim()}
                </span>
              ) : null}
              {detail.taxExempt ? (
                <span className="rounded-md bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--pos-primary,#0f766e)]">
                  Tax exempt
                </span>
              ) : null}
            </div>

            {canWrite && onEditProfile && onAddContact && !isPlaceholderSupplier ? (
              <div className="mt-3 flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 flex-1 gap-1.5 rounded-md bg-[var(--order-ink,#15231f)] px-2.5 text-[11px] font-semibold text-white shadow-none hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_88%,#000)]"
                  onClick={onEditProfile}
                >
                  <PencilLine className="size-3.5" aria-hidden />
                  Edit profile
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 rounded-md border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-2.5 text-[11px] font-semibold shadow-none"
                  onClick={onAddContact}
                  aria-label="Add contact"
                >
                  <UserPlus className="size-3.5" aria-hidden />
                  Contact
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 rounded-md border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-2.5 text-[11px] font-semibold shadow-none"
                  disabled={inviteBusy}
                  onClick={() => void onInvite()}
                  aria-label={inviteBusy ? "Sending invite" : "Invite to portal"}
                >
                  <Send className="size-3.5" aria-hidden />
                  {inviteBusy ? "…" : "Invite"}
                </Button>
              </div>
            ) : null}
          </div>

          {canDeposit && onDeposit ? (
            <div className="flex items-center justify-between gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,white)] px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                  Wallet credit
                </p>
                <p className="mt-0.5 font-mono text-[15px] font-semibold tabular-nums tracking-tight text-[var(--order-ink,#15231f)]">
                  {formatSupplyMoney(walletCredit, currency)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-md border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-white px-2.5 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] shadow-none hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                onClick={onDeposit}
              >
                <Wallet className="size-3.5" aria-hidden />
                Deposit
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          compact
            ? "min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-2 py-2 [scrollbar-width:thin]"
            : "contents",
        )}
      >
      {!compact ? (
        <div className="border border-border">
          <table className={supKvTable}>
            <tbody>
              <tr>
                <th scope="row" className={supKvLabel}>
                  Name
                </th>
                <td className={cn(supKvValue, "font-semibold")}>
                  <SupplierDisplayName
                    name={detail.name}
                    code={detail.code}
                  />
                </td>
              </tr>
              <tr>
                <th scope="row" className={supKvLabel}>
                  Code
                </th>
                <td className={cn(supKvValue, "font-mono")}>
                  {isPlaceholderSupplier ? "—" : detail.code?.trim() || "—"}
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
                        <TelLink
                          phone={primaryContact.phone.trim()}
                          className="underline-offset-2"
                        />
                      </td>
                    </tr>
                  ) : null}
                </>
              ) : null}
            </tbody>
          </table>
          {canWrite && onEditProfile && onAddContact && !isPlaceholderSupplier ? (
            <div className="flex flex-wrap gap-1 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-2 py-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 min-w-0 flex-1 gap-1.5 rounded-md border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-sm font-semibold shadow-none"
                onClick={onEditProfile}
              >
                <PencilLine className="size-3.5" aria-hidden />
                Edit profile
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 min-w-0 flex-1 gap-1.5 rounded-md border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-sm font-semibold shadow-none"
                onClick={onAddContact}
              >
                <UserPlus className="size-3.5" aria-hidden />
                Add contact
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 min-w-0 flex-1 gap-1.5 rounded-md border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] text-sm font-semibold shadow-none"
                disabled={inviteBusy}
                onClick={() => void onInvite()}
              >
                <Send className="size-3.5" aria-hidden />
                {inviteBusy ? "Sending…" : "Invite portal"}
              </Button>
            </div>
          ) : null}
          {canDeposit && onDeposit ? (
            <div className="flex items-center justify-between gap-3 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_4%,transparent)] px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
                  Wallet credit
                </p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-[var(--order-ink,#15231f)]">
                  {formatSupplyMoney(walletCredit, currency)}
                </p>
                <p className="mt-0.5 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
                  Applied automatically on the next supply
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 rounded-md bg-[var(--order-ink,#15231f)] px-3 text-xs font-semibold text-white shadow-none hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_88%,#000)]"
                onClick={onDeposit}
              >
                <Wallet className="size-3.5" aria-hidden />
                Deposit
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!compact ? <SupplierCommercialSection s={detail} compact={compact} /> : null}

      <SupplierSidebarPaymentSection
        detail={detail}
        canWrite={canWrite}
        onSavePayout={onSavePayout}
      />

      <SupplierPurchaseHistorySection
        key={purchaseHistoryRefreshKey}
        supplierId={detail.id}
        variant={variant}
        selectedInvoiceId={selectedInvoiceId}
        onSelectInvoice={onSelectInvoice}
        historyLimit={compact ? 100 : 40}
      />

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
          onEditContact={onEditContact}
          onDeleteContact={onDeleteContact}
          deletingContactId={deletingContactId}
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
            <thead className={supTableHead}>
              <tr>
                <th className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-2 py-1 font-semibold">Name</th>
                <th className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-2 py-1 font-semibold">Role</th>
                <th className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-2 py-1 font-semibold">Phone</th>
                <th className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-2 py-1 font-semibold">Email</th>
                {canWrite && (onEditContact || onDeleteContact) ? (
                  <th className="border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-2 py-1 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className={supTableRow}>
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
                      <TelLink phone={c.phone.trim()} />
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
                  {canWrite && (onEditContact || onDeleteContact) ? (
                    <td className="border border-border/70 px-1 py-0.5">
                      <ContactRowActions
                        contact={c}
                        onEditContact={onEditContact}
                        onDeleteContact={onDeleteContact}
                        deletingContactId={deletingContactId}
                      />
                    </td>
                  ) : null}
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

function ContactRowActions({
  contact,
  onEditContact,
  onDeleteContact,
  deletingContactId = null,
  compact = false,
}: {
  contact: SupplierContactRecord;
  onEditContact?: (contact: SupplierContactRecord) => void;
  onDeleteContact?: (contact: SupplierContactRecord) => void;
  deletingContactId?: string | null;
  compact?: boolean;
}) {
  if (!onEditContact && !onDeleteContact) return null;
  const label = contact.name?.trim() || "contact";
  const sizeClass = compact ? "size-5" : "size-6";
  const iconClass = compact ? "size-2.5" : "size-3";

  return (
    <div className="flex items-center justify-end gap-0.5">
      {onEditContact ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            sizeClass,
            "rounded-md text-muted-foreground hover:text-foreground",
          )}
          aria-label={`Edit ${label}`}
          onClick={() => onEditContact(contact)}
        >
          <Pencil className={iconClass} aria-hidden />
        </Button>
      ) : null}
      {onDeleteContact ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            sizeClass,
            "rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
          )}
          aria-label={`Delete ${label}`}
          disabled={deletingContactId === contact.id}
          onClick={() => onDeleteContact(contact)}
        >
          <Trash2 className={iconClass} aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

function SupplierSidebarContactsDock({
  contacts,
  canWrite,
  onAddContact,
  onEditContact,
  onDeleteContact,
  deletingContactId = null,
}: {
  contacts: SupplierContactRecord[];
  canWrite: boolean;
  onAddContact?: () => void;
  onEditContact?: (contact: SupplierContactRecord) => void;
  onDeleteContact?: (contact: SupplierContactRecord) => void;
  deletingContactId?: string | null;
}) {
  const sorted = [...contacts].sort((a, b) => {
    if (a.primaryContact === b.primaryContact) return 0;
    return a.primaryContact ? -1 : 1;
  });
  const showActions = canWrite && Boolean(onEditContact || onDeleteContact);

  return (
    <section className="shrink-0 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-white">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <h3 className="text-[12px] font-semibold tracking-tight text-[var(--order-ink,#15231f)]">
          Contacts
          {contacts.length > 0 ? (
            <span className="ml-1.5 text-[11px] font-medium tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
              {contacts.length}
            </span>
          ) : null}
        </h3>
        {canWrite && onAddContact ? (
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-[var(--pos-primary,#0f766e)] hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,transparent)]"
            onClick={onAddContact}
          >
            <UserPlus className="size-3" aria-hidden />
            Add
          </button>
        ) : null}
      </div>
      {sorted.length === 0 ? (
        <p className="px-3 pb-3 text-[11px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
          No contacts yet.
          {canWrite && onAddContact ? " Add a phone or email for this vendor." : null}
        </p>
      ) : (
        <ul className="max-h-[min(11rem,28vh)] space-y-0 overflow-y-auto overscroll-contain border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] [scrollbar-width:thin]">
          {sorted.map((c) => {
            const phone = c.phone?.trim();
            const email = c.email?.trim();
            const name = c.name?.trim() || "Unnamed";
            const role = c.roleLabel?.trim();
            return (
              <li
                key={c.id}
                className="flex items-start gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_6%,transparent)] px-3 py-2 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-[var(--order-ink,#15231f)]">
                    {name}
                    {c.primaryContact ? (
                      <span className="ml-1.5 rounded bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] px-1 py-px text-[9px] font-bold uppercase tracking-wide text-[var(--pos-primary,#0f766e)]">
                        Primary
                      </span>
                    ) : null}
                  </p>
                  {role ? (
                    <p className="truncate text-[10px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
                      {role}
                    </p>
                  ) : null}
                  <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
                    {phone ? (
                      <TelLink
                        phone={phone}
                        className="text-[var(--order-ink,#15231f)] underline-offset-2 hover:underline"
                      />
                    ) : null}
                    {email ? (
                      <a
                        href={`mailto:${email}`}
                        className="truncate text-[var(--pos-primary,#0f766e)] underline-offset-2 hover:underline"
                      >
                        {email}
                      </a>
                    ) : null}
                    {!phone && !email ? (
                      <span className="text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
                        No phone or email
                      </span>
                    ) : null}
                  </div>
                </div>
                {showActions ? (
                  <ContactRowActions
                    contact={c}
                    onEditContact={onEditContact}
                    onDeleteContact={onDeleteContact}
                    deletingContactId={deletingContactId}
                    compact
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SupplierSidebarPaymentSection({
  detail,
  canWrite,
  onSavePayout,
}: {
  detail: SupplierRecord;
  canWrite?: boolean;
  onSavePayout?: (input: {
    payoutType: "manual" | "mobile_wallet" | "till" | "paybill";
    payoutPhone: string | null;
    payoutTillNumber: string | null;
    payoutPaybillNumber: string | null;
    payoutPaybillAccount: string | null;
  }) => Promise<void>;
}) {
  const paymentDetails = detail.paymentDetails?.trim();
  const creditTerms = formatCreditTerms(detail.creditTermsDays);
  const preferredPay = detail.paymentMethodPreferred?.trim();
  const vatPin = detail.vatPin?.trim();
  const creditLimit =
    detail.creditLimit != null && Number.isFinite(detail.creditLimit)
      ? detail.creditLimit.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : null;

  type PayoutType = "manual" | "mobile_wallet" | "till" | "paybill";
  const savedType = (detail.payoutType as PayoutType) || "manual";
  const [payoutType, setPayoutType] = useState<PayoutType>(savedType);
  const [payoutPhone, setPayoutPhone] = useState(detail.payoutPhone?.trim() ?? "");
  const [payoutTillNumber, setPayoutTillNumber] = useState(
    detail.payoutTillNumber?.trim() ?? "",
  );
  const [payoutPaybillNumber, setPayoutPaybillNumber] = useState(
    detail.payoutPaybillNumber?.trim() ?? "",
  );
  const [payoutPaybillAccount, setPayoutPaybillAccount] = useState(
    detail.payoutPaybillAccount?.trim() ?? "",
  );
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);

  useEffect(() => {
    setPayoutType((detail.payoutType as PayoutType) || "manual");
    setPayoutPhone(detail.payoutPhone?.trim() ?? "");
    setPayoutTillNumber(detail.payoutTillNumber?.trim() ?? "");
    setPayoutPaybillNumber(detail.payoutPaybillNumber?.trim() ?? "");
    setPayoutPaybillAccount(detail.payoutPaybillAccount?.trim() ?? "");
  }, [
    detail.id,
    detail.payoutType,
    detail.payoutPhone,
    detail.payoutTillNumber,
    detail.payoutPaybillNumber,
    detail.payoutPaybillAccount,
  ]);

  const dirty =
    payoutType !== savedType ||
    payoutPhone.trim() !== (detail.payoutPhone?.trim() ?? "") ||
    payoutTillNumber.trim() !== (detail.payoutTillNumber?.trim() ?? "") ||
    payoutPaybillNumber.trim() !== (detail.payoutPaybillNumber?.trim() ?? "") ||
    payoutPaybillAccount.trim() !== (detail.payoutPaybillAccount?.trim() ?? "");

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

  const savePayout = async () => {
    if (!onSavePayout) return;
    if (payoutType === "mobile_wallet" && !payoutPhone.trim()) {
      toast.error("Enter the supplier M-Pesa phone number.");
      return;
    }
    if (payoutType === "till" && !payoutTillNumber.trim()) {
      toast.error("Enter the supplier till number.");
      return;
    }
    if (payoutType === "paybill") {
      if (!payoutPaybillNumber.trim()) {
        toast.error("Enter the paybill number.");
        return;
      }
      if (!payoutPaybillAccount.trim()) {
        toast.error("Enter the paybill account number.");
        return;
      }
    }
    setSavingPayout(true);
    try {
      await onSavePayout({
        payoutType,
        payoutPhone: payoutType === "mobile_wallet" ? payoutPhone.trim() : null,
        payoutTillNumber: payoutType === "till" ? payoutTillNumber.trim() : null,
        payoutPaybillNumber:
          payoutType === "paybill" ? payoutPaybillNumber.trim() : null,
        payoutPaybillAccount:
          payoutType === "paybill" ? payoutPaybillAccount.trim() : null,
      });
    } finally {
      setSavingPayout(false);
    }
  };

  const destinationSummary =
    savedType === "mobile_wallet"
      ? detail.payoutPhone?.trim() || "—"
      : savedType === "till"
        ? detail.payoutTillNumber?.trim()
          ? `Till ${detail.payoutTillNumber.trim()}`
          : "—"
        : savedType === "paybill"
          ? detail.payoutPaybillNumber?.trim()
            ? `Paybill ${detail.payoutPaybillNumber.trim()} · ${detail.payoutPaybillAccount?.trim() || "—"}`
            : "—"
          : null;

  const summaryChips = [
    creditTerms,
    preferredPay,
    creditLimit ? `Limit ${creditLimit}` : null,
    savedType === "manual"
      ? "Manual payout"
      : savedType === "mobile_wallet"
        ? "M-Pesa"
        : savedType === "till"
          ? "Till"
          : savedType === "paybill"
            ? "Paybill"
            : null,
  ].filter(Boolean) as string[];

  useEffect(() => {
    if (dirty) setPayoutOpen(true);
  }, [dirty]);

  return (
    <section className="overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-white">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--order-shelf,#f3f6f5)_45%,transparent)]"
        aria-expanded={payoutOpen}
        onClick={() => setPayoutOpen((o) => !o)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[12px] font-semibold tracking-tight text-[var(--order-ink,#15231f)]">
              Payment
            </h3>
            {dirty ? (
              <span className="rounded-md bg-amber-100 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-800">
                Unsaved
              </span>
            ) : null}
          </div>
          {summaryChips.length > 0 || destinationSummary ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_55%,transparent)]">
              {[...summaryChips, destinationSummary && savedType !== "manual" ? destinationSummary : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
              Terms, remittance, and KopoKopo destination
            </p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 size-4 shrink-0 text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)] transition-transform duration-200",
            payoutOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {payoutOpen ? (
        <div className="space-y-2.5 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] px-3 py-2.5">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]">
            KopoKopo Send Money
          </span>
          <select
            className="h-8 rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 text-xs"
            value={payoutType}
            disabled={!canWrite || !onSavePayout || savingPayout}
            onChange={(e) => setPayoutType(e.target.value as PayoutType)}
          >
            <option value="manual">Off — record manually</option>
            <option value="mobile_wallet">M-Pesa phone</option>
            <option value="till">Till (Buy Goods)</option>
            <option value="paybill">Paybill</option>
          </select>
          <span className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Supplies → Pay can Send Money to this destination (and auto-pay if enabled
            under Payments settings).
          </span>
        </label>

        {payoutType === "mobile_wallet" ? (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              M-Pesa payout phone
            </span>
            <input
              className="h-8 rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 font-mono text-xs"
              value={payoutPhone}
              onChange={(e) => setPayoutPhone(e.target.value)}
              placeholder="0710514157 or 2547…"
              inputMode="tel"
              disabled={!canWrite || !onSavePayout || savingPayout}
            />
          </label>
        ) : null}

        {payoutType === "till" ? (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Till number
            </span>
            <input
              className="h-8 rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 font-mono text-xs"
              value={payoutTillNumber}
              onChange={(e) => setPayoutTillNumber(e.target.value)}
              placeholder="e.g. 567890"
              inputMode="numeric"
              disabled={!canWrite || !onSavePayout || savingPayout}
            />
          </label>
        ) : null}

        {payoutType === "paybill" ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Paybill number
              </span>
              <input
                className="h-8 rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 font-mono text-xs"
                value={payoutPaybillNumber}
                onChange={(e) => setPayoutPaybillNumber(e.target.value)}
                placeholder="e.g. 247247"
                inputMode="numeric"
                disabled={!canWrite || !onSavePayout || savingPayout}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Account number
              </span>
              <input
                className="h-8 rounded-md border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 font-mono text-xs"
                value={payoutPaybillAccount}
                onChange={(e) => setPayoutPaybillAccount(e.target.value)}
                placeholder="Account or reference"
                disabled={!canWrite || !onSavePayout || savingPayout}
              />
            </label>
          </>
        ) : null}

        <p className="text-[11px] leading-snug text-muted-foreground">
          Auto-pay schedule (override 12:00 AM / 6:00 PM) is set for the whole business under{" "}
          <a
            href="/payments/settings#supplier-payouts"
            className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
          >
            Payments → Supplier payouts
          </a>
          .
        </p>

        {canWrite && onSavePayout ? (
          <Button
            type="button"
            size="sm"
            className={cn(
              "h-8 w-full rounded-md text-xs font-semibold shadow-none",
              dirty
                ? "bg-[var(--order-ink,#15231f)] text-white hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_88%,#000)]"
                : "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,transparent)] text-[var(--pos-primary,#0f766e)] hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_18%,transparent)]",
            )}
            disabled={savingPayout || !dirty}
            onClick={() => void savePayout()}
          >
            {savingPayout ? "Saving…" : dirty ? "Save payment settings" : "Saved"}
          </Button>
        ) : savedType === "manual" ? (
          <p className="text-[11px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
            Open Edit profile to enable KopoKopo payout if you have write access.
          </p>
        ) : (
          <p className="font-mono text-xs text-[var(--order-ink,#15231f)]">{destinationSummary}</p>
        )}

      {rows.length > 0 ? <SupFieldTable rows={rows} /> : null}
        </div>
      ) : null}
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
