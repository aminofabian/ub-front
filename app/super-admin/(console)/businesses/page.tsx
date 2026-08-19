"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  Copy,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { AuthAlert } from "@/components/auth/auth-alert";
import {
  showThemedConfirmToast,
  showThemedErrorToast,
  showThemedSuccessToast,
} from "@/components/super-admin/themed-confirm-toast";
import { SuperAdminDrawer } from "@/components/super-admin/super-admin-drawer";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type CreateSaBusinessPayload,
  type SaBusinessRow,
  createSaBusiness,
  deleteSaBusiness,
  fetchSaBusinesses,
  fetchSaEmailRecipients,
} from "@/lib/super-admin-api";
import { APP_ROUTES, slugDerivedShopUrl } from "@/lib/config";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "inactive" | "stuck";

const CHECK_CLASS =
  "size-4 shrink-0 rounded-[4px] border border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

const SELECT_CLASS = cn(
  "h-9 min-w-[8.5rem] rounded-lg border border-input bg-background px-2.5 text-sm shadow-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35",
);

function slugifyName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function formatTenantDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTenantDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function tenantManageHref(b: SaBusinessRow) {
  const q = new URLSearchParams({
    name: b.name,
    slug: b.slug,
    tier: b.subscriptionTier,
    active: b.active ? "1" : "0",
  });
  return `${APP_ROUTES.superAdminBusinesses}/${encodeURIComponent(b.id)}?${q.toString()}`;
}

function SelectAllCheckbox({
  allSelected,
  someSelected,
  onToggle,
}: {
  allSelected: boolean;
  someSelected: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      className={CHECK_CLASS}
      aria-label="Select all visible tenants"
      checked={allSelected}
      ref={(el) => {
        if (el) el.indeterminate = someSelected && !allSelected;
      }}
      onChange={(ev) => onToggle(ev.target.checked)}
    />
  );
}

