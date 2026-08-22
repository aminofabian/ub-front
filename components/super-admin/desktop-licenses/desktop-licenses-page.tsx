"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wand2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { SaSection, saSelectClass } from "@/components/super-admin/sa-section";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  clearDesktopLicenseIssuerKey,
  fetchDesktopLicenseIssuerStatus,
  fetchDesktopLicenseIssues,
  generateDesktopLicenseIssuerKey,
  issueAndEmailDesktopLicense,
  issueDesktopLicense,
  resendDesktopLicense,
  setDesktopLicenseIssuerKey,
  type DesktopLicenseIssueRecord,
  type DesktopLicenseIssueResult,
  type DesktopLicenseIssuerStatus,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50";

const LABEL_CLASS = "text-sm font-medium leading-none text-foreground";

const PLANS = [
  { value: "shop", label: "Shop (full POS)" },
  { value: "counter", label: "Counter (single till)" },
  { value: "lan", label: "LAN server" },
];

function formatExpiry(iso: string | null): string {
  if (!iso) return "never (perpetual)";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function DesktopLicensesPage() {
  const [status, setStatus] = useState<DesktopLicenseIssuerStatus | null>(null);
  const [loadError, setLoadError] = useState("");
  const [issues, setIssues] = useState<DesktopLicenseIssueRecord[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [plan, setPlan] = useState("shop");
  const [days, setDays] = useState("365");
  const [perpetual, setPerpetual] = useState(false);
  const [fingerprint, setFingerprint] = useState("");
  const [email, setEmail] = useState("");

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DesktopLicenseIssueResult | null>(null);
  const [copied, setCopied] = useState(false);

  const [keyPrivate, setKeyPrivate] = useState("");
  const [keyPublic, setKeyPublic] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [generatedPublicKey, setGeneratedPublicKey] = useState<string | null>(null);
  const [pubCopied, setPubCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await fetchDesktopLicenseIssuerStatus());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not check the license issuer.");
    }
  }, []);

  const loadIssues = useCallback(async () => {
    setIssuesLoading(true);
    try {
      setIssues(await fetchDesktopLicenseIssues(50));
    } catch {
      /* the list is best-effort — the issue form still works */
    } finally {
      setIssuesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    void loadIssues();
  }, [loadStatus, loadIssues]);

  async function copyToken() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard — select the token and copy manually.");
    }
  }

  function buildPayload() {
    return {
      businessName: businessName.trim(),
      plan,
      ...(perpetual
        ? { perpetual: true }
        : { days: Math.max(1, Math.min(36500, Number(days) || 365)) }),
      fingerprint: fingerprint.trim(),
    };
  }

  async function onSubmit(emailIt: boolean) {
    const name = businessName.trim();
    if (!name) {
      toast.error("Enter the shop name the license is issued to (must match the till exactly).");
      return;
    }
    const machineId = fingerprint.trim();
    if (!machineId) {
      toast.error(
        "Machine ID is required — ask the shop owner for the Machine ID shown in Kiosk Desktop → Settings → License.",
      );
      return;
    }
    const target = email.trim();
    if (emailIt && !target) {
      toast.error("Enter the email address to send the token to.");
      return;
    }
    setBusy(true);
    try {
      const next = emailIt
        ? await issueAndEmailDesktopLicense({ ...buildPayload(), email: target })
        : await issueDesktopLicense(buildPayload());
      setResult(next);
      toast.success(emailIt ? `License issued and emailed to ${target}.` : "License issued.");
      void loadIssues();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not issue the license.");
    } finally {
      setBusy(false);
    }
  }

  async function onResend(id: string) {
    setResendingId(id);
    try {
      await resendDesktopLicense(id);
      toast.success("License token re-emailed.");
      void loadIssues();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not re-email the license.");
    } finally {
      setResendingId(null);
    }
  }

  async function copyPublicKey() {
    const value = generatedPublicKey ?? status?.publicKey ?? null;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setPubCopied(true);
      setTimeout(() => setPubCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard — select the key and copy manually.");
    }
  }

  async function onSaveIssuerKey() {
    const priv = keyPrivate.trim();
    if (!priv) {
      toast.error("Paste the PRIVATE_KEY from backend/scripts/generate-license.sh keys (or generate a pair below).");
      return;
    }
    setKeyBusy(true);
    try {
      const next = await setDesktopLicenseIssuerKey(priv, keyPublic);
      setStatus(next);
      setKeyPrivate("");
      setKeyPublic("");
      setGeneratedPublicKey(null);
      toast.success("Signing key saved — license issuance is now enabled.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the signing key.");
    } finally {
      setKeyBusy(false);
    }
  }

  function onGenerateIssuerKey() {
    showThemedConfirmToast({
      id: "generate-issuer-key",
      title: "Generate a new license signing key?",
      description:
        "This replaces the signing key in the console. Installs already shipped keep verifying against the public key baked into their JAR — licenses issued after this change will be REJECTED by those installs until a new desktop release ships with the new PUBLIC_KEY.\n\nOnly do this if you are ready to rebuild the desktop app.",
      confirmLabel: "Generate key",
      onConfirm: async () => {
        setKeyBusy(true);
        try {
          const result = await generateDesktopLicenseIssuerKey();
          setGeneratedPublicKey(result.publicKey);
          setKeyPrivate("");
          setKeyPublic("");
          await loadStatus();
          toast.success("New key pair generated and active.");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not generate a key pair.");
        } finally {
          setKeyBusy(false);
        }
      },
    });
  }

  function onClearIssuerKey() {
    showThemedConfirmToast({
      id: "clear-issuer-key",
      title: "Remove the console-managed signing key?",
      description:
        "License issuance will be disabled unless APP_DESKTOP_LICENSE_PRIVATE_KEY is set in the deployment environment.",
      confirmLabel: "Remove key",
      onConfirm: async () => {
        setKeyBusy(true);
        try {
          const next = await clearDesktopLicenseIssuerKey();
          setStatus(next);
          setGeneratedPublicKey(null);
          toast.success("Console-managed signing key removed.");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not remove the signing key.");
        } finally {
          setKeyBusy(false);
        }
      },
    });
  }

  const canIssue = !loadError && status?.configured === true && !busy;

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Desktop licenses"
        description="Issue Ed25519-signed license tokens for Kiosk Desktop installs. The customer pastes the token into Settings → License on the till — the signature verifies against the public key baked into the app."
      />

      {loadError ? (
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {!loadError && status && !status.configured ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3.5 text-sm leading-relaxed text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium">The license issuer is not configured.</p>
            <p className="mt-1">
              Set the signing key in the <b>License issuer key</b> section below — it is
              stored encrypted in the platform database, so no deployment changes or
              restart are needed.
            </p>
          </div>
        </div>
      ) : null}

      <SaSection
        title="License issuer key"
        description="The Ed25519 private key that signs desktop licenses. Save it here (stored encrypted in the platform database, picked up immediately — no restart) or via APP_DESKTOP_LICENSE_PRIVATE_KEY on the deployment. The matching public key must ship inside the desktop app (app.desktop.license.public-key)."
      >
        <div className="grid max-w-2xl gap-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {status?.configured ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="size-3.5" aria-hidden /> Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                <ShieldAlert className="size-3.5" aria-hidden /> Not configured
              </span>
            )}
            <span className="text-muted-foreground">
              Source:{" "}
              {status?.source === "env"
                ? "deployment environment (APP_DESKTOP_LICENSE_PRIVATE_KEY)"
                : status?.source === "console"
                  ? "this console (stored encrypted)"
                  : "none"}
              {status?.updatedAt
                ? ` · updated ${new Date(status.updatedAt).toLocaleString()}`
                : ""}
            </span>
          </div>

          {status?.source === "env" ? (
            <p className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              <b>APP_DESKTOP_LICENSE_PRIVATE_KEY</b> is set in the deployment environment and
              takes precedence over any key saved here. Remove it (and restart) to use the
              console-managed key.
            </p>
          ) : null}

          {status?.encryptionEphemeral ? (
            <p className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-xs leading-relaxed text-amber-950 dark:border-amber-500/30 dark:text-amber-50">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                This server has no persistent <code>APP_PAYMENTS_ENCRYPTION_KEY</code> — a key
                saved here becomes unreadable after a restart. Set it in the deployment
                environment first.
              </span>
            </p>
          ) : null}

          {status?.publicKey ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Public key in use</p>
                <Button type="button" size="sm" variant="outline" onClick={() => void copyPublicKey()}>
                  {pubCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {pubCopied ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="mt-1.5 overflow-x-auto rounded-lg border border-border/70 bg-muted/30 px-3 py-2 font-mono text-xs break-all whitespace-pre-wrap">
                {status.publicKey}
              </pre>
              <p className="mt-1 text-xs text-muted-foreground">
                Must match <code>app.desktop.license.public-key</code> in the desktop JAR
                (application-desktop.properties). If it differs, rebuild the desktop app before
                issuing.
              </p>
            </div>
          ) : null}

          {generatedPublicKey ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-amber-950 dark:text-amber-50">
                  New PUBLIC_KEY — bake into the next desktop release
                </p>
                <Button type="button" size="sm" variant="outline" onClick={() => void copyPublicKey()}>
                  {pubCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {pubCopied ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="mt-1.5 overflow-x-auto rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2 font-mono text-xs break-all whitespace-pre-wrap">
                {generatedPublicKey}
              </pre>
              <p className="mt-1 text-xs text-amber-950/80 dark:text-amber-50/80">
                Set <code>app.desktop.license.public-key</code> to this value, rebuild, and ship —
                installs with the old public key will reject licenses issued from now on.
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 rounded-xl border border-border/70 p-4">
            <p className="text-sm font-medium">Paste a key pair from the script</p>
            <div>
              <label className={LABEL_CLASS} htmlFor="issuer-private">
                PRIVATE_KEY
              </label>
              <textarea
                id="issuer-private"
                rows={2}
                className={cn(INPUT_CLASS, "mt-1.5 font-mono text-xs")}
                placeholder="base64 PKCS#8 — from backend/scripts/generate-license.sh keys"
                value={keyPrivate}
                onChange={(e) => setKeyPrivate(e.target.value)}
                disabled={keyBusy}
              />
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="issuer-public">
                PUBLIC_KEY <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="issuer-public"
                rows={2}
                className={cn(INPUT_CLASS, "mt-1.5 font-mono text-xs")}
                placeholder="Matching public key — checked on save (must pair with the private key)"
                value={keyPublic}
                onChange={(e) => setKeyPublic(e.target.value)}
                disabled={keyBusy}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={() => void onSaveIssuerKey()} disabled={keyBusy}>
                {keyBusy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                Save signing key
              </Button>
              <Button type="button" variant="outline" onClick={onGenerateIssuerKey} disabled={keyBusy}>
                <Wand2 className="size-4" />
                Generate new key pair
              </Button>
              {status?.source === "console" ? (
                <Button type="button" variant="ghost" onClick={onClearIssuerKey} disabled={keyBusy}>
                  <Trash2 className="size-4" />
                  Remove key
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </SaSection>

      <SaSection
        title="Issue a license"
        description="The business name must match the shop name entered in the till's first-run wizard exactly (case-sensitive)."
      >
        <div className="grid max-w-2xl gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="lic-business">
                Business name
              </label>
              <input
                id="lic-business"
                className={cn(INPUT_CLASS, "mt-1.5")}
                placeholder="e.g. Fabian's Shop"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={!canIssue}
              />
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="lic-plan">
                Plan
              </label>
              <select
                id="lic-plan"
                className={cn(saSelectClass, "mt-1.5")}
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                disabled={!canIssue}
              >
                {PLANS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASS} htmlFor="lic-days">
                Validity (days)
              </label>
              <input
                id="lic-days"
                type="number"
                min={1}
                max={36500}
                className={cn(INPUT_CLASS, "mt-1.5")}
                value={perpetual ? "" : days}
                placeholder="365"
                disabled={!canIssue || perpetual}
                onChange={(e) => setDays(e.target.value)}
              />
              <div className="mt-2">
                <Switch
                  id="lic-perpetual"
                  checked={perpetual}
                  disabled={!canIssue}
                  onCheckedChange={setPerpetual}
                />
                <label htmlFor="lic-perpetual" className="ml-2 text-sm text-muted-foreground">
                  Perpetual (never expires)
                </label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="lic-fingerprint">
                Machine ID (required)
              </label>
              <input
                id="lic-fingerprint"
                className={cn(INPUT_CLASS, "mt-1.5 font-mono text-xs")}
                placeholder="64-char Machine ID from the till (Settings → License)"
                value={fingerprint}
                onChange={(e) => setFingerprint(e.target.value)}
                disabled={!canIssue}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The key only works on the machine with this ID — this is what
                stops a license being used on another shop's computer.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} htmlFor="lic-email">
                Email to customer (optional)
              </label>
              <input
                id="lic-email"
                type="email"
                className={cn(INPUT_CLASS, "mt-1.5")}
                placeholder="owner@shop.co.ke — leave blank to copy the token yourself"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!canIssue}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={!canIssue || !email.trim()}
              onClick={() => void onSubmit(true)}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              Issue &amp; email
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canIssue}
              onClick={() => void onSubmit(false)}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              Issue (copy token)
            </Button>
          </div>
        </div>
      </SaSection>

      {result ? (
        <SaSection
          title="Issued license"
          description={`${result.businessName} · ${result.plan} · expires ${formatExpiry(result.expiresAt)}`}
          actions={
            <Button type="button" size="sm" variant="outline" onClick={() => void copyToken()}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy token"}
            </Button>
          }
        >
          <p className="text-xs leading-relaxed text-muted-foreground">
            Send this token to the shop owner. They open{" "}
            <b>Kiosk Desktop → Settings → License</b>, paste it, and click{" "}
            <b>Apply license</b>.
            {result.emailSent && result.emailedTo ? (
              <>
                {" "}
                Emailed to <b>{result.emailedTo}</b>.
              </>
            ) : (
              " It was not emailed — copy it below."
            )}
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border/70 bg-muted/30 px-4 py-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
            {result.token}
          </pre>
        </SaSection>
      ) : null}

      <SaSection
        title="Recent licenses"
        description="Everything issued from this console — resend the email or re-issue an expired one."
        actions={
          <Button type="button" size="sm" variant="ghost" onClick={() => void loadIssues()} disabled={issuesLoading}>
            <RefreshCw className={cn("size-4", issuesLoading && "animate-spin")} />
            Refresh
          </Button>
        }
      >
        {issues.length === 0 && !issuesLoading ? (
          <p className="text-sm text-muted-foreground">No licenses issued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Shop</th>
                  <th className="px-3 py-2 font-medium">Plan</th>
                  <th className="px-3 py-2 font-medium">Expires</th>
                  <th className="px-3 py-2 font-medium">Sent to</th>
                  <th className="px-3 py-2 font-medium">Issued</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {issues.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2.5 font-medium">{row.businessName}</td>
                    <td className="px-3 py-2.5 capitalize">{row.plan}</td>
                    <td className="px-3 py-2.5">{formatExpiry(row.expiresAt)}</td>
                    <td className="px-3 py-2.5">
                      {row.recipientEmail ? (
                        <span className="inline-flex items-center gap-1.5">
                          {row.emailSent ? (
                            <Mail className="size-3.5 text-muted-foreground" aria-hidden />
                          ) : null}
                          {row.recipientEmail}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">not emailed</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {row.recipientEmail ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={resendingId === row.id}
                          onClick={() => void onResend(row.id)}
                        >
                          {resendingId === row.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Mail className="size-3.5" />
                          )}
                          Resend
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SaSection>
    </div>
  );
}
