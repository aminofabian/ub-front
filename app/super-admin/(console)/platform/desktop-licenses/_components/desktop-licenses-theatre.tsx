"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronRight,
  KeyRound,
  Mail,
  MonitorSmartphone,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer } from "@/components/form-drawer";
import { useMediaLg } from "@/hooks/use-media-lg";
import type {
  DesktopLicenseIssueRecord,
  DesktopLicenseIssuerStatus,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

export type DesktopLicensePanel =
  | { kind: "issuer" }
  | { kind: "issue" }
  | { kind: "license"; id: string };

export type EmailFilter = "all" | "emailed" | "not_emailed";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";

function LiveDot() {
  return (
    <span
      className="inline-block size-1.5 shrink-0 bg-[var(--pos-primary,#0f766e)]"
      aria-hidden
    />
  );
}

function formatWhen(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatExpiry(iso: string | null): string {
  if (!iso) return "perpetual";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function sourceLabel(source: DesktopLicenseIssuerStatus["source"] | undefined) {
  if (source === "env") return "deployment env";
  if (source === "console") return "this console";
  return "none";
}

function panelEquals(a: DesktopLicensePanel | null, b: DesktopLicensePanel) {
  if (!a) return false;
  if (a.kind !== b.kind) return false;
  if (a.kind === "license" && b.kind === "license") return a.id === b.id;
  return true;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-none border px-2 text-[11px] font-semibold tracking-[-0.02em] transition-colors",
        active
          ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
          : cn(HAIRLINE, "bg-white text-muted-foreground hover:text-foreground"),
      )}
    >
      {children}
    </button>
  );
}

function ContextBanner({
  status,
  issueCount,
  loading,
}: {
  status: DesktopLicenseIssuerStatus | null;
  issueCount: number;
  loading: boolean;
}) {
  const configured = status?.configured === true;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 border bg-white px-2.5 py-1.5 sm:px-3",
        HAIRLINE,
      )}
    >
      <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <LiveDot />
          {loading ? "—" : configured ? "Issuer ready" : "Issuer off"}
        </span>
        <span className={dashboardHintClass()}>
          source {loading ? "—" : sourceLabel(status?.source)}
          {" · "}
          {loading ? "—" : issueCount} issued
        </span>
      </p>
      <span
        className="hidden h-4 w-px bg-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] sm:block"
        aria-hidden
      />
      <p className={cn(dashboardHintClass(), "hidden sm:block")}>
        Issue tokens for Kiosk Desktop tills. Machine ID locks each key to one
        install.
      </p>
    </div>
  );
}

function LicensesPulse({
  status,
  issueCount,
  emailedCount,
  loading,
  onOpenIssuer,
  onOpenIssue,
  className,
}: {
  status: DesktopLicenseIssuerStatus | null;
  issueCount: number;
  emailedCount: number;
  loading: boolean;
  onOpenIssuer: () => void;
  onOpenIssue: () => void;
  className?: string;
}) {
  const configured = status?.configured === true;
  const card =
    "absolute z-[1] w-[min(17.5rem,calc(100%-1.5rem))] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white p-3.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]";

  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M18 38 C 34 24, 58 20, 76 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M26 52 C 46 62, 64 56, 78 66"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.35"
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className={cn(card, "left-3 top-[10%]")}>
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          {configured ? (
            <ShieldCheck
              className="size-3.5 text-[var(--pos-primary,#0f766e)]"
              aria-hidden
            />
          ) : (
            <ShieldAlert className="size-3.5 text-amber-700" aria-hidden />
          )}
          Signing key
        </p>
        <p className={cn(dashboardHintClass(), "mt-1")}>
          {loading
            ? "Checking issuer…"
            : configured
              ? `Active via ${sourceLabel(status?.source)}`
              : "Not configured — set a key before issuing"}
        </p>
      </div>

      <div className={cn(card, "right-3 top-[38%]")}>
        <p className="text-[11px] font-semibold text-foreground">Recent issues</p>
        <p className="mt-1 text-[1.5rem] font-semibold tabular-nums tracking-[-0.03em] text-foreground">
          {loading ? "—" : issueCount}
        </p>
        <p className={cn(dashboardHintClass(), "mt-0.5")}>
          {loading ? "—" : emailedCount} emailed from this console
        </p>
      </div>

      <button
        type="button"
        className={cn(
          card,
          "bottom-[8%] left-3 text-left transition-colors hover:border-[var(--pos-primary,#0f766e)]",
        )}
        onClick={configured ? onOpenIssue : onOpenIssuer}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          {configured ? (
            <Plus
              className="size-3.5 text-[var(--pos-primary,#0f766e)]"
              aria-hidden
            />
          ) : (
            <KeyRound
              className="size-3.5 text-[var(--pos-primary,#0f766e)]"
              aria-hidden
            />
          )}
          {configured ? "Issue a license" : "Configure issuer"}
        </p>
        <p className={cn(dashboardHintClass(), "mt-1 line-clamp-2")}>
          {configured
            ? "Open the issue form — shop name, Machine ID, optional email."
            : "Paste or generate the Ed25519 signing key first."}
        </p>
      </button>
    </div>
  );
}