export default function SuperAdminBusinessesPage() {
  const [rows, setRows] = useState<SaBusinessRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryDomain, setPrimaryDomain] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [countryCode, setCountryCode] = useState("KE");
  const [timezone, setTimezone] = useState("Africa/Nairobi");
  const [tier, setTier] = useState("starter");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<StatusFilter>("all");
  const [filterTier, setFilterTier] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stuckIds, setStuckIds] = useState<Set<string>>(() => new Set());

  const searchRef = useRef<HTMLInputElement>(null);
  const slugTouched = useRef(false);
  const copyTimer = useRef<number | null>(null);
  const loadedOnce = useRef(false);

  const reload = useCallback(async () => {
    setLoadError("");
    if (loadedOnce.current) setRefreshing(true);
    else setLoading(true);
    try {
      const [tenants, stuck] = await Promise.all([
        fetchSaBusinesses(0, 100),
        fetchSaEmailRecipients({ segment: "stuck_signup" }, 0, 500).catch(() => ({
          rows: [] as { businessId: string }[],
          total: 0,
        })),
      ]);
      setRows(tenants);
      setStuckIds(new Set(stuck.rows.map((row) => row.businessId)));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load businesses.");
    } finally {
      loadedOnce.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (createOpen) return;
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createOpen]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const counts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const row of rows) {
      if (row.active) active += 1;
      else inactive += 1;
    }
    return { all: rows.length, active, inactive, stuck: stuckIds.size };
  }, [rows, stuckIds]);

  const tiers = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      const value = row.subscriptionTier.trim();
      if (value) set.add(value);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((b) => {
      if (
        q &&
        !b.name.toLowerCase().includes(q) &&
        !b.slug.toLowerCase().includes(q) &&
        !b.id.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (filterActive === "active" && !b.active) return false;
      if (filterActive === "inactive" && b.active) return false;
      if (filterActive === "stuck" && !stuckIds.has(b.id)) return false;
      if (filterTier.trim() && b.subscriptionTier.toLowerCase() !== filterTier.trim().toLowerCase()) return false;
      return true;
    });
  }, [rows, search, filterActive, filterTier, stuckIds]);

  const filtersOn = Boolean(search.trim()) || filterActive !== "all" || Boolean(filterTier.trim());

  const allVisibleSelected =
    filteredRows.length > 0 && filteredRows.every((b) => selectedIds.includes(b.id));
  const someVisibleSelected = filteredRows.some((b) => selectedIds.includes(b.id));

  const resetFilters = () => {
    setSearch("");
    setFilterActive("all");
    setFilterTier("");
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    const payload: CreateSaBusinessPayload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      currency: currency.trim() || undefined,
      countryCode: countryCode.trim().toUpperCase() || undefined,
      timezone: timezone.trim() || undefined,
      subscriptionTier: tier.trim() || undefined,
      primaryDomain: primaryDomain.trim() || undefined,
    };
    try {
      await createSaBusiness(payload);
      setName("");
      setSlug("");
      setPrimaryDomain("");
      slugTouched.current = false;
      await reload();
      setCreateOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      /* ignore */
    }
  }

  const performDeleteTenant = async (b: SaBusinessRow) => {
    setDeleteError("");
    setDeletingId(b.id);
    try {
      await deleteSaBusiness(b.id);
      setSelectedIds((prev) => prev.filter((id) => id !== b.id));
      showThemedSuccessToast(`Tenant “${b.name}” deleted.`);
      await reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      setDeleteError(message);
      showThemedErrorToast(message);
    } finally {
      setDeletingId(null);
    }
  };

  const onDeleteTenant = (b: SaBusinessRow) => {
    showThemedConfirmToast({
      id: `delete-sa-business-${b.id}`,
      title: `Delete tenant “${b.name}”?`,
      description: `Slug: ${b.slug}. This archives the business and all users under it. It cannot be undone from the console.`,
      onConfirm: () => performDeleteTenant(b),
    });
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((item) => item !== id),
    );
  };

  const statusOptions: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "active", label: "Active", count: counts.active },
    { value: "inactive", label: "Inactive", count: counts.inactive },
    { value: "stuck", label: "Stuck", count: counts.stuck },
  ];

  const createForm = (
    <form className="space-y-7" onSubmit={onCreate}>
      <fieldset className="min-w-0 space-y-4 p-0">
        <legend className="float-none w-full p-0 text-sm font-medium text-foreground">Identity</legend>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Slug drives the default hostname{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">{"{slug}.{parent}"}</code>. Parent is
          the host from{" "}
          <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_APP_BASE_URL</code>. Add a
          custom domain only when the tenant has a dedicated host.
        </p>
        <div className="space-y-2">
          <Label htmlFor="sa-new-name">Name</Label>
          <Input
            id="sa-new-name"
            value={name}
            onChange={(ev) => {
              const next = ev.target.value;
              setName(next);
              if (!slugTouched.current) setSlug(slugifyName(next));
            }}
            autoComplete="off"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sa-new-slug">Slug</Label>
          <Input
            id="sa-new-slug"
            value={slug}
            onChange={(ev) => {
              slugTouched.current = true;
              setSlug(ev.target.value);
            }}
            placeholder="acme-kiosk"
            pattern="[a-zA-Z0-9-]+"
            required
          />
          {slug.trim() ? (
            <p className="text-xs text-muted-foreground">
              Default URL{" "}
              <code className="rounded bg-muted px-1 font-mono">{slugDerivedShopUrl(slug)}</code>
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="sa-new-domain">Custom domain</Label>
          <Input
            id="sa-new-domain"
            value={primaryDomain}
            onChange={(ev) => setPrimaryDomain(ev.target.value)}
            placeholder="Optional — e.g. shop.acme.co.ke"
          />
        </div>
      </fieldset>

      <fieldset className="min-w-0 space-y-4 p-0">
        <legend className="float-none w-full p-0 text-sm font-medium text-foreground">Locale</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sa-new-currency">Currency</Label>
            <Input id="sa-new-currency" value={currency} onChange={(ev) => setCurrency(ev.target.value)} maxLength={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sa-new-country">Country</Label>
            <Input
              id="sa-new-country"
              value={countryCode}
              onChange={(ev) => setCountryCode(ev.target.value)}
              maxLength={2}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sa-new-tz">Timezone</Label>
          <Input id="sa-new-tz" value={timezone} onChange={(ev) => setTimezone(ev.target.value)} />
        </div>
      </fieldset>

      <fieldset className="min-w-0 space-y-4 p-0">
        <legend className="float-none w-full p-0 text-sm font-medium text-foreground">Plan</legend>
        <div className="space-y-2">
          <Label htmlFor="sa-new-tier">Subscription tier</Label>
          <Input id="sa-new-tier" value={tier} onChange={(ev) => setTier(ev.target.value)} />
        </div>
      </fieldset>

      {formError ? <AuthAlert variant="error">{formError}</AuthAlert> : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create tenant"}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setCreateOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );

  const rowActions = (b: SaBusinessRow, compact: boolean) => (
    <div className={cn("flex items-center", compact ? "justify-end gap-0.5" : "gap-1")}>
      <Button variant="outline" size="sm" type="button" asChild>
        <Link href={tenantManageHref(b)}>Manage</Link>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        type="button"
        aria-label={copiedId === b.id ? "Tenant ID copied" : `Copy tenant ID for ${b.name}`}
        title={copiedId === b.id ? "Copied" : "Copy tenant ID"}
        onClick={() => void copyId(b.id)}
      >
        {copiedId === b.id ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        type="button"
        className="text-muted-foreground hover:text-destructive"
        aria-label={`Delete ${b.name}`}
        title="Delete tenant"
        disabled={deletingId !== null}
        onClick={() => onDeleteTenant(b)}
      >
        {deletingId === b.id ? (
          <RefreshCw className="size-3.5 animate-spin" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Tenants"
        description="Find a business, open it to manage domains and users, or provision a new tenant."
        actions={
          <>
            {stuckIds.size > 0 ? (
              <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                <Link href={`${APP_ROUTES.superAdminCampaignNew}?segment=stuck_signup`}>
                  <Mail className="size-3.5" />
                  Email stuck
                  <span className="tabular-nums">({stuckIds.size})</span>
                </Link>
              </Button>
            ) : null}
            <Button type="button" size="sm" className="gap-1.5 shadow-sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              New tenant
            </Button>
          </>
        }
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}
      {deleteError ? <AuthAlert variant="error">{deleteError}</AuthAlert> : null}
      <p className="sr-only" aria-live="polite">
        {copiedId ? "Tenant ID copied to clipboard." : ""}
      </p>

      <SuperAdminDrawer
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            slugTouched.current = false;
            setFormError("");
          }
        }}
        title="Create tenant"
        description="Provision a new business with Nairobi defaults. Attach a custom domain after creation if needed."
        width="wide"
      >
        {createForm}
      </SuperAdminDrawer>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                ref={searchRef}
                id="sa-tenant-search"
                value={search}
                onChange={(ev) => setSearch(ev.target.value)}
                placeholder="Search name, slug, or tenant ID"
                className={cn("h-9 pl-8", search ? "pr-9" : "sm:pr-12")}
                aria-label="Search tenants"
              />
              {search ? (
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X className="size-3.5" />
                </button>
              ) : (
                <span className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border/80 px-1.5 py-px font-mono text-[10px] leading-4 text-muted-foreground sm:inline">
                  /
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex max-w-full flex-nowrap overflow-x-auto rounded-lg border border-border/80 bg-muted/25 p-0.5"
                role="group"
                aria-label="Filter by status"
              >
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={filterActive === option.value}
                    className={cn(
                      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-colors",
                      filterActive === option.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setFilterActive(option.value)}
                  >
                    {option.label}
                    <span className="tabular-nums text-muted-foreground">{option.count}</span>
                  </button>
                ))}
              </div>
              {tiers.length > 0 ? (
                <select
                  aria-label="Filter by subscription tier"
                  className={SELECT_CLASS}
                  value={filterTier}
                  onChange={(ev) => setFilterTier(ev.target.value)}
                >
                  <option value="">All tiers</option>
                  {tiers.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              ) : null}
              <Button
                variant="outline"
                size="icon-sm"
                type="button"
                aria-label="Refresh tenants"
                title="Refresh"
                disabled={refreshing}
                onClick={() => void reload()}
              >
                <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              {!loading && filteredRows.length > 0 ? (
                <label className="inline-flex items-center gap-2 lg:hidden">
                  <SelectAllCheckbox
                    allSelected={allVisibleSelected}
                    someSelected={someVisibleSelected}
                    onToggle={(checked) =>
                      setSelectedIds(checked ? filteredRows.map((b) => b.id) : [])
                    }
                  />
                  <span className="text-foreground">Select visible</span>
                </label>
              ) : null}
              <p>
                {loading ? (
                  "Loading tenants…"
                ) : (
                  <>
                    <span className="font-medium text-foreground tabular-nums">{filteredRows.length}</span>
                    {filtersOn ? (
                      <>
                        {" "}
                        of <span className="tabular-nums">{rows.length}</span> match
                      </>
                    ) : (
                      <> tenant{filteredRows.length === 1 ? "" : "s"}</>
                    )}
                  </>
                )}
              </p>
            </div>
            {filtersOn ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                Reset filters
              </Button>
            ) : null}
          </div>
        </div>

        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2.5 sm:px-5">
            <p className="mr-auto text-sm font-medium text-foreground">
              <span className="tabular-nums">{selectedIds.length}</span> selected
            </p>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
              <Link
                href={`${APP_ROUTES.superAdminCampaignNew}?segment=selected_tenants&businessIds=${encodeURIComponent(selectedIds.join(","))}`}
              >
                <Mail className="size-3.5" />
                Email selected
              </Link>
            </Button>
            {stuckIds.size > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds([...stuckIds])}>
                Select stuck
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        ) : null}

        {loading ? (
          <TenantListSkeleton />
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <Building2 className="mb-3 size-8 text-muted-foreground/45" aria-hidden />
            <p className="text-sm font-medium text-foreground">
              {rows.length === 0 ? "No tenants yet" : "No tenants match"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {rows.length === 0
                ? "Provision the first business to start managing domains, users, and campaigns from this list."
                : "Try a different name, status, or tier — or reset filters to see the full fleet."}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {rows.length === 0 ? (
                <Button type="button" size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  New tenant
                </Button>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                  Reset filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border/50 lg:hidden">
              {filteredRows.map((b) => {
                const selected = selectedIds.includes(b.id);
                return (
                  <li
                    key={b.id}
                    className={cn("flex gap-3 px-4 py-3.5 sm:px-5", selected && "bg-primary/[0.04]")}
                  >
                    <label className="flex size-9 shrink-0 items-center justify-center">
                      <input
                        type="checkbox"
                        className={CHECK_CLASS}
                        aria-label={`Select ${b.name}`}
                        checked={selected}
                        onChange={(ev) => toggleSelected(b.id, ev.target.checked)}
                      />
                    </label>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={tenantManageHref(b)}
                            className="block truncate font-medium text-foreground hover:text-primary"
                          >
                            {b.name}
                          </Link>
                          <p className="truncate font-mono text-xs text-muted-foreground">{b.slug}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                          {stuckIds.has(b.id) ? <Badge variant="warning">Stuck</Badge> : null}
                          <Badge variant={b.active ? "success" : "secondary"}>
                            {b.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {b.subscriptionTier}
                        </Badge>
                        <time
                          className="text-xs text-muted-foreground tabular-nums"
                          dateTime={b.createdAt}
                          title={formatTenantDateTime(b.createdAt)}
                        >
                          {formatTenantDate(b.createdAt)}
                        </time>
                      </div>
                      {rowActions(b, false)}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border bg-muted/35 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <SelectAllCheckbox
                        allSelected={allVisibleSelected}
                        someSelected={someVisibleSelected}
                        onToggle={(checked) =>
                          setSelectedIds(checked ? filteredRows.map((b) => b.id) : [])
                        }
                      />
                    </th>
                    <th className="px-4 py-3 font-medium">Tenant</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Tier</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredRows.map((b) => {
                    const selected = selectedIds.includes(b.id);
                    return (
                      <tr
                        key={b.id}
                        className={cn(
                          "transition-colors hover:bg-muted/35",
                          selected && "bg-primary/[0.04] hover:bg-primary/[0.06]",
                        )}
                      >
                        <td className="px-4 py-2.5">
                          <label className="flex size-9 items-center justify-center">
                            <input
                              type="checkbox"
                              className={CHECK_CLASS}
                              aria-label={`Select ${b.name}`}
                              checked={selected}
                              onChange={(ev) => toggleSelected(b.id, ev.target.checked)}
                            />
                          </label>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex min-w-0 items-start gap-2">
                            <div className="min-w-0">
                              <Link
                                href={tenantManageHref(b)}
                                className="block truncate font-medium text-foreground hover:text-primary"
                              >
                                {b.name}
                              </Link>
                              <p className="truncate font-mono text-xs text-muted-foreground">{b.slug}</p>
                            </div>
                            {stuckIds.has(b.id) ? (
                              <Badge variant="warning" className="mt-0.5 shrink-0">
                                Stuck
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={b.active ? "success" : "secondary"}>
                            {b.active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="outline" className="capitalize">
                            {b.subscriptionTier}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground tabular-nums">
                          <time dateTime={b.createdAt} title={formatTenantDateTime(b.createdAt)}>
                            {formatTenantDate(b.createdAt)}
                          </time>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">{rowActions(b, true)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function TenantListSkeleton() {
  return (
    <div className="divide-y divide-border/50" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4 sm:px-5">
          <div className="size-4 animate-pulse rounded-[4px] bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-40 max-w-full animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-24 max-w-[50%] animate-pulse rounded bg-muted/80" />
          </div>
          <div className="hidden h-5 w-14 animate-pulse rounded-md bg-muted sm:block" />
          <div className="hidden h-5 w-16 animate-pulse rounded-md bg-muted md:block" />
          <div className="hidden h-3 w-20 animate-pulse rounded bg-muted lg:block" />
        </div>
      ))}
    </div>
  );
}
