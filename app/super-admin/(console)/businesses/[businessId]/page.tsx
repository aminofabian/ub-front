"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { Button } from "@/components/ui/button";
import { encodeAuthHandoffPayload } from "@/lib/auth-handoff";
import {
  APP_ROUTES,
  hostDerivedShopUrl,
  slugDerivedShopUrl,
} from "@/lib/config";
import {
  type SaBusinessUserRow,
  type SaDomainRow,
  addSaDomain,
  fetchSaBusiness,
  fetchSaBusinessUsers,
  fetchSaDomains,
  impersonateSaBusiness,
  patchSaBusiness,
  setSaPrimaryDomain,
} from "@/lib/super-admin-api";

function BusinessDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessIdRaw = params.businessId;
  const businessId =
    typeof businessIdRaw === "string"
      ? businessIdRaw
      : Array.isArray(businessIdRaw)
        ? businessIdRaw[0]
        : "";
  const titleName = searchParams.get("name") ?? "";
  const slugFromQuery = searchParams.get("slug") ?? "";

  const [domains, setDomains] = useState<SaDomainRow[]>([]);
  const [users, setUsers] = useState<SaBusinessUserRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [bizName, setBizName] = useState(titleName);
  const [bizTier, setBizTier] = useState(searchParams.get("tier") ?? "");
  const [bizActive, setBizActive] = useState(
    searchParams.get("active") !== "0",
  );
  const [globalCatalogCode, setGlobalCatalogCode] = useState("");
  const [bizCountry, setBizCountry] = useState("KE");
  const [bizCurrency, setBizCurrency] = useState("KES");
  const [bizTimezone, setBizTimezone] = useState("Africa/Nairobi");
  const [selectedUserId, setSelectedUserId] = useState("");

  const loadBusiness = useCallback(async () => {
    if (!businessId) return;
    try {
      const row = await fetchSaBusiness(businessId);
      setBizName(row.name);
      setBizTier(row.subscriptionTier ?? "");
      setBizActive(row.active);
      setGlobalCatalogCode(row.globalCatalogCode ?? "");
      setBizCountry(row.countryCode || "KE");
      setBizCurrency(row.currency || "KES");
      setBizTimezone(row.timezone || "Africa/Nairobi");
    } catch {
      /* name/tier still come from query params as fallback */
    }
  }, [businessId]);

  const loadDomains = useCallback(async () => {
    if (!businessId) {
      return;
    }
    setError("");
    try {
      setDomains(await fetchSaDomains(businessId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load domains.");
    }
  }, [businessId]);

  const loadUsers = useCallback(async () => {
    if (!businessId) {
      return;
    }
    try {
      const rows = await fetchSaBusinessUsers(businessId);
      setUsers(rows);
      const owner = rows.find(
        (u) => u.roleKey === "owner" && u.status.toLowerCase() === "active",
      );
      setSelectedUserId((prev) => {
        if (prev && rows.some((u) => u.id === prev)) return prev;
        return owner?.id ?? rows.find((u) => u.status.toLowerCase() === "active")?.id ?? "";
      });
    } catch {
      /* users are optional for domain management */
    }
  }, [businessId]);

  useEffect(() => {
    void loadBusiness();
    void loadDomains();
    void loadUsers();
  }, [loadBusiness, loadDomains, loadUsers]);

  useEffect(() => {
    setBizName(titleName);
  }, [titleName]);

  const primaryDomain = useMemo(
    () => domains.find((d) => d.primary && d.active)?.domain ?? null,
    [domains],
  );

  const onAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addSaDomain(businessId, newDomain);
      setNewDomain("");
      await loadDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add domain failed.");
    } finally {
      setBusy(false);
    }
  };

  const onSetPrimary = async (domainId: string) => {
    if (!businessId) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await setSaPrimaryDomain(businessId, domainId);
      await loadDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set primary.");
    } finally {
      setBusy(false);
    }
  };

  const onSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const nextCountry = bizCountry.trim().toUpperCase();
      const nextCurrency = bizCurrency.trim().toUpperCase();
      const nextTimezone = bizTimezone.trim();
      const loaded = await fetchSaBusiness(businessId);
      const regionChanged =
        nextCountry !== (loaded.countryCode || "").toUpperCase() ||
        nextCurrency !== (loaded.currency || "").toUpperCase();
      let acknowledgeRegionRisk: boolean | undefined;
      if (regionChanged) {
        const confirmed = window.confirm(
          "Changing country or currency re-labels existing amounts without converting them " +
            "(e.g. 1,200 KES becomes 1,200 UGX).\n\n" +
            "If this shop already has products or sales, the API will require this confirmation. Continue?",
        );
        if (!confirmed) {
          return;
        }
        acknowledgeRegionRisk = true;
      }
      await patchSaBusiness(businessId, {
        name: bizName.trim() || undefined,
        subscriptionTier: bizTier.trim() || undefined,
        active: bizActive,
        globalCatalogCode: globalCatalogCode.trim(),
        countryCode: nextCountry || undefined,
        currency: nextCurrency || undefined,
        timezone: nextTimezone || undefined,
        acknowledgeRegionRisk,
      });
      router.replace(
        `/super-admin/businesses/${encodeURIComponent(businessId)}?name=${encodeURIComponent(bizName.trim())}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const onOpenTenant = async (asOwner: boolean) => {
    if (!businessId) return;
    setImpersonating(true);
    setError("");
    try {
      const userId = asOwner ? undefined : selectedUserId || undefined;
      const result = await impersonateSaBusiness(businessId, userId);
      const slug = result.slug?.trim() || slugFromQuery.trim();
      const shopBase =
        hostDerivedShopUrl(result.primaryDomain || primaryDomain) ||
        (slug ? slugDerivedShopUrl(slug) : "");
      if (!shopBase) {
        throw new Error(
          "Could not resolve tenant URL. Add a primary domain or ensure the slug is set.",
        );
      }
      const nextPath = APP_ROUTES.business;
      const fragment = encodeAuthHandoffPayload({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tenantId: result.businessId,
        nextPath,
        impersonating: true,
        impersonationUserEmail: result.user.email,
        impersonationUserName: result.user.name,
      });
      const nextEnc = encodeURIComponent(nextPath);
      const slugEnc = encodeURIComponent(slug || result.slug);
      window.location.assign(
        `${shopBase}${APP_ROUTES.authHandoff}?next=${nextEnc}&slug=${slugEnc}#${fragment}`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open tenant session.",
      );
      setImpersonating(false);
    }
  };

  if (!businessId) {
    return <AuthAlert variant="error">Missing business id.</AuthAlert>;
  }

  const activeUsers = users.filter((u) => u.status.toLowerCase() === "active");

  return (
    <div className="space-y-10">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" type="button" asChild>
          <Link href={APP_ROUTES.superAdminBusinesses}>← All businesses</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {bizName || "Business"}{" "}
          <span className="text-base font-normal text-muted-foreground">
            · domains
          </span>
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
          {businessId}
        </p>
      </div>

      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

      <section className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">Open tenant dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Starts a 15-minute support session as a tenant user. Actions are
          audit-logged. You will leave the super-admin console and land on the
          tenant host.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Button
            type="button"
            disabled={busy || impersonating}
            onClick={() => void onOpenTenant(true)}
          >
            {impersonating ? "Opening…" : "Open as owner"}
          </Button>
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-sm font-medium">Or pick a user</span>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedUserId}
              onChange={(ev) => setSelectedUserId(ev.target.value)}
              disabled={busy || impersonating || activeUsers.length === 0}
            >
              {activeUsers.length === 0 ? (
                <option value="">No active users</option>
              ) : (
                activeUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} · {u.roleKey} · {u.email}
                  </option>
                ))
              )}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={
              busy || impersonating || !selectedUserId || activeUsers.length === 0
            }
            onClick={() => void onOpenTenant(false)}
          >
            Open as selected
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">Business settings</h2>
        <form className="mt-4 max-w-md space-y-3" onSubmit={onSaveBusiness}>
          <label className="block">
            <span className="text-sm font-medium">Display name</span>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={bizName}
              onChange={(ev) => setBizName(ev.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Subscription tier</span>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={bizTier}
              onChange={(ev) => setBizTier(ev.target.value)}
              placeholder="starter"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={bizActive}
              onChange={(ev) => setBizActive(ev.target.checked)}
            />
            Active
          </label>
          <label className="block">
            <span className="text-sm font-medium">Country code</span>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono uppercase"
              value={bizCountry}
              onChange={(ev) => setBizCountry(ev.target.value)}
              maxLength={2}
              placeholder="KE"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Currency</span>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono uppercase"
              value={bizCurrency}
              onChange={(ev) => setBizCurrency(ev.target.value)}
              maxLength={3}
              placeholder="KES"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Timezone</span>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={bizTimezone}
              onChange={(ev) => setBizTimezone(ev.target.value)}
              placeholder="Africa/Nairobi"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Changing country/currency on a shop with products or sales requires
              an explicit confirmation — amounts are re-labeled, not converted.
            </span>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Global catalog code</span>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              value={globalCatalogCode}
              onChange={(ev) => setGlobalCatalogCode(ev.target.value)}
              placeholder="default (leave blank for country/default)"
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Overrides regional resolution. Blank clears the override.
            </span>
          </label>
          <Button type="submit" disabled={busy}>
            Save changes
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="text-lg font-medium">Domains</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hostnames mapped to this tenant (lowercase). One can be marked primary.
        </p>
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={onAddDomain}
        >
          <label className="flex-1">
            <span className="text-sm font-medium">New domain</span>
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newDomain}
              onChange={(ev) => setNewDomain(ev.target.value)}
              placeholder="kiosk.example.com"
            />
          </label>
          <Button type="submit" disabled={busy}>
            Add
          </Button>
        </form>

        <div className="mt-6 overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Domain</th>
                <th className="px-3 py-2">Primary</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {domains.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No domains. Add one above or recreate with primary domain.
                  </td>
                </tr>
              ) : (
                domains.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="px-3 py-2 font-mono text-xs">{d.domain}</td>
                    <td className="px-3 py-2">{d.primary ? "Yes" : "—"}</td>
                    <td className="px-3 py-2">{d.active ? "Yes" : "No"}</td>
                    <td className="px-3 py-2 text-right">
                      {!d.primary ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => void onSetPrimary(d.id)}
                        >
                          Make primary
                        </Button>
                      ) : null}
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

export default function SuperAdminBusinessDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-muted-foreground">Loading business…</div>
      }
    >
      <BusinessDetailInner />
    </Suspense>
  );
}
