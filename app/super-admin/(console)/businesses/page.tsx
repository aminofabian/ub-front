"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, Plus, RefreshCw, SlidersHorizontal } from "lucide-react";

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
import {
  type CreateSaBusinessPayload,
  type SaBusinessRow,
  createSaBusiness,
  deleteSaBusiness,
  fetchSaBusinesses,
} from "@/lib/super-admin-api";
import { slugDerivedShopUrl } from "@/lib/config";
import { cn } from "@/lib/utils";

export default function SuperAdminBusinessesPage() {
  const [rows, setRows] = useState<SaBusinessRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryDomain, setPrimaryDomain] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [countryCode, setCountryCode] = useState("KE");
  const [timezone, setTimezone] = useState("Africa/Nairobi");
  const [tier, setTier] = useState("starter");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [filterTier, setFilterTier] = useState("");

  const reload = useCallback(async () => {
    setLoadError("");
    try {
      setRows(await fetchSaBusinesses(0, 100));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load businesses.");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

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
      if (filterTier.trim() && b.subscriptionTier.toLowerCase() !== filterTier.trim().toLowerCase()) return false;
      return true;
    });
  }, [rows, search, filterActive, filterTier]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (filterActive !== "all" ? 1 : 0) +
    (filterTier.trim() ? 1 : 0);

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
    } catch {
      /* ignore */
    }
  }

  const performDeleteTenant = async (b: SaBusinessRow) => {
    setDeleteError("");
    setDeletingId(b.id);
    try {
      await deleteSaBusiness(b.id);
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

  const createForm = (
    <form className="space-y-4" onSubmit={onCreate}>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Slug drives the default hostname{" "}
        <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">{"{slug}." + "{parent}"}</code> — parent
        is the hostname from <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_APP_BASE_URL</code>.
        Use a custom domain only when the tenant has a dedicated host.
      </p>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="sa-new-name">
          Name
        </label>
        <Input id="sa-new-name" value={name} onChange={(ev) => setName(ev.target.value)} required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="sa-new-slug">
          Slug
        </label>
        <Input
          id="sa-new-slug"
          value={slug}
          onChange={(ev) => setSlug(ev.target.value)}
          placeholder="acme-kiosk"
          pattern="[a-zA-Z0-9-]+"
          required
        />
        {slug.trim() ? (
          <p className="text-xs text-muted-foreground">
            Default URL preview:{" "}
            <code className="rounded bg-muted px-1 font-mono">{slugDerivedShopUrl(slug)}</code>
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="sa-new-domain">
          Custom domain (optional)
        </label>
        <Input
          id="sa-new-domain"
          value={primaryDomain}
          onChange={(ev) => setPrimaryDomain(ev.target.value)}
          placeholder="e.g. acme.example.com"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="sa-new-currency">
            Currency
          </label>
          <Input id="sa-new-currency" value={currency} onChange={(ev) => setCurrency(ev.target.value)} maxLength={3} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="sa-new-country">
            Country
          </label>
          <Input
            id="sa-new-country"
            value={countryCode}
            onChange={(ev) => setCountryCode(ev.target.value)}
            maxLength={2}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="sa-new-tz">
          Timezone
        </label>
        <Input id="sa-new-tz" value={timezone} onChange={(ev) => setTimezone(ev.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="sa-new-tier">
          Subscription tier
        </label>
        <Input id="sa-new-tier" value={tier} onChange={(ev) => setTier(ev.target.value)} />
      </div>
      {formError ? <AuthAlert variant="error">{formError}</AuthAlert> : null}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create business"}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setCreateOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-8">
      <SuperAdminPageHeader
        title="Tenants"
        description="Each row is a tenant. Copy the UUID for NEXT_PUBLIC_TENANT_ID or shop sign-up. Use filters to narrow the list without losing context."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="size-3.5" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="ml-0.5 inline-flex min-w-5 justify-center rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
            <Button type="button" size="sm" className="gap-1.5 shadow-sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              New tenant
            </Button>
          </>
        }
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}
      {deleteError ? <AuthAlert variant="error">{deleteError}</AuthAlert> : null}

      <SuperAdminDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create tenant"
        description="Provision a new business with sensible defaults. You can attach domains after creation."
        width="wide"
      >
        {createForm}
      </SuperAdminDrawer>

      <SuperAdminDrawer
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filter tenants"
        description="Refine the table client-side. Combine search with status and tier."
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="sa-filter-search">
              Search
            </label>
            <Input
              id="sa-filter-search"
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
              placeholder="Name, slug, or tenant ID"
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Status</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["active", "Active"],
                  ["inactive", "Inactive"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={filterActive === value ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setFilterActive(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="sa-filter-tier">
              Tier (exact match)
            </label>
            <Input
              id="sa-filter-tier"
              value={filterTier}
              onChange={(ev) => setFilterTier(ev.target.value)}
              placeholder="e.g. starter"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setSearch("");
              setFilterActive("all");
              setFilterTier("");
            }}
          >
            Reset filters
          </Button>
        </div>
      </SuperAdminDrawer>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="size-4 shrink-0 opacity-70" aria-hidden />
            <span>
              Showing{" "}
              <span className="font-medium text-foreground tabular-nums">{filteredRows.length}</span> of{" "}
              <span className="font-medium text-foreground tabular-nums">{rows.length}</span>
            </span>
          </div>
          <Button variant="outline" size="sm" type="button" className="gap-1.5 self-start sm:self-auto" onClick={() => void reload()}>
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/35 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Tenant ID</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-muted-foreground">
                    {rows.length === 0 ? "No businesses yet." : "No tenants match your filters."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((b) => (
                  <tr
                    key={b.id}
                    className="transition-colors hover:bg-muted/35"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{b.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.slug}</td>
                    <td className="px-4 py-3">
                      <Badge variant={b.active ? "success" : "secondary"}>{b.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">
                        {b.subscriptionTier}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground tabular-nums">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">{b.id}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" type="button" onClick={() => void copyId(b.id)}>
                        Copy ID
                      </Button>
                      <Button variant="ghost" size="sm" type="button" asChild>
                        <Link
                          href={`/super-admin/businesses/${encodeURIComponent(b.id)}?name=${encodeURIComponent(b.name)}&tier=${encodeURIComponent(b.subscriptionTier)}&active=${b.active ? "1" : "0"}`}
                        >
                          Manage
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        className="text-destructive hover:text-destructive"
                        disabled={deletingId !== null}
                        onClick={() => onDeleteTenant(b)}
                      >
                        {deletingId === b.id ? "Deleting…" : "Delete"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
