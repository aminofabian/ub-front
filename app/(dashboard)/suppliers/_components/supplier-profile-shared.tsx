"use client";

import { cn } from "@/lib/utils";

import { supFieldLabel, supInput, supSelect, supTextarea } from "./supplier-ui-tokens";

const SUPPLIER_STATUS_OPTIONS = ["active", "inactive", "blocked"] as const;

const sectionTitle = "text-xs font-semibold tracking-tight text-foreground";

export type SupplierProfileDraft = {
  name: string;
  code: string;
  supplierType: string;
  status: string;
  notes: string;
  vatPin: string;
  taxExempt: boolean;
  /** Whole days; empty string means omit on save (keep server value). */
  creditTermsDays: string;
  /** Decimal amount; empty string means omit on save. */
  creditLimit: string;
  paymentMethodPreferred: string;
  paymentDetails: string;
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
};

export function SupplierProfileFields({
  draft,
  onDraftChange,
}: {
  draft: SupplierProfileDraft;
  onDraftChange: (partial: Partial<SupplierProfileDraft>) => void;
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className={sectionTitle}>Identity &amp; status</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            How this vendor appears in search, purchasing, and reporting.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={supFieldLabel}>Legal / display name</span>
            <input
              className={supInput}
              value={draft.name}
              onChange={(e) => onDraftChange({ name: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={supFieldLabel}>Vendor code</span>
            <input
              className={supInput}
              value={draft.code}
              onChange={(e) => onDraftChange({ code: e.target.value })}
              maxLength={64}
              placeholder="Optional reference"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={supFieldLabel}>Supplier type</span>
            <input
              className={supInput}
              value={draft.supplierType}
              onChange={(e) => onDraftChange({ supplierType: e.target.value })}
              placeholder="e.g. distributor, manufacturer"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={supFieldLabel}>Status</span>
            <select
              className={supSelect}
              value={draft.status}
              onChange={(e) => onDraftChange({ status: e.target.value })}
            >
              {(SUPPLIER_STATUS_OPTIONS as readonly string[]).includes(draft.status) ? null : (
                <option value={draft.status}>{draft.status}</option>
              )}
              {SUPPLIER_STATUS_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={supFieldLabel}>Internal notes</span>
            <textarea
              className={supTextarea}
              value={draft.notes}
              onChange={(e) => onDraftChange({ notes: e.target.value })}
              placeholder="Buyer notes, reminders, or negotiation context…"
              maxLength={5000}
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 border-t border-border/50 pt-8">
        <div>
          <h3 className={sectionTitle}>Commercial &amp; payments</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Tax, credit, and remittance details shared with finance and receiving.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={supFieldLabel}>VAT / tax ID</span>
            <input
              className={supInput}
              value={draft.vatPin}
              onChange={(e) => onDraftChange({ vatPin: e.target.value })}
              maxLength={64}
              placeholder="Optional"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 bg-muted/15 px-3 py-3 sm:mt-6 sm:py-0 sm:pl-1 sm:pr-0 sm:pt-0">
            <input
              type="checkbox"
              className="size-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              checked={draft.taxExempt}
              onChange={(e) => onDraftChange({ taxExempt: e.target.checked })}
            />
            <span className="text-sm text-foreground">Tax exempt vendor</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={supFieldLabel}>Credit terms (days)</span>
            <input
              className={cn(supInput, "tabular-nums")}
              inputMode="numeric"
              value={draft.creditTermsDays}
              onChange={(e) => onDraftChange({ creditTermsDays: e.target.value.replace(/\D/g, "") })}
              placeholder="e.g. 30"
            />
            <span className="text-[10px] leading-snug text-muted-foreground">
              When editing, leave blank to keep the current value. Clearing days or limit in the API is not supported
              yet.
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={supFieldLabel}>Credit limit</span>
            <input
              className={cn(supInput, "tabular-nums")}
              inputMode="decimal"
              value={draft.creditLimit}
              onChange={(e) => onDraftChange({ creditLimit: e.target.value })}
              placeholder="Optional"
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={supFieldLabel}>Preferred payment method</span>
            <input
              className={supInput}
              value={draft.paymentMethodPreferred}
              onChange={(e) => onDraftChange({ paymentMethodPreferred: e.target.value })}
              maxLength={32}
              placeholder="Bank transfer, card on file, cheque…"
            />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={supFieldLabel}>Payment &amp; remittance details</span>
            <textarea
              className={cn(supTextarea, "min-h-[6.5rem]")}
              value={draft.paymentDetails}
              onChange={(e) => onDraftChange({ paymentDetails: e.target.value })}
              maxLength={2000}
              placeholder="Bank account, IBAN, SWIFT, PO references…"
            />
          </label>
        </div>
      </section>
    </div>
  );
}
