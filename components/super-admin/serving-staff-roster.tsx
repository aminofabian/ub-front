"use client";

import * as React from "react";
import { UsersRound } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DASHBOARD_SECTION_SURFACE,
  DASHBOARD_TABLE_SURFACE,
  DashboardFeedback,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import {
  SERVING_DIVIDE,
  SERVING_INK,
  SERVING_SHARP_BTN,
} from "@/components/serving/serving-ui";
import { Button } from "@/components/ui/button";
import {
  fetchSaServingStaff,
  inviteSaServingStaff,
  patchSaServingStaff,
  type SaDeskRole,
  type ServingStaffRow,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

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
    <div className={cn(DASHBOARD_MAX_WIDE, "grocery-market-paper gap-1.5")}>
      <DashboardPageHero
        icon={UsersRound}
        title="Serving staff"
        description="Invite customer-serving agents. Agents only see Serving, not billing, tenants, or impersonation."
      />
      {error ? <DashboardFeedback kind="error" text={error} /> : null}
      {issued ? <DashboardFeedback kind="success" text={issued} /> : null}

      <form onSubmit={onInvite} className={cn(DASHBOARD_SECTION_SURFACE, "space-y-3")}>
        <p className={cn("text-[13px] font-semibold tracking-[-0.02em]", SERVING_INK)}>Invite staff</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={dashboardInputClass()}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
          />
          <input
            className={dashboardInputClass()}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
          />
          <select
            className={dashboardSelectClass()}
            value={deskRole}
            onChange={(e) => setDeskRole(e.target.value as SaDeskRole)}
          >
            <option value="agent">Agent</option>
            <option value="lead">Lead</option>
            <option value="owner">Owner</option>
          </select>
          <input
            className={dashboardInputClass()}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Temporary password"
            required
          />
        </div>
        <Button
          type="submit"
          size="sm"
          className={SERVING_SHARP_BTN}
          disabled={busy || !name.trim() || !email.trim() || password.length < 8}
        >
          Invite
        </Button>
      </form>

      <div className={DASHBOARD_TABLE_SURFACE}>
        {rows.length === 0 ? (
          <p className={cn(dashboardHintClass(), "px-3 py-10 text-center")}>
            Nobody on the roster yet. Invite an agent above.
          </p>
        ) : (
          <ul className={cn("divide-y", SERVING_DIVIDE)}>
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 px-3 py-3">
                <div className="min-w-0">
                  <p className={cn("text-[13px] font-semibold tracking-[-0.015em]", SERVING_INK)}>
                    {row.name}
                    {row.currentUser ? (
                      <span className={cn("ml-2 text-[11px] font-normal", dashboardHintClass())}>(you)</span>
                    ) : null}
                  </p>
                  <p className={dashboardHintClass()}>
                    {roleLabel(row.deskRole)} · {row.email}
                    {row.phone ? ` · ${row.phone}` : ""}
                  </p>
                  <p className={cn(dashboardHintClass(), "mt-0.5 tabular-nums")}>
                    {row.openCount} open · {row.waitingCount} waiting
                    {row.active ? "" : " · inactive"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <select
                    className={cn(dashboardSelectClass(), "h-8 w-[7.5rem] text-[12px]")}
                    value={row.deskRole}
                    onChange={(e) => {
                      void patchSaServingStaff(row.id, { deskRole: e.target.value as SaDeskRole }).then(reload);
                    }}
                    aria-label={`Role for ${row.name}`}
                  >
                    <option value="agent">Agent</option>
                    <option value="lead">Lead</option>
                    <option value="owner">Owner</option>
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={SERVING_SHARP_BTN}
                    onClick={() => {
                      void patchSaServingStaff(row.id, { active: !row.active })
                        .then(reload)
                        .catch((err) => {
                          setError(err instanceof Error ? err.message : "Could not update");
                        });
                    }}
                  >
                    {row.active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
