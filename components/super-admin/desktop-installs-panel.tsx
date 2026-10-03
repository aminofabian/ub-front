"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  Send,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  fetchDesktopInstalls,
  fetchInstallIssues,
  issueAndEmailForInstall,
  resendDesktopLicense,
  type DesktopInstallRow,
  type InstallIssueRow,
  type IssueForInstallResult,
} from "@/lib/super-admin-api";

/**
 * Super Admin → Platform → Desktop licenses → Installs.
 *
 * Every Kiosk Desktop till that comes online checks in with its Machine ID, so
 * the install shows up here automatically. "Generate & email" issues a
 * machine-bound key and sends it to the shop owner in one click; installs for a
 * paid, connected shop are activated automatically on check-in.
 */
export function DesktopInstallsPanel() {
  const [rows, setRows] = useState<DesktopInstallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<IssueForInstallResult | null>(null);
  const [viewing, setViewing] = useState<DesktopInstallRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await fetchDesktopInstalls(50));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load desktop installs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Issues a machine-bound key and emails it. Returns the result so the detail
   * drawer can refresh its history; rethrows so callers can stay quiet.
   */
  const activate = useCallback(
    async (install: DesktopInstallRow): Promise<IssueForInstallResult | null> => {
      setBusyId(install.installId);
      try {
        const issued = await issueAndEmailForInstall(install.installId, {});
        setResult(issued);
        if (issued.emailSent) {
          toast.success(`Activation key emailed to ${issued.emailedTo ?? "the shop owner"}.`);
        } else {
          toast.message("Activation key issued — copy the token below.");
        }
        await load();
        return issued;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not issue an activation key.");
        return null;
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Desktop installs
          </h2>
          <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Kiosk Desktop tills that have checked in with their Machine ID. Issue
            an activation key in one click — no need to ask the shop for it.
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          )}
          Refresh
        </Button>
      </div>

      <div className="px-4 py-5 sm:px-5">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : rows.length === 0 && !loading ? (
          <p className="text-sm text-muted-foreground">
            No desktop installs have checked in yet. A till appears here the first
            time it has internet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/70 text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
                  <th scope="col" className="px-2 py-2 font-medium">Shop</th>
                  <th scope="col" className="px-2 py-2 font-medium">Machine ID</th>
                  <th scope="col" className="px-2 py-2 font-medium">License</th>
                  <th scope="col" className="px-2 py-2 font-medium">Last seen</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Activation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((row) => (
                  <tr key={row.installId}>
                    <td className="px-2 py-2.5 align-top">
                      <div className="font-medium">{row.businessName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.platform ?? "unknown OS"}
                        {row.appVersion ? ` · v${row.appVersion}` : ""}
                        {row.cloudBusinessId ? " · connected" : " · local only"}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 align-top">
                      <MachineIdCell machineId={row.machineId} />
                    </td>
                    <td className="px-2 py-2.5 align-top">
                      <LicenseCell row={row} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 align-top text-muted-foreground">
                      {formatTime(row.lastSeenAt)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 align-top text-right">
                      {row.autoIssuedAt ? (
                        <span className="inline-flex items-center gap-1 border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--pos-primary,#0f766e)]">
                          <Wand2 className="h-3 w-3" aria-hidden />
                          Auto-activated
                        </span>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-2 h-7 px-2 text-xs"
                        onClick={() => setViewing(row)}
                      >
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-1 h-7 px-2 text-xs"
                        disabled={busyId === row.installId}
                        onClick={() => void activate(row)}
                      >
                        {busyId === row.installId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <KeyRound className="h-3.5 w-3.5" aria-hidden />
                        )}
                        Generate &amp; email
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewing ? (
        <InstallDetailDrawer
          install={viewing}
          busy={busyId === viewing.installId}
          onActivate={() => activate(viewing)}
          onClose={() => setViewing(null)}
        />
      ) : null}

      {result ? (
        <TokenDialog result={result} onClose={() => setResult(null)} />
      ) : null}
    </section>
  );
}

function MachineIdCell({ machineId }: { machineId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="max-w-[16ch] truncate font-mono text-[11px]" title={machineId}>
        {machineId}
      </code>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-1.5"
        aria-label="Copy Machine ID"
        onClick={() => {
          void navigator.clipboard.writeText(machineId).then(
            () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            },
            () => toast.error("Could not copy to clipboard."),
          );
        }}
      >
        {copied ? (
          <Check className="h-3 w-3" aria-hidden />
        ) : (
          <Copy className="h-3 w-3" aria-hidden />
        )}
      </Button>
    </div>
  );
}

function LicenseCell({ row }: { row: DesktopInstallRow }) {
  return (
    <div className="space-y-0.5">
      <span className="inline-flex items-center gap-1 capitalize">
        {row.licenseState ?? "unknown"}
      </span>
      <div className="text-xs capitalize text-muted-foreground">
        {row.plan ?? "no plan"}
      </div>
    </div>
  );
}

function InstallDetailDrawer({
  install,
  busy,
  onActivate,
  onClose,
}: {
  install: DesktopInstallRow;
  busy: boolean;
  onActivate: () => Promise<IssueForInstallResult | null>;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<InstallIssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [resendingId, setResendingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setHistoryError("");
    try {
      setHistory(await fetchInstallIssues(install.installId, 50));
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : "Failed to load license history.");
    } finally {
      setLoading(false);
    }
  }, [install.installId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onResend = useCallback(
    async (issueId: string) => {
      setResendingId(issueId);
      try {
        await resendDesktopLicense(issueId);
        toast.success("Activation key re-sent.");
        await loadHistory();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not resend the key.");
      } finally {
        setResendingId(null);
      }
    },
    [loadHistory],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={`Install ${install.installId}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-md flex-col overflow-hidden border-l border-border/70 bg-card shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-heading text-base font-semibold">
              {install.businessName}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {install.installId}
            </p>
          </div>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
            <Detail label="Machine ID" mono value={install.machineId} />
            <Detail label="Status" value={install.cloudBusinessId ? "Connected" : "Local only"} />
            <Detail label="Cloud business" mono value={install.cloudBusinessId ?? "—"} />
            <Detail label="License" value={`${install.licenseState ?? "unknown"} · ${install.plan ?? "no plan"}`} />
            <Detail label="Platform" value={`${install.platform ?? "unknown"}${install.appVersion ? ` · v${install.appVersion}` : ""}`} />
            <Detail label="Owner email" value={install.contactEmail ?? "—"} />
            <Detail label="First seen" value={formatTime(install.firstSeenAt)} />
            <Detail label="Last seen" value={`${formatTime(install.lastSeenAt)}${install.lastIp ? ` · ${install.lastIp}` : ""}`} />
          </dl>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                License history
              </h3>
              {install.autoIssuedAt ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--pos-primary,#0f766e)]">
                  <Wand2 className="h-3 w-3" aria-hidden /> Auto-activated
                </span>
              ) : null}
            </div>

            {historyError ? (
              <p className="text-sm text-destructive">{historyError}</p>
            ) : loading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading…
              </p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No keys issued for this machine yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/60 border-y border-border/60">
                {history.map((issue) => (
                  <li key={issue.id} className="flex items-start justify-between gap-2 py-2">
                    <div className="min-w-0 text-xs">
                      <div className="font-medium capitalize">{issue.plan}</div>
                      <div className="text-muted-foreground">
                        {issue.expiresAt ? `expires ${formatTime(issue.expiresAt)}` : "perpetual"}
                        {" · "}
                        {issue.emailSent ? `emailed ${issue.recipientEmail ?? ""}` : "not emailed"}
                      </div>
                    </div>
                    {issue.recipientEmail ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 shrink-0 px-2 text-xs"
                        disabled={resendingId === issue.id}
                        onClick={() => void onResend(issue.id)}
                      >
                        {resendingId === issue.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Send className="h-3.5 w-3.5" aria-hidden />
                        )}
                        Resend
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="border-t border-border/60 px-4 py-3">
          <Button
            className="w-full"
            disabled={busy}
            onClick={async () => {
              const issued = await onActivate();
              if (issued) {
                await loadHistory();
              }
            }}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <KeyRound className="h-3.5 w-3.5" aria-hidden />
            )}
            Generate &amp; email activation key
          </Button>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "break-all font-mono text-[11px]" : "break-words"}>{value}</dd>
    </>
  );
}

function TokenDialog({
  result,
  onClose,
}: {
  result: IssueForInstallResult;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Activation key issued"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-xl">
        <div>
          <p className="font-heading text-base font-semibold">
            Activation key issued for {result.businessName}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {result.emailSent
              ? `Emailed to ${result.emailedTo ?? "the shop owner"}.`
              : "Email not sent — copy the token and send it to the shop."}
            {result.expiresAt
              ? ` Expires ${formatTime(result.expiresAt)}.`
              : " Perpetual."}
          </p>
        </div>
        <pre className="max-h-48 overflow-auto border bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] px-3 py-2 font-mono text-[11px] break-all whitespace-pre-wrap">
          {result.token}
        </pre>
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => {
              void navigator.clipboard.writeText(result.token).then(
                () => {
                  setCopied(true);
                  toast.success("Token copied.");
                },
                () => toast.error("Could not copy to clipboard."),
              );
            }}
          >
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copied ? "Copied" : "Copy token"}
          </Button>
          <Button size="sm" className="h-8" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}
