"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  type SaDomainRow,
  addSaDomain,
  fetchSaDomains,
  patchSaBusiness,
  setSaPrimaryDomain,
} from "@/lib/super-admin-api";

function BusinessDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessIdRaw = params.businessId;
  const businessId =
    typeof businessIdRaw === "string" ? businessIdRaw : Array.isArray(businessIdRaw) ? businessIdRaw[0] : "";
  const titleName = searchParams.get("name") ?? "";
  const tierParam = searchParams.get("tier") ?? "";
  const activeParam = searchParams.get("active");

  const [domains, setDomains] = useState<SaDomainRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [bizName, setBizName] = useState(titleName);
  const [bizTier, setBizTier] = useState(tierParam);
  const [bizActive, setBizActive] = useState(activeParam !== "0");

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

  useEffect(() => {
    void loadDomains();
  }, [loadDomains]);

  useEffect(() => {
    setBizName(titleName);
    setBizTier(tierParam);
    setBizActive(activeParam !== "0");
  }, [titleName, tierParam, activeParam]);

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
      await patchSaBusiness(businessId, {
        name: bizName.trim() || undefined,
        subscriptionTier: bizTier.trim() || undefined,
        active: bizActive,
      });
      const t = bizTier.trim();
      router.replace(
        `/super-admin/businesses/${encodeURIComponent(businessId)}?name=${encodeURIComponent(bizName.trim())}&tier=${encodeURIComponent(t)}&active=${bizActive ? "1" : "0"}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!businessId) {
    return <AuthAlert variant="error">Missing business id.</AuthAlert>;
  }

  return (
    <div className="space-y-10">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" type="button" asChild>
          <Link href={APP_ROUTES.superAdminBusinesses}>← All businesses</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {bizName || "Business"} <span className="text-base font-normal text-muted-foreground">· domains</span>
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground break-all">{businessId}</p>
      </div>

      {error ? <AuthAlert variant="error">{error}</AuthAlert> : null}

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
        <form className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={onAddDomain}>
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
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    No domains. Add one above or recreate with primary domain.
                  </td>
                </tr>
              ) : (
                domains.map((d) => (
                  <tr key={d.id} className="border-b border-border/50 last:border-0">
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
