"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  BuyKenyanDomainWizard,
  useDomainOrderStats,
} from "@/components/business/buy-kenyan-domain-wizard";
import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX,
  DASHBOARD_SECTION_SURFACE,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type TabId = "buy" | "manage" | "connect";
type Busy = { kind: "idle" } | { kind: "save" } | { kind: "row"; id: string; action: string };
type SortKey = "domain" | "status" | "source";
type DnsRecord = { type?: string; name?: string; value?: string };

function sortDomains(rows: DomainRecord[], key: SortKey, dir: "asc" | "desc"): DomainRecord[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "domain") return mul * a.domain.localeCompare(b.domain);
    if (key === "source") return mul * (a.source || "").localeCompare(b.source || "");
    const sa = (a.status || (a.active ? "active" : "pending")).toLowerCase();
    const sb = (b.status || (b.active ? "active" : "pending")).toLowerCase();
    return mul * sa.localeCompare(sb);
  });
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

function statusMeta(row: DomainRecord): { text: string; variant: "success" | "warning" | "destructive" | "secondary" | "default" } {
  const status = (row.status || (row.active ? "active" : "pending")).toLowerCase();
  const source = (row.source || "").toLowerCase();
  if (status === "active" && row.active) return { text: "Live", variant: "success" };
  if (status === "verifying") return { text: "Verifying", variant: "warning" };
  if (status === "failed") return { text: "Failed", variant: "destructive" };
  if (source === "hostafrica_purchase") return { text: "Provisioning", variant: "default" };
  return { text: "Pending DNS", variant: "secondary" };
}

function sourceLabel(row: DomainRecord): string {
  const source = (row.source || "").toLowerCase();
  if (source === "platform_subdomain") return "Platform";
  if (source === "hostafrica_purchase") return "Purchased";
  if (source === "manual_connect") return "Connected";
  return "Domain";
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

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof Globe;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-4 text-left shadow-sm ring-1 ring-black/[0.02] transition-all dark:ring-white/[0.04]",
        onClick && "hover:-translate-y-0.5 hover:border-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          {hint ? <p className={cn(dashboardHintClass(), "mt-1")}>{hint}</p> : null}
        </div>
        <span className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
    </Comp>
  );
}