function LicenseFocus({
  panel,
  license,
  status,
  className,
}: {
  panel: DesktopLicensePanel;
  license: DesktopLicenseIssueRecord | null;
  status: DesktopLicenseIssuerStatus | null;
  className?: string;
}) {
  if (panel.kind === "issuer") {
    const configured = status?.configured === true;
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
          className,
        )}
      >
        <div className="max-w-md space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <KeyRound className="size-3" aria-hidden />
            Issuer
          </span>
          <h2
            className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Signing key
          </h2>
          <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
            Ed25519 private key that signs desktop licenses. Stored encrypted in
            the platform database, or via deployment env.
          </p>
          <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
            <span className="font-semibold">
              {configured ? "Configured" : "Not configured"}
            </span>
            {" · "}
            source {sourceLabel(status?.source)}
          </p>
        </div>
        <p
          className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
        >
          <LiveDot />
          Manage the key in the panel
        </p>
      </div>
    );
  }

  if (panel.kind === "issue") {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
          className,
        )}
      >
        <div className="max-w-md space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <Plus className="size-3" aria-hidden />
            New token
          </span>
          <h2
            className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Issue a license
          </h2>
          <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
            Business name must match the till wizard exactly. Machine ID locks
            the token to one install.
          </p>
        </div>
        <p
          className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
        >
          <LiveDot />
          Fill the form in the panel
        </p>
      </div>
    );
  }

  if (!license) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center px-5",
          className,
        )}
      >
        <p className={dashboardHintClass()}>License not in this list.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col justify-between overflow-y-auto overscroll-contain bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)] px-5 py-6",
        className,
      )}
    >
      <div className="max-w-md space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
          <MonitorSmartphone className="size-3" aria-hidden />
          {license.plan || "plan"}
        </span>
        <h2
          className="text-[1.65rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {license.businessName}
        </h2>
        <p className={cn(dashboardHintClass(), "text-[13px] leading-relaxed")}>
          Expires {formatExpiry(license.expiresAt)}
          {" · "}
          issued {formatWhen(license.createdAt)}
        </p>
        <p className="rounded-none border border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_25%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_6%,white)] px-3 py-2 text-[12px] text-foreground">
          {license.recipientEmail ? (
            <>
              <span className="font-semibold">{license.recipientEmail}</span>
              {" · "}
              {license.emailSent ? "emailed" : "email pending"}
            </>
          ) : (
            <span className="font-semibold">Not emailed — copy-only issue</span>
          )}
        </p>
      </div>
      <p
        className={cn(dashboardHintClass(), "flex items-center gap-1.5 text-[11px]")}
      >
        <LiveDot />
        Resend or inspect details in the panel
      </p>
    </div>
  );
}

export type DesktopLicensesTheatreProps = {
  status: DesktopLicenseIssuerStatus | null;
  issues: DesktopLicenseIssueRecord[];
  loading: boolean;
  issuesLoading: boolean;
  emailFilter: EmailFilter;
  onEmailFilterChange: (value: EmailFilter) => void;
  selected: DesktopLicensePanel | null;
  onSelect: (panel: DesktopLicensePanel) => void;
  onClearSelection: () => void;
  drawerBody: ReactNode;
  drawerFooter?: ReactNode;
};

