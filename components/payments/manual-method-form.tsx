"use client";

import { useState } from "react";
import { FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import type { CreateGatewayConfigPayload } from "@/lib/api";

type Props = {
  onSave: (payload: CreateGatewayConfigPayload) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  initial?: Partial<{
    label: string;
    displayInstructionsJson: string;
  }>;
};

type ManualType = "till" | "paybill" | "bank_account";

export function ManualMethodForm({ onSave, onCancel, saving, initial }: Props) {
  const [methodType, setMethodType] = useState<ManualType>(
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
  const [bankName, setBankName] = useState(
    parseInitialField(initial?.displayInstructionsJson, "bankName"),
  );
  const [branchName, setBranchName] = useState(
    parseInitialField(initial?.displayInstructionsJson, "branchName"),
  );
  const [accountName, setAccountName] = useState(
    parseInitialField(initial?.displayInstructionsJson, "accountName"),
  );
  const [swiftCode, setSwiftCode] = useState(
    parseInitialField(initial?.displayInstructionsJson, "swiftCode"),
  );
  const [instructions, setInstructions] = useState(
    parseInitialField(initial?.displayInstructionsJson, "instructions"),
  );

  const buildPayload = (): CreateGatewayConfigPayload => {
    const display: Record<string, string> = {
      type: methodType,
      label,
      instructions,
    };
    if (methodType === "till") display.tillNumber = tillNumber;
    if (methodType === "paybill") {
      display.businessNumber = businessNumber;
      if (accountNumber) display.accountNumber = accountNumber;
    }
    if (methodType === "bank_account") {
      display.bankName = bankName;
      display.branchName = branchName;
      display.accountNumber = accountNumber;
      display.accountName = accountName;
      if (swiftCode) display.swiftCode = swiftCode;
    }
    return {
      gatewayType: "MANUAL",
      label: label || displayName(),
      isDefault: false,
      displayInstructionsJson: JSON.stringify(display),
    };
  };

  const displayName = () => {
    if (methodType === "till") return `M-Pesa Till ${tillNumber || ""}`.trim();
    if (methodType === "paybill")
      return `M-Pesa Paybill ${businessNumber || ""}`.trim();
    return `Bank: ${bankName || ""}`.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(buildPayload());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormDrawerFields legend="Method type">
        <div className="flex gap-2">
          {(["till", "paybill", "bank_account"] as ManualType[]).map((t) => (
            <label
              key={t}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/80 bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent/50"
            >
              <input
                type="radio"
                name="methodType"
                className="size-4"
                checked={methodType === t}
                onChange={() => setMethodType(t)}
              />
              {t === "till" ? "Till Number" : t === "paybill" ? "Paybill" : "Bank Account"}
            </label>
          ))}
        </div>
      </FormDrawerFields>

      <FormDrawerFields legend="Display label">
        <input
          type="text"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="e.g. M-Pesa Till"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </FormDrawerFields>

      {methodType === "till" && (
        <FormDrawerFields legend="Till number *" hint="The M-Pesa Buy Goods till number.">
          <input
            type="text"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
            placeholder="5123456"
            value={tillNumber}
            onChange={(e) => setTillNumber(e.target.value)}
            required
          />
        </FormDrawerFields>
      )}

      {methodType === "paybill" && (
        <>
          <FormDrawerFields legend="Business number *" hint="The M-Pesa Paybill business number.">
            <input
              type="text"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="247247"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(e.target.value)}
              required
            />
          </FormDrawerFields>
          <FormDrawerFields legend="Account number (optional)">
            <input
              type="text"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="Leave blank for customer to enter"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </FormDrawerFields>
        </>
      )}

      {methodType === "bank_account" && (
        <>
          <FormDrawerFields legend="Bank name *">
            <input
              type="text"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="KCB"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              required
            />
          </FormDrawerFields>
          <FormDrawerFields legend="Branch">
            <input
              type="text"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="Moi Avenue"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
            />
          </FormDrawerFields>
          <FormDrawerFields legend="Account number *">
            <input
              type="text"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="1234567890"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              required
            />
          </FormDrawerFields>
          <FormDrawerFields legend="Account name *">
            <input
              type="text"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="Acme Stores Ltd"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
            />
          </FormDrawerFields>
          <FormDrawerFields legend="SWIFT code">
            <input
              type="text"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="KCBLKENX"
              value={swiftCode}
              onChange={(e) => setSwiftCode(e.target.value)}
            />
          </FormDrawerFields>
        </>
      )}

      <FormDrawerFields legend="Customer instructions" hint="Shown to customers at checkout.">
        <textarea
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
          rows={3}
          placeholder="e.g. Go to M-Pesa → Lipa na M-Pesa → Paybill…"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </FormDrawerFields>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function parseInitialType(json: string | undefined): ManualType {
  if (!json) return "till";
  try {
    const obj = JSON.parse(json);
    if (obj.type === "paybill" || obj.type === "bank_account") return obj.type;
    return "till";
  } catch {
    return "till";
  }
}

function parseInitialField(json: string | undefined, field: string): string {
  if (!json) return "";
  try {
    const obj = JSON.parse(json);
    return obj[field] ?? "";
  } catch {
    return "";
  }
}
