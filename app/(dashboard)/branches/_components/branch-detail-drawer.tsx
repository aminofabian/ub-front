"use client";

import { Loader2, MapPin, Save } from "lucide-react";

import { CupsPrinterPicker } from "@/components/cups-printer-picker";
import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { BranchRecord } from "@/lib/api";
import type { BranchReceiptDraft } from "@/lib/branch-receipt";
import { cn } from "@/lib/utils";

export type BranchEditRow = {
  name: string;
  address: string;
  active: boolean;
  receipt: BranchReceiptDraft;
};

export type BranchDetailPanelProps = {
  branch: BranchRecord;
  row: BranchEditRow;
  onRowChange: (next: BranchEditRow) => void;
  canManage: boolean;
  saving: boolean;
  onSave: () => void;
};

function statusBadgeClass(active: boolean): string {
  return active
    ? "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] bg-[var(--pos-primary,#0f766e)] text-white"
    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground";
}

export function BranchDetailPanel({
  branch,
  row,
  onRowChange,
  canManage,
  saving,
  onSave,
}: BranchDetailPanelProps) {
  const set = <K extends keyof BranchEditRow>(key: K, value: BranchEditRow[K]) =>
    onRowChange({ ...row, [key]: value });

  const setReceipt = <K extends keyof BranchReceiptDraft>(
    key: K,
    value: BranchReceiptDraft[K],
  ) => onRowChange({ ...row, receipt: { ...row.receipt, [key]: value } });

  const readOnly = !canManage;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Location
        </p>
        <h3
          className="mt-1 truncate text-[1.35rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {row.name.trim() || branch.name}
        </h3>
        <p className="mt-1.5 flex items-start gap-1 text-[11px] text-muted-foreground">
          <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">
            {row.address.trim() || branch.address || "No address on file"}
          </span>
        </p>
        <div className="mt-2">
          <span
            className={cn(
              "inline-flex items-center rounded-none border px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.02em]",
              statusBadgeClass(row.active),
            )}
          >
            {row.active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <form
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-2.5 py-2.5 sm:px-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (canManage) onSave();
        }}
      >
        <fieldset className="space-y-2" disabled={readOnly}>
          <legend className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Core
          </legend>
          <label className="block space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              Branch name
            </span>
            <input
              className={cn(dashboardInputClass(), "h-8 text-[13px]")}
              value={row.name}
              onChange={(e) => set("name", e.target.value)}
              required
              aria-label={`Edit name for ${branch.name}`}
            />
          </label>
          <label className="block space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
              Address
            </span>
            <input
              className={cn(dashboardInputClass(), "h-8 text-[13px]")}
              value={row.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Street, city"
              aria-label={`Edit address for ${branch.name}`}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-2.5 py-2">
            <span className="min-w-0 space-y-0.5">
              <span className="block text-[12px] font-semibold text-foreground">
                Active
              </span>
              <span className={cn(dashboardHintClass(), "block")}>
                Inactive branches hide from pickers and POS assignment.
              </span>
            </span>
            <Switch
              size="sm"
              checked={row.active}
              onCheckedChange={(checked) => set("active", checked)}
              aria-label={`Active status for ${branch.name}`}
              disabled={readOnly}
            />
          </label>
        </fieldset>

        <fieldset className="space-y-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] pt-3" disabled={readOnly}>
          <legend className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            Receipt details
          </legend>
          <p className={cn(dashboardHintClass(), "-mt-1")}>
            Checkout footer, contact, till, printer, and WhatsApp receipt.
          </p>
          <input
            className={cn(dashboardInputClass(), "h-8 text-[13px]")}
            placeholder="Phone (e.g. 254712345678)"
            value={row.receipt.phone}
            onChange={(e) => setReceipt("phone", e.target.value)}
            aria-label={`Receipt phone for ${branch.name}`}
          />
          <input
            className={cn(dashboardInputClass(), "h-8 text-[13px]")}
            placeholder="Email"
            type="email"
            value={row.receipt.email}
            onChange={(e) => setReceipt("email", e.target.value)}
            aria-label={`Receipt email for ${branch.name}`}
          />
          <input
            className={cn(dashboardInputClass(), "h-8 text-[13px]")}
            placeholder="Website (https://yourshop.com)"
            value={row.receipt.website}
            onChange={(e) => setReceipt("website", e.target.value)}
            aria-label={`Receipt website for ${branch.name}`}
          />
          <input
            className={cn(dashboardInputClass(), "h-8 text-[13px]")}
            placeholder="M-Pesa Till (e.g. 3502582)"
            inputMode="numeric"
            value={row.receipt.tillNumber}
            onChange={(e) => setReceipt("tillNumber", e.target.value)}
            aria-label={`M-Pesa till for ${branch.name}`}
          />
          <div className="flex flex-col gap-1.5">
            <input
              className={cn(dashboardInputClass(), "h-8 text-[13px]")}
              placeholder="Receipt printer name (e.g. Caysn_CN811_UB)"
              value={row.receipt.printerCupsName}
              onChange={(e) => setReceipt("printerCupsName", e.target.value)}
              aria-label={`Receipt printer name for ${branch.name}`}
            />
            {canManage ? (
              <CupsPrinterPicker
                value={row.receipt.printerCupsName}
                onSelect={(cupsName) => setReceipt("printerCupsName", cupsName)}
              />
            ) : null}
          </div>
          <textarea
            className={cn(dashboardTextareaClass(), "text-[13px]")}
            placeholder="Footer message on receipt (optional)"
            value={row.receipt.footerNote}
            onChange={(e) => setReceipt("footerNote", e.target.value)}
            aria-label={`Receipt footer for ${branch.name}`}
          />
          <label className="flex items-start justify-between gap-3 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] px-2.5 py-2">
            <span className="min-w-0 space-y-0.5">
              <span className="block text-[12px] font-semibold text-foreground">
                WhatsApp receipt
              </span>
              <span className={cn(dashboardHintClass(), "block")}>
                Let cashiers send a digital receipt on WhatsApp after checkout.
              </span>
            </span>
            <Switch
              size="sm"
              checked={Boolean(row.receipt.whatsappReceiptEnabled)}
              onCheckedChange={(checked) =>
                setReceipt("whatsappReceiptEnabled", checked)
              }
              aria-label={`WhatsApp receipt for ${branch.name}`}
              disabled={readOnly}
            />
          </label>
          <p className={dashboardHintClass()}>
            <strong className="font-medium text-foreground">
              Cloud cashier + receipt printer:
            </strong>{" "}
            on the till PC open Cashier and click{" "}
            <strong className="font-medium text-foreground">
              Download for macOS / Windows / Linux
            </strong>
            , unzip, run the installer once (Windows: Install-Palmart-Print-Bridge.cmd
            — runs hidden at sign-in, no window to leave open), then{" "}
            <strong className="font-medium text-foreground">Detect printers</strong>{" "}
            above and <strong className="font-medium text-foreground">Save</strong>.
            Direct zips:{" "}
            <a
              className="underline"
              href="/downloads/palmart-till-print-bridge-macos.zip"
            >
              macOS
            </a>
            {" · "}
            <a
              className="underline"
              href="/downloads/palmart-till-print-bridge-windows.zip"
            >
              Windows 10/11
            </a>
            {" · "}
            <a
              className="underline"
              href="/downloads/palmart-till-print-bridge-windows7.zip"
            >
              Windows 7
            </a>
            {" · "}
            <a
              className="underline"
              href="/downloads/palmart-till-print-bridge-linux.zip"
            >
              Linux
            </a>
            . Network printers also supported (TCP 9100).
          </p>
        </fieldset>
      </form>

      {canManage ? (
        <div className="shrink-0 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)] px-2.5 py-2 sm:px-3">
          <Button
            type="button"
            size="sm"
            className="h-9 w-full gap-1.5 rounded-none shadow-none"
            disabled={saving || !row.name.trim()}
            onClick={() => onSave()}
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-3.5" aria-hidden />
                Save branch
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