export function DesktopLicensesTheatre({
  status,
  issues,
  loading,
  issuesLoading,
  emailFilter,
  onEmailFilterChange,
  selected,
  onSelect,
  onClearSelection,
  drawerBody,
  drawerFooter,
}: DesktopLicensesTheatreProps) {
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const emailedCount = useMemo(
    () => issues.filter((row) => Boolean(row.recipientEmail && row.emailSent)).length,
    [issues],
  );

  const filteredIssues = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter((row) => {
      if (emailFilter === "emailed" && !row.recipientEmail) return false;
      if (emailFilter === "not_emailed" && row.recipientEmail) return false;
      if (!q) return true;
      return (
        row.businessName.toLowerCase().includes(q) ||
        row.plan.toLowerCase().includes(q) ||
        (row.recipientEmail?.toLowerCase().includes(q) ?? false) ||
        (row.machineFingerprint?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [issues, emailFilter, query]);

  const selectedLicense =
    selected?.kind === "license"
      ? (issues.find((row) => row.id === selected.id) ?? null)
      : null;

  const selectPanel = (panel: DesktopLicensePanel) => {
    onSelect(panel);
    if (panel.kind === "license") {
      history.replaceState(null, "", `#license-${panel.id}`);
    } else {
      history.replaceState(null, "", `#${panel.kind}`);
    }
    if (!isLg) setMobileDrawerOpen(true);
  };

  const clearSelection = () => {
    onClearSelection();
    setMobileDrawerOpen(false);
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };

  useEffect(() => {
    if (selected && !isLg) setMobileDrawerOpen(true);
  }, [selected, isLg]);

  const drawerOpen = !!selected && (isLg || mobileDrawerOpen);

  const drawerTitle =
    selected?.kind === "issuer"
      ? "Signing key"
      : selected?.kind === "issue"
        ? "Issue a license"
        : selectedLicense?.businessName ?? "License";

  const drawerDescription =
    selected?.kind === "issuer"
      ? "Ed25519 private key for desktop tokens"
      : selected?.kind === "issue"
        ? "Shop name must match the till wizard exactly"
        : selectedLicense
          ? `${selectedLicense.plan} · expires ${formatExpiry(selectedLicense.expiresAt)}`
          : undefined;

  const roster = (opts?: { fill?: boolean; denser?: boolean }) => {
    const fill = opts?.fill ?? false;
    const denser = opts?.denser ?? false;
    return (
      <div
        className={cn(
          "flex min-h-0 flex-col",
          fill ? "h-full bg-transparent" : "bg-white",
        )}
      >
        <div
          className={cn(
            "shrink-0 space-y-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-2.5 py-2 sm:px-3",
            fill ? "bg-transparent" : "sticky top-0 z-[1] bg-white",
          )}
        >
          <label className="relative block min-w-0">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              className={cn(
                dashboardInputClass(),
                "h-9 pl-7 text-[13px] lg:h-8 lg:text-[12px]",
              )}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shop, plan, email…"
              aria-label="Search issued licenses"
            />
          </label>
          <div className="flex flex-wrap gap-1">
            <Chip
              active={emailFilter === "all"}
              onClick={() => onEmailFilterChange("all")}
            >
              All
            </Chip>
            <Chip
              active={emailFilter === "emailed"}
              onClick={() => onEmailFilterChange("emailed")}
            >
              Emailed
            </Chip>
            <Chip
              active={emailFilter === "not_emailed"}
              onClick={() => onEmailFilterChange("not_emailed")}
            >
              Copy-only
            </Chip>
          </div>
          <p className={cn(dashboardHintClass(), "tabular-nums")}>
            {filteredIssues.length} license
            {filteredIssues.length === 1 ? "" : "s"}
            {issuesLoading ? " · refreshing…" : ""}
          </p>
        </div>

        <div
          className={cn(
            "min-h-0",
            fill ? "flex-1 overflow-y-auto overscroll-contain" : null,
          )}
        >
          <ul className="divide-y divide-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]">
            {(
              [
                {
                  kind: "issuer" as const,
                  label: "Signing key",
                  hint: status?.configured
                    ? `Ready · ${sourceLabel(status.source)}`
                    : "Not configured",
                  icon: KeyRound,
                },
                {
                  kind: "issue" as const,
                  label: "Issue a license",
                  hint: "New token for a till Machine ID",
                  icon: Plus,
                },
              ] as const
            ).map((item) => {
              const active = panelEquals(selected, { kind: item.kind });
              const Icon = item.icon;
              return (
                <li key={item.kind}>
                  <button
                    type="button"
                    onClick={() => selectPanel({ kind: item.kind })}
                    className={cn(
                      "relative flex w-full items-start gap-2.5 text-left transition-colors",
                      denser
                        ? "px-2.5 py-2 sm:px-3"
                        : "min-h-[3.25rem] px-3 py-3",
                      active
                        ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                        : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-7 shrink-0 place-items-center border",
                        active
                          ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                          : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate font-semibold tracking-[-0.015em] text-foreground",
                          denser ? "text-[12.5px]" : "text-[14px]",
                        )}
                      >
                        {item.label}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                        {item.hint}
                      </p>
                    </div>
                    {!denser ? (
                      <ChevronRight
                        className="mt-1 size-4 shrink-0 text-muted-foreground/70"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}

            {filteredIssues.length === 0 ? (
              <li>
                <p className={cn(dashboardHintClass(), "px-3 py-8 text-center")}>
                  {issuesLoading
                    ? "Loading licenses…"
                    : query.trim()
                      ? `No licenses match “${query.trim()}”.`
                      : "No licenses issued yet."}
                </p>
              </li>
            ) : (
              filteredIssues.map((row) => {
                const active = panelEquals(selected, {
                  kind: "license",
                  id: row.id,
                });
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() =>
                        selectPanel({ kind: "license", id: row.id })
                      }
                      className={cn(
                        "relative flex w-full items-start gap-2.5 text-left transition-colors",
                        denser
                          ? "px-2.5 py-2 sm:px-3"
                          : "min-h-[3.25rem] px-3 py-3",
                        active
                          ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)]"
                          : "active:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)] hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2.5%,white)]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-7 shrink-0 place-items-center border",
                          active
                            ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        <MonitorSmartphone className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate font-semibold tracking-[-0.015em] text-foreground",
                            denser ? "text-[12.5px]" : "text-[14px]",
                          )}
                        >
                          {row.businessName}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] leading-snug capitalize text-muted-foreground">
                          {row.plan}
                          {" · "}
                          {formatExpiry(row.expiresAt)}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground">
                          {row.recipientEmail ? (
                            <span className="inline-flex items-center gap-0.5 truncate">
                              <Mail className="size-2.5 shrink-0" aria-hidden />
                              {row.recipientEmail}
                            </span>
                          ) : (
                            <span>copy-only</span>
                          )}
                          <span>{formatWhen(row.createdAt)}</span>
                        </p>
                      </div>
                      {!denser ? (
                        <ChevronRight
                          className="mt-1 size-4 shrink-0 text-muted-foreground/70"
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    );
  };

  const room = selected ? (
    <LicenseFocus
      panel={selected}
      license={selectedLicense}
      status={status}
      className="h-full min-h-0"
    />
  ) : (
    <LicensesPulse
      status={status}
      issueCount={issues.length}
      emailedCount={emailedCount}
      loading={loading}
      onOpenIssuer={() => selectPanel({ kind: "issuer" })}
      onOpenIssue={() => selectPanel({ kind: "issue" })}
      className="h-full min-h-0"
    />
  );

  const inspect = selected ? null : (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Dossier
        </p>
        <h3
          className="mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Pick a row
        </h3>
        <p className={cn(dashboardHintClass(), "mt-3 max-w-[16rem]")}>
          Configure the signing key, issue a new token, or reopen a recent
          license to resend.
        </p>
      </div>
      <p className={cn(dashboardHintClass(), "flex items-center gap-1.5")}>
        <MonitorSmartphone className="size-3.5 shrink-0" aria-hidden />
        Deep links use #issuer, #issue, #license-id
      </p>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <ContextBanner
        status={status}
        issueCount={issues.length}
        loading={loading}
      />

      <div
        className={cn(
          "hidden h-[min(80dvh,52rem)] overflow-hidden border lg:grid",
          HAIRLINE,
          "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4.5%,#f3eee6)]",
          "lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)_minmax(20rem,23.5rem)]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,#faf8f4)]">
          {roster({ fill: true, denser: true })}
        </div>
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
          <p
            className="pointer-events-none absolute bottom-3 left-4 z-[1] text-[10px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
            aria-hidden
          >
            License floor
          </p>
          {room}
        </div>
        <div
          ref={setDockRoot}
          className="relative flex h-full min-h-0 flex-col overflow-hidden border-l border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)] bg-white"
        >
          {isLg && selected ? null : inspect}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2 lg:hidden">
        <div className={cn("overflow-hidden border bg-white", HAIRLINE)}>
          {roster({ fill: false, denser: false })}
        </div>
      </div>

      <FormDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
        contextLabel="Desktop licenses"
        title={drawerTitle}
        description={drawerDescription}
        headerDensity="compact"
        bodyLayout="fill"
        appearance="sharp"
        docked={isLg}
        dockRoot={dockRoot}
        footer={drawerFooter}
      >
        {selected ? (
          <div
            className={cn(
              "flex min-h-0 flex-col overflow-y-auto overscroll-contain bg-white px-3 py-3 sm:px-4",
              isLg
                ? "h-full"
                : "h-[min(82dvh,42rem)] sm:h-auto sm:min-h-0 sm:flex-1",
            )}
          >
            {drawerBody}
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
