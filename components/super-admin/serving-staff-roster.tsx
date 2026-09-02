"use client";

import * as React from "react";

import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchSaServingStaff,
  inviteSaServingStaff,
  patchSaServingStaff,
  type SaDeskRole,
  type ServingStaffRow,
} from "@/lib/super-admin-api";

function roleLabel(role: string) {
  if (role === "agent") return "Agent";
  if (role === "lead") return "Lead";
  return "Owner";
}

export function ServingStaffRoster() {
  const [rows, setRows] = React.useState<ServingStaffRow[]>([]);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [deskRole, setDeskRole] = React.useState<SaDeskRole>("agent");
  const [issued, setIssued] = React.useState("");

  const reload = React.useCallback(async () => {
    try {
      const payload = await fetchSaServingStaff();
      setRows(payload.staff);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load staff");
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setIssued("");
    try {
      const result = await inviteSaServingStaff({
        name: name.trim(),
        email: email.trim(),
        deskRole,
        password,
      });
      setIssued(`Share this password with ${result.staff.name}: ${result.temporaryPassword}`);
      setName("");
      setEmail("");
      setPassword("");
      setDeskRole("agent");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not invite");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <SuperAdminPageHeader
        title="Serving staff"
        description="Invite customer-serving agents. Agents only see Serving — not billing, tenants, or impersonation."
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {issued ? <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">{issued}</p> : null}

      <form onSubmit={onInvite} className="space-y-3 rounded-2xl border bg-card p-4">
        <p className="text-sm font-semibold">Invite staff</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={deskRole}
            onChange={(e) => setDeskRole(e.target.value as SaDeskRole)}
          >
            <option value="agent">Agent</option>
            <option value="lead">Lead</option>
            <option value="owner">Owner</option>
          </select>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Temporary password"
            required
          />
        </div>
        <Button type="submit" size="sm" disabled={busy || !name.trim() || !email.trim() || password.length < 8}>
          Invite
        </Button>
      </form>

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {row.name}
                  {row.currentUser ? <span className="ml-2 text-xs text-muted-foreground">(you)</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {roleLabel(row.deskRole)} · {row.email}
                  {row.phone ? ` · ${row.phone}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.openCount} open · {row.waitingCount} waiting
                  {row.active ? "" : " · inactive"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={row.deskRole}
                  onChange={(e) => {
                    void patchSaServingStaff(row.id, { deskRole: e.target.value as SaDeskRole }).then(reload);
                  }}
                >
                  <option value="agent">Agent</option>
                  <option value="lead">Lead</option>
                  <option value="owner">Owner</option>
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void patchSaServingStaff(row.id, { active: !row.active }).then(reload).catch((err) => {
                      setError(err instanceof Error ? err.message : "Could not update");
                    });
                  }}
                >
                  {row.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
