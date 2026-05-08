"use client";

import { cn } from "@/lib/utils";

import {
  supFieldLabel,
  supInput,
  supSelect,
  supTextarea,
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
    <div className="space-y-6">
      {/* ── Identity & status ── */}
      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Identity &amp; status
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">
            <span className={supFieldLabel}>
              Legal / display name <span className="text-destructive">*</span>
            </span>
            <input
              className={supInput}
              value={draft.name}
              onChange={(e) => onDraftChange({ name: e.target.value })}
              placeholder="e.g. Acacia Distributors Ltd"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            <span className={supFieldLabel}>Vendor code</span>
            <input
              className={supInput}
              value={draft.code}
              onChange={(e) => onDraftChange({ code: e.target.value })}
              maxLength={64}
              placeholder="Optional reference"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            <span className={supFieldLabel}>Supplier type</span>
            <input
              className={supInput}
              value={draft.supplierType}
              onChange={(e) => onDraftChange({ supplierType: e.target.value })}
              placeholder="e.g. distributor, manufacturer"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            <span className={supFieldLabel}>Status</span>
            <select
              className={supSelect}
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
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">
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

      {/* ── Commercial & payments ── */}
      <section className="space-y-3 border-t border-border/50 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Commercial &amp; payments
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            <span className={supFieldLabel}>VAT / tax ID</span>
            <input
              className={supInput}
              value={draft.vatPin}
              onChange={(e) => onDraftChange({ vatPin: e.target.value })}
              maxLength={64}
              placeholder="Optional"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/50 bg-muted/15 px-3 py-2.5 sm:mt-5">
            <input
              type="checkbox"
              className="size-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              checked={draft.taxExempt}
              onChange={(e) => onDraftChange({ taxExempt: e.target.checked })}
            />
            <span className="text-sm text-foreground">Tax exempt vendor</span>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            <span className={supFieldLabel}>Credit terms (days)</span>
            <input
              className={cn(supInput, "tabular-nums")}
              inputMode="numeric"
              value={draft.creditTermsDays}
              onChange={(e) =>
                onDraftChange({
                  creditTermsDays: e.target.value.replace(/\D/g, ""),
                })
              }
              placeholder="e.g. 30"
            />
            <span className="text-[10px] text-muted-foreground">
              Leave blank to keep current value.
            </span>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            <span className={supFieldLabel}>Credit limit</span>
            <input
              className={cn(supInput, "tabular-nums")}
              inputMode="decimal"
              value={draft.creditLimit}
              onChange={(e) => onDraftChange({ creditLimit: e.target.value })}
              placeholder="Optional"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">
            <span className={supFieldLabel}>Preferred payment method</span>
            <input
              className={supInput}
              value={draft.paymentMethodPreferred}
              onChange={(e) =>
                onDraftChange({ paymentMethodPreferred: e.target.value })
              }
              maxLength={32}
              placeholder="Bank transfer, card on file, cheque…"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">
            <span className={supFieldLabel}>
              Payment &amp; remittance details
            </span>
            <textarea
              className={cn(supTextarea, "min-h-28")}
              value={draft.paymentDetails}
              onChange={(e) =>
                onDraftChange({ paymentDetails: e.target.value })
              }
              maxLength={2000}
              placeholder="Bank account, IBAN, SWIFT, PO references…"
            />
          </label>
        </div>
      </section>
    </div>
  );
}
