"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, CreditCard, Globe, KeyRound, Server } from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { PlatformDomainOrdersPanel } from "@/components/super-admin/platform-domain-orders-panel";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  fetchPlatformDomainSettings,
  fetchSaResellerStatus,
  updatePlatformDomainSettings,
  type PlatformDomainSettingsRecord,
} from "@/lib/super-admin-api";

type DomainsTab = "settings" | "orders";

function defaultsToText(map: Record<string, string> | null | undefined): string {
  if (!map || Object.keys(map).length === 0) return "";
  return Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

function textToDefaults(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && value) out[key] = value;
  }
  return out;
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span> : null}
      </span>
      <input
        id={id}
        type="checkbox"
        className="mt-1 size-4 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function SuperAdminPlatformDomainsPage() {
  const [tab, setTab] = useState<DomainsTab>("settings");
  const [settings, setSettings] = useState<PlatformDomainSettingsRecord | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [hostafricaApiKey, setHostafricaApiKey] = useState("");
  const [hostafricaApiBaseUrl, setHostafricaApiBaseUrl] = useState("https://api.hostafrica.com");
  const [hostafricaCurrency, setHostafricaCurrency] = useState("KES");
  const [hostafricaKenyanTlds, setHostafricaKenyanTlds] = useState(
    "co.ke,or.ke,me.ke,sc.ke,ac.ke,go.ke,ke",
  );
  const [hostafricaBillingStubEnabled, setHostafricaBillingStubEnabled] = useState(true);
  const [hostafricaRegistrantDefaultsText, setHostafricaRegistrantDefaultsText] = useState("");

  const [hostafricaResellerEmail, setHostafricaResellerEmail] = useState("");
  const [hostafricaResellerApiKey, setHostafricaResellerApiKey] = useState("");
  const [hostafricaResellerApiBaseUrl, setHostafricaResellerApiBaseUrl] = useState(
    "https://my.hostafrica.com/modules/addons/DomainsReseller/api/index.php",
  );
  const [whoisFirstname, setWhoisFirstname] = useState("");
  const [whoisLastname, setWhoisLastname] = useState("");
  const [whoisCompany, setWhoisCompany] = useState("");
  const [whoisEmail, setWhoisEmail] = useState("");
  const [whoisAddress1, setWhoisAddress1] = useState("");
  const [whoisAddress2, setWhoisAddress2] = useState("");
  const [whoisCity, setWhoisCity] = useState("");
  const [whoisState, setWhoisState] = useState("");
  const [whoisPostcode, setWhoisPostcode] = useState("");
  const [whoisCountry, setWhoisCountry] = useState("KE");
  const [whoisPhone, setWhoisPhone] = useState("");
  const [resellerTest, setResellerTest] = useState<{ ok: boolean; text: string } | null>(null);
  const [resellerTesting, setResellerTesting] = useState(false);

  const [palmartStkClientId, setPalmartStkClientId] = useState("");
  const [palmartStkClientSecret, setPalmartStkClientSecret] = useState("");
  const [palmartStkApiKey, setPalmartStkApiKey] = useState("");
  const [palmartStkTillNumber, setPalmartStkTillNumber] = useState("");
  const [palmartStkEnvironment, setPalmartStkEnvironment] = useState("sandbox");

  const [vercelToken, setVercelToken] = useState("");
  const [vercelTeamId, setVercelTeamId] = useState("");
  const [vercelProjectId, setVercelProjectId] = useState("");
  const [vercelApiBaseUrl, setVercelApiBaseUrl] = useState("https://api.vercel.com");

  const [domainOrderSyncEnabled, setDomainOrderSyncEnabled] = useState(false);
  const [domainOrderSyncFixedDelayMs, setDomainOrderSyncFixedDelayMs] = useState("60000");
  const [domainOrderSyncInitialDelayMs, setDomainOrderSyncInitialDelayMs] = useState("20000");

  const applySettings = useCallback((row: PlatformDomainSettingsRecord) => {
    setSettings(row);
    setHostafricaApiBaseUrl(row.hostafricaApiBaseUrl || "https://api.hostafrica.com");
    setHostafricaCurrency(row.hostafricaCurrency || "KES");
    setHostafricaKenyanTlds(row.hostafricaKenyanTlds || "co.ke,or.ke,me.ke,sc.ke,ac.ke,go.ke,ke");
    setHostafricaBillingStubEnabled(row.hostafricaBillingStubEnabled);
    setHostafricaRegistrantDefaultsText(defaultsToText(row.hostafricaRegistrantDefaults));
    setHostafricaResellerEmail(row.hostafricaResellerEmail || "");
    setHostafricaResellerApiBaseUrl(
      row.hostafricaResellerApiBaseUrl ||
        "https://my.hostafrica.com/modules/addons/DomainsReseller/api/index.php",
    );
    setHostafricaResellerApiKey("");
    const whois = row.hostafricaResellerWhois || {};
    setWhoisFirstname(whois.firstname || "");
    setWhoisLastname(whois.lastname || "");
    setWhoisCompany(whois.companyname || "");
    setWhoisEmail(whois.email || "");
    setWhoisAddress1(whois.address1 || "");
    setWhoisAddress2(whois.address2 || "");
    setWhoisCity(whois.city || "");
    setWhoisState(whois.state || "");
    setWhoisPostcode(whois.postcode || "");
    setWhoisCountry(whois.country || "KE");
    setWhoisPhone(whois.phonenumber || "");
    setPalmartStkTillNumber(row.palmartStkTillNumber || "");
    setPalmartStkClientId("");
    setPalmartStkClientSecret("");
    setPalmartStkApiKey("");
    setVercelTeamId(row.vercelTeamId || "");
    setVercelProjectId(row.vercelProjectId || "");
    setVercelApiBaseUrl(row.vercelApiBaseUrl || "https://api.vercel.com");
    setDomainOrderSyncEnabled(row.domainOrderSyncEnabled);
    setDomainOrderSyncFixedDelayMs(String(row.domainOrderSyncFixedDelayMs || 60000));
    setDomainOrderSyncInitialDelayMs(String(row.domainOrderSyncInitialDelayMs || 20000));
    setHostafricaApiKey("");
    setVercelToken("");
  }, []);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const row = await fetchPlatformDomainSettings();
      applySettings(row);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load domain settings.");
    }
  }, [applySettings]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async () => {
    setBusy(true);
    setSuccess("");
    setError("");
    try {
      const body: Parameters<typeof updatePlatformDomainSettings>[0] = {
        hostafricaApiBaseUrl,
        hostafricaCurrency,
        hostafricaKenyanTlds,
        hostafricaBillingStubEnabled,
        hostafricaRegistrantDefaults: textToDefaults(hostafricaRegistrantDefaultsText),
        hostafricaResellerEmail,
        hostafricaResellerApiBaseUrl,
        hostafricaResellerWhois: {
          firstname: whoisFirstname.trim(),
          lastname: whoisLastname.trim(),
          companyname: whoisCompany.trim(),
          email: whoisEmail.trim(),
          address1: whoisAddress1.trim(),
          address2: whoisAddress2.trim(),
          city: whoisCity.trim(),
          state: whoisState.trim(),
          postcode: whoisPostcode.trim(),
          country: whoisCountry.trim() || "KE",
          phonenumber: whoisPhone.trim(),
        },
        vercelTeamId,
        vercelProjectId,
        vercelApiBaseUrl,
        domainOrderSyncEnabled,
        domainOrderSyncFixedDelayMs: Number(domainOrderSyncFixedDelayMs) || 60000,
        domainOrderSyncInitialDelayMs: Number(domainOrderSyncInitialDelayMs) || 20000,
      };
      if (hostafricaApiKey.trim()) {
        body.hostafricaApiKey = hostafricaApiKey.trim();
      }
      if (hostafricaResellerApiKey.trim()) {
        body.hostafricaResellerApiKey = hostafricaResellerApiKey.trim();
      }
      if (vercelToken.trim()) {
        body.vercelToken = vercelToken.trim();
      }
      const stkSecretTouched =
        !!palmartStkClientId.trim() || !!palmartStkClientSecret.trim() || !!palmartStkApiKey.trim();
      if (stkSecretTouched) {
        if (palmartStkClientId.trim()) body.palmartStkClientId = palmartStkClientId.trim();
        if (palmartStkClientSecret.trim()) body.palmartStkClientSecret = palmartStkClientSecret.trim();
        if (palmartStkApiKey.trim()) body.palmartStkApiKey = palmartStkApiKey.trim();
        if (palmartStkTillNumber.trim()) body.palmartStkTillNumber = palmartStkTillNumber.trim();
        if (palmartStkEnvironment.trim()) body.palmartStkEnvironment = palmartStkEnvironment.trim();
      } else if (settings?.hasPalmartStkCredentials) {
        const prevTill = settings.palmartStkTillNumber || "";
        if (palmartStkTillNumber.trim() && palmartStkTillNumber.trim() !== prevTill) {
          body.palmartStkTillNumber = palmartStkTillNumber.trim();
        }
        if (palmartStkEnvironment.trim()) {
          body.palmartStkEnvironment = palmartStkEnvironment.trim();
        }
      }
      const updated = await updatePlatformDomainSettings(body);
      applySettings(updated);
      setSuccess("Domain settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save domain settings.");
    } finally {
      setBusy(false);
    }
  };

  const clearSecret = (
    field: "hostafricaApiKey" | "vercelToken" | "palmartStk" | "hostafricaResellerApiKey",
    label: string,
  ) => {
    showThemedConfirmToast({
      id: `clear-domain-${field}`,
      title: `Clear ${label}?`,
      description:
        field === "palmartStk"
          ? "Domain purchase M-Pesa will stop until new platform credentials are saved."
          : field === "hostafricaResellerApiKey"
            ? "Zero-touch RegisterDomain will stop until a DomainsReseller API key is saved again."
            : "Merchants will fall back to env only if set. Prefer leaving a key in Super Admin.",
      confirmLabel: "Clear",
      confirmVariant: "destructive",
      onConfirm: async () => {
        setBusy(true);
        setError("");
        setSuccess("");
        try {
          const updated =
            field === "palmartStk"
              ? await updatePlatformDomainSettings({ clearPalmartStkCredentials: true })
              : field === "hostafricaResellerApiKey"
                ? await updatePlatformDomainSettings({ clearHostafricaResellerApiKey: true })
                : await updatePlatformDomainSettings({ [field]: "" });
          applySettings(updated);
          setSuccess(`${label} cleared.`);
        } catch (e) {
          setError(e instanceof Error ? e.message : `Could not clear ${label}.`);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  return (
    <div className={cn("mx-auto space-y-6 pb-16", tab === "orders" ? "max-w-6xl" : "max-w-3xl")}>
      <SuperAdminPageHeader
        title="Domains"
        description="HostAfrica (Kenyan TLDs) and Vercel DNS/SSL for merchant custom domains. Secrets are encrypted at rest."
      />

      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={tab === "settings" ? "default" : "outline"}
          className="gap-1.5 rounded-full"
          onClick={() => setTab("settings")}
        >
          <KeyRound className="size-3.5" aria-hidden />
          Settings
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "orders" ? "default" : "outline"}
          className="gap-1.5 rounded-full"
          onClick={() => setTab("orders")}
        >
          <ClipboardList className="size-3.5" aria-hidden />
          Orders
        </Button>
      </div>

      {tab === "orders" ? <PlatformDomainOrdersPanel /> : null}

      {tab === "settings" ? (
        <>
      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}
      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}
      {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}

      {settings?.encryptionEphemeral ? (
        <AuthAlert variant="error">
          APP_PAYMENTS_ENCRYPTION_KEY is not set. Saved secrets work until restart, then must be re-entered.
        </AuthAlert>
      ) : null}
      {settings && !settings.secretsReadable && settings.secretsError ? (
        <AuthAlert variant="error">{settings.secretsError}</AuthAlert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-4" aria-hidden />
            HostAfrica
          </CardTitle>
          <CardDescription>
            Registrar for .ke / .co.ke purchases. Domains are registered on the platform HostAfrica account.
            {settings?.envHostafricaConfigured ? " Env fallback is present." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            id="ha-key"
            label="API key"
            type="password"
            placeholder={settings?.hasHostafricaApiKey ? "•••••••• (saved — leave blank to keep)" : "Paste HostAfrica API token"}
            hint={settings?.hasHostafricaApiKey ? "A key is stored. Leave blank to keep it, or clear below." : undefined}
            value={hostafricaApiKey}
            onChange={setHostafricaApiKey}
          />
          {settings?.hasHostafricaApiKey ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => clearSecret("hostafricaApiKey", "HostAfrica API key")}
            >
              Clear HostAfrica key
            </Button>
          ) : null}
          <Field
            id="ha-base"
            label="API base URL"
            value={hostafricaApiBaseUrl}
            onChange={setHostafricaApiBaseUrl}
            placeholder="https://api.hostafrica.com"
          />
          <Field
            id="ha-currency"
            label="Quote currency"
            value={hostafricaCurrency}
            onChange={setHostafricaCurrency}
            placeholder="KES"
          />
          <Field
            id="ha-tlds"
            label="Kenyan TLDs (comma-separated)"
            value={hostafricaKenyanTlds}
            onChange={setHostafricaKenyanTlds}
            hint="Used when a merchant searches a bare label like mama-njeri."
          />
          <ToggleRow
            id="ha-billing-stub"
            label="Billing stub enabled"
            description="When on, Buy skips M-Pesa and starts registration. Turn off for real Palmart STK checkout (credentials below)."
            checked={hostafricaBillingStubEnabled}
            onChange={setHostafricaBillingStubEnabled}
          />
          <div className="space-y-1.5">
            <label htmlFor="ha-registrant-defaults" className="text-sm font-medium">
              Registrant required-data defaults
            </label>
            <textarea
              id="ha-registrant-defaults"
              className="min-h-[7rem] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              spellCheck={false}
              placeholder={"# one field per line — HostAfrica additionalFields.name=value\nCompanyName=Palmart Limited\nRegistrantID=P051234567X"}
              value={hostafricaRegistrantDefaultsText}
              onChange={(e) => setHostafricaRegistrantDefaultsText(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Used after purchase when HostAfrica lists the domain under requiring-data. Keys must match HA field{" "}
              <span className="font-mono">name</span> values (case-insensitive). Leave blank to force ops to complete in
              the HA panel.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" aria-hidden />
            DomainsReseller (zero-touch register)
          </CardTitle>
          <CardDescription>
            HMAC API for RegisterDomain on the platform HostAfrica account. When configured, paid orders register
            automatically — no ops register_url step.
            {settings?.hostafricaResellerConfigured
              ? " Ready."
              : " Incomplete — fill email, API key, and WHOIS below."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            id="ha-reseller-email"
            label="Reseller login email"
            value={hostafricaResellerEmail}
            onChange={setHostafricaResellerEmail}
            placeholder="you@company.com"
            hint="Sent as the username header."
          />
          <Field
            id="ha-reseller-key"
            label="Reseller API key"
            type="password"
            placeholder={
              settings?.hasHostafricaResellerApiKey
                ? "•••••••• (saved — leave blank to keep)"
                : "Paste DomainsReseller API key"
            }
            hint={
              settings?.hasHostafricaResellerApiKey
                ? "A key is stored. Leave blank to keep it, or clear below."
                : undefined
            }
            value={hostafricaResellerApiKey}
            onChange={setHostafricaResellerApiKey}
          />
          {settings?.hasHostafricaResellerApiKey ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => clearSecret("hostafricaResellerApiKey", "DomainsReseller API key")}
            >
              Clear reseller API key
            </Button>
          ) : null}
          <Field
            id="ha-reseller-base"
            label="Reseller API base URL"
            value={hostafricaResellerApiBaseUrl}
            onChange={setHostafricaResellerApiBaseUrl}
            placeholder="https://my.hostafrica.com/modules/addons/DomainsReseller/api/index.php"
          />
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || resellerTesting}
              onClick={async () => {
                setResellerTesting(true);
                setResellerTest(null);
                try {
                  const status = await fetchSaResellerStatus();
                  if (status.ok) {
                    setResellerTest({
                      ok: true,
                      text: `Connected.${status.credit ? ` Credits: ${status.credit}.` : ""}`,
                    });
                  } else {
                    setResellerTest({
                      ok: false,
                      text: status.error || "Reseller API rejected the request.",
                    });
                  }
                } catch (e) {
                  setResellerTest({
                    ok: false,
                    text: e instanceof Error ? e.message : "Could not reach the reseller API.",
                  });
                } finally {
                  setResellerTesting(false);
                }
              }}
            >
              {resellerTesting ? "Testing…" : "Test reseller connection"}
            </Button>
            {resellerTest ? (
              <p className={cn("text-xs", resellerTest.ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
                {resellerTest.text}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Save settings first, then test — calls GetCredits with the stored HMAC credentials.
              </p>
            )}
          </div>
          <div className="space-y-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Platform WHOIS contact</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Used for Registrant, Admin, Technical, and Billing on RegisterDomain.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="whois-fn" label="First name" value={whoisFirstname} onChange={setWhoisFirstname} />
              <Field id="whois-ln" label="Last name" value={whoisLastname} onChange={setWhoisLastname} />
              <Field id="whois-co" label="Company" value={whoisCompany} onChange={setWhoisCompany} />
              <Field id="whois-em" label="Email" value={whoisEmail} onChange={setWhoisEmail} />
              <Field id="whois-a1" label="Address line 1" value={whoisAddress1} onChange={setWhoisAddress1} />
              <Field id="whois-a2" label="Address line 2" value={whoisAddress2} onChange={setWhoisAddress2} />
              <Field id="whois-city" label="City" value={whoisCity} onChange={setWhoisCity} />
              <Field id="whois-state" label="State / county" value={whoisState} onChange={setWhoisState} />
              <Field id="whois-pc" label="Postcode" value={whoisPostcode} onChange={setWhoisPostcode} />
              <Field id="whois-cc" label="Country (ISO)" value={whoisCountry} onChange={setWhoisCountry} placeholder="KE" />
              <Field
                id="whois-phone"
                label="Phone"
                value={whoisPhone}
                onChange={setWhoisPhone}
                placeholder="+2547…"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" aria-hidden />
            Palmart M-Pesa (domain checkout)
          </CardTitle>
          <CardDescription>
            Platform KopoKopo till that receives Kenyan domain purchase payments. Turn billing stub off to require this.
            {settings?.hasPalmartStkCredentials
              ? ` Till ${settings.palmartStkTillNumber || "saved"} is configured.`
              : " Not configured yet — ops Mark paid remains the fallback."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            id="stk-client-id"
            label="Client ID"
            type="password"
            placeholder={settings?.hasPalmartStkCredentials ? "•••••••• (leave blank to keep)" : "KopoKopo client id"}
            value={palmartStkClientId}
            onChange={setPalmartStkClientId}
          />
          <Field
            id="stk-client-secret"
            label="Client secret"
            type="password"
            placeholder={
              settings?.hasPalmartStkCredentials ? "•••••••• (leave blank to keep)" : "KopoKopo client secret"
            }
            value={palmartStkClientSecret}
            onChange={setPalmartStkClientSecret}
          />
          <Field
            id="stk-api-key"
            label="API key (webhook signature)"
            type="password"
            placeholder={
              settings?.hasPalmartStkCredentials ? "•••••••• (leave blank to keep)" : "Optional but recommended"
            }
            value={palmartStkApiKey}
            onChange={setPalmartStkApiKey}
          />
          <Field
            id="stk-till"
            label="Till number"
            value={palmartStkTillNumber}
            onChange={setPalmartStkTillNumber}
            placeholder="KopoKopo till"
          />
          <Field
            id="stk-env"
            label="Environment"
            value={palmartStkEnvironment}
            onChange={setPalmartStkEnvironment}
            placeholder="sandbox or production"
            hint="Use sandbox while testing; production for live collections."
          />
          {settings?.hasPalmartStkCredentials ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => clearSecret("palmartStk", "Palmart STK credentials")}
            >
              Clear Palmart STK credentials
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="size-4" aria-hidden />
            Vercel
          </CardTitle>
          <CardDescription>
            DNS zone, records, project domains, and SSL for purchased / connected hostnames.
            {settings?.envVercelConfigured ? " Env fallback is present." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            id="vercel-token"
            label="API token"
            type="password"
            placeholder={settings?.hasVercelToken ? "•••••••• (saved — leave blank to keep)" : "Paste Vercel token"}
            value={vercelToken}
            onChange={setVercelToken}
          />
          {settings?.hasVercelToken ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => clearSecret("vercelToken", "Vercel token")}
            >
              Clear Vercel token
            </Button>
          ) : null}
          <Field
            id="vercel-team"
            label="Team ID"
            value={vercelTeamId}
            onChange={setVercelTeamId}
            placeholder="team_…"
            hint="Optional for personal accounts."
          />
          <Field
            id="vercel-project"
            label="Project ID"
            value={vercelProjectId}
            onChange={setVercelProjectId}
            placeholder="prj_…"
          />
          <Field
            id="vercel-base"
            label="API base URL"
            value={vercelApiBaseUrl}
            onChange={setVercelApiBaseUrl}
            placeholder="https://api.vercel.com"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" aria-hidden />
            Order sync
          </CardTitle>
          <CardDescription>
            Background poll advances registering → owned → provisioning → live. Requires HostAfrica + Vercel keys above.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            id="sync-enabled"
            label="Enable domain order sync"
            checked={domainOrderSyncEnabled}
            onChange={setDomainOrderSyncEnabled}
          />
          <Field
            id="sync-fixed"
            label="Poll interval (ms)"
            value={domainOrderSyncFixedDelayMs}
            onChange={setDomainOrderSyncFixedDelayMs}
          />
          <Field
            id="sync-initial"
            label="Initial delay (ms)"
            value={domainOrderSyncInitialDelayMs}
            onChange={setDomainOrderSyncInitialDelayMs}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => void load()}>
          Reload
        </Button>
        <Button type="button" disabled={busy || !settings} onClick={() => void onSave()}>
          {busy ? "Saving…" : "Save domain settings"}
        </Button>
      </div>
        </>
      ) : null}
    </div>
  );
}
