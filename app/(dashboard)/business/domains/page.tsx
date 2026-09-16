"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useDomainOrderStats } from "@/components/business/buy-kenyan-domain-wizard";
import { useDashboard } from "@/components/dashboard-provider";
import {
  DASHBOARD_MAX,
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMediaLg } from "@/hooks/use-media-lg";
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

import {
  DomainChip,
  sortDomains,
  sourceLabel,
  statusMeta,
  type SortKey,
} from "./_components/domain-helpers";
import {
  DomainsTheatre,
  type TabId,
} from "./_components/domains-theatre";

type Busy =
  | { kind: "idle" }
  | { kind: "save" }
  | { kind: "row"; id: string; action: string };
type DnsRecord = { type?: string; name?: string; value?: string };

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function recommendedRecords(row: DomainRecord): DnsRecord[] {
  const raw = row.dnsInstructions?.recommendedRecords;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is DnsRecord => !!r && typeof r === "object");
}

function LockedNotice() {
  return (
    <div
      className={cn(
        DASHBOARD_MAX,
        "flex min-h-[50vh] items-center justify-center",
      )}
    >
      <div className={cn(DASHBOARD_SECTION_SURFACE, "max-w-md text-center")}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white text-muted-foreground">
          <Lock className="size-5" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">
          Domains are restricted
        </h1>
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

function DomainDetailDrawer({
  row,
  open,
  onOpenChange,
  busy,
  onMakePrimary,
  onVerify,
  onDelete,
  docked = false,
  dockRoot = null,
}: {
  row: DomainRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onMakePrimary: (row: DomainRecord) => void;
  onVerify: (row: DomainRecord) => void;
  onDelete: (row: DomainRecord) => void;
  docked?: boolean;
  dockRoot?: HTMLElement | null;
}) {
  if (!row) return null;
  const badge = statusMeta(row);
  const isPlatform = (row.source || "").toLowerCase() === "platform_subdomain";
  const isPurchase = (row.source || "").toLowerCase() === "hostafrica_purchase";
  const needsVerify = !isPlatform && !isPurchase && !row.active;
  const records = recommendedRecords(row);
  const note =
    typeof row.dnsInstructions?.note === "string"
      ? row.dnsInstructions.note
      : null;

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
      width={docked ? "default" : "wide"}
      appearance="sharp"
      headerDensity={docked ? "compact" : "default"}
      bodyLayout={docked ? "fill" : "scroll"}
      docked={docked}
      dockRoot={dockRoot}
      footer={
        <div className="flex flex-wrap gap-2">
          {row.active ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a
                href={`https://${row.domain}`}
                target="_blank"
                rel="noreferrer"
              >
                Visit
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </Button>
          ) : null}
          {needsVerify ? (
            <Button
              size="sm"
              disabled={busy}
              className="gap-1.5"
              onClick={() => onVerify(row)}
            >
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
            className="gap-1.5 text-[#9a2e16] hover:bg-[color-mix(in_srgb,#9a2e16_8%,white)] hover:text-[#9a2e16]"
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
          {row.primary ? (
            <DomainChip className="border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_40%,transparent)] text-[var(--pos-primary,#0f766e)]">
              Primary
            </DomainChip>
          ) : null}
          <DomainChip className={badge.className}>{badge.text}</DomainChip>
          <DomainChip className="border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground">
            {sourceLabel(row)}
          </DomainChip>
        </div>

        {isPlatform ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Always free. Staff login stays here by default even after you add a
            custom domain.
          </p>
        ) : null}
        {isPurchase && !row.active ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            We&apos;re finishing DNS and SSL for this purchased domain — no
            manual DNS changes needed.
          </p>
        ) : null}
        {row.lastError ? (
          <div className="rounded-none border border-[#9a2e16]/35 bg-[color-mix(in_srgb,#9a2e16_5%,white)] px-3 py-2.5 text-sm text-[#9a2e16]">
            {row.lastError}
          </div>
        ) : null}

        {needsVerify ? (
          <div className="space-y-3 rounded-none border border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-semibold">DNS checklist</p>
            {note ? <p className={dashboardHintClass()}>{note}</p> : null}
            {records.length > 0 ? (
              <ul className="space-y-2">
                {records.map((r, i) => {
                  const line = [r.type, r.name, r.value]
                    .filter(Boolean)
                    .join(" → ");
                  return (
                    <li
                      key={`${line}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-none border border-border/50 bg-background px-2.5 py-2 font-mono text-xs"
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
              <p className={dashboardHintClass()}>
                No recommended records yet — try Verify after DNS propagates.
              </p>
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
      appearance="sharp"
      footer={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !value.trim()}
            className="gap-1.5"
            onClick={() => void onSubmit(value.trim())}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Plus className="size-3.5" aria-hidden />
            )}
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

export default function DomainsPage() {
  const { canManageBusinessSettings } = useDashboard();
  const isLg = useMediaLg();
  const [dockRoot, setDockRoot] = useState<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<TabId>("buy");
  const [rows, setRows] = useState<DomainRecord[]>([]);
  const [busy, setBusy] = useState<Busy>({ kind: "idle" });
  const [fetchPass, setFetchPass] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("domain");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
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
      setRows((previous) =>
        sortDomains([...previous, created], sortKey, sortDir),
      );
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
      setRows((previous) =>
        previous.map((r) => (r.id === updated.id ? updated : r)),
      );
      setDetailRow(updated);
      if (updated.active) toast.success(`${updated.domain} is live.`);
      else
        toast.error(
          `${updated.domain} is not verified yet. Check DNS and try again.`,
        );
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
      list = list.filter(
        (r) => (r.source || "").toLowerCase() === sourceFilter,
      );
    }
    if (q) {
      list = list.filter((r) => r.domain.toLowerCase().includes(q));
    }
    return sortDomains(list, sortKey, sortDir);
  }, [rows, query, sourceFilter, sortKey, sortDir]);

  if (!canManageBusinessSettings) return <LockedNotice />;

  const rowBusyId = busy.kind === "row" ? busy.id : null;
  const showListLoading = fetchPass === 0 && !loadFailed && rows.length === 0;
  const platformRow = rows.find(
    (r) => (r.source || "").toLowerCase() === "platform_subdomain",
  );
  const liveCount = rows.filter((r) => r.active).length;
  const pendingCount = rows.filter((r) => !r.active).length;

  const clearSelection = () => {
    setDetailRow(null);
    setDetailOpen(false);
  };

  return (
    <>
      <div className={cn(DASHBOARD_MAX_WIDE, "gap-1.5")}>
        <DashboardPageHero
          icon={Globe}
          eyebrow="Connectivity"
          title="Domains"
          description="Buy a Kenyan domain, manage mapped hostnames, or connect one you already own — customers shop on custom domains; staff login stays on your free platform URL."
        />

        <DomainsTheatre
          tab={tab}
          onTabChange={setTab}
          rows={rows}
          filtered={filtered}
          query={query}
          onQueryChange={setQuery}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          showListLoading={showListLoading}
          loadFailed={loadFailed}
          onReload={() => void reload()}
          liveCount={liveCount}
          pendingCount={pendingCount}
          orderStats={orderStats}
          platformRow={platformRow}
          selectedRow={detailRow}
          detailOpen={detailOpen}
          onSelect={(row) => {
            setDetailRow(row);
            setDetailOpen(true);
          }}
          onConnectOpen={() => setConnectOpen(true)}
          onBuyLive={() => {
            void reload();
            void orderStats.reload().catch(() => undefined);
          }}
          rowBusyId={rowBusyId}
          dockRef={setDockRoot}
        />
      </div>

      <DomainDetailDrawer
        row={detailRow}
        open={detailOpen && !!detailRow}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) clearSelection();
        }}
        busy={!!detailRow && rowBusyId === detailRow.id}
        onMakePrimary={(r) => void handleMakePrimary(r)}
        onVerify={(r) => void handleVerify(r)}
        onDelete={(r) => setDeleteRow(r)}
        docked={isLg}
        dockRoot={dockRoot}
      />

      <ConnectDomainDrawer
        open={connectOpen}
        onOpenChange={setConnectOpen}
        busy={busy.kind === "save"}
        onSubmit={handleAdd}
      />

      <Dialog
        open={!!deleteRow}
        onOpenChange={(open) => !open && !deleting && setDeleteRow(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {deleteRow?.domain}?</DialogTitle>
            <DialogDescription>
              This disconnects the hostname from your shop. You can reconnect it
              later if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteRow(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              className="gap-1.5"
              onClick={() => void confirmDelete()}
            >
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-3.5" aria-hidden />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
