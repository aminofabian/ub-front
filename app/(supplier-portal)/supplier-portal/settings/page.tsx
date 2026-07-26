"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { Button } from "@/components/ui/button";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSupplierPortalSessions,
  logoutAllSupplierPortalSessions,
  revokeSupplierPortalSession,
  type SupplierPortalSessionRow,
} from "@/lib/marketplace-api";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function shortUa(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (ua.length <= 72) return ua;
  return `${ua.slice(0, 69)}…`;
}

export default function SupplierPortalSettingsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SupplierPortalSessionRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () =>
    fetchSupplierPortalSessions()
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load sessions"));

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void reload();
  }, [router]);

  const onRevoke = async (sessionId: string, current: boolean) => {
    setBusy(true);
    setError("");
    try {
      await revokeSupplierPortalSession(sessionId);
      if (current) {
        router.replace(APP_ROUTES.supplierPortalLogin);
        return;
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke session");
    } finally {
      setBusy(false);
    }
  };

  const onLogoutAll = async () => {
    setBusy(true);
    setError("");
    try {
      await logoutAllSupplierPortalSessions();
      router.replace(APP_ROUTES.supplierPortalLogin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign out all devices");
      setBusy(false);
    }
  };

  return (
    <SupplierPortalShell>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Security and active sessions for your supplier account.
            </p>
          </div>
          <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => void onLogoutAll()}>
            Sign out everywhere
          </Button>
        </header>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Sessions
          </h3>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Device</th>
                  <th className="px-3 py-2 font-medium">IP</th>
                  <th className="px-3 py-2 font-medium">Signed in</th>
                  <th className="px-3 py-2 font-medium">Last seen</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.sessionId} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-medium">{shortUa(row.userAgent)}</p>
                      {row.current ? (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400">This device</p>
                      ) : null}
                      {row.revoked ? (
                        <p className="text-xs text-muted-foreground">Revoked</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{row.ip || "—"}</td>
                    <td className="px-3 py-2">{fmtDate(row.issuedAt)}</td>
                    <td className="px-3 py-2">{fmtDate(row.lastSeenAt)}</td>
                    <td className="px-3 py-2 text-right">
                      {!row.revoked ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void onRevoke(row.sessionId, row.current)}
                        >
                          {row.current ? "Sign out" : "Revoke"}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && !error ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No sessions recorded yet. Sign in again after the upgrade.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </SupplierPortalShell>
  );
}
