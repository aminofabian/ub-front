"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  SupFormRow,
  SupFormSection,
  SupFormTable,
} from "./supplier-layout-primitives";
import {
  supFormCellInput,
  supFormCellSelect,
  supFormCellTextarea,
} from "./supplier-ui-tokens";

const SUPPLIER_STATUS_OPTIONS = ["active", "inactive", "blocked"] as const;

export type SupplierProfileDraft = {
  name: string;
  code: string;
  supplierType: string;
  status: string;
  notes: string;
  vatPin: string;
  taxExempt: boolean;
  creditTermsDays: string;
  creditLimit: string;
  paymentMethodPreferred: string;
  paymentDetails: string;
  payoutType: string;
  payoutPhone: string;
  /** Create flow only — used for duplicate check and optional primary contact. */
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

export const EMPTY_SUPPLIER_PROFILE: SupplierProfileDraft = {
  name: "",
  code: "",
  supplierType: "distributor",
  status: "active",
  notes: "",
  vatPin: "",
  taxExempt: false,
  creditTermsDays: "",
  creditLimit: "",
  paymentMethodPreferred: "",
  paymentDetails: "",
  payoutType: "manual",
  payoutPhone: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
};

/** Map API supplier row to editable profile draft (edit flows ignore contact fields). */
export function supplierRecordToProfileDraft(supplier: {
  name: string;
  code?: string | null;
  supplierType: string;
  status: string;
  notes?: string | null;
  vatPin?: string | null;
  taxExempt?: boolean | null;
  creditTermsDays?: number | null;
  creditLimit?: number | string | null;
  paymentMethodPreferred?: string | null;
  paymentDetails?: string | null;
  payoutType?: string | null;
  payoutPhone?: string | null;
}): SupplierProfileDraft {
  return {
    name: supplier.name,
    code: supplier.code ?? "",
    supplierType: supplier.supplierType,
    status: supplier.status,
    notes: supplier.notes ?? "",
    vatPin: supplier.vatPin ?? "",
    taxExempt: Boolean(supplier.taxExempt),
    creditTermsDays:
      supplier.creditTermsDays != null ? String(supplier.creditTermsDays) : "",
    creditLimit:
      supplier.creditLimit != null && Number.isFinite(Number(supplier.creditLimit))
        ? String(supplier.creditLimit)
        : "",
    paymentMethodPreferred: supplier.paymentMethodPreferred ?? "",
    paymentDetails: supplier.paymentDetails ?? "",
    payoutType: supplier.payoutType ?? "manual",
    payoutPhone: supplier.payoutPhone ?? "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
  };
}

export function SupplierProfileFields({
  draft,
  onDraftChange,
  mode = "full",
  slotAfterIdentity,
}: {
  draft: SupplierProfileDraft;
  onDraftChange: (partial: Partial<SupplierProfileDraft>) => void;
  /** full = edit drawer; create = new supplier with contact + dedup-friendly layout */
  mode?: "full" | "create";
  slotAfterIdentity?: ReactNode;
}) {
  return (
    <div>
      <SupFormSection
        title="Identity & status"
        hint="How this vendor appears in your directory and records."
      >
        <SupFormTable>
          <SupFormRow label="Legal / display name" required>
            <input
              className={supFormCellInput}
              value={draft.name}
              onChange={(e) => onDraftChange({ name: e.target.value })}
              placeholder="e.g. Acacia Distributors Ltd"
              required
            />
          </SupFormRow>
          {mode === "create" ? (
            <>
              <SupFormRow label="Primary contact phone">
                <input
                  className={supFormCellInput}
                  value={draft.contactPhone}
                  onChange={(e) => onDraftChange({ contactPhone: e.target.value })}
                  placeholder="For duplicate check & PO follow-up"
                  inputMode="tel"
                  maxLength={32}
                />
              </SupFormRow>
              <SupFormRow label="Primary contact email">
                <input
                  className={supFormCellInput}
                  type="email"
                  value={draft.contactEmail}
                  onChange={(e) => onDraftChange({ contactEmail: e.target.value })}
                  placeholder="orders@supplier.co.ke"
                  maxLength={255}
                />
              </SupFormRow>
              <SupFormRow label="Contact person">
                <input
                  className={supFormCellInput}
                  value={draft.contactName}
                  onChange={(e) => onDraftChange({ contactName: e.target.value })}
                  placeholder="Optional — saved as primary contact after create"
                  maxLength={255}
                />
              </SupFormRow>
            </>
          ) : null}
          <SupFormRow label="Vendor code">
            <input
              className={supFormCellInput}
              value={draft.code}
              onChange={(e) => onDraftChange({ code: e.target.value })}
              maxLength={64}
              placeholder="Optional reference"
            />
          </SupFormRow>
          <SupFormRow label="Supplier type">
            <input
              className={supFormCellInput}
              value={draft.supplierType}
              onChange={(e) => onDraftChange({ supplierType: e.target.value })}
              placeholder="e.g. distributor, manufacturer"
            />
          </SupFormRow>
          <SupFormRow label="Status">
            <select
              className={supFormCellSelect}
              value={draft.status}
              onChange={(e) => onDraftChange({ status: e.target.value })}
            >
              {!(SUPPLIER_STATUS_OPTIONS as readonly string[]).includes(
                draft.status,
              ) ? (
                <option value={draft.status}>{draft.status}</option>
              ) : null}
              {SUPPLIER_STATUS_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </SupFormRow>
          <SupFormRow label="Internal notes">
            <textarea
              className={supFormCellTextarea}
              value={draft.notes}
              onChange={(e) => onDraftChange({ notes: e.target.value })}
              placeholder="Buyer notes, reminders, or negotiation context…"
              maxLength={5000}
            />
          </SupFormRow>
        </SupFormTable>
      </SupFormSection>

      {slotAfterIdentity}

      <SupFormSection
        title="Commercial & payments"
        hint="Credit, tax, and how you settle invoices with this supplier."
      >
        <SupFormTable>
          <SupFormRow
            label="VAT / tax ID"
            hint={mode === "create" ? "Helps match existing vendors" : undefined}
          >
            <input
              className={supFormCellInput}
              value={draft.vatPin}
              onChange={(e) => onDraftChange({ vatPin: e.target.value })}
              maxLength={64}
              placeholder={mode === "create" ? "Optional" : "Optional"}
            />
          </SupFormRow>
          <SupFormRow label="Tax exempt">
            <label className="flex h-8 cursor-pointer items-center gap-2 px-2">
              <input
                type="checkbox"
                className="size-3.5 rounded-none border-input text-primary focus-visible:ring-1 focus-visible:ring-primary/40"
                checked={draft.taxExempt}
                onChange={(e) => onDraftChange({ taxExempt: e.target.checked })}
              />
              <span className="text-sm text-foreground">Tax exempt vendor</span>
            </label>
          </SupFormRow>
          <SupFormRow label="Credit terms (days)" hint="Leave blank to keep current value.">
            <input
              className={cn(supFormCellInput, "tabular-nums")}
              inputMode="numeric"
              value={draft.creditTermsDays}
              onChange={(e) =>
                onDraftChange({
                  creditTermsDays: e.target.value.replace(/\D/g, ""),
                })
              }
              placeholder="e.g. 30"
            />
          </SupFormRow>
          <SupFormRow label="Credit limit">
            <input
              className={cn(supFormCellInput, "tabular-nums")}
              inputMode="decimal"
              value={draft.creditLimit}
              onChange={(e) => onDraftChange({ creditLimit: e.target.value })}
              placeholder="Optional"
            />
          </SupFormRow>
          <SupFormRow label="Preferred payment method">
            <input
              className={supFormCellInput}
              value={draft.paymentMethodPreferred}
              onChange={(e) =>
                onDraftChange({ paymentMethodPreferred: e.target.value })
              }
              maxLength={32}
              placeholder="Bank transfer, card on file, cheque…"
            />
          </SupFormRow>
          <SupFormRow label="Payment & remittance details">
            <textarea
              className={cn(supFormCellTextarea, "min-h-[5.5rem]")}
              value={draft.paymentDetails}
              onChange={(e) =>
                onDraftChange({ paymentDetails: e.target.value })
              }
              maxLength={2000}
              placeholder="Bank account, IBAN, SWIFT, PO references…"
            />
          </SupFormRow>
          <SupFormRow label="KopoKopo payout">
            <select
              className={supFormCellSelect}
              value={draft.payoutType}
              onChange={(e) => onDraftChange({ payoutType: e.target.value })}
            >
              <option value="manual">Manual (record payment yourself)</option>
              <option value="mobile_wallet">M-Pesa via KopoKopo Send Money</option>
            </select>
          </SupFormRow>
          {draft.payoutType === "mobile_wallet" ? (
            <SupFormRow
              label="M-Pesa payout phone"
              hint="Used when paying supplies via KopoKopo Send Money."
            >
              <input
                className={cn(supFormCellInput, "font-mono")}
                value={draft.payoutPhone}
                onChange={(e) => onDraftChange({ payoutPhone: e.target.value })}
                maxLength={32}
                placeholder="2547XXXXXXXX"
                inputMode="tel"
              />
            </SupFormRow>
          ) : null}
        </SupFormTable>
      </SupFormSection>
    </div>
  );
}
