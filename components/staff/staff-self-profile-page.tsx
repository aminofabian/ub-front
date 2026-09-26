"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  ChevronRight,
  KeyRound,
  Loader2,
  MessageSquareWarning,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  DASHBOARD_MAX,
  DashboardPageHero,
} from "@/components/dashboard-page-ui";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { useDashboard } from "@/components/dashboard-provider";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchMyOAuthLinks,
  fetchStaffPaySelf,
  requestPasswordReset,
  unlinkGoogleAccount,
  type StaffPaySelfAdvance,
  type StaffPaySelfPayslip,
  type StaffPaySelfPortal,
} from "@/lib/api";
import {
  openSupportConversation,
  sendSupportMessage,
} from "@/lib/support-api";
import {
  advanceStatusLabel,
  employmentStatusLabel,
  formatPayrollDate,
  formatPayrollMoney,
  payrollMonthLabel,
} from "@/lib/payroll-utils";
import { Permission, hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const hair =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const ink = "text-[var(--order-ink,#15231f)]";
const mute =
  "text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]";

type SectionId = "overview" | "pay" | "complaint";

/**
 * Employee self-service desk: identity, salary / advances, workplace concern.
 */
export function StaffSelfProfilePage() {
  const { me, business, canViewPayrollSelf, loading: sessionLoading } =
    useDashboard();
  const [section, setSection] = useState<SectionId>("overview");
  const [portal, setPortal] = useState<StaffPaySelfPortal | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [passwordLinkSending, setPasswordLinkSending] = useState(false);
  const [passwordLinkSent, setPasswordLinkSent] = useState(false);
  const [googleLinked, setGoogleLinked] = useState<boolean | null>(null);
  const [showUnlinkGoogle, setShowUnlinkGoogle] = useState(false);
  const [unlinkGooglePassword, setUnlinkGooglePassword] = useState("");
  const [unlinkGoogleBusy, setUnlinkGoogleBusy] = useState(false);
  const [unlinkGoogleError, setUnlinkGoogleError] = useState<string | null>(null);

  const [complaintSubject, setComplaintSubject] = useState("Workplace concern");
  const [complaintBody, setComplaintBody] = useState("");
  const [complaintSending, setComplaintSending] = useState(false);

  const canReadPay =
    canViewPayrollSelf ||
    hasPermission(me?.permissions, Permission.PayrollSelfRead);

  const loadPay = useCallback(async () => {
    if (!canReadPay) return;
    setPayLoading(true);
    setPayError(null);
    try {
      const data = await fetchStaffPaySelf();
      setPortal(data);
    } catch (e) {
      setPayError(
        e instanceof Error ? e.message : "Could not load your pay details.",
      );
      setPortal(null);
    } finally {
      setPayLoading(false);
    }
  }, [canReadPay]);

  useEffect(() => {
    if (sessionLoading) return;
    void loadPay();
  }, [sessionLoading, loadPay]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const links = await fetchMyOAuthLinks();
        if (!cancelled) setGoogleLinked(links.googleLinked === true);
      } catch {
        if (!cancelled) setGoogleLinked(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName =
    portal?.displayName?.trim() ||
    me?.name?.trim() ||
    me?.email?.trim() ||
    "Team member";
  const roleLabel = me?.role?.name?.trim() || me?.role?.key?.trim() || "Staff";
  const branchLabel =
    portal?.shopName?.trim() || business?.name?.trim() || "Your shop";

  const openAdvances = useMemo(
    () =>
      (portal?.advances ?? []).filter(
        (a) => Number(a.balanceOutstanding ?? 0) > 0.009,
      ),
    [portal],
  );

  const recentPayslips = useMemo(
    () => (portal?.payslips ?? []).slice(0, 6),
    [portal],
  );

  const onSendPasswordLink = async () => {
    const to = me?.email?.trim();
    if (!to || passwordLinkSending) return;
    setPasswordLinkSending(true);
    try {
      await requestPasswordReset(to);
      setPasswordLinkSent(true);
      toast.success("Password link sent. Check your email.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not send the password link.",
      );
    } finally {
      setPasswordLinkSending(false);
    }
  };

  const onUnlinkGoogle = async () => {
    if (unlinkGoogleBusy) return;
    setUnlinkGoogleBusy(true);
    setUnlinkGoogleError(null);
    try {
      await unlinkGoogleAccount(unlinkGooglePassword);
      setGoogleLinked(false);
      setShowUnlinkGoogle(false);
      setUnlinkGooglePassword("");
      toast.success("Google disconnected.");
    } catch (e) {
      setUnlinkGoogleError(
        e instanceof Error ? e.message : "Could not disconnect Google.",
      );
    } finally {
      setUnlinkGoogleBusy(false);
    }
  };

  const submitComplaint = async () => {
    const body = complaintBody.trim();
    if (body.length < 12) {
      toast.error("Please describe the concern in a bit more detail.");
      return;
    }
    setComplaintSending(true);
    try {
      const subjectLine = complaintSubject.trim() || "Workplace concern";
      await openSupportConversation(subjectLine);
      await sendSupportMessage(
        `[Staff concern · ${subjectLine}]\n\n${body}\n\n— ${displayName} · ${roleLabel}`,
      );
      setComplaintBody("");
      toast.success("Concern sent. We’ll follow up in Support.");
      setSection("overview");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not send your concern.",
      );
    } finally {
      setComplaintSending(false);
    }
  };

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        compact
        icon={UserRound}
        title="My profile"
        description={`${roleLabel} · ${branchLabel}`}
      />

      <div className={cn("mt-2 overflow-hidden border bg-white", hair)}>
        <div
          className={cn(
            "flex border-b bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)]",
            hair,
          )}
          role="tablist"
          aria-label="Profile sections"
        >
          {(
            [
              ["overview", "You"],
              ["pay", "Pay"],
              ["complaint", "Concern"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={section === id}
              onClick={() => setSection(id)}
              className={cn(
                "flex-1 px-3 py-2.5 text-[12px] font-semibold tracking-[-0.01em] transition-colors",
                section === id
                  ? "bg-[var(--pos-primary,#0f766e)] text-white"
                  : cn(mute, "hover:text-[var(--order-ink,#15231f)]"),
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-3 sm:p-4">
          {section === "overview" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center border bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[1.1rem] font-semibold text-[var(--pos-primary,#0f766e)]",
                    hair,
                  )}
                >
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-[1.15rem] font-semibold tracking-[-0.02em]",
                      ink,
                    )}
                  >
                    {displayName}
                  </p>
                  <p className={cn("mt-0.5 text-[12px]", mute)}>
                    {roleLabel}
                    {portal?.title ? ` · ${portal.title}` : ""}
                  </p>
                  {portal?.employmentStatus ? (
                    <p className={cn("mt-1 text-[11px]", mute)}>
                      {employmentStatusLabel(portal.employmentStatus)}
                      {portal.startDate
                        ? ` · since ${formatPayrollDate(portal.startDate)}`
                        : ""}
                    </p>
                  ) : null}
                </div>
              </div>

              <dl className={cn("grid gap-2 border p-3 sm:grid-cols-2", hair)}>
                <div>
                  <dt className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", mute)}>
                    Phone
                  </dt>
                  <dd className={cn("mt-0.5 font-mono text-[13px]", ink)}>
                    {portal?.phone?.trim() || me?.phone?.trim() || "—"}
                  </dd>
                </div>
                <div>
                  <dt className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", mute)}>
                    Email
                  </dt>
                  <dd className={cn("mt-0.5 truncate text-[13px]", ink)}>
                    {me?.email?.trim() || "—"}
                  </dd>
                </div>
                <div>
                  <dt className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", mute)}>
                    Shop
                  </dt>
                  <dd className={cn("mt-0.5 text-[13px]", ink)}>{branchLabel}</dd>
                </div>
                <div>
                  <dt className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", mute)}>
                    Current salary
                  </dt>
                  <dd className={cn("mt-0.5 font-mono text-[13px] tabular-nums", ink)}>
                    {canReadPay && portal
                      ? formatPayrollMoney(portal.currentSalary)
                      : canReadPay
                        ? "…"
                        : "Ask an admin for pay access"}
                  </dd>
                </div>
              </dl>

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSection("pay")}
                  className={cn(
                    "flex items-center gap-3 border bg-white px-3 py-3 text-left transition-colors",
                    hair,
                    "hover:border-[var(--pos-primary,#0f766e)]",
                  )}
                >
                  <Banknote className="size-4 text-[var(--pos-primary,#0f766e)]" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[13px] font-semibold", ink)}>
                      Pay & advances
                    </span>
                    <span className={cn("block text-[11px]", mute)}>
                      Salary, outstanding advances, payslips
                    </span>
                  </span>
                  <ChevronRight className={cn("size-4", mute)} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setSection("complaint")}
                  className={cn(
                    "flex items-center gap-3 border bg-white px-3 py-3 text-left transition-colors",
                    hair,
                    "hover:border-[var(--pos-primary,#0f766e)]",
                  )}
                >
                  <MessageSquareWarning
                    className="size-4 text-amber-700"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[13px] font-semibold", ink)}>
                      Raise a concern
                    </span>
                    <span className={cn("block text-[11px]", mute)}>
                      File a workplace complaint privately
                    </span>
                  </span>
                  <ChevronRight className={cn("size-4", mute)} aria-hidden />
                </button>
              </div>

              <button
                type="button"
                onClick={() => void onSendPasswordLink()}
                disabled={passwordLinkSending || !me?.email}
                className={cn(
                  "flex w-full items-center gap-3 border bg-white px-3 py-3 text-left transition-colors",
                  hair,
                  "hover:border-[var(--pos-primary,#0f766e)] disabled:opacity-60",
                )}
              >
                <KeyRound
                  className="size-4 text-[var(--pos-primary,#0f766e)]"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-[13px] font-semibold", ink)}>
                    {passwordLinkSending
                      ? "Sending link\u2026"
                      : "Set or change password"}
                  </span>
                  <span className={cn("block text-[11px]", mute)}>
                    {passwordLinkSent
                      ? "Check your email for the link."
                      : "Email me a secure link to choose a password"}
                  </span>
                </span>
                <ChevronRight className={cn("size-4", mute)} aria-hidden />
              </button>

              <div className={cn("border bg-white p-3 sm:p-4", hair)}>
                <p className={cn("text-[13px] font-semibold", ink)}>
                  Connected accounts
                </p>
                <p className={cn("mt-1 text-[11px]", mute)}>
                  Connect the Google account with this same email to sign in
                  faster — you can keep using your password too.
                </p>
                <div className="mt-3">
                  {googleLinked === null ? (
                    <p className={cn("text-[12px]", mute)}>Checking…</p>
                  ) : googleLinked ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className={cn("text-[13px] font-medium", ink)}>
                          Google
                        </span>
                        <span className="text-[11px] font-semibold text-[var(--pos-primary,#0f766e)]">
                          Connected
                        </span>
                      </div>
                      {showUnlinkGoogle ? (
                        <div className="space-y-2">
                          <input
                            type="password"
                            value={unlinkGooglePassword}
                            onChange={(e) =>
                              setUnlinkGooglePassword(e.target.value)
                            }
                            placeholder="Your account password"
                            autoComplete="current-password"
                            className={cn(
                              "h-10 w-full border bg-white px-3 text-[13px]",
                              hair,
                              ink,
                            )}
                          />
                          {unlinkGoogleError ? (
                            <p className="text-[11px] text-red-700">
                              {unlinkGoogleError}
                            </p>
                          ) : null}
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => void onUnlinkGoogle()}
                              disabled={
                                unlinkGoogleBusy || !unlinkGooglePassword
                              }
                              className="inline-flex h-9 items-center justify-center bg-[var(--pos-primary,#0f766e)] px-3 text-[12px] font-semibold text-white disabled:opacity-50"
                            >
                              {unlinkGoogleBusy
                                ? "Disconnecting…"
                                : "Disconnect"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowUnlinkGoogle(false);
                                setUnlinkGooglePassword("");
                                setUnlinkGoogleError(null);
                              }}
                              className={cn("text-[12px] font-medium", mute)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowUnlinkGoogle(true)}
                          className={cn("text-[12px] font-medium", mute)}
                        >
                          Disconnect Google
                        </button>
                      )}
                    </div>
                  ) : (
                    <GoogleAuthButton
                      intent="sign_in"
                      next={APP_ROUTES.myProfile}
                      label="Connect Google"
                    />
                  )}
                </div>
              </div>

              {canReadPay ? (
                <Link
                  href={APP_ROUTES.myPay}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--pos-primary,#0f766e)]",
                  )}
                >
                  Open full payslip portal
                  <ChevronRight className="size-3.5" aria-hidden />
                </Link>
              ) : null}
            </div>
          ) : null}

          {section === "pay" ? (
            <PaySection
              canReadPay={canReadPay}
              loading={payLoading}
              error={payError}
              portal={portal}
              openAdvances={openAdvances}
              recentPayslips={recentPayslips}
              onRetry={() => void loadPay()}
            />
          ) : null}

          {section === "complaint" ? (
            <div className="space-y-3">
              <div
                className={cn(
                  "flex gap-2 border bg-amber-500/[0.06] px-3 py-2.5 text-[12px] leading-snug text-amber-950 dark:text-amber-100",
                  hair,
                )}
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>
                  This reaches the Kiosk support desk with your name and role.
                  For urgent safety issues, also tell your shop manager directly.
                </p>
              </div>

              <label className="block">
                <span className={cn("mb-1 block text-[11px] font-semibold", mute)}>
                  Subject
                </span>
                <select
                  value={complaintSubject}
                  onChange={(e) => setComplaintSubject(e.target.value)}
                  className={cn(
                    "h-10 w-full border bg-white px-3 text-[13px]",
                    hair,
                    ink,
                  )}
                >
                  <option>Workplace concern</option>
                  <option>Pay or advance issue</option>
                  <option>Harassment or mistreatment</option>
                  <option>Safety or equipment</option>
                  <option>Schedule or hours</option>
                  <option>Other</option>
                </select>
              </label>

              <label className="block">
                <span className={cn("mb-1 block text-[11px] font-semibold", mute)}>
                  What happened
                </span>
                <textarea
                  value={complaintBody}
                  onChange={(e) => setComplaintBody(e.target.value)}
                  rows={6}
                  placeholder="Share what happened, when, and who was involved. Be as clear as you can."
                  className={cn(
                    "w-full resize-y border bg-white px-3 py-2.5 text-[13px] leading-relaxed",
                    hair,
                    ink,
                    "placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]",
                    "focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:outline-none",
                  )}
                />
              </label>

              <button
                type="button"
                onClick={() => void submitComplaint()}
                disabled={complaintSending}
                className="inline-flex h-11 w-full items-center justify-center gap-2 bg-[var(--pos-primary,#0f766e)] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {complaintSending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <MessageSquareWarning className="size-4" aria-hidden />
                )}
                {complaintSending ? "Sending…" : "Submit concern"}
              </button>

              <Link
                href={APP_ROUTES.support}
                className={cn("block text-center text-[12px] font-medium", mute)}
              >
                Or open Support chat
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PaySection({
  canReadPay,
  loading,
  error,
  portal,
  openAdvances,
  recentPayslips,
  onRetry,
}: {
  canReadPay: boolean;
  loading: boolean;
  error: string | null;
  portal: StaffPaySelfPortal | null;
  openAdvances: StaffPaySelfAdvance[];
  recentPayslips: StaffPaySelfPayslip[];
  onRetry: () => void;
}) {
  if (!canReadPay) {
    return (
      <p className={cn("py-8 text-center text-[13px]", mute)}>
        Ask an admin to enable payroll self-view for your account.
      </p>
    );
  }

  if (loading && !portal) {
    return (
      <div className={cn("flex items-center justify-center gap-2 py-10 text-[13px]", mute)}>
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading pay details…
      </div>
    );
  }

  if (error && !portal) {
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="text-[13px] text-rose-700">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-[12px] font-semibold text-[var(--pos-primary,#0f766e)]"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!portal) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className={cn("border bg-white p-3", hair)}>
          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", mute)}>
            Salary
          </p>
          <p className={cn("mt-1 font-mono text-[1.25rem] font-semibold tabular-nums", ink)}>
            {formatPayrollMoney(portal.currentSalary)}
          </p>
        </div>
        <div className={cn("border bg-white p-3", hair)}>
          <p className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", mute)}>
            Advances due
          </p>
          <p
            className={cn(
              "mt-1 font-mono text-[1.25rem] font-semibold tabular-nums",
              Number(portal.advancesOutstanding) > 0
                ? "text-amber-800 dark:text-amber-200"
                : ink,
            )}
          >
            {formatPayrollMoney(portal.advancesOutstanding)}
          </p>
        </div>
      </div>

      <section>
        <div className="mb-1.5 flex items-center gap-2">
          <Wallet className={cn("size-3.5", mute)} aria-hidden />
          <h2 className={cn("text-[12px] font-semibold", ink)}>
            Open advances
          </h2>
        </div>
        {openAdvances.length === 0 ? (
          <p className={cn("border px-3 py-3 text-[12px]", hair, mute)}>
            No outstanding advances.
          </p>
        ) : (
          <ul className={cn("divide-y border", hair)}>
            {openAdvances.map((row) => (
              <li key={row.id} className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                <span className="min-w-0">
                  <span className={cn("block text-[12px] font-medium", ink)}>
                    {formatPayrollDate(row.advancedOn)}
                  </span>
                  <span className={cn("block text-[11px]", mute)}>
                    {advanceStatusLabel(row)}
                    {row.note ? ` · ${row.note}` : ""}
                  </span>
                </span>
                <span className={cn("shrink-0 font-mono text-[12px] tabular-nums", ink)}>
                  {formatPayrollMoney(row.balanceOutstanding)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className={cn("mb-1.5 text-[12px] font-semibold", ink)}>
          Recent payslips
        </h2>
        {recentPayslips.length === 0 ? (
          <p className={cn("border px-3 py-3 text-[12px]", hair, mute)}>
            No payslips yet.
          </p>
        ) : (
          <ul className={cn("divide-y border", hair)}>
            {recentPayslips.map((slip) => (
              <li
                key={slip.id}
                className="flex items-baseline justify-between gap-3 px-3 py-2.5"
              >
                <span className={cn("text-[12px] font-medium", ink)}>
                  {payrollMonthLabel(slip.periodYear, slip.periodMonth)}
                </span>
                <span className={cn("font-mono text-[12px] tabular-nums", ink)}>
                  {formatPayrollMoney(slip.netPaid)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={APP_ROUTES.myPay}
        className="inline-flex h-10 w-full items-center justify-center gap-1.5 border border-[var(--pos-primary,#0f766e)] text-[13px] font-semibold text-[var(--pos-primary,#0f766e)]"
      >
        Full payslip portal
        <ChevronRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}
