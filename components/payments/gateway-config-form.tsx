"use client";

import { useState } from "react";
import { FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import type { CreateGatewayConfigPayload } from "@/lib/api";

type Props = {
  gatewayType: string;
  displayName: string;
  onSave: (payload: CreateGatewayConfigPayload) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  initial?: Partial<{
    label: string;
    credentialsJson: string;
  }>;
};

/**
 * Generic configuration form for API-based gateways (KopoKopo, Paystack, etc.).
 * Renders the appropriate credential fields based on gatewayType.
 */
export function GatewayConfigForm({
  gatewayType,
  displayName,
  onSave,
  onCancel,
  saving,
  initial,
}: Props) {
  const [label, setLabel] = useState(initial?.label ?? "");

  // Parse initial credentials if editing
  const initialCreds = parseCredentials(initial?.credentialsJson);

  const [environment, setEnvironment] = useState(
    initialCreds?.environment ?? "sandbox",
  );
  const [clientId, setClientId] = useState(initialCreds?.clientId ?? "");
  const [clientSecret, setClientSecret] = useState(
    initialCreds?.clientSecret ?? "",
  );
  const [apiKey, setApiKey] = useState(initialCreds?.apiKey ?? "");
  const [secretKey, setSecretKey] = useState(initialCreds?.secretKey ?? "");
  const [publicKey, setPublicKey] = useState(initialCreds?.publicKey ?? "");
  const [consumerKey, setConsumerKey] = useState(
    initialCreds?.consumerKey ?? "",
  );
  const [consumerSecret, setConsumerSecret] = useState(
    initialCreds?.consumerSecret ?? "",
  );
  const [passkey, setPasskey] = useState(initialCreds?.passkey ?? "");
  const [shortcode, setShortcode] = useState(initialCreds?.shortcode ?? "");
  const [shortcodeType, setShortcodeType] = useState(
    initialCreds?.shortcodeType ?? "paybill",
  );

  const buildPayload = (): CreateGatewayConfigPayload => {
    const creds: Record<string, string> = { environment };
    if (gatewayType === "KOPOKOPO") {
      creds.clientId = clientId;
      creds.clientSecret = clientSecret;
      creds.apiKey = apiKey;
    } else if (gatewayType === "PAYSTACK") {
      creds.secretKey = secretKey;
      creds.publicKey = publicKey;
    } else if (gatewayType === "DARAJA") {
      creds.consumerKey = consumerKey;
      creds.consumerSecret = consumerSecret;
      creds.passkey = passkey;
      creds.shortcode = shortcode;
      creds.shortcodeType = shortcodeType;
    } else if (gatewayType === "PESAPAL") {
      creds.consumerKey = consumerKey;
      creds.consumerSecret = consumerSecret;
    }
    return {
      gatewayType,
      label: label || displayName,
      isDefault: false,
      credentialsJson: JSON.stringify(creds),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(buildPayload());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      {/* KopoKopo fields */}
      {gatewayType === "KOPOKOPO" && (
        <>
          <FormDrawerFields legend="Client ID *">
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            />
          </FormDrawerFields>
          <FormDrawerFields legend="Client Secret *">
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              required
            />
          </FormDrawerFields>
          <FormDrawerFields legend="API Key *">
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          </FormDrawerFields>
        </>
      )}

      {/* Paystack fields */}
      {gatewayType === "PAYSTACK" && (
        <>
          <FormDrawerFields legend="Secret Key *" hint="Starts with sk_live_ or sk_test_.">
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              required
            />
          </FormDrawerFields>
          <FormDrawerFields legend="Public Key *" hint="Starts with pk_live_ or pk_test_.">
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              required
            />
          </FormDrawerFields>
        </>
      )}

      {/* Daraja fields */}
      {gatewayType === "DARAJA" && (
        <>
          <FormDrawerFields legend="Consumer Key *">
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              required
            />
          </FormDrawerFields>
          <FormDrawerFields legend="Consumer Secret *">
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              required
            />
          </FormDrawerFields>
          <FormDrawerFields legend="Passkey *">
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              required
            />
          </FormDrawerFields>
          <FormDrawerFields legend="Shortcode Type">
            <div className="flex gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/80 bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent/50">
                <input
                  type="radio"
                  name="shortcodeType"
                  className="size-4"
                  checked={shortcodeType === "paybill"}
                  onChange={() => setShortcodeType("paybill")}
                />
                Paybill
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/80 bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent/50">
                <input
                  type="radio"
                  name="shortcodeType"
                  className="size-4"
                  checked={shortcodeType === "till"}
                  onChange={() => setShortcodeType("till")}
                />
                Till Number
              </label>
            </div>
          </FormDrawerFields>
          <FormDrawerFields legend="Shortcode *">
            <input
              type="text"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              placeholder="174379"
              value={shortcode}
              onChange={(e) => setShortcode(e.target.value)}
              required
            />
          </FormDrawerFields>
        </>
      )}

      {/* PesaPal fields */}
      {gatewayType === "PESAPAL" && (
        <>
          <FormDrawerFields legend="Consumer Key *">
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              required
            />
          </FormDrawerFields>
          <FormDrawerFields legend="Consumer Secret *">
            <input
              type="password"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              required
            />
          </FormDrawerFields>
        </>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save as Draft"}
        </Button>
      </div>
    </form>
  );
}

function parseCredentials(
  json: string | undefined,
): Record<string, string> | null {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
