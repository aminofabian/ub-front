"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  SupFormRow,
  SupFormSection,
  SupFormTable,
} from "./supplier-layout-primitives";
import { SupplierPayoutChooser } from "./SupplierPayoutChooser";
import {
  HAIRLINE,
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
  payoutTillNumber: string;
  payoutPaybillNumber: string;
  payoutPaybillAccount: string;
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
  payoutTillNumber: "",
  payoutPaybillNumber: "",
  payoutPaybillAccount: "",
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
  payoutTillNumber?: string | null;
  payoutPaybillNumber?: string | null;
  payoutPaybillAccount?: string | null;
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
      supplier.creditLimit != null &&
      Number.isFinite(Number(supplier.creditLimit))
        ? String(supplier.creditLimit)
        : "",
    paymentMethodPreferred: supplier.paymentMethodPreferred ?? "",
    paymentDetails: supplier.paymentDetails ?? "",
    payoutType: supplier.payoutType ?? "manual",
    payoutPhone: supplier.payoutPhone ?? "",
    payoutTillNumber: supplier.payoutTillNumber ?? "",
    payoutPaybillNumber: supplier.payoutPaybillNumber ?? "",
    payoutPaybillAccount: supplier.payoutPaybillAccount ?? "",
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
  const [moreOpen, setMoreOpen] = useState(false);

  /* ── Create flow: name → contact → payment, extras tucked away ───────── */
  if (mode === "create") {
    return (
      <div className="space-y-3">
        <SupFormSection
          title="Who you buy from"
          hint="A name is enough to start. Phone helps catch duplicates and becomes the order number."
        >
          <SupFormTable>
            <SupFormRow label="Supplier name" required>
              <input
                className={supFormCellInput}
                value={draft.name}
                onChange={(e) => onDraftChange({ name: e.target.value })}
                placeholder="e.g. Acacia Distributors Ltd"
                autoComplete="organization"
                required
              />
            </SupFormRow>
            <SupFormRow
              label="Phone"
              hint="WhatsApp / call line — also used to spot duplicates."
            >
              <input
                className={cn(supFormCellInput, "tabular-nums")}
                value={draft.contactPhone}
                onChange={(e) =>
                  onDraftChange({ contactPhone: e.target.value })
                }
                placeholder="07XX XXX XXX"
                inputMode="tel"
                autoComplete="tel"
                maxLength={32}
              />
            </SupFormRow>
            <SupFormRow label="Contact person">
              <input
                className={supFormCellInput}
                value={draft.contactName}
                onChange={(e) =>
                  onDraftChange({ contactName: e.target.value })
                }
                placeholder="Who you deal with day to day"
                maxLength={255}
              />
            </SupFormRow>
            <SupFormRow label="Email">
              <input
                className={supFormCellInput}
                type="email"
                value={draft.contactEmail}
                onChange={(e) =>
                  onDraftChange({ contactEmail: e.target.value })
                }
                placeholder="orders@supplier.co.ke"
                autoComplete="email"
                maxLength={255}
              />
            </SupFormRow>
          </SupFormTable>
        </SupFormSection>

        {slotAfterIdentity}

        <SupFormSection
          title="How you pay them"
          hint="Pick a destination now — Supplies → Pay can Send Money in one tap. Skip if you only need the name."
        >
          <div className="p-2.5">
            <SupplierPayoutChooser
              values={{
                payoutType: draft.payoutType,
                payoutPhone: draft.payoutPhone,
                payoutTillNumber: draft.payoutTillNumber,
                payoutPaybillNumber: draft.payoutPaybillNumber,
                payoutPaybillAccount: draft.payoutPaybillAccount,
                paymentDetails: draft.paymentDetails,
              }}
              onChange={onDraftChange}
              supplierName={draft.name}
              showBankNotes
            />
          </div>
        </SupFormSection>

        <button
          type="button"
          onClick={() => setMoreOpen((value) => !value)}
          aria-expanded={moreOpen}
          className={cn(
            "flex min-h-11 w-full items-center justify-between rounded-[2px] border bg-[var(--op-surface,#FCFAF5)] px-3.5 text-sm font-medium text-[var(--op-accent,#1D4B3B)] sm:min-h-9",
            HAIRLINE,
          )}
        >
          {moreOpen ? "Hide extra details" : "More details"}
          <span className="text-xs font-normal text-[var(--op-muted,#556159)]">
            Code, VAT, credit terms
          </span>
        </button>

        {moreOpen ? (
          <SupFormSection
            title="More details"
            hint="Optional — you can add these any time from the supplier’s profile."
          >
            <SupFormTable>
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
                  onChange={(e) =>
                    onDraftChange({ supplierType: e.target.value })
                  }
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
              <SupFormRow label="VAT / tax ID" hint="Also helps match existing vendors.">
                <input
                  className={supFormCellInput}
                  value={draft.vatPin}
                  onChange={(e) => onDraftChange({ vatPin: e.target.value })}
                  maxLength={64}
                  placeholder="Optional"
                />
              </SupFormRow>
              <SupFormRow label="Tax exempt">
                <label className="flex h-8 cursor-pointer items-center gap-2 px-2">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded-sm border-input text-primary focus-visible:ring-1 focus-visible:ring-primary/40"
                    checked={draft.taxExempt}
                    onChange={(e) =>
                      onDraftChange({ taxExempt: e.target.checked })
                    }
                  />
                  <span className="text-sm text-foreground">
                    Tax exempt vendor
                  </span>
                </label>
              </SupFormRow>
              <SupFormRow label="Credit terms (days)">
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
                  onChange={(e) =>
                    onDraftChange({ creditLimit: e.target.value })
                  }
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
        ) : null}
      </div>
    );
  }

  /* ── Edit flow: full profile, everything visible ─────────────────────── */
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
        title="Commercial"
        hint="Credit, tax, and how you usually settle with this supplier."
      >
        <SupFormTable>
          <SupFormRow label="VAT / tax ID">
            <input
              className={supFormCellInput}
              value={draft.vatPin}
              onChange={(e) => onDraftChange({ vatPin: e.target.value })}
              maxLength={64}
              placeholder="Optional"
            />
          </SupFormRow>
          <SupFormRow label="Tax exempt">
            <label className="flex h-8 cursor-pointer items-center gap-2 px-2">
              <input
                type="checkbox"
                className="size-3.5 rounded-sm border-input text-primary focus-visible:ring-1 focus-visible:ring-primary/40"
                checked={draft.taxExempt}
                onChange={(e) => onDraftChange({ taxExempt: e.target.checked })}
              />
              <span className="text-sm text-foreground">Tax exempt vendor</span>
            </label>
          </SupFormRow>
          <SupFormRow
            label="Credit terms (days)"
            hint="Leave blank to keep current value."
          >
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
        </SupFormTable>
      </SupFormSection>

      <SupFormSection
        title="How you pay them"
        hint="Send Money destination for Supplies → Pay. Optional bank notes stay on the record."
      >
        <div className="p-2.5">
          <SupplierPayoutChooser
            values={{
              payoutType: draft.payoutType,
              payoutPhone: draft.payoutPhone,
              payoutTillNumber: draft.payoutTillNumber,
              payoutPaybillNumber: draft.payoutPaybillNumber,
              payoutPaybillAccount: draft.payoutPaybillAccount,
              paymentDetails: draft.paymentDetails,
            }}
            onChange={onDraftChange}
            supplierName={draft.name}
            showBankNotes
          />
        </div>
      </SupFormSection>
    </div>
  );
}
