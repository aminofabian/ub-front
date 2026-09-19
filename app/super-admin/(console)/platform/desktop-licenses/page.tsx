"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Mail,
  MonitorSmartphone,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
  dashboardTextareaClass,
} from "@/components/dashboard-page-ui";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

import {
  DesktopLicensesTheatre,
  type DesktopLicensePanel,
  type EmailFilter,
} from "./_components/desktop-licenses-theatre";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PRIMARY_BTN =
  "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3.5 text-white shadow-none hover:bg-[#0d6b63]";

const PLANS = [
  { value: "", label: "Same as the shop's subscription (auto)" },
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "business", label: "Business" },
  { value: "growth", label: "Growth" },
  { value: "enterprise", label: "Enterprise" },
];

function panelFromHash(hash: string): DesktopLicensePanel | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (id === "issuer") return { kind: "issuer" };
  if (id === "issue") return { kind: "issue" };
  if (id.startsWith("license-")) {
    const licenseId = id.slice("license-".length);
    if (licenseId) return { kind: "license", id: licenseId };
  }
  return null;
}

function formatExpiry(iso: string | null): string {
  if (!iso) return "never (perpetual)";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id?: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {id ? (
        <Label htmlFor={id} className={dashboardLabelClass()}>
          {label}
        </Label>
      ) : (
        <p className={dashboardLabelClass()}>{label}</p>
      )}
      {children}
    </div>
  );
}

