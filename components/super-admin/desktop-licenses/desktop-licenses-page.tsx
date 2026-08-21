"use client";

import { useCallback, useEffect, useState } from "react";

import { Check, Copy, KeyRound, Loader2, Mail, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { SaSection, saSelectClass } from "@/components/super-admin/sa-section";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  fetchDesktopLicenseIssuerStatus,
  fetchDesktopLicenseIssues,
  issueAndEmailDesktopLicense,
  issueDesktopLicense,
  resendDesktopLicense,
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
      ...(fingerprint.trim() ? { fingerprint: fingerprint.trim() } : {}),
    };
  }

  async function onSubmit(emailIt: boolean) {
    const name = businessName.trim();
    if (!name) {
      toast.error("Enter the shop name the license is issued to (must match the till exactly).");
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
            <p className="font-medium">The license issuer is not configured on this deployment.</p>
            <p className="mt-1">
              Set the vendor private key (<code className="break-all">APP_DESKTOP_LICENSE_PRIVATE_KEY</code>)
              on the cloud deployment and restart. Generate it with{" "}
              <code>backend/scripts/generate-license.sh keys</code> — the matching{" "}
              <code>PUBLIC_KEY</code> is what ships in the desktop JAR.
            </p>
          </div>
        </div>
      ) : null}

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
                Machine fingerprint (optional)
              </label>
              <input
                id="lic-fingerprint"
                className={cn(INPUT_CLASS, "mt-1.5 font-mono text-xs")}
                placeholder="SHA-256 of MAC + disk — carried in the token, not yet enforced"
                value={fingerprint}
                onChange={(e) => setFingerprint(e.target.value)}
                disabled={!canIssue}
              />
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
