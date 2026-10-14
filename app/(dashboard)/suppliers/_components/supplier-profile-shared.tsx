"use client";

import { useState, type ReactNode } from "react";

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

/** Payout methods a supplier can be paid through. "Not set" keeps it manual. */
const PAYOUT_OPTIONS = [
  { value: "manual", label: "Not set" },
  { value: "mobile_wallet", label: "M-Pesa" },
  { value: "till", label: "Till" },
  { value: "paybill", label: "Paybill" },
] as const;

/** Clear the fields that don't belong to the newly chosen payout method. */
function payoutTypePatch(next: string): Partial<SupplierProfileDraft> {
  if (next === "manual") {
    return {
      payoutType: next,
      payoutPhone: "",
      payoutTillNumber: "",
      payoutPaybillNumber: "",
      payoutPaybillAccount: "",
    };
  }
  if (next === "mobile_wallet") {
    return {
      payoutType: next,
      payoutTillNumber: "",
      payoutPaybillNumber: "",
      payoutPaybillAccount: "",
    };
  }
  if (next === "till") {
    return {
      payoutType: next,
      payoutPhone: "",
      payoutPaybillNumber: "",
      payoutPaybillAccount: "",
    };
  }
  return { payoutType: next, payoutPhone: "", payoutTillNumber: "" };
}

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
          title="Supplier"
          hint="Who you buy from. The name is all you need to get started."
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
              hint="Used to spot duplicates and for order follow-up."
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
            <SupFormRow label="Contact person">
              <input
                className={supFormCellInput}
                value={draft.contactName}
                onChange={(e) =>
                  onDraftChange({ contactName: e.target.value })
                }
                placeholder="Optional — who you deal with"
                maxLength={255}
              />
            </SupFormRow>
          </SupFormTable>
        </SupFormSection>

        {slotAfterIdentity}

        <SupFormSection
          title="Payment details"
          hint="How you pay them — till, paybill, bank, or M-Pesa. Optional, but it makes paying them one tap later."
        >
          <SupFormTable>
            <SupFormRow label="Pay via" hint="Where the money goes.">
              <div className="flex flex-wrap gap-1.5 py-0.5">
                {PAYOUT_OPTIONS.map((opt) => {
                  const active = (draft.payoutType || "manual") === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onDraftChange(payoutTypePatch(opt.value))}
                      className={cn(
                        "inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-semibold transition-colors",
                        active
                          ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
                          : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </SupFormRow>
            {draft.payoutType === "mobile_wallet" ? (
              <SupFormRow
                label="M-Pesa number"
                hint="SMS verification is optional."
              >
                <input
                  className={cn(supFormCellInput, "tabular-nums")}
                  value={draft.payoutPhone}
                  onChange={(e) =>
                    onDraftChange({ payoutPhone: e.target.value })
                  }
                  maxLength={32}
                  placeholder="0710514157 or 2547XXXXXXXX"
                  inputMode="tel"
                />
              </SupFormRow>
            ) : null}
            {draft.payoutType === "till" ? (
              <SupFormRow label="Till number" hint="Supplier’s Buy Goods till.">
                <input
                  className={cn(supFormCellInput, "tabular-nums")}
                  value={draft.payoutTillNumber}
                  onChange={(e) =>
                    onDraftChange({ payoutTillNumber: e.target.value })
                  }
                  maxLength={32}
                  placeholder="e.g. 567890"
                  inputMode="numeric"
                />
              </SupFormRow>
            ) : null}
            {draft.payoutType === "paybill" ? (
              <>
                <SupFormRow label="Paybill number">
                  <input
                    className={cn(supFormCellInput, "tabular-nums")}
                    value={draft.payoutPaybillNumber}
                    onChange={(e) =>
                      onDraftChange({ payoutPaybillNumber: e.target.value })
                    }
                    maxLength={32}
                    placeholder="e.g. 247247"
                    inputMode="numeric"
                  />
                </SupFormRow>
                <SupFormRow
                  label="Account number"
                  hint="Account / reference the paybill asks for."
                >
                  <input
                    className={cn(supFormCellInput, "tabular-nums")}
                    value={draft.payoutPaybillAccount}
                    onChange={(e) =>
                      onDraftChange({ payoutPaybillAccount: e.target.value })
                    }
                    maxLength={64}
                    placeholder="Account or reference"
                  />
                </SupFormRow>
              </>
            ) : null}
            <SupFormRow
              label="Bank / other details"
              hint="Bank name, account number, branch, SWIFT — anything you’ll need to pay them."
            >
              <textarea
                className={cn(supFormCellTextarea, "min-h-[5.5rem]")}
                value={draft.paymentDetails}
                onChange={(e) =>
                  onDraftChange({ paymentDetails: e.target.value })
                }
                maxLength={2000}
                placeholder="Bank account, IBAN, SWIFT, cheque notes…"
              />
            </SupFormRow>
          </SupFormTable>
        </SupFormSection>

        <button
          type="button"
          onClick={() => setMoreOpen((value) => !value)}
          aria-expanded={moreOpen}
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-[#E8E4DC] bg-white px-3.5 text-sm font-medium text-[#0f766e] sm:min-h-9"
        >
          {moreOpen ? "Hide extra details" : "More details"}
          <span className="text-xs font-normal text-[#667085]">
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
        title="Commercial & payments"
        hint="Credit, tax, and how you settle invoices with this supplier."
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
          <SupFormRow
            label="Send Money destination"
            hint="Automated payout when paying supplies (M-Pesa, till, or paybill)."
          >
            <select
              className={supFormCellSelect}
              value={draft.payoutType || "manual"}
              onChange={(e) => onDraftChange(payoutTypePatch(e.target.value))}
            >
              <option value="manual">Off — record payments manually</option>
              <option value="mobile_wallet">M-Pesa phone</option>
              <option value="till">Till (Buy Goods)</option>
              <option value="paybill">Paybill</option>
            </select>
          </SupFormRow>
          {draft.payoutType === "mobile_wallet" ? (
            <SupFormRow
              label="M-Pesa payout phone"
              hint="Save an M-Pesa number to enable automated Send Money. SMS verification is optional."
            >
              <input
                className={cn(supFormCellInput, "tabular-nums")}
                value={draft.payoutPhone}
                onChange={(e) => onDraftChange({ payoutPhone: e.target.value })}
                maxLength={32}
                placeholder="0710514157 or 2547XXXXXXXX"
                inputMode="tel"
              />
            </SupFormRow>
          ) : null}
          {draft.payoutType === "till" ? (
            <SupFormRow label="Till number" hint="Supplier Buy Goods till.">
              <input
                className={cn(supFormCellInput, "tabular-nums")}
                value={draft.payoutTillNumber}
                onChange={(e) =>
                  onDraftChange({ payoutTillNumber: e.target.value })
                }
                maxLength={32}
                placeholder="e.g. 567890"
                inputMode="numeric"
              />
            </SupFormRow>
          ) : null}
          {draft.payoutType === "paybill" ? (
            <>
              <SupFormRow label="Paybill number">
                <input
                  className={cn(supFormCellInput, "tabular-nums")}
                  value={draft.payoutPaybillNumber}
                  onChange={(e) =>
                    onDraftChange({ payoutPaybillNumber: e.target.value })
                  }
                  maxLength={32}
                  placeholder="e.g. 247247"
                  inputMode="numeric"
                />
              </SupFormRow>
              <SupFormRow
                label="Account number"
                hint="Account / reference the paybill requires."
              >
                <input
                  className={cn(supFormCellInput, "tabular-nums")}
                  value={draft.payoutPaybillAccount}
                  onChange={(e) =>
                    onDraftChange({ payoutPaybillAccount: e.target.value })
                  }
                  maxLength={64}
                  placeholder="Account or reference"
                />
              </SupFormRow>
            </>
          ) : null}
        </SupFormTable>
      </SupFormSection>
    </div>
  );
}
