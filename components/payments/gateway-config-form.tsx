"use client";

import { useState } from "react";
import { FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import type {
  CreateGatewayConfigPayload,
  GatewayCredentialSettingsRecord,
} from "@/lib/api";

type Props = {
  gatewayType: string;
  displayName: string;
  onSave: (payload: CreateGatewayConfigPayload) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  mode?: "create" | "edit";
  initial?: Partial<{
    label: string;
  }>;
  credentialSettings?: GatewayCredentialSettingsRecord | null;
};

/**
 * Generic configuration form for API-based gateways (KopoKopo, Paystack, etc.).
 */
export function GatewayConfigForm({
  gatewayType,
  displayName,
  onSave,
  onCancel,
  saving,
  mode = "create",
  initial,
  credentialSettings,
}: Props) {
  const isEdit = mode === "edit";
  const credentialsUnreadable =
    isEdit && credentialSettings != null && credentialSettings.credentialsReadable === false;

  const [label, setLabel] = useState(initial?.label ?? "");
  const [environment, setEnvironment] = useState(
    credentialSettings?.environment ?? "sandbox",
  );
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [tillNumber, setTillNumber] = useState(
    credentialSettings?.tillNumber ?? "",
  );
  const [secretKey, setSecretKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [passkey, setPasskey] = useState("");
  const [shortcode, setShortcode] = useState(credentialSettings?.shortcode ?? "");
  const [shortcodeType, setShortcodeType] = useState(
    credentialSettings?.shortcodeType ?? "paybill",
  );
  const [formError, setFormError] = useState("");

  const secretPlaceholder = isEdit ? "Leave blank to keep current" : undefined;

  const buildPayload = (): CreateGatewayConfigPayload => {
    const creds: Record<string, string> = { environment };
    const put = (key: string, value: string) => {
      const v = value.trim();
      if (v || !isEdit) {
        creds[key] = v;
      }
    };

    if (gatewayType === "KOPOKOPO") {
      put("clientId", clientId);
      put("clientSecret", clientSecret);
      put("apiKey", apiKey);
      put("tillNumber", tillNumber);
    } else if (gatewayType === "PAYSTACK") {
      put("secretKey", secretKey);
      put("publicKey", publicKey);
    } else if (gatewayType === "DARAJA") {
      put("consumerKey", consumerKey);
      put("consumerSecret", consumerSecret);
      put("passkey", passkey);
      put("shortcode", shortcode);
      creds.shortcodeType = shortcodeType;
    } else if (gatewayType === "PESAPAL") {
      put("consumerKey", consumerKey);
      put("consumerSecret", consumerSecret);
    }

    return {
      gatewayType,
      label: label || displayName,
      isDefault: false,
      credentialsJson: JSON.stringify(creds),
    };
  };

  const validate = (): string | null => {
    if (gatewayType === "KOPOKOPO") {
      const hasTill =
        tillNumber.trim() !== "" ||
        Boolean(credentialSettings?.tillNumber?.trim());
      if (!hasTill) {
        return "Till number is required for M-Pesa STK Push.";
      }
      if (!isEdit || credentialsUnreadable) {
        if (!clientId.trim() || !clientSecret.trim() || !apiKey.trim()) {
          return "Client ID, Client Secret, and API Key are required.";
        }
      } else if (
        !credentialSettings?.hasClientId ||
        !credentialSettings?.hasClientSecret ||
        !credentialSettings?.hasApiKey
      ) {
        if (!clientId.trim() || !clientSecret.trim() || !apiKey.trim()) {
          return "Re-enter Client ID, Client Secret, and API Key (one or more are missing on file).";
        }
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError("");
    await onSave(buildPayload());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {credentialSettings?.readError ? (
        <p className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {credentialSettings.readError}
        </p>
      ) : null}

      {formError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <FormDrawerFields legend="Label" hint="A friendly name for this gateway.">
        <input
          type="text"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder={displayName}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </FormDrawerFields>

      <FormDrawerFields legend="Environment">
        <div className="flex gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/80 bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent/50">
            <input
              type="radio"
              name="environment"
              className="size-4"
              checked={environment === "sandbox"}
              onChange={() => setEnvironment("sandbox")}
            />
            Sandbox
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/80 bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent/50">
            <input
              type="radio"
              name="environment"
              className="size-4"
              checked={environment === "production"}
              onChange={() => setEnvironment("production")}
            />
            Production
          </label>
        </div>
      </FormDrawerFields>

      {gatewayType === "KOPOKOPO" && (
        <>
          <FormDrawerFields
            legend={`Client ID${isEdit ? "" : " *"}`}
            hint={
              credentialsUnreadable
                ? "Re-enter from your KopoKopo Applications page (not the API Key)."
                : isEdit && credentialSettings?.hasClientId
                  ? "Already saved. Leave blank unless replacing."
                  : environment === "production"
                    ? "Application key from https://app.kopokopo.com/applications"
                    : "Application key from https://sandbox.kopokopo.com/applications"
            }
          >
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder={credentialsUnreadable ? "Required" : secretPlaceholder}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required={!isEdit || credentialsUnreadable}
            />
          </FormDrawerFields>
          <FormDrawerFields
            legend={`Client Secret${isEdit ? "" : " *"}`}
            hint={
              credentialsUnreadable
                ? "Application secret from the same Applications page as Client ID."
                : isEdit && credentialSettings?.hasClientSecret
                  ? "Already saved. Leave blank unless replacing."
                  : "Must match the selected environment (Sandbox vs Production)."
            }
          >
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder={credentialsUnreadable ? "Required" : secretPlaceholder}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required={!isEdit || credentialsUnreadable}
            />
          </FormDrawerFields>
          <FormDrawerFields
            legend={`API Key${isEdit ? "" : " *"}`}
            hint={
              credentialsUnreadable
                ? "Separate from Client ID — used for webhooks, not OAuth."
                : isEdit && credentialSettings?.hasApiKey
                  ? "Already saved. Leave blank unless replacing."
                  : "Separate from Client ID — used for webhooks, not OAuth."
            }
          >
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder={credentialsUnreadable ? "Required" : secretPlaceholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required={!isEdit || credentialsUnreadable}
            />
          </FormDrawerFields>
          <FormDrawerFields
            legend="Till number *"
            hint="M-Pesa till for STK Push (from your KopoKopo dashboard). Required for storefront checkout."
          >
            <input
              type="text"
              inputMode="numeric"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="e.g. 123456"
              value={tillNumber}
              onChange={(e) => setTillNumber(e.target.value)}
              required
            />
          </FormDrawerFields>
        </>
      )}

      {gatewayType === "PAYSTACK" && (
        <>
          <FormDrawerFields legend={`Secret Key${isEdit ? "" : " *"}`}>
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder={secretPlaceholder}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              required={!isEdit}
            />
          </FormDrawerFields>
          <FormDrawerFields legend={`Public Key${isEdit ? "" : " *"}`}>
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder={secretPlaceholder}
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              required={!isEdit}
            />
          </FormDrawerFields>
        </>
      )}

      {gatewayType === "DARAJA" && (
        <>
          <FormDrawerFields legend={`Consumer Key${isEdit ? "" : " *"}`}>
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder={secretPlaceholder}
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              required={!isEdit}
            />
          </FormDrawerFields>
          <FormDrawerFields legend={`Consumer Secret${isEdit ? "" : " *"}`}>
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder={secretPlaceholder}
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              required={!isEdit}
            />
          </FormDrawerFields>
          <FormDrawerFields legend={`Passkey${isEdit ? "" : " *"}`}>
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder={secretPlaceholder}
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              required={!isEdit}
            />
          </FormDrawerFields>
          <FormDrawerFields legend="Shortcode type">
            <div className="flex gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/80 bg-background px-3 py-2 text-sm font-medium shadow-sm">
                <input
                  type="radio"
                  name="shortcodeType"
                  checked={shortcodeType === "paybill"}
                  onChange={() => setShortcodeType("paybill")}
                />
                Paybill
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/80 bg-background px-3 py-2 text-sm font-medium shadow-sm">
                <input
                  type="radio"
                  name="shortcodeType"
                  checked={shortcodeType === "till"}
                  onChange={() => setShortcodeType("till")}
                />
                Till Number
              </label>
            </div>
          </FormDrawerFields>
          <FormDrawerFields legend={`Shortcode${isEdit ? "" : " *"}`}>
            <input
              type="text"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="174379"
              value={shortcode}
              onChange={(e) => setShortcode(e.target.value)}
              required={!isEdit}
            />
          </FormDrawerFields>
        </>
      )}

      {gatewayType === "PESAPAL" && (
        <>
          <FormDrawerFields legend={`Consumer Key${isEdit ? "" : " *"}`}>
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder={secretPlaceholder}
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              required={!isEdit}
            />
          </FormDrawerFields>
          <FormDrawerFields legend={`Consumer Secret${isEdit ? "" : " *"}`}>
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder={secretPlaceholder}
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              required={!isEdit}
            />
          </FormDrawerFields>
        </>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Save as Draft"}
        </Button>
      </div>
    </form>
  );
}
