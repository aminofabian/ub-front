"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Lock,
  MapPin,
  Palette,
  RefreshCw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
} from "lucide-react";

import { BuyKenyanDomainWizard } from "@/components/business/buy-kenyan-domain-wizard";
import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_HEAD,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  DashboardPageHero,
  DashboardQuickLinks,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  addMyDomain,
  deleteMyDomain,
  fetchMyDomains,
  setMyPrimaryDomain,
  verifyMyDomain,
  type DomainRecord,
} from "@/lib/api";

type Busy = { kind: "idle" } | { kind: "save" } | { kind: "row"; id: string; action: string };

type Feedback = { kind: "success" | "error"; text: string } | null;

type DnsRecord = { type?: string; name?: string; value?: string };

function sortDomains(rows: DomainRecord[]): DomainRecord[] {
  return [...rows].sort((a, b) => {
    if (a.primary !== b.primary) {
      return a.primary ? -1 : 1;
    }
    return a.domain.localeCompare(b.domain);
  });
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function statusLabel(row: DomainRecord): { text: string; className: string } {
  const status = (row.status || (row.active ? "active" : "pending")).toLowerCase();
  const source = (row.source || "").toLowerCase();
  if (status === "active" && row.active) {
    return { text: "Live", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300" };
  }
  if (status === "verifying") {
    return { text: "Verifying SSL", className: "bg-amber-500/15 text-amber-900 dark:text-amber-200" };
  }
  if (status === "failed") {
    return { text: "Failed", className: "bg-destructive/15 text-destructive" };
  }
  if (source === "hostafrica_purchase") {
    return { text: "Provisioning", className: "bg-sky-500/15 text-sky-900 dark:text-sky-200" };
  }
  return { text: "Pending DNS", className: "bg-muted text-muted-foreground" };
}

function sourceLabel(row: DomainRecord): string | null {
  const source = (row.source || "").toLowerCase();
  if (source === "platform_subdomain") return "Free platform URL";
  if (source === "hostafrica_purchase") return "Purchased";
  if (source === "manual_connect") return "Connected";
  return null;
}

function recommendedRecords(row: DomainRecord): DnsRecord[] {
  const raw = row.dnsInstructions?.recommendedRecords;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is DnsRecord => !!r && typeof r === "object");
}

function LockedNotice() {
  return (
    <div className={cn(DASHBOARD_MAX, "flex min-h-[50vh] items-center justify-center")}>
      <div className={cn(DASHBOARD_SECTION_SURFACE, "max-w-md text-center")}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-border/60 bg-muted/50 text-muted-foreground">
          <Lock className="size-5" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Domains are restricted</h1>
        <p className={cn(dashboardHintClass(), "mt-2")}>
          Ask an owner or admin with settings access to map custom hostnames.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href={APP_ROUTES.business}>Back to business</Link>
        </Button>
      </div>
    </div>
  );
}

function DnsHints({ row }: { row: DomainRecord }) {
  const records = recommendedRecords(row);
  const note = typeof row.dnsInstructions?.note === "string" ? row.dnsInstructions.note : null;
  if (records.length === 0 && !note && !row.lastError) {
    return null;
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mt-4 space-y-2.5 rounded-xl border border-border/60 bg-muted/25 p-3.5 text-xs">
      <p className="font-medium text-foreground">DNS to add at your registrar</p>
      {note ? <p className="leading-relaxed text-muted-foreground">{note}</p> : null}
      {records.length > 0 ? (
        <ul className="space-y-2">
          {records.map((r, i) => {
            const line = [r.type, r.name, r.value].filter(Boolean).join(" → ");
            return (
              <li
                key={`${line}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/80 px-2.5 py-2 font-mono"
              >
                <span className="min-w-0 truncate">{line}</span>
                {r.value ? (
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => void copy(r.value!)}
                    aria-label="Copy DNS value"
                  >
                    <Copy className="size-3" aria-hidden />
                    Copy
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {row.lastError ? <p className="text-destructive">{row.lastError}</p> : null}
    </div>
  );
}

function DomainRow({
  row,
  busy,
  onMakePrimary,
  onVerify,
  onDelete,
}: {
  row: DomainRecord;
  busy: boolean;
  onMakePrimary: (row: DomainRecord) => void;
  onVerify: (row: DomainRecord) => void;
  onDelete: (row: DomainRecord) => void;
}) {
  const badge = statusLabel(row);
  const source = sourceLabel(row);
  const isPlatform = (row.source || "").toLowerCase() === "platform_subdomain";
  const isPurchase = (row.source || "").toLowerCase() === "hostafrica_purchase";
  const needsVerify = !isPlatform && !isPurchase && !row.active;

  return (
    <li
      className={cn(
        "border-b border-border/50 px-4 py-4 last:border-b-0 sm:px-5",
        row.primary && "bg-primary/[0.03]",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border",
              row.primary
                ? "border-primary/25 bg-primary/10 text-primary"
                : "border-border/60 bg-muted/40 text-muted-foreground",
            )}
          >
            <Globe className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-mono text-sm font-semibold tracking-tight">{row.domain}</p>
              {row.active ? (
                <a
                  href={`https://${row.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Open
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
              {row.primary ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 font-medium text-primary">
                  <Star className="size-3" aria-hidden />
                  Primary
                </span>
              ) : null}
              <span className={cn("rounded-full px-2 py-0.5 font-medium", badge.className)}>{badge.text}</span>
              {source ? (
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">{source}</span>
              ) : null}
            </div>
            {isPlatform ? (
              <p className={cn(dashboardHintClass(), "mt-2")}>
                Always free. Staff login stays here by default even after you add a custom domain.
              </p>
            ) : null}
            {isPurchase && !row.active ? (
              <p className={cn(dashboardHintClass(), "mt-2")}>
                We&apos;re finishing DNS and SSL for this purchased domain — no manual DNS changes needed.
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {needsVerify ? (
            <Button variant="outline" size="sm" disabled={busy} className="gap-1.5" onClick={() => onVerify(row)}>
              <ShieldCheck className="size-3.5" aria-hidden />
              Verify
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            disabled={busy || row.primary || !row.active}
            className="gap-1.5"
            onClick={() => onMakePrimary(row)}
          >
            <Star className="size-3.5" aria-hidden />
            {row.primary ? "Primary" : "Make primary"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || row.primary || isPlatform}
            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(row)}
          >
            <Trash2 className="size-3.5" aria-hidden />
            Remove
          </Button>
        </div>
      </div>
      {needsVerify ? <DnsHints row={row} /> : null}
    </li>
  );
}

function ConnectOwnDomain({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (domain: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const onSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = value.trim();
    if (!next) return;
    await onSubmit(next);
    setValue("");
  };

  return (
    <section className={cn(DASHBOARD_SECTION_SURFACE, "bg-muted/10")}>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Already own a domain?
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight">Connect a hostname you control</h2>
          <p className={cn(dashboardHintClass(), "mt-1.5 max-w-xl")}>
            Point DNS at Vercel, then verify. Your free platform URL stays the default login host.
          </p>
        </div>
        <span className="mt-1 shrink-0 text-xs font-medium text-primary">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <form className="mt-5 flex flex-col gap-3 border-t border-border/50 pt-5 sm:flex-row" onSubmit={onSend}>
          <label htmlFor="new-domain" className="sr-only">
            Domain hostname
          </label>
          <input
            id="new-domain"
            className={cn(dashboardInputClass(), "sm:min-w-0 sm:flex-1")}
            placeholder="shop.acme.co.ke"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button type="submit" disabled={busy || !value.trim()} className="shrink-0 gap-2 sm:w-auto">
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Connecting…
              </>
            ) : (
              <>
                <Link2 className="size-4" aria-hidden />
                Connect domain
              </>
            )}
          </Button>
        </form>
      ) : null}
    </section>
  );
}

export default function DomainsPage() {
  const { canManageBusinessSettings } = useDashboard();
  const [rows, setRows] = useState<DomainRecord[]>([]);
  const [busy, setBusy] = useState<Busy>({ kind: "idle" });
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [fetchPass, setFetchPass] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);

  const reload = useCallback(() => {
    return fetchMyDomains()
      .then((raw) => {
        setRows(sortDomains(raw));
        setLoadFailed(false);
      })
      .catch((e) => {
        setLoadFailed(true);
        setRows([]);
        setFeedback({ kind: "error", text: messageFor(e, "Failed to load domains.") });
      })
      .finally(() => {
        setFetchPass((n) => n + 1);
      });
  }, []);

  useEffect(() => {
    if (canManageBusinessSettings) {
      void reload();
    }
  }, [canManageBusinessSettings, reload]);

  const handleAdd = async (domain: string) => {
    setBusy({ kind: "save" });
    setFeedback(null);
    try {
      const created = await addMyDomain(domain);
      setRows((previous) => sortDomains([...previous, created]));
      setFeedback({
        kind: "success",
        text: created.active
          ? `Added ${created.domain}.`
          : `Added ${created.domain}. Configure DNS, then Verify to go live.`,
      });
    } catch (e) {
      setFeedback({ kind: "error", text: messageFor(e, "Could not add domain.") });
    } finally {
      setBusy({ kind: "idle" });
    }
  };

  const handleMakePrimary = async (row: DomainRecord) => {
    setBusy({ kind: "row", id: row.id, action: "primary" });
    setFeedback(null);
    try {
      await setMyPrimaryDomain(row.id);
      await reload();
      setFeedback({
        kind: "success",
        text: `Primary is now ${row.domain}. Staff login still uses your platform subdomain by default.`,
      });
    } catch (e) {
      setFeedback({ kind: "error", text: messageFor(e, "Could not promote domain.") });
    } finally {
      setBusy({ kind: "idle" });
    }
  };

  const handleVerify = async (row: DomainRecord) => {
    setBusy({ kind: "row", id: row.id, action: "verify" });
    setFeedback(null);
    try {
      const updated = await verifyMyDomain(row.id);
      setRows((previous) => sortDomains(previous.map((r) => (r.id === updated.id ? updated : r))));
      setFeedback({
        kind: updated.active ? "success" : "error",
        text: updated.active
          ? `${updated.domain} is live.`
          : `${updated.domain} is not verified yet. Check DNS and try again.`,
      });
    } catch (e) {
      setFeedback({ kind: "error", text: messageFor(e, "Could not verify domain.") });
      await reload();
    } finally {
      setBusy({ kind: "idle" });
    }
  };

  const handleDelete = async (row: DomainRecord) => {
    setBusy({ kind: "row", id: row.id, action: "delete" });
    setFeedback(null);
    try {
      await deleteMyDomain(row.id);
      setRows((previous) => previous.filter((r) => r.id !== row.id));
      setFeedback({ kind: "success", text: `Removed ${row.domain}.` });
    } catch (e) {
      setFeedback({ kind: "error", text: messageFor(e, "Could not delete domain.") });
    } finally {
      setBusy({ kind: "idle" });
    }
  };

  if (!canManageBusinessSettings) {
    return <LockedNotice />;
  }

  const rowBusyId = busy.kind === "row" ? busy.id : null;
  const isInitialLoading = fetchPass === 0;
  const showListLoading = isInitialLoading && !loadFailed && rows.length === 0;
  const platformRow = rows.find((r) => (r.source || "").toLowerCase() === "platform_subdomain");
  const customRows = rows.filter((r) => (r.source || "").toLowerCase() !== "platform_subdomain");

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        icon={Globe}
        eyebrow="Connectivity"
        title="Domains"
        description={
          <>
            Give customers a memorable Kenyan shop address. Your free platform URL stays available for staff login
            {platformRow ? (
              <>
                {" "}
                at <span className="font-mono text-[13px] text-foreground">{platformRow.domain}</span>
              </>
            ) : null}
            .
          </>
        }
      >
        <DashboardQuickLinks
          compact
          links={[
            { href: APP_ROUTES.business, label: "Business", desc: "Business hub", icon: Building2 },
            { href: APP_ROUTES.businessSettings, label: "Settings", desc: "Profile", icon: Settings },
            { href: APP_ROUTES.businessConfiguration, label: "Operations", desc: "Inventory", icon: SlidersHorizontal },
            { href: APP_ROUTES.businessBranding, label: "Branding", desc: "Look & feel", icon: Palette },
            { href: APP_ROUTES.branches, label: "Branches", desc: "Locations", icon: MapPin },
          ]}
        />
      </DashboardPageHero>

      {platformRow ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-gradient-to-br from-muted/40 via-card to-card px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-muted-foreground shadow-sm">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">Your free shop URL is live</p>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">{platformRow.domain}</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
            <a href={`https://${platformRow.domain}`} target="_blank" rel="noreferrer">
              Visit shop
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </Button>
        </div>
      ) : null}

      {feedback ? <DashboardFeedback kind={feedback.kind} text={feedback.text} /> : null}

      <BuyKenyanDomainWizard
        onLive={() => void reload()}
        onFeedback={(kind, text) => setFeedback({ kind, text })}
      />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-0.5">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Your domains</h2>
            <p className={dashboardHintClass()}>
              Purchased .ke names auto-provision. Connected domains need DNS + Verify.
            </p>
          </div>
          {rows.length > 0 ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              {customRows.length} custom · {rows.length} total
            </span>
          ) : null}
        </div>

        {showListLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 py-16">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading domains…</p>
          </div>
        ) : loadFailed && fetchPass > 0 ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-sm">
            <p className="text-sm font-medium text-destructive">Could not load the domain list</p>
            <p className={cn(dashboardHintClass(), "mt-1")}>{feedback?.text}</p>
            <Button
              className="mt-4 gap-2"
              variant="outline"
              onClick={() => {
                setLoadFailed(false);
                setFeedback(null);
                void reload();
              }}
            >
              <RefreshCw className="size-4" aria-hidden />
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted-foreground/25 bg-muted/10 px-6 py-12 text-center">
            <Globe className="mx-auto size-9 text-muted-foreground/55" aria-hidden />
            <p className="mt-3 text-sm font-medium text-foreground">No domains yet</p>
            <p className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-sm")}>
              Search for a .ke name above, or connect a hostname you already own.
            </p>
          </div>
        ) : (
          <div className={DASHBOARD_TABLE_SURFACE}>
            <div className={DASHBOARD_TABLE_HEAD}>
              <p className="text-sm font-semibold tracking-tight">Mapped hostnames</p>
              <p className={dashboardHintClass()}>Primary is used for storefront branding links when active.</p>
            </div>
            <ul>
              {rows.map((row) => (
                <DomainRow
                  key={row.id}
                  row={row}
                  busy={rowBusyId === row.id}
                  onMakePrimary={handleMakePrimary}
                  onVerify={handleVerify}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          </div>
        )}
      </section>

      <ConnectOwnDomain busy={busy.kind === "save"} onSubmit={handleAdd} />
    </div>
  );
}
