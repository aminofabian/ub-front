"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { Button } from "@/components/ui/button";
import {
  type CreateSaBusinessPayload,
  type SaBusinessRow,
  createSaBusiness,
  fetchSaBusinesses,
} from "@/lib/super-admin-api";

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

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Businesses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each row is a tenant. Copy the UUID for{" "}
          <code className="rounded bg-muted px-1 text-xs">NEXT_PUBLIC_TENANT_ID</code> or shop sign-up.
        </p>
      </div>

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}

      <section className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">Create tenant</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Slug must be alphanumeric and hyphens only. Optional primary domain creates the host mapping.
        </p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">Name</span>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              required
            />
          </label>
          <label>
            <span className="text-sm font-medium">Slug</span>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={slug}
              onChange={(ev) => setSlug(ev.target.value)}
              placeholder="acme-kiosk"
              pattern="[a-zA-Z0-9-]+"
              required
            />
          </label>
          <label>
            <span className="text-sm font-medium">Primary domain (optional)</span>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={primaryDomain}
              onChange={(ev) => setPrimaryDomain(ev.target.value)}
              placeholder="acme.example.com"
            />
          </label>
          <label>
            <span className="text-sm font-medium">Currency</span>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={currency}
              onChange={(ev) => setCurrency(ev.target.value)}
              maxLength={3}
            />
          </label>
          <label>
            <span className="text-sm font-medium">Country</span>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={countryCode}
              onChange={(ev) => setCountryCode(ev.target.value)}
              maxLength={2}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">Timezone</span>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={timezone}
              onChange={(ev) => setTimezone(ev.target.value)}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">Subscription tier</span>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={tier}
              onChange={(ev) => setTier(ev.target.value)}
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create business"}
            </Button>
          </div>
        </form>
        {formError ? (
          <div className="mt-4">
            <AuthAlert variant="error">{formError}</AuthAlert>
          </div>
        ) : null}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium">All tenants</h2>
          <Button variant="outline" size="sm" type="button" onClick={() => void reload()}>
            Refresh
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Slug</th>
                <th className="px-3 py-2 font-medium">Active</th>
                <th className="px-3 py-2 font-medium">Tier</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Tenant ID</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                    No businesses yet.
                  </td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr key={b.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 font-medium">{b.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{b.slug}</td>
                    <td className="px-3 py-2">{b.active ? "Yes" : "No"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{b.subscriptionTier}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 font-mono text-xs text-muted-foreground">
                      {b.id}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <Button variant="ghost" size="sm" type="button" onClick={() => void copyId(b.id)}>
                        Copy ID
                      </Button>
                      <Button variant="ghost" size="sm" type="button" asChild>
                        <Link
                          href={`/super-admin/businesses/${encodeURIComponent(b.id)}?name=${encodeURIComponent(b.name)}&tier=${encodeURIComponent(b.subscriptionTier)}&active=${b.active ? "1" : "0"}`}
                        >
                          Domains
                        </Link>
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
