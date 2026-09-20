"use client";

import { useState } from "react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import type { CreateGatewayConfigPayload } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  onSave: (payload: CreateGatewayConfigPayload) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  initial?: Partial<{
    label: string;
    displayInstructionsJson: string;
  }>;
};

type CustodyType = "till" | "paybill";

/**
 * Tenant Option B: till/paybill only — platform collects and settles on the SA-selected rail.
 * Visual language matches the store-room theatre (warm paper, ink hairlines, teal wash).
 */
export function CustodyMpesaMethodForm({ onSave, onCancel, saving, initial }: Props) {
  const [methodType, setMethodType] = useState<CustodyType>(
    parseInitialType(initial?.displayInstructionsJson),
  );
  const [label, setLabel] = useState(initial?.label ?? "");
  const [tillNumber, setTillNumber] = useState(
    parseInitialField(initial?.displayInstructionsJson, "tillNumber"),
  );
  const [businessNumber, setBusinessNumber] = useState(
    parseInitialField(initial?.displayInstructionsJson, "businessNumber"),
  );
  const [accountNumber, setAccountNumber] = useState(
    parseInitialField(initial?.displayInstructionsJson, "accountNumber"),
  );
  const [formError, setFormError] = useState("");

  const buildPayload = (): CreateGatewayConfigPayload => {
    const display: Record<string, string> = {
      type: methodType,
      label,
    };
    if (methodType === "till") display.tillNumber = tillNumber;
    if (methodType === "paybill") {
      display.businessNumber = businessNumber;
      display.accountNumber = accountNumber;
    }
    return {
      gatewayType: "CUSTODY_MPESA",
      label: label || defaultLabel(),
      isDefault: false,
      displayInstructionsJson: JSON.stringify(display),
    };
  };

  const defaultLabel = () => {
    if (methodType === "till") return `M-Pesa Till ${tillNumber || ""}`.trim();
    return `Paybill ${businessNumber || ""}`.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (methodType === "till" && !/^\d{5,7}$/.test(tillNumber.replace(/\D/g, ""))) {
      setFormError("Enter a valid Buy Goods till number (5–7 digits).");
      return;
    }
    if (methodType === "paybill") {
      if (!/^\d{5,7}$/.test(businessNumber.replace(/\D/g, ""))) {
        setFormError("Enter a valid Paybill business number (5–7 digits).");
        return;
      }
      if (!accountNumber.trim()) {
        setFormError("Paybill account number is required.");
        return;
      }
    }
    setFormError("");
    await onSave(buildPayload());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      <div
        className={cn(
          "border px-3 py-2.5",
          "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]",
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
        )}
      >
        <p className="text-[12px] font-semibold tracking-[-0.02em] text-[var(--order-ink,#15231f)]">
          Lipa Na M-Pesa prompt — no API keys
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 leading-relaxed")}>
          Enter a Buy Goods till under Kiosk&apos;s Head Office (or a paybill on
          that HO). Kiosk sends M-Pesa Express with PartyB = your till — money
          lands on you directly, customer enters PIN only. No API keys, no B2B.
          Bank paybills (NCBA, Equity, …) cannot receive this from Kiosk&apos;s
          Daraja app — connect your own keys instead.
        </p>
      </div>

      {formError ? (
        <p
          role="alert"
          className="border border-[#9a2e16]/35 bg-[color-mix(in_srgb,#9a2e16_5%,white)] px-3 py-2 text-[12px] font-medium text-[#9a2e16]"
        >
          {formError}
        </p>
      ) : null}

      <fieldset className="space-y-1.5">
        <legend className={dashboardLabelClass()}>Destination type</legend>
        <div className="grid grid-cols-2 gap-px border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)]">
          {(["till", "paybill"] as const).map((t) => {
            const active = methodType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setMethodType(t)}
                className={cn(
                  "h-9 px-3 text-[13px] font-semibold tracking-[-0.02em] transition-colors",
                  active
                    ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
                    : "bg-white text-muted-foreground hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)] hover:text-foreground",
                )}
                aria-pressed={active}
              >
                {t === "till" ? "Till number" : "Paybill"}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="block space-y-1.5">
        <span className={dashboardLabelClass()}>Display label</span>
        <input
          type="text"
          className={dashboardInputClass(saving)}
          placeholder="e.g. Shop till"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={saving}
        />
      </label>

      {methodType === "till" ? (
        <label className="block space-y-1.5">
          <span className={dashboardLabelClass()}>Till number</span>
          <input
            type="text"
            inputMode="numeric"
            className={dashboardInputClass(saving)}
            placeholder="e.g. 3502582"
            value={tillNumber}
            onChange={(e) => setTillNumber(e.target.value.replace(/[^\d]/g, ""))}
            required
            disabled={saving}
          />
          <span className={dashboardHintClass()}>
            Buy Goods till that receives the settlement after the prompt.
          </span>
        </label>
      ) : (
        <>
          <label className="block space-y-1.5">
            <span className={dashboardLabelClass()}>Paybill business number</span>
            <input
              type="text"
              inputMode="numeric"
              className={dashboardInputClass(saving)}
              placeholder="247247"
              value={businessNumber}
              onChange={(e) =>
                setBusinessNumber(e.target.value.replace(/[^\d]/g, ""))
              }
              required
              disabled={saving}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={dashboardLabelClass()}>Account number</span>
            <input
              type="text"
              className={dashboardInputClass(saving)}
              placeholder="Account / bill reference"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              required
              disabled={saving}
            />
          </label>
        </>
      )}

      <div className="flex justify-end gap-2 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] pt-3">
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-none shadow-none"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-8 rounded-none bg-[var(--pos-primary,#0f766e)] text-white shadow-none hover:bg-[#0d6b63]"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function parseInitialType(json?: string): CustodyType {
  if (!json) return "till";
  try {
    const o = JSON.parse(json) as { type?: string };
    return o.type === "paybill" ? "paybill" : "till";
  } catch {
    return "till";
  }
}

function parseInitialField(json: string | undefined, key: string): string {
  if (!json) return "";
  try {
    const o = JSON.parse(json) as Record<string, string>;
    return o[key] ?? "";
  } catch {
    return "";
  }
}

export type CustodyDestination = {
  type: "till" | "paybill";
  tillNumber: string;
  businessNumber: string;
  accountNumber: string;
};

export function parseCustodyDestination(
  json: string | null | undefined,
): CustodyDestination {
  return {
    type: parseInitialType(json ?? undefined),
    tillNumber: parseInitialField(json ?? undefined, "tillNumber"),
    businessNumber: parseInitialField(json ?? undefined, "businessNumber"),
    accountNumber: parseInitialField(json ?? undefined, "accountNumber"),
  };
}
