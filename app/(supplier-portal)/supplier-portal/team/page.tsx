"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SupplierPortalShell } from "@/components/supplier-portal/supplier-portal-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_ROUTES } from "@/lib/config";
import {
  createSupplierPortalTeamUser,
  fetchSupplierPortalCapabilities,
  fetchSupplierPortalTeam,
  patchSupplierPortalTeamUser,
  resetSupplierPortalTeamUserPassword,
  type SupplierPortalTeamUserRow,
} from "@/lib/marketplace-api";
import { getSupplierPortalAccessToken } from "@/lib/supplier-portal-session";

function roleLabel(roleKey: string): string {
  return roleKey === "staff" ? "Staff" : "Owner";
}

export default function SupplierPortalTeamPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SupplierPortalTeamUserRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleKey, setRoleKey] = useState("staff");
  const [resetByUser, setResetByUser] = useState<Record<string, string>>({});

  const reload = () =>
    fetchSupplierPortalTeam()
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load team"));

  useEffect(() => {
    if (!getSupplierPortalAccessToken()) {
      router.replace(APP_ROUTES.supplierPortalLogin);
      return;
    }
    void fetchSupplierPortalCapabilities()
      .then((caps) => {
        if (!caps.canManageTeam) {
          router.replace(APP_ROUTES.supplierPortalOverview);
          return;
        }
        return reload();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load team"));
  }, [router]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createSupplierPortalTeamUser({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
        roleKey,
      });
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRoleKey("staff");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create teammate");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SupplierPortalShell>
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight">Team</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Owners see money and manage the team. Staff can fulfil orders and edit the catalogue.
          </p>
        </header>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <form onSubmit={onCreate} className="space-y-3 rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold">Add teammate</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
            <select
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={roleKey}
              onChange={(e) => setRoleKey(e.target.value)}
            >
              <option value="staff">Staff</option>
              <option value="admin">Owner</option>
            </select>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional if phone set)"
            />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional if email set)"
            />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Temporary password"
              required
              className="sm:col-span-2"
            />
          </div>
          <Button type="submit" size="sm" disabled={busy || !name.trim() || !password}>
            Create user
          </Button>
        </form>

        <ul className="space-y-3">
          {rows.map((user) => (
            <li key={user.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {user.name}
                    {user.currentUser ? (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabel(user.roleKey)} · {user.phone || "—"} · {user.email || "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {user.active ? "Active" : "Suspended"}
                    {user.lastLoginAt
                      ? ` · last login ${new Date(user.lastLoginAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    value={user.roleKey === "staff" ? "staff" : "admin"}
                    disabled={busy || user.currentUser}
                    onChange={(e) => {
                      const next = e.target.value;
                      void (async () => {
                        setBusy(true);
                        setError("");
                        try {
                          await patchSupplierPortalTeamUser(user.id, { roleKey: next });
                          await reload();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Could not change role");
                        } finally {
                          setBusy(false);
                        }
                      })();
                    }}
                  >
                    <option value="admin">Owner</option>
                    <option value="staff">Staff</option>
                  </select>
                  {!user.currentUser ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void (async () => {
                          setBusy(true);
                          setError("");
                          try {
                            await patchSupplierPortalTeamUser(user.id, { active: !user.active });
                            await reload();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Could not update status");
                          } finally {
                            setBusy(false);
                          }
                        })()
                      }
                    >
                      {user.active ? "Suspend" : "Unsuspend"}
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Input
                  type="password"
                  className="max-w-xs"
                  value={resetByUser[user.id] ?? ""}
                  onChange={(e) =>
                    setResetByUser((prev) => ({ ...prev, [user.id]: e.target.value }))
                  }
                  placeholder="New password"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !(resetByUser[user.id] ?? "").trim()}
                  onClick={() =>
                    void (async () => {
                      setBusy(true);
                      setError("");
                      try {
                        await resetSupplierPortalTeamUserPassword(
                          user.id,
                          (resetByUser[user.id] ?? "").trim(),
                        );
                        setResetByUser((prev) => ({ ...prev, [user.id]: "" }));
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Could not reset password");
                      } finally {
                        setBusy(false);
                      }
                    })()
                  }
                >
                  Reset password
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SupplierPortalShell>
  );
}
