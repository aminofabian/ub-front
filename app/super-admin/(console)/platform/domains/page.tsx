"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Globe, RefreshCw } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { PlatformDomainOrdersPanel } from "@/components/super-admin/platform-domain-orders-panel";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  fetchPlatformDomainSettings,
  fetchSaResellerStatus,
  updatePlatformDomainSettings,
  type PlatformDomainSettingsRecord,
} from "@/lib/super-admin-api";

import {
  DOMAINS_NAV,
  DomainsTheatre,
  type DomainsSectionId,
} from "./_components/domains-theatre";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PRIMARY_BTN =
  "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3.5 text-white shadow-none hover:bg-[#0d6b63]";

const WHOIS_REQUIRED = [
  "firstname",
  "lastname",
  "companyname",
  "email",
  "address1",
  "city",
  "state",
  "postcode",
  "country",
  "phonenumber",
] as const;

function sectionFromHash(hash: string): DomainsSectionId | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (DOMAINS_NAV.some((item) => item.id === id)) {
    return id as DomainsSectionId;
  }
  return null;
}

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
      <Label htmlFor={id} className={dashboardLabelClass()}>
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        className={dashboardInputClass()}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <p className={dashboardHintClass()}>{hint}</p> : null}
    </div>
  );
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
    <div
      className={cn(
        "flex items-start justify-between gap-3 border bg-white px-3 py-2.5",
        HAIRLINE,
      )}
    >
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-[13px] font-semibold tracking-[-0.015em] text-foreground">
          {label}
        </span>
        {description ? (
          <span className={cn(dashboardHintClass(), "mt-0.5 block")}>
            {description}
          </span>
        ) : null}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ClearBtn({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 rounded-none"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export default function SuperAdminPlatformDomainsPage() {
  const [activeSection, setActiveSection] = useState<DomainsSectionId | null>(
    null,
  );
  const [booting, setBooting] = useState(true);
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
  const [hostafricaBillingStubEnabled, setHostafricaBillingStubEnabled] = useState(false);
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
    setBooting(true);
    setLoadError("");
    try {
      const row = await fetchPlatformDomainSettings();
      applySettings(row);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load domain settings.");
    } finally {
      setBooting(false);
    }
  }, [applySettings]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const apply = () => {
      const next = sectionFromHash(window.location.hash);
      if (next) setActiveSection(next);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

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

  const whoisComplete = WHOIS_REQUIRED.every((k) => {
    const map: Record<string, string> = {
      firstname: whoisFirstname,
      lastname: whoisLastname,
      companyname: whoisCompany,
      email: whoisEmail,
      address1: whoisAddress1,
      city: whoisCity,
      state: whoisState,
      postcode: whoisPostcode,
      country: whoisCountry,
      phonenumber: whoisPhone,
    };
    return !!map[k]?.trim();
  });

  const sectionSummary = (sectionId: DomainsSectionId): ReactNode => {
    switch (sectionId) {
      case "hostafrica":
        return (
          <>
            Key{" "}
            <span className="font-semibold">
              {settings?.hasHostafricaApiKey ? "stored" : "missing"}
            </span>
            {settings?.envHostafricaConfigured ? " · env also set" : null}
            {" · "}
            stub{" "}
            <span className="font-semibold">
              {hostafricaBillingStubEnabled ? "on" : "off"}
            </span>
          </>
        );
      case "reseller":
        return (
          <>
            <span className="font-semibold">
              {settings?.hostafricaResellerConfigured ? "Ready" : "Incomplete"}
            </span>
            {" · "}
            key{" "}
            <span className="font-semibold">
              {settings?.hasHostafricaResellerApiKey ? "yes" : "no"}
            </span>
          </>
        );
      case "mpesa":
        return (
          <>
            Credentials{" "}
            <span className="font-semibold">
              {settings?.hasPalmartStkCredentials ? "saved" : "missing"}
            </span>
            {settings?.palmartStkTillNumber
              ? ` · till ${settings.palmartStkTillNumber}`
              : null}
          </>
        );
      case "vercel":
        return (
          <>
            Token{" "}
            <span className="font-semibold">
              {settings?.hasVercelToken ? "stored" : "missing"}
            </span>
            {settings?.envVercelConfigured ? " · env also set" : null}
          </>
        );
      case "sync":
        return (
          <>
            Sync{" "}
            <span className="font-semibold">
              {domainOrderSyncEnabled ? "on" : "off"}
            </span>
            {" · "}
            every{" "}
            <span className="font-semibold tabular-nums">
              {domainOrderSyncFixedDelayMs}
            </span>
            ms
          </>
        );
      case "orders":
        return <>Merchant domain purchase pipeline and ops actions.</>;
      default:
        return null;
    }
  };

  const drawerBody = (() => {
    if (!activeSection) return null;

    if (activeSection === "orders") {
      return <PlatformDomainOrdersPanel />;
    }

    if (activeSection === "hostafrica") {
      return (
        <div className="space-y-4">
          <p className={dashboardHintClass()}>
            Registrar for .ke / .co.ke purchases. Domains register on the
            platform HostAfrica account.
            {settings?.envHostafricaConfigured ? " Env fallback is present." : ""}
          </p>
          <Field
            id="ha-key"
            label="API key"
            type="password"
            placeholder={
              settings?.hasHostafricaApiKey
                ? "•••••••• (saved — leave blank to keep)"
                : "Paste HostAfrica API token"
            }
            hint={
              settings?.hasHostafricaApiKey
                ? "A key is stored. Leave blank to keep it, or clear below."
                : undefined
            }
            value={hostafricaApiKey}
            onChange={setHostafricaApiKey}
          />
          {settings?.hasHostafricaApiKey ? (
            <ClearBtn
              disabled={busy}
              onClick={() => clearSecret("hostafricaApiKey", "HostAfrica API key")}
            >
              Clear HostAfrica key
            </ClearBtn>
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
            label="Billing stub (skip M-Pesa)"
            description="WARNING: when on, Buy skips STK entirely. Keep OFF in production."
            checked={hostafricaBillingStubEnabled}
            onChange={setHostafricaBillingStubEnabled}
          />
          <div className="space-y-1.5">
            <Label htmlFor="ha-registrant-defaults" className={dashboardLabelClass()}>
              Registrant required-data defaults
            </Label>
            <Textarea
              id="ha-registrant-defaults"
              className={cn(dashboardTextareaClass(), "min-h-[7rem] font-mono text-[11px]")}
              spellCheck={false}
              placeholder={
                "# one field per line\nCompanyName=Palmart Limited\nRegistrantID=P051234567X"
              }
              value={hostafricaRegistrantDefaultsText}
              onChange={(e) => setHostafricaRegistrantDefaultsText(e.target.value)}
            />
            <p className={dashboardHintClass()}>
              Used after purchase when HostAfrica lists the domain under
              requiring-data. Leave blank to force ops to complete in the HA
              panel.
            </p>
          </div>
        </div>
      );
    }

    if (activeSection === "reseller") {
      return (
        <div className="space-y-4">
          <p className={dashboardHintClass()}>
            HMAC API for RegisterDomain. When configured, paid orders register
            automatically.
          </p>
          {!settings?.hostafricaResellerConfigured ? (
            <ul
              className={cn(
                "border border-amber-700/30 bg-amber-50/80 px-3 py-2 text-[12px] text-amber-950",
                HAIRLINE,
              )}
            >
              <li className="font-semibold">Required before zero-touch / Test:</li>
              <li className="mt-1">
                {hostafricaResellerEmail.trim() || settings?.hostafricaResellerEmail
                  ? "✓"
                  : "○"}{" "}
                Reseller login email
              </li>
              <li>
                {settings?.hasHostafricaResellerApiKey ||
                hostafricaResellerApiKey.trim()
                  ? "✓"
                  : "○"}{" "}
                Reseller API key
              </li>
              <li>{whoisComplete ? "✓" : "○"} Platform WHOIS (all * fields)</li>
              <li className={cn(dashboardHintClass(), "mt-1")}>
                Save first, then Test — Test reads the database.
              </li>
            </ul>
          ) : null}
          <Field
            id="ha-reseller-email"
            label="Reseller login email *"
            value={hostafricaResellerEmail}
            onChange={setHostafricaResellerEmail}
            placeholder="you@company.com"
            hint="Sent as the username header."
          />
          <Field
            id="ha-reseller-key"
            label="Reseller API key *"
            type="password"
            placeholder={
              settings?.hasHostafricaResellerApiKey
                ? "•••••••• (saved — leave blank to keep)"
                : "Paste DomainsReseller API key"
            }
            value={hostafricaResellerApiKey}
            onChange={setHostafricaResellerApiKey}
          />
          {settings?.hasHostafricaResellerApiKey ? (
            <ClearBtn
              disabled={busy}
              onClick={() =>
                clearSecret("hostafricaResellerApiKey", "DomainsReseller API key")
              }
            >
              Clear reseller API key
            </ClearBtn>
          ) : null}
          <Field
            id="ha-reseller-base"
            label="Reseller API base URL"
            value={hostafricaResellerApiBaseUrl}
            onChange={setHostafricaResellerApiBaseUrl}
            placeholder="https://my.hostafrica.com/modules/addons/DomainsReseller/api/index.php"
          />
          <div className={cn("space-y-3 border p-3", HAIRLINE)}>
            <div>
              <p className="text-[13px] font-semibold tracking-[-0.015em]">
                Platform WHOIS contact *
              </p>
              <p className={cn(dashboardHintClass(), "mt-0.5")}>
                Address line 2 is optional; every other field is required.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="whois-fn" label="First name *" value={whoisFirstname} onChange={setWhoisFirstname} />
              <Field id="whois-ln" label="Last name *" value={whoisLastname} onChange={setWhoisLastname} />
              <Field id="whois-co" label="Company *" value={whoisCompany} onChange={setWhoisCompany} />
              <Field id="whois-em" label="Email *" value={whoisEmail} onChange={setWhoisEmail} />
              <Field id="whois-a1" label="Address line 1 *" value={whoisAddress1} onChange={setWhoisAddress1} />
              <Field id="whois-a2" label="Address line 2" value={whoisAddress2} onChange={setWhoisAddress2} />
              <Field id="whois-city" label="City *" value={whoisCity} onChange={setWhoisCity} />
              <Field id="whois-state" label="State / county *" value={whoisState} onChange={setWhoisState} />
              <Field id="whois-pc" label="Postcode *" value={whoisPostcode} onChange={setWhoisPostcode} />
              <Field id="whois-cc" label="Country (ISO) *" value={whoisCountry} onChange={setWhoisCountry} placeholder="KE" />
              <Field id="whois-phone" label="Phone *" value={whoisPhone} onChange={setWhoisPhone} placeholder="+2547…" />
            </div>
          </div>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-none"
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
                    const detail =
                      status.missing && status.missing.length > 0
                        ? status.missing.join("; ")
                        : status.error || "Reseller API rejected the request.";
                    setResellerTest({ ok: false, text: detail });
                  }
                } catch (e) {
                  setResellerTest({
                    ok: false,
                    text:
                      e instanceof Error
                        ? e.message
                        : "Could not reach the reseller API.",
                  });
                } finally {
                  setResellerTesting(false);
                }
              }}
            >
              {resellerTesting ? "Testing…" : "Test reseller connection"}
            </Button>
            {resellerTest ? (
              <p
                className={cn(
                  "text-[12px]",
                  resellerTest.ok
                    ? "text-[var(--pos-primary,#0f766e)]"
                    : "text-[#9a2e16]",
                )}
              >
                {resellerTest.text}
              </p>
            ) : (
              <p className={dashboardHintClass()}>
                Save settings first, then test — calls GetCredits with stored
                HMAC credentials.
              </p>
            )}
          </div>
        </div>
      );
    }

    if (activeSection === "mpesa") {
      return (
        <div className="space-y-4">
          <p className={dashboardHintClass()}>
            Platform KopoKopo till for Kenyan domain purchase payments. Turn
            billing stub off to require this.
            {settings?.hasPalmartStkCredentials
              ? ` Till ${settings.palmartStkTillNumber || "saved"} is configured.`
              : " Not configured yet."}
          </p>
          <Field
            id="stk-client-id"
            label="Client ID"
            type="password"
            placeholder={
              settings?.hasPalmartStkCredentials
                ? "•••••••• (leave blank to keep)"
                : "KopoKopo client id"
            }
            value={palmartStkClientId}
            onChange={setPalmartStkClientId}
          />
          <Field
            id="stk-client-secret"
            label="Client secret"
            type="password"
            placeholder={
              settings?.hasPalmartStkCredentials
                ? "•••••••• (leave blank to keep)"
                : "KopoKopo client secret"
            }
            value={palmartStkClientSecret}
            onChange={setPalmartStkClientSecret}
          />
          <Field
            id="stk-api-key"
            label="API key (webhook signature)"
            type="password"
            placeholder={
              settings?.hasPalmartStkCredentials
                ? "•••••••• (leave blank to keep)"
                : "Optional but recommended"
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
            <ClearBtn
              disabled={busy}
              onClick={() => clearSecret("palmartStk", "Palmart STK credentials")}
            >
              Clear Palmart STK credentials
            </ClearBtn>
          ) : null}
        </div>
      );
    }

    if (activeSection === "vercel") {
      return (
        <div className="space-y-4">
          <p className={dashboardHintClass()}>
            DNS zone, records, project domains, and SSL for purchased /
            connected hostnames.
            {settings?.envVercelConfigured ? " Env fallback is present." : ""}
          </p>
          <Field
            id="vercel-token"
            label="API token"
            type="password"
            placeholder={
              settings?.hasVercelToken
                ? "•••••••• (saved — leave blank to keep)"
                : "Paste Vercel token"
            }
            value={vercelToken}
            onChange={setVercelToken}
          />
          {settings?.hasVercelToken ? (
            <ClearBtn
              disabled={busy}
              onClick={() => clearSecret("vercelToken", "Vercel token")}
            >
              Clear Vercel token
            </ClearBtn>
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
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className={dashboardHintClass()}>
          Background poll advances registering → owned → provisioning → live.
          Requires HostAfrica + Vercel keys.
        </p>
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
      </div>
    );
  })();

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={Globe}
        eyebrow="Platform"
        title="Domains"
        description="HostAfrica (Kenyan TLDs) and Vercel DNS/SSL for merchant custom domains. Secrets are encrypted at rest."
      >
        <button
          type="button"
          disabled={busy || booting}
          onClick={() => void load()}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-none border bg-white text-[#666666]",
            HAIRLINE,
            "transition-colors hover:border-[#0f766e] hover:text-[#0f766e]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label="Refresh domain settings"
        >
          <RefreshCw
            className={cn("size-3.5", (busy || booting) && "animate-spin")}
            aria-hidden
          />
        </button>
        {activeSection && activeSection !== "orders" ? (
          <Button
            type="button"
            size="sm"
            className={PRIMARY_BTN}
            disabled={busy || !settings || Boolean(loadError)}
            onClick={() => void onSave()}
          >
            {busy ? "Saving…" : "Save settings"}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className={PRIMARY_BTN}
            onClick={() => setActiveSection("orders")}
          >
            Orders
          </Button>
        )}
      </DashboardPageHero>

      {loadError ? <DashboardFeedback kind="error" text={loadError} /> : null}
      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {success ? <DashboardFeedback kind="success" text={success} /> : null}
      {settings?.encryptionEphemeral ? (
        <DashboardFeedback
          kind="error"
          text="APP_PAYMENTS_ENCRYPTION_KEY is not set. Saved secrets work until restart, then must be re-entered."
        />
      ) : null}
      {settings && !settings.secretsReadable && settings.secretsError ? (
        <DashboardFeedback kind="error" text={settings.secretsError} />
      ) : null}

      <DomainsTheatre
        activeSectionId={activeSection}
        onActiveSectionChange={setActiveSection}
        hostafricaReady={Boolean(settings?.hasHostafricaApiKey)}
        resellerReady={Boolean(settings?.hostafricaResellerConfigured)}
        mpesaReady={Boolean(settings?.hasPalmartStkCredentials)}
        syncEnabled={domainOrderSyncEnabled}
        loading={booting || !settings}
        sectionSummary={sectionSummary}
        drawerBody={drawerBody}
        drawerFooter={
          activeSection && activeSection !== "orders" ? (
            <Button
              type="button"
              className={PRIMARY_BTN}
              disabled={busy || !settings || Boolean(loadError)}
              onClick={() => void onSave()}
            >
              {busy ? "Saving…" : "Save domain settings"}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
