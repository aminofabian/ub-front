"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Copy,
  Globe,
  Link2,
  Loader2,
  Lock,
  MapPin,
  Palette,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
} from "lucide-react";

import { useDashboard } from "@/components/dashboard-provider";
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
import { BuyKenyanDomainWizard } from "@/components/business/buy-kenyan-domain-wizard";

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

function inputClass() {
  return cn(
    "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm transition-colors",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
  );
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
  if (source === "platform_subdomain") return "Platform subdomain";
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
    <div className="mx-auto max-w-lg py-16">
      <div className="rounded-2xl border border-border/80 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Lock className="size-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Domains are restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask an owner or admin with <span className="font-mono text-xs">business.manage_settings</span> to map custom
          hostnames.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href={APP_ROUTES.business}>Back to business</Link>
        </Button>
      </div>
    </div>
  );
}

function RelatedLinks() {
  const links = [
    { href: APP_ROUTES.business, label: "Business", desc: "Business hub", icon: Building2 },
    { href: APP_ROUTES.businessSettings, label: "Settings", desc: "Profile & storefront", icon: Settings },
    { href: APP_ROUTES.businessConfiguration, label: "Operations", desc: "Inventory & till", icon: SlidersHorizontal },
    { href: APP_ROUTES.businessBranding, label: "Branding", desc: "Logo & colors", icon: Palette },
    { href: APP_ROUTES.branches, label: "Branches", desc: "Locations", icon: MapPin },
  ] as const;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {links.map(({ href, label, desc, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group flex items-start gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-sm transition-all",
            "hover:border-primary/25 hover:bg-accent/40 hover:shadow-md",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-sm font-semibold">
              {label}
              <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

function AddDomainForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (domain: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");

  const onSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = value.trim();
    if (!next) {
      return;
    }
    await onSubmit(next);
    setValue("");
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <Plus className="size-4 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold tracking-tight">I already own a domain</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter a hostname (e.g. <span className="font-mono text-xs">shop.acme.co.ke</span>). It stays pending until DNS
        points at Vercel and verification succeeds. Your free platform subdomain stays the default login host.
      </p>
      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={onSend}>
        <label htmlFor="new-domain" className="sr-only">
          Domain hostname
        </label>
        <input
          id="new-domain"
          className={cn(inputClass(), "sm:min-w-0 sm:flex-1")}
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
              Adding…
            </>
          ) : (
            <>
              <Link2 className="size-4" aria-hidden />
              Connect domain
            </>
          )}
        </Button>
      </form>
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
    <div className="mt-3 space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
      {note ? <p className="text-muted-foreground">{note}</p> : null}
      {records.length > 0 ? (
        <ul className="space-y-1.5">
          {records.map((r, i) => {
            const line = [r.type, r.name, r.value].filter(Boolean).join(" → ");
            return (
              <li key={`${line}-${i}`} className="flex items-center justify-between gap-2 font-mono">
                <span className="min-w-0 truncate">{line}</span>
                {r.value ? (
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1 text-muted-foreground hover:text-foreground"
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
  // Purchased domains auto-provision — don't show BYO Verify / A+CNAME checklist.
  const needsVerify = !isPlatform && !isPurchase && !row.active;

  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm transition-colors",
        row.primary ? "border-primary/25 bg-primary/[0.03]" : "border-border/80",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border",
              row.primary
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/60 bg-muted/40 text-muted-foreground",
            )}
          >
            <Globe className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-medium">{row.domain}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {row.primary ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">
                  <Star className="size-3" aria-hidden />
                  Primary
                </span>
              ) : null}
              <span className={cn("rounded-full px-2 py-0.5 font-medium", badge.className)}>{badge.text}</span>
              {source ? <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{source}</span> : null}
            </div>
            {isPurchase && !row.active ? (
              <p className="mt-2 text-xs text-muted-foreground">
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
            Delete
          </Button>
        </div>
      </div>
      {needsVerify ? <DnsHints row={row} /> : null}
    </li>
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
        setFeedback(null);
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

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <header className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="size-4" aria-hidden />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary/90">Connectivity</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Domains</h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Your free shop URL is always available
            {platformRow ? (
              <>
                {" "}
                at <span className="font-mono text-xs text-foreground">{platformRow.domain}</span>
              </>
            ) : null}
            . Custom domains go live after DNS verification — customers use them; staff login stays on the platform
            subdomain.
          </p>
        </div>
        <RelatedLinks />
      </header>

      {feedback ? (
        <div
          role="status"
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm",
            feedback.kind === "success" &&
              "border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-950 dark:text-emerald-100",
            feedback.kind === "error" && "border-destructive/30 bg-destructive/5 text-destructive",
          )}
        >
          {feedback.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <span>{feedback.text}</span>
        </div>
      ) : null}

      <BuyKenyanDomainWizard
        onLive={() => void reload()}
        onFeedback={(kind, text) => setFeedback({ kind, text })}
      />

      <AddDomainForm busy={busy.kind === "save"} onSubmit={handleAdd} />

      {showListLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 py-16">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading domains…</p>
        </div>
      ) : loadFailed && fetchPass > 0 ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto size-10 text-destructive" aria-hidden />
          <p className="mt-3 text-sm font-medium text-destructive">Could not load the domain list</p>
          <p className="mt-1 text-sm text-muted-foreground">{feedback?.text}</p>
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
          <Link2 className="mx-auto size-10 text-muted-foreground/60" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">No domains yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Connect a hostname using the form above.</p>
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Your domains</h2>
          <ul className="flex flex-col gap-3">
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
        </section>
      )}

      <p className="text-center text-xs text-muted-foreground sm:text-left">
        Purchased .ke domains auto-provision on Vercel. Connected (BYO) domains need DNS + Verify.
      </p>
    </div>
  );
}
