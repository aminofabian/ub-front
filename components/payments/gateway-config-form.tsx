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
  const [clientId, setClientId] = useState(credentialSettings?.clientId ?? "");
  const [clientSecret, setClientSecret] = useState(
    credentialSettings?.clientSecret ?? "",
  );
  const [apiKey, setApiKey] = useState(credentialSettings?.apiKey ?? "");
  const [tillNumber, setTillNumber] = useState(
    credentialSettings?.tillNumber ?? "",
  );
  const [webhookTillNumbers, setWebhookTillNumbers] = useState(
    credentialSettings?.webhookTillNumbers ?? "",
  );
  const [secretKey, setSecretKey] = useState(credentialSettings?.secretKey ?? "");
  const [publicKey, setPublicKey] = useState(credentialSettings?.publicKey ?? "");
  const [consumerKey, setConsumerKey] = useState(
    credentialSettings?.consumerKey ?? "",
  );
  const [consumerSecret, setConsumerSecret] = useState(
    credentialSettings?.consumerSecret ?? "",
  );
  const [passkey, setPasskey] = useState(credentialSettings?.passkey ?? "");
  const [shortcode, setShortcode] = useState(credentialSettings?.shortcode ?? "");
  const [shortcodeType, setShortcodeType] = useState(
    credentialSettings?.shortcodeType ?? "paybill",
  );
  const [formError, setFormError] = useState("");

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
      put("webhookTillNumbers", webhookTillNumbers);
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
      const till = tillNumber.trim() || credentialSettings?.tillNumber?.trim() || "";
      if (till.includes(",") || till.includes(" ")) {
        return "Till number must be a single till (digits only). Put extra tills under Webhook tills.";
      }
      const hasTill =
        tillNumber.trim() !== "" ||
        Boolean(credentialSettings?.tillNumber?.trim());
      if (!hasTill) {
        return "Till number is required for M-Pesa STK Push.";
      }
      // When editing and stored values couldn't be prefetched, blanks mean "keep current".
      const mustHaveSecrets = !isEdit || credentialsUnreadable || credentialSettings != null;
      if (
        mustHaveSecrets &&
        (!clientId.trim() || !clientSecret.trim() || !apiKey.trim())
      ) {
        return "Client ID, Client Secret, and API Key are required.";
      }
    }
    if (gatewayType === "PAYSTACK") {
      const sk = secretKey.trim();
      const pk = publicKey.trim();
      const mustHaveKeys =
        !isEdit || credentialsUnreadable || sk !== "" || pk !== "";
      if (mustHaveKeys) {
        if (!isEdit || sk !== "") {
          if (!sk.startsWith("sk_test_") && !sk.startsWith("sk_live_")) {
            return "Secret key must start with sk_test_ or sk_live_.";
          }
        }
        if (!isEdit || pk !== "") {
          if (!pk.startsWith("pk_test_") && !pk.startsWith("pk_live_")) {
            return "Public key must start with pk_test_ or pk_live_.";
          }
        }
        const effectiveSk = sk || credentialSettings?.secretKey || "";
        const effectivePk = pk || credentialSettings?.publicKey || "";
        if (environment === "production") {
          if (effectiveSk.startsWith("sk_test_") || effectivePk.startsWith("pk_test_")) {
            return "Production requires live keys (sk_live_ / pk_live_).";
          }
        } else if (
          effectiveSk.startsWith("sk_live_") ||
          effectivePk.startsWith("pk_live_")
        ) {
          return "Sandbox requires test keys (sk_test_ / pk_test_).";
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

  const secretInputClass =
    "w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
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
          autoComplete="off"
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
        <p className="mt-2 text-xs text-muted-foreground">
          {gatewayType === "PAYSTACK"
            ? "Sandbox keys start with pk_test_ / sk_test_. Production keys start with pk_live_ / sk_live_. Do not mix them."
            : "Sandbox and Production have different Client ID / Secret pairs. Switching environment requires credentials from that environment's Applications page."}
        </p>
      </FormDrawerFields>

      {gatewayType === "KOPOKOPO" && (
        <>
          <FormDrawerFields
            legend="Client ID *"
            hint={
              environment === "production"
                ? "Application key from https://app.kopokopo.com/applications (not the API Key)."
                : "Application key from https://sandbox.kopokopo.com/applications (not the API Key)."
            }
          >
            <input
              type="text"
              className={secretInputClass}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required={!isEdit}
              autoComplete="off"
              spellCheck={false}
            />
          </FormDrawerFields>
          <FormDrawerFields
            legend="Client Secret *"
            hint="Application secret from the same Applications page as Client ID. Used for OAuth."
          >
            <input
              type="text"
              className={secretInputClass}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required={!isEdit}
              autoComplete="off"
              spellCheck={false}
            />
          </FormDrawerFields>
          <FormDrawerFields
            legend="API Key *"
            hint="Separate from Client ID — used for webhook HMAC, not OAuth."
          >
            <input
              type="text"
              className={secretInputClass}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required={!isEdit}
              autoComplete="off"
              spellCheck={false}
            />
          </FormDrawerFields>
          <FormDrawerFields
            legend="Till number *"
            hint="Single M-Pesa till for STK Push (from your KopoKopo dashboard). One number only."
          >
            <input
              type="text"
              inputMode="numeric"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="e.g. 3502582"
              value={tillNumber}
              onChange={(e) => setTillNumber(e.target.value.replace(/[^\d]/g, ""))}
              required
              autoComplete="off"
            />
          </FormDrawerFields>
          <FormDrawerFields
            legend="Webhook tills"
            hint="All tills that should fire buygoods webhooks (comma-separated). After save, click Till webhooks on the ACTIVE KopoKopo row."
          >
            <input
              type="text"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="3020127,3502582"
              value={webhookTillNumbers}
              onChange={(e) => setWebhookTillNumbers(e.target.value)}
              autoComplete="off"
            />
          </FormDrawerFields>
        </>
      )}

      {gatewayType === "PAYSTACK" && (
        <>
          <FormDrawerFields
            legend="Secret Key *"
            hint={
              environment === "production"
                ? "From Paystack Dashboard → Settings → API Keys (sk_live_…)."
                : "From Paystack Dashboard → Settings → API Keys (sk_test_…)."
            }
          >
            <input
              type="text"
              className={secretInputClass}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              required={!isEdit || !credentialSettings?.hasSecretKey}
              autoComplete="off"
              spellCheck={false}
              placeholder={environment === "production" ? "sk_live_…" : "sk_test_…"}
            />
          </FormDrawerFields>
          <FormDrawerFields
            legend="Public Key *"
            hint={
              environment === "production"
                ? "Must match the live secret (pk_live_…)."
                : "Must match the test secret (pk_test_…)."
            }
          >
            <input
              type="text"
              className={secretInputClass}
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              required={!isEdit || !credentialSettings?.hasPublicKey}
              autoComplete="off"
              spellCheck={false}
              placeholder={environment === "production" ? "pk_live_…" : "pk_test_…"}
            />
          </FormDrawerFields>
          <p className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            After you activate Paystack, register this webhook URL in the Paystack
            dashboard (Settings → API Keys &amp; Webhooks):{" "}
            <code className="break-all font-mono text-[11px]">
              {"{API_BASE}"}/webhooks/paystack
            </code>
            . Use your platform API host (e.g.{" "}
            <code className="font-mono text-[11px]">https://api.kiosk.ke/webhooks/paystack</code>
            ).
          </p>
        </>
      )}

      {gatewayType === "DARAJA" && (
        <>
          <FormDrawerFields legend="Consumer Key *">
            <input
              type="text"
              className={secretInputClass}
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              required={!isEdit || !credentialSettings?.hasConsumerKey}
              autoComplete="off"
              spellCheck={false}
            />
          </FormDrawerFields>
          <FormDrawerFields legend="Consumer Secret *">
            <input
              type="text"
              className={secretInputClass}
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              required={!isEdit || !credentialSettings?.hasConsumerSecret}
              autoComplete="off"
              spellCheck={false}
            />
          </FormDrawerFields>
          <FormDrawerFields legend="Passkey *">
            <input
              type="text"
              className={secretInputClass}
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              required={!isEdit || !credentialSettings?.hasPasskey}
              autoComplete="off"
              spellCheck={false}
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
              autoComplete="off"
            />
          </FormDrawerFields>
        </>
      )}

      {gatewayType === "PESAPAL" && (
        <>
          <FormDrawerFields legend="Consumer Key *">
            <input
              type="text"
              className={secretInputClass}
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              required={!isEdit || !credentialSettings?.hasConsumerKey}
              autoComplete="off"
              spellCheck={false}
            />
          </FormDrawerFields>
          <FormDrawerFields legend="Consumer Secret *">
            <input
              type="text"
              className={secretInputClass}
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              required={!isEdit || !credentialSettings?.hasConsumerSecret}
              autoComplete="off"
              spellCheck={false}
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