function DomainDetailDrawer({
  row,
  open,
  onOpenChange,
  busy,
  onMakePrimary,
  onVerify,
  onDelete,
}: {
  row: DomainRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onMakePrimary: (row: DomainRecord) => void;
  onVerify: (row: DomainRecord) => void;
  onDelete: (row: DomainRecord) => void;
}) {
  if (!row) return null;
  const badge = statusMeta(row);
  const isPlatform = (row.source || "").toLowerCase() === "platform_subdomain";
  const isPurchase = (row.source || "").toLowerCase() === "hostafrica_purchase";
  const needsVerify = !isPlatform && !isPurchase && !row.active;
  const records = recommendedRecords(row);
  const note = typeof row.dnsInstructions?.note === "string" ? row.dnsInstructions.note : null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      contextLabel="Domain"
      title={row.domain}
      description={`${sourceLabel(row)} · ${badge.text}`}
      icon={<Globe className="size-4" aria-hidden />}
      width="wide"
      footer={
        <div className="flex flex-wrap gap-2">
          {row.active ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={`https://${row.domain}`} target="_blank" rel="noreferrer">
                Visit
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </Button>
          ) : null}
          {needsVerify ? (
            <Button size="sm" disabled={busy} className="gap-1.5" onClick={() => onVerify(row)}>
              <ShieldCheck className="size-3.5" aria-hidden />
              Verify DNS
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
            Make primary
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
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {row.primary ? <Badge>Primary</Badge> : null}
          <Badge variant={badge.variant}>{badge.text}</Badge>
          <Badge variant="secondary">{sourceLabel(row)}</Badge>
        </div>

        {isPlatform ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Always free. Staff login stays here by default even after you add a custom domain.
          </p>
        ) : null}
        {isPurchase && !row.active ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            We&apos;re finishing DNS and SSL for this purchased domain — no manual DNS changes needed.
          </p>
        ) : null}
        {row.lastError ? (
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            {row.lastError}
          </div>
        ) : null}

        {needsVerify ? (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-semibold">DNS checklist</p>
            {note ? <p className={dashboardHintClass()}>{note}</p> : null}
            {records.length > 0 ? (
              <ul className="space-y-2">
                {records.map((r, i) => {
                  const line = [r.type, r.name, r.value].filter(Boolean).join(" → ");
                  return (
                    <li
                      key={`${line}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-2 font-mono text-xs"
                    >
                      <span className="min-w-0 truncate">{line}</span>
                      {r.value ? (
                        <button
                          type="button"
                          className="inline-flex shrink-0 items-center gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => void copy(r.value!)}
                        >
                          <Copy className="size-3" aria-hidden />
                          Copy
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={dashboardHintClass()}>No recommended records yet — try Verify after DNS propagates.</p>
            )}
          </div>
        ) : null}
      </div>
    </FormDrawer>
  );
}

function ConnectDomainDrawer({
  open,
  onOpenChange,
  busy,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onSubmit: (domain: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) setValue("");
  }, [open]);

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      contextLabel="Connect"
      title="Connect a domain you own"
      description="Point DNS at Vercel, then verify. Your free platform URL stays the default login host."
      icon={<Link2 className="size-4" aria-hidden />}
      footer={
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !value.trim()}
            className="gap-1.5"
            onClick={() => void onSubmit(value.trim())}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
            Connect domain
          </Button>
        </div>
      }
    >
      <FormDrawerFields legend="Hostname" hint="Example: shop.acme.co.ke">
        <input
          className={dashboardInputClass()}
          placeholder="shop.acme.co.ke"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim() && !busy) {
              e.preventDefault();
              void onSubmit(value.trim());
            }
          }}
        />
      </FormDrawerFields>
    </FormDrawer>
  );
}

function RowActionsMenu({
  row,
  busy,
  onOpen,
  onMakePrimary,
  onVerify,
  onDelete,
}: {
  row: DomainRecord;
  busy: boolean;
  onOpen: () => void;
  onMakePrimary: () => void;
  onVerify: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isPlatform = (row.source || "").toLowerCase() === "platform_subdomain";
  const isPurchase = (row.source || "").toLowerCase() === "hostafrica_purchase";
  const needsVerify = !isPlatform && !isPurchase && !row.active;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="size-8 p-0"
        disabled={busy}
        aria-label="Row actions"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </Button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 min-w-[11rem] overflow-hidden rounded-xl border border-border/70 bg-background py-1 shadow-lg">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
              onClick={() => {
                setOpen(false);
                onOpen();
              }}
            >
              View details
            </button>
            {needsVerify ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                onClick={() => {
                  setOpen(false);
                  onVerify();
                }}
              >
                <ShieldCheck className="size-3.5" aria-hidden />
                Verify
              </button>
            ) : null}
            <button
              type="button"
              disabled={row.primary || !row.active}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:opacity-40"
              onClick={() => {
                setOpen(false);
                onMakePrimary();
              }}
            >
              <Star className="size-3.5" aria-hidden />
              Make primary
            </button>
            <button
              type="button"
              disabled={row.primary || isPlatform}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/5 disabled:opacity-40"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Remove
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function DomainsPage() {
  const { canManageBusinessSettings } = useDashboard();
  const [tab, setTab] = useState<TabId>("buy");
  const [rows, setRows] = useState<DomainRecord[]>([]);
  const [busy, setBusy] = useState<Busy>({ kind: "idle" });
  const [fetchPass, setFetchPass] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("domain");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const pageSize = 8;
  const [detailRow, setDetailRow] = useState<DomainRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<DomainRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const orderStats = useDomainOrderStats();

  const reload = useCallback(async () => {
    try {
      const raw = await fetchMyDomains();
      setRows(sortDomains(raw, "domain", "asc"));
      setLoadFailed(false);
    } catch (e) {
      setLoadFailed(true);
      setRows([]);
      toast.error(messageFor(e, "Failed to load domains."));
    } finally {
      setFetchPass((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    if (canManageBusinessSettings) void reload();
  }, [canManageBusinessSettings, reload]);

  const handleAdd = async (domain: string) => {
    setBusy({ kind: "save" });
    try {
      const created = await addMyDomain(domain);
      setRows((previous) => sortDomains([...previous, created], sortKey, sortDir));
      setConnectOpen(false);
      setTab("manage");
      toast.success(
        created.active
          ? `Added ${created.domain}.`
          : `Added ${created.domain}. Configure DNS, then Verify.`,
      );
      setDetailRow(created);
      setDetailOpen(true);
    } catch (e) {
      toast.error(messageFor(e, "Could not add domain."));
    } finally {
      setBusy({ kind: "idle" });
    }
  };

  const handleMakePrimary = async (row: DomainRecord) => {
    setBusy({ kind: "row", id: row.id, action: "primary" });
    try {
      await setMyPrimaryDomain(row.id);
      await reload();
      toast.success(`Primary is now ${row.domain}.`);
    } catch (e) {
      toast.error(messageFor(e, "Could not promote domain."));
    } finally {
      setBusy({ kind: "idle" });
    }
  };

  const handleVerify = async (row: DomainRecord) => {
    setBusy({ kind: "row", id: row.id, action: "verify" });
    try {
      const updated = await verifyMyDomain(row.id);
      setRows((previous) => previous.map((r) => (r.id === updated.id ? updated : r)));
      setDetailRow(updated);
      if (updated.active) toast.success(`${updated.domain} is live.`);
      else toast.error(`${updated.domain} is not verified yet. Check DNS and try again.`);
    } catch (e) {
      toast.error(messageFor(e, "Could not verify domain."));
      await reload();
    } finally {
      setBusy({ kind: "idle" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    setDeleting(true);
    setBusy({ kind: "row", id: deleteRow.id, action: "delete" });
    try {
      await deleteMyDomain(deleteRow.id);
      setRows((previous) => previous.filter((r) => r.id !== deleteRow.id));
      setDetailOpen(false);
      setDetailRow(null);
      toast.success(`Removed ${deleteRow.domain}.`);
      setDeleteRow(null);
    } catch (e) {
      toast.error(messageFor(e, "Could not delete domain."));
    } finally {
      setDeleting(false);
      setBusy({ kind: "idle" });
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;
    if (sourceFilter !== "all") {
      list = list.filter((r) => (r.source || "").toLowerCase() === sourceFilter);
    }
    if (q) {
      list = list.filter((r) => r.domain.toLowerCase().includes(q));
    }
    return sortDomains(list, sortKey, sortDir);
  }, [rows, query, sourceFilter, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice(page * pageSize, page * pageSize + pageSize);

  useEffect(() => {
    setPage(0);
  }, [query, sourceFilter]);

  if (!canManageBusinessSettings) return <LockedNotice />;

  const rowBusyId = busy.kind === "row" ? busy.id : null;
  const showListLoading = fetchPass === 0 && !loadFailed && rows.length === 0;
  const platformRow = rows.find((r) => (r.source || "").toLowerCase() === "platform_subdomain");
  const liveCount = rows.filter((r) => r.active).length;
  const pendingCount = rows.filter((r) => !r.active).length;

  const tabs: { id: TabId; label: string; icon: typeof Globe; count?: number }[] = [
    { id: "buy", label: "Buy .ke", icon: ShoppingCart, count: orderStats.awaitingPay || undefined },
    { id: "manage", label: "Your domains", icon: Globe, count: rows.length || undefined },
    { id: "connect", label: "Connect own", icon: Link2 },
  ];

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className={DASHBOARD_MAX}>
      <DashboardPageHero
        icon={Globe}
        eyebrow="Connectivity"
        title="Domains"
        description="Buy a Kenyan domain, manage mapped hostnames, or connect one you already own — customers shop on custom domains; staff login stays on your free platform URL."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Live"
          value={liveCount}
          hint="Active hostnames"
          icon={CheckCircle2}
          onClick={() => setTab("manage")}
        />
        <StatCard
          label="Pending"
          value={pendingCount}
          hint="Awaiting DNS / SSL"
          icon={ShieldCheck}
          onClick={() => setTab("manage")}
        />
        <StatCard
          label="Purchases"
          value={orderStats.open}
          hint={orderStats.awaitingPay ? `${orderStats.awaitingPay} awaiting pay` : "Open orders"}
          icon={ShoppingCart}
          onClick={() => setTab("buy")}
        />
        <StatCard
          label="Free URL"
          value={platformRow ? "On" : "—"}
          hint={platformRow?.domain || "Platform subdomain"}
          icon={Globe}
        />
      </div>

      {platformRow ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-gradient-to-br from-muted/35 via-card to-card px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-emerald-600 shadow-sm dark:text-emerald-400">
              <CheckCircle2 className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">Your free shop URL is live</p>
              <p className="mt-0.5 truncate font-mono text-sm text-muted-foreground">{platformRow.domain}</p>
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

      <div className="space-y-5">
        <div
          role="tablist"
          aria-label="Domains sections"
          className="flex flex-wrap gap-1 rounded-xl border border-border/60 bg-muted/30 p-1"
        >
          {tabs.map(({ id, label, icon: Icon, count }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setTab(id)}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
                {count != null && count > 0 ? (
                  <span className="rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {tab === "buy" ? (
          <div role="tabpanel" className="animate-in fade-in-0 duration-200">
            <div className={cn(DASHBOARD_SECTION_SURFACE, "space-y-6")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 max-w-xl">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Kenyan TLDs
                  </p>
                  <h2 className="mt-1.5 text-xl font-semibold tracking-tight">Find and buy your .ke name</h2>
                  <p className={cn(dashboardHintClass(), "mt-2")}>
                    Search availability, pay with M-Pesa in a focused modal, and we register and provision it for you.
                  </p>
                </div>
              </div>
              <BuyKenyanDomainWizard
                embedded
                onLive={() => {
                  void reload();
                  void orderStats.reload().catch(() => undefined);
                }}
              />
            </div>
          </div>
        ) : null}

        {tab === "connect" ? (
          <div role="tabpanel" className="animate-in fade-in-0 duration-200">
            <div className={cn(DASHBOARD_SECTION_SURFACE, "max-w-2xl")}>
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground">
                  <Link2 className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold tracking-tight">Already own a domain?</h2>
                  <p className={cn(dashboardHintClass(), "mt-2")}>
                    Connect a hostname you manage elsewhere. We&apos;ll show the DNS records to point at us, then you
                    verify when they&apos;ve propagated. Your free platform URL remains the default staff login host.
                  </p>
                  <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="font-semibold text-foreground">1.</span>
                      Enter the apex or subdomain you want to map.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-foreground">2.</span>
                      Update DNS at your registrar with the recommended records.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-foreground">3.</span>
                      Open the domain details and tap Verify.
                    </li>
                  </ol>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button type="button" className="gap-1.5" onClick={() => setConnectOpen(true)}>
                      <Plus className="size-3.5" aria-hidden />
                      Connect domain
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setTab("manage")}>
                      View your domains
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "manage" ? (
          <div role="tabpanel" className="space-y-4 animate-in fade-in-0 duration-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative min-w-0 flex-1 sm:max-w-sm">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  className={dashboardInputClass(false, "h-10 pl-9")}
                  placeholder="Search domains…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className={dashboardInputClass(false, "h-10 w-auto cursor-pointer py-2")}
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  aria-label="Filter by source"
                >
                  <option value="all">All sources</option>
                  <option value="platform_subdomain">Platform</option>
                  <option value="hostafrica_purchase">Purchased</option>
                  <option value="manual_connect">Connected</option>
                </select>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void reload()}>
                  <RefreshCw className="size-3.5" aria-hidden />
                  Reload
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setConnectOpen(true)}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Connect
                </Button>
              </div>
            </div>

            {showListLoading ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl border border-border/50 bg-muted/30" />
                ))}
              </div>
            ) : loadFailed ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
                <p className="text-sm font-medium text-destructive">Could not load domains</p>
                <Button className="mt-4 gap-2" variant="outline" onClick={() => void reload()}>
                  <RefreshCw className="size-4" aria-hidden />
                  Try again
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/15 px-6 py-14 text-center">
                <Globe className="mx-auto size-9 text-muted-foreground/55" aria-hidden />
                <p className="mt-3 text-sm font-medium">No domains match</p>
                <p className={cn(dashboardHintClass(), "mx-auto mt-1 max-w-sm")}>
                  Buy a .ke name or connect a hostname you already own.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setTab("buy")}>
                    Buy .ke
                  </Button>
                  <Button size="sm" onClick={() => setConnectOpen(true)}>
                    Connect own
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-border/50 bg-muted/35 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">
                          <button type="button" className="hover:text-foreground" onClick={() => toggleSort("domain")}>
                            Domain {sortKey === "domain" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                          </button>
                        </th>
                        <th className="px-4 py-3">
                          <button type="button" className="hover:text-foreground" onClick={() => toggleSort("status")}>
                            Status {sortKey === "status" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                          </button>
                        </th>
                        <th className="px-4 py-3">
                          <button type="button" className="hover:text-foreground" onClick={() => toggleSort("source")}>
                            Source {sortKey === "source" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {pageRows.map((row) => {
                        const badge = statusMeta(row);
                        const busyRow = rowBusyId === row.id;
                        return (
                          <tr
                            key={row.id}
                            className={cn(
                              "transition-colors hover:bg-muted/25",
                              row.primary && "bg-primary/[0.03]",
                            )}
                          >
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                className="group flex min-w-0 flex-col text-left"
                                onClick={() => {
                                  setDetailRow(row);
                                  setDetailOpen(true);
                                }}
                              >
                                <span className="font-mono text-sm font-semibold tracking-tight group-hover:text-primary">
                                  {row.domain}
                                </span>
                                {row.primary ? (
                                  <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                                    <Star className="size-3" aria-hidden />
                                    Primary
                                  </span>
                                ) : null}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={badge.variant}>{badge.text}</Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{sourceLabel(row)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                {row.active ? (
                                  <Button asChild variant="ghost" size="sm" className="size-8 p-0">
                                    <a
                                      href={`https://${row.domain}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      aria-label="Open site"
                                    >
                                      <ExternalLink className="size-3.5" aria-hidden />
                                    </a>
                                  </Button>
                                ) : null}
                                <RowActionsMenu
                                  row={row}
                                  busy={busyRow}
                                  onOpen={() => {
                                    setDetailRow(row);
                                    setDetailOpen(true);
                                  }}
                                  onMakePrimary={() => void handleMakePrimary(row)}
                                  onVerify={() => void handleVerify(row)}
                                  onDelete={() => setDeleteRow(row)}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {pageCount > 1 ? (
                  <div className="flex items-center justify-between border-t border-border/50 px-4 py-3 text-xs text-muted-foreground">
                    <span>
                      {filtered.length} domain{filtered.length === 1 ? "" : "s"} · page {page + 1} of {pageCount}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page === 0}
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page >= pageCount - 1}
                        onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <DomainDetailDrawer
        row={detailRow}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        busy={!!detailRow && rowBusyId === detailRow.id}
        onMakePrimary={(r) => void handleMakePrimary(r)}
        onVerify={(r) => void handleVerify(r)}
        onDelete={(r) => setDeleteRow(r)}
      />

      <ConnectDomainDrawer
        open={connectOpen}
        onOpenChange={setConnectOpen}
        busy={busy.kind === "save"}
        onSubmit={handleAdd}
      />

      <Dialog open={!!deleteRow} onOpenChange={(open) => !open && !deleting && setDeleteRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {deleteRow?.domain}?</DialogTitle>
            <DialogDescription>
              This disconnects the hostname from your shop. You can reconnect it later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setDeleteRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              className="gap-1.5"
              onClick={() => void confirmDelete()}
            >
              {deleting ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