export default function SuperAdminPlatformDesktopLicensesPage() {
  const [status, setStatus] = useState<DesktopLicenseIssuerStatus | null>(null);
  const [loadError, setLoadError] = useState("");
  const [booting, setBooting] = useState(true);
  const [issues, setIssues] = useState<DesktopLicenseIssueRecord[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [emailFilter, setEmailFilter] = useState<EmailFilter>("all");
  const [selected, setSelected] = useState<DesktopLicensePanel | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [plan, setPlan] = useState("");
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
  const [generatedPublicKey, setGeneratedPublicKey] = useState<string | null>(
    null,
  );
  const [pubCopied, setPubCopied] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await fetchDesktopLicenseIssuerStatus());
      setLoadError("");
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : "Could not check the license issuer.",
      );
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

  const load = useCallback(async () => {
    setBooting(true);
    await Promise.all([loadStatus(), loadIssues()]);
    setBooting(false);
  }, [loadStatus, loadIssues]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const apply = () => {
      const next = panelFromHash(window.location.hash);
      if (next) setSelected(next);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  async function copyToken() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(
        "Could not copy to clipboard — select the token and copy manually.",
      );
    }
  }

  function buildPayload() {
    return {
      businessName: businessName.trim(),
      ...(plan ? { plan } : {}),
      ...(perpetual
        ? { perpetual: true }
        : { days: Math.max(1, Math.min(36500, Number(days) || 365)) }),
      fingerprint: fingerprint.trim(),
    };
  }

  async function onSubmit(emailIt: boolean) {
    const name = businessName.trim();
    if (!name) {
      toast.error(
        "Enter the shop name the license is issued to (must match the till exactly).",
      );
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
        ? await issueAndEmailDesktopLicense({
            ...buildPayload(),
            email: target,
          })
        : await issueDesktopLicense(buildPayload());
      setResult(next);
      toast.success(
        emailIt
          ? `License issued and emailed to ${target}.`
          : "License issued.",
      );
      void loadIssues();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not issue the license.",
      );
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
      toast.error(
        e instanceof Error ? e.message : "Could not re-email the license.",
      );
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
      toast.error(
        "Could not copy to clipboard — select the key and copy manually.",
      );
    }
  }

  async function onSaveIssuerKey() {
    const priv = keyPrivate.trim();
    if (!priv) {
      toast.error(
        "Paste the PRIVATE_KEY from backend/scripts/generate-license.sh keys (or generate a pair below).",
      );
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
      toast.error(
        e instanceof Error ? e.message : "Could not save the signing key.",
      );
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
          const generated = await generateDesktopLicenseIssuerKey();
          setGeneratedPublicKey(generated.publicKey);
          setKeyPrivate("");
          setKeyPublic("");
          await loadStatus();
          toast.success("New key pair generated and active.");
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Could not generate a key pair.",
          );
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
          toast.error(
            e instanceof Error
              ? e.message
              : "Could not remove the signing key.",
          );
        } finally {
          setKeyBusy(false);
        }
      },
    });
  }

  const canIssue = !loadError && status?.configured === true && !busy;
  const selectedLicense =
    selected?.kind === "license"
      ? (issues.find((row) => row.id === selected.id) ?? null)
      : null;

  const drawerBody = (() => {
    if (!selected) return null;

    if (selected.kind === "issuer") {
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            {status?.configured ? (
              <span className="inline-flex items-center gap-1.5 border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--pos-primary,#0f766e)]">
                <ShieldCheck className="size-3" aria-hidden /> Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 border border-amber-700/35 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                <ShieldAlert className="size-3" aria-hidden /> Not configured
              </span>
            )}
            <span className={dashboardHintClass()}>
              Source:{" "}
              {status?.source === "env"
                ? "deployment environment"
                : status?.source === "console"
                  ? "this console (encrypted)"
                  : "none"}
              {status?.updatedAt
                ? ` · updated ${new Date(status.updatedAt).toLocaleString()}`
                : ""}
            </span>
          </div>

          {status?.source === "env" ? (
            <p
              className={cn(
                "border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] px-3 py-2 text-[12px] leading-relaxed text-muted-foreground",
                HAIRLINE,
              )}
            >
              <span className="font-semibold text-foreground">
                APP_DESKTOP_LICENSE_PRIVATE_KEY
              </span>{" "}
              is set in the deployment environment and takes precedence over any
              key saved here. Remove it (and restart) to use the console-managed
              key.
            </p>
          ) : null}

          {status?.encryptionEphemeral ? (
            <p className="flex items-start gap-2 border border-amber-700/30 bg-amber-50/80 px-3 py-2 text-[12px] leading-relaxed text-amber-950">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                This server has no persistent{" "}
                <code className="font-mono text-[11px]">
                  APP_PAYMENTS_ENCRYPTION_KEY
                </code>{" "}
                — a key saved here becomes unreadable after a restart. Set it in
                the deployment environment first.
              </span>
            </p>
          ) : null}

          {status?.publicKey ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className={dashboardLabelClass()}>Public key in use</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-none"
                  onClick={() => void copyPublicKey()}
                >
                  {pubCopied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {pubCopied ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre
                className={cn(
                  "overflow-x-auto border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] px-3 py-2 font-mono text-[11px] break-all whitespace-pre-wrap",
                  HAIRLINE,
                )}
              >
                {status.publicKey}
              </pre>
              <p className={dashboardHintClass()}>
                Must match{" "}
                <code className="font-mono text-[10px]">
                  app.desktop.license.public-key
                </code>{" "}
                in the desktop JAR. If it differs, rebuild before issuing.
              </p>
            </div>
          ) : null}

          {generatedPublicKey ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-amber-950">
                  New PUBLIC_KEY — bake into the next desktop release
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-none"
                  onClick={() => void copyPublicKey()}
                >
                  {pubCopied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {pubCopied ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="overflow-x-auto border border-amber-700/30 bg-amber-50/80 px-3 py-2 font-mono text-[11px] break-all whitespace-pre-wrap text-amber-950">
                {generatedPublicKey}
              </pre>
              <p className="text-[11px] leading-relaxed text-amber-950/80">
                Set{" "}
                <code className="font-mono text-[10px]">
                  app.desktop.license.public-key
                </code>{" "}
                to this value, rebuild, and ship — installs with the old public
                key will reject licenses issued from now on.
              </p>
            </div>
          ) : null}

          <div className={cn("space-y-3 border p-3", HAIRLINE)}>
            <p className="text-[13px] font-semibold tracking-[-0.015em]">
              Paste a key pair from the script
            </p>
            <Field id="issuer-private" label="PRIVATE_KEY">
              <textarea
                id="issuer-private"
                rows={2}
                className={cn(
                  dashboardTextareaClass(),
                  "min-h-[64px] font-mono text-[11px]",
                )}
                placeholder="base64 PKCS#8 — from backend/scripts/generate-license.sh keys"
                value={keyPrivate}
                onChange={(e) => setKeyPrivate(e.target.value)}
                disabled={keyBusy}
              />
            </Field>
            <Field id="issuer-public" label="PUBLIC_KEY (optional)">
              <textarea
                id="issuer-public"
                rows={2}
                className={cn(
                  dashboardTextareaClass(),
                  "min-h-[64px] font-mono text-[11px]",
                )}
                placeholder="Matching public key — checked on save"
                value={keyPublic}
                onChange={(e) => setKeyPublic(e.target.value)}
                disabled={keyBusy}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className={PRIMARY_BTN}
                onClick={() => void onSaveIssuerKey()}
                disabled={keyBusy}
              >
                {keyBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <KeyRound className="size-3.5" />
                )}
                Save signing key
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-none"
                onClick={onGenerateIssuerKey}
                disabled={keyBusy}
              >
                <Wand2 className="size-3.5" />
                Generate new key pair
              </Button>
              {status?.source === "console" ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 rounded-none"
                  onClick={onClearIssuerKey}
                  disabled={keyBusy}
                >
                  <Trash2 className="size-3.5" />
                  Remove key
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    if (selected.kind === "issue") {
      return (
        <div className="space-y-4">
          {!status?.configured && !loadError ? (
            <p className="flex items-start gap-2 border border-amber-700/30 bg-amber-50/80 px-3 py-2 text-[12px] leading-relaxed text-amber-950">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>
                The license issuer is not configured. Open{" "}
                <button
                  type="button"
                  className="font-semibold underline underline-offset-2"
                  onClick={() => setSelected({ kind: "issuer" })}
                >
                  Signing key
                </button>{" "}
                first.
              </span>
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              id="lic-business"
              label="Business name"
              className="sm:col-span-2"
            >
              <input
                id="lic-business"
                className={dashboardInputClass()}
                placeholder="e.g. Fabian's Shop"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={!canIssue}
              />
            </Field>

            <Field id="lic-plan" label="Plan">
              <select
                id="lic-plan"
                className={dashboardSelectClass()}
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
              <p className={cn(dashboardHintClass(), "mt-1")}>
                Blank copies the shop&apos;s cloud subscription so till and
                online stay in sync.
              </p>
            </Field>

            <Field id="lic-days" label="Validity (days)">
              <input
                id="lic-days"
                type="number"
                min={1}
                max={36500}
                className={dashboardInputClass()}
                value={perpetual ? "" : days}
                placeholder="365"
                disabled={!canIssue || perpetual}
                onChange={(e) => setDays(e.target.value)}
              />
              <div className="mt-2 flex items-center gap-2">
                <Switch
                  id="lic-perpetual"
                  checked={perpetual}
                  disabled={!canIssue}
                  onCheckedChange={setPerpetual}
                />
                <label
                  htmlFor="lic-perpetual"
                  className="text-[12px] text-muted-foreground"
                >
                  Perpetual (never expires)
                </label>
              </div>
            </Field>

            <Field
              id="lic-fingerprint"
              label="Machine ID (required)"
              className="sm:col-span-2"
            >
              <input
                id="lic-fingerprint"
                className={cn(dashboardInputClass(), "font-mono text-[11px]")}
                placeholder="64-char Machine ID from the till (Settings → License)"
                value={fingerprint}
                onChange={(e) => setFingerprint(e.target.value)}
                disabled={!canIssue}
              />
              <p className={cn(dashboardHintClass(), "mt-1")}>
                The key only works on the machine with this ID.
              </p>
            </Field>

            <Field
              id="lic-email"
              label="Email to customer (optional)"
              className="sm:col-span-2"
            >
              <input
                id="lic-email"
                type="email"
                className={dashboardInputClass()}
                placeholder="owner@shop.co.ke — leave blank to copy the token yourself"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!canIssue}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className={PRIMARY_BTN}
              disabled={!canIssue || !email.trim()}
              onClick={() => void onSubmit(true)}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Mail className="size-3.5" />
              )}
              Issue &amp; email
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-none"
              disabled={!canIssue}
              onClick={() => void onSubmit(false)}
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <KeyRound className="size-3.5" />
              )}
              Issue (copy token)
            </Button>
          </div>

          {result ? (
            <div className={cn("space-y-2 border p-3", HAIRLINE)}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold tracking-[-0.015em]">
                    Issued license
                  </p>
                  <p className={dashboardHintClass()}>
                    {result.businessName} · {result.plan} · expires{" "}
                    {formatExpiry(result.expiresAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 rounded-none"
                  onClick={() => void copyToken()}
                >
                  {copied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className={cn(dashboardHintClass(), "leading-relaxed")}>
                Shop owner pastes this into{" "}
                <span className="font-semibold text-foreground">
                  Kiosk Desktop → Settings → License
                </span>
                .
                {result.emailSent && result.emailedTo
                  ? ` Emailed to ${result.emailedTo}.`
                  : " Not emailed — copy it below."}
              </p>
              <pre
                className={cn(
                  "overflow-x-auto border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] px-3 py-2 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap",
                  HAIRLINE,
                )}
              >
                {result.token}
              </pre>
            </div>
          ) : null}
        </div>
      );
    }

    if (!selectedLicense) {
      return (
        <p className={dashboardHintClass()}>
          This license is not in the current list. Refresh and try again.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-[15px] font-semibold tracking-[-0.02em]">
            {selectedLicense.businessName}
          </p>
          <p className={cn(dashboardHintClass(), "capitalize")}>
            {selectedLicense.plan} · expires{" "}
            {formatExpiry(selectedLicense.expiresAt)}
          </p>
        </div>

        <dl className="grid gap-2 text-[12px]">
          <div className={cn("flex justify-between gap-3 border px-3 py-2", HAIRLINE)}>
            <dt className="text-muted-foreground">Issued</dt>
            <dd className="font-medium tabular-nums">
              {new Date(selectedLicense.createdAt).toLocaleString()}
            </dd>
          </div>
          <div className={cn("flex justify-between gap-3 border px-3 py-2", HAIRLINE)}>
            <dt className="text-muted-foreground">Recipient</dt>
            <dd className="max-w-[60%] truncate text-right font-medium">
              {selectedLicense.recipientEmail ?? "not emailed"}
            </dd>
          </div>
          {selectedLicense.machineFingerprint ? (
            <div className={cn("space-y-1 border px-3 py-2", HAIRLINE)}>
              <dt className="text-muted-foreground">Machine ID</dt>
              <dd className="break-all font-mono text-[11px]">
                {selectedLicense.machineFingerprint}
              </dd>
            </div>
          ) : null}
        </dl>

        {selectedLicense.recipientEmail ? (
          <Button
            type="button"
            className={PRIMARY_BTN}
            disabled={resendingId === selectedLicense.id}
            onClick={() => void onResend(selectedLicense.id)}
          >
            {resendingId === selectedLicense.id ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Mail className="size-3.5" />
            )}
            Resend email
          </Button>
        ) : (
          <p className={dashboardHintClass()}>
            This issue was copy-only — no email on file to resend. Issue a new
            token if the shop needs another key.
          </p>
        )}
      </div>
    );
  })();

  const drawerFooter =
    selected?.kind === "issuer" ? (
      <Button
        type="button"
        className={PRIMARY_BTN}
        onClick={() => void onSaveIssuerKey()}
        disabled={keyBusy}
      >
        {keyBusy ? "Saving…" : "Save signing key"}
      </Button>
    ) : selected?.kind === "issue" ? (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className={PRIMARY_BTN}
          disabled={!canIssue || !email.trim()}
          onClick={() => void onSubmit(true)}
        >
          {busy ? "Issuing…" : "Issue & email"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-none"
          disabled={!canIssue}
          onClick={() => void onSubmit(false)}
        >
          {busy ? "Issuing…" : "Issue (copy)"}
        </Button>
      </div>
    ) : selectedLicense?.recipientEmail ? (
      <Button
        type="button"
        className={PRIMARY_BTN}
        disabled={resendingId === selectedLicense.id}
        onClick={() => void onResend(selectedLicense.id)}
      >
        {resendingId === selectedLicense.id ? "Sending…" : "Resend email"}
      </Button>
    ) : undefined;

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={MonitorSmartphone}
        eyebrow="Platform"
        title="Desktop licenses"
        description="Issue Ed25519-signed tokens for Kiosk Desktop tills. The customer pastes the token into Settings → License."
      >
        <button
          type="button"
          disabled={busy || keyBusy || booting || issuesLoading}
          onClick={() => void load()}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-none border bg-white text-[#666666]",
            HAIRLINE,
            "transition-colors hover:border-[#0f766e] hover:text-[#0f766e]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label="Refresh desktop licenses"
        >
          <RefreshCw
            className={cn(
              "size-3.5",
              (booting || issuesLoading) && "animate-spin",
            )}
            aria-hidden
          />
        </button>
        <Button
          type="button"
          size="sm"
          className={PRIMARY_BTN}
          disabled={!status?.configured}
          onClick={() => setSelected({ kind: "issue" })}
        >
          Issue license
        </Button>
      </DashboardPageHero>

      {loadError ? <DashboardFeedback kind="error" text={loadError} /> : null}
      {!loadError && status && !status.configured ? (
        <DashboardFeedback
          kind="warning"
          text="The license issuer is not configured. Open Signing key and paste or generate an Ed25519 key — stored encrypted, no restart needed."
        />
      ) : null}
      {status?.encryptionEphemeral ? (
        <DashboardFeedback
          kind="error"
          text="APP_PAYMENTS_ENCRYPTION_KEY is not set on the server. Console-managed signing keys will be lost on restart until that key is set."
        />
      ) : null}

      <DesktopLicensesTheatre
        status={status}
        issues={issues}
        loading={booting}
        issuesLoading={issuesLoading}
        emailFilter={emailFilter}
        onEmailFilterChange={setEmailFilter}
        selected={selected}
        onSelect={setSelected}
        onClearSelection={() => setSelected(null)}
        drawerBody={drawerBody}
        drawerFooter={drawerFooter}
      />
    </div>
  );
}
