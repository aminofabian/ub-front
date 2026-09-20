"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, UsersRound } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardPageHero,
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_ROUTES } from "@/lib/config";
import {
  fetchSaServingStaff,
  inviteSaServingStaff,
  patchSaServingStaff,
  type SaDeskRole,
  type ServingStaffRow,
} from "@/lib/super-admin-api";
import { cn } from "@/lib/utils";

import {
  ServingStaffTheatre,
  roleLabel,
  type ServingStaffPanel,
  type StaffRoleFilter,
  type StaffStatusFilter,
} from "./_components/serving-staff-theatre";

const HAIRLINE =
  "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]";
const PRIMARY_BTN =
  "h-8 rounded-none bg-[var(--pos-primary,#0f766e)] px-3.5 text-white shadow-none hover:bg-[#0d6b63]";

function panelFromHash(hash: string): ServingStaffPanel | null {
  const id = hash.replace(/^#/, "");
  if (!id) return null;
  if (id === "invite") return { kind: "invite" };
  if (id.startsWith("staff-")) {
    const staffId = id.slice("staff-".length);
    if (staffId) return { kind: "staff", id: staffId };
  }
  return null;
}

export default function SuperAdminServingStaffPage() {
  const [rows, setRows] = useState<ServingStaffRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [issued, setIssued] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<StaffRoleFilter>("all");
  const [selected, setSelected] = useState<ServingStaffPanel | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deskRole, setDeskRole] = useState<SaDeskRole>("agent");

  const reload = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setLoadError("");
    try {
      const payload = await fetchSaServingStaff();
      setRows(payload.staff);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Could not load staff.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const apply = () => {
      const next = panelFromHash(window.location.hash);
      if (next) setSelected(next);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const counts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let waiting = 0;
    for (const row of rows) {
      if (row.active) active += 1;
      else inactive += 1;
      waiting += row.waitingCount;
    }
    return { all: rows.length, active, inactive, waiting };
  }, [rows]);

  const selectedStaff =
    selected?.kind === "staff"
      ? (rows.find((r) => r.id === selected.id) ?? null)
      : null;

  const onInvite = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setFormError("");
    setIssued("");
    try {
      const result = await inviteSaServingStaff({
        name: name.trim(),
        email: email.trim(),
        deskRole,
        password,
      });
      setIssued(
        `Share this password with ${result.staff.name}: ${result.temporaryPassword}`,
      );
      setName("");
      setEmail("");
      setPassword("");
      setDeskRole("agent");
      await reload(true);
      setSelected({ kind: "staff", id: result.staff.id });
      history.replaceState(null, "", `#staff-${result.staff.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not invite.");
    } finally {
      setBusy(false);
    }
  };

  const onRoleChange = async (id: string, next: SaDeskRole) => {
    setFormError("");
    try {
      await patchSaServingStaff(id, { deskRole: next });
      await reload(true);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not update role.",
      );
    }
  };

  const onToggleActive = async (row: ServingStaffRow) => {
    setTogglingId(row.id);
    setFormError("");
    try {
      await patchSaServingStaff(row.id, { active: !row.active });
      await reload(true);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not update status.",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const drawerBody =
    selected?.kind === "invite" ? (
      <form onSubmit={onInvite} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="invite-name" className={dashboardLabelClass()}>
            Name
          </Label>
          <Input
            id="invite-name"
            className={dashboardInputClass()}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Okonkwo"
            required
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-email" className={dashboardLabelClass()}>
            Email
          </Label>
          <Input
            id="invite-email"
            type="email"
            className={dashboardInputClass()}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agent@example.com"
            required
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-role" className={dashboardLabelClass()}>
            Desk role
          </Label>
          <select
            id="invite-role"
            className={dashboardSelectClass()}
            value={deskRole}
            onChange={(e) => setDeskRole(e.target.value as SaDeskRole)}
          >
            <option value="agent">Agent</option>
            <option value="lead">Lead</option>
            <option value="owner">Owner</option>
          </select>
          <p className={dashboardHintClass()}>
            Agents only see Serving. Leads and owners keep broader desk access.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-password" className={dashboardLabelClass()}>
            Temporary password
          </Label>
          <Input
            id="invite-password"
            type="password"
            className={dashboardInputClass()}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        {formError && selected?.kind === "invite" ? (
          <DashboardFeedback kind="error" text={formError} />
        ) : null}
      </form>
    ) : selectedStaff ? (
      <div className="space-y-4">
        <div className={cn("border bg-white px-3 py-2.5", HAIRLINE)}>
          <p className={dashboardHintClass()}>Workload</p>
          <p
            className="mt-1 text-[1.15rem] font-semibold tabular-nums tracking-[-0.03em]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {selectedStaff.openCount} open · {selectedStaff.waitingCount}{" "}
            waiting
          </p>
          <p className={cn(dashboardHintClass(), "mt-1")}>
            {selectedStaff.active ? "Active on the desk" : "Deactivated"}
            {selectedStaff.currentUser ? " · this is you" : ""}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="staff-role" className={dashboardLabelClass()}>
            Desk role
          </Label>
          <select
            id="staff-role"
            className={dashboardSelectClass()}
            value={selectedStaff.deskRole}
            onChange={(e) => {
              void onRoleChange(
                selectedStaff.id,
                e.target.value as SaDeskRole,
              );
            }}
            aria-label={`Role for ${selectedStaff.name}`}
          >
            <option value="agent">Agent</option>
            <option value="lead">Lead</option>
            <option value="owner">Owner</option>
          </select>
          <p className={dashboardHintClass()}>
            Current: {roleLabel(selectedStaff.deskRole)}
          </p>
        </div>

        <div className="space-y-1">
          <p className={dashboardLabelClass()}>Contact</p>
          <p className="text-[13px] text-foreground">{selectedStaff.email}</p>
          {selectedStaff.phone ? (
            <p className="text-[13px] text-foreground">{selectedStaff.phone}</p>
          ) : (
            <p className={dashboardHintClass()}>No phone on file</p>
          )}
        </div>

        {formError && selected?.kind === "staff" ? (
          <DashboardFeedback kind="error" text={formError} />
        ) : null}
      </div>
    ) : (
      <p className={cn(dashboardHintClass(), "py-6 text-center")}>
        Staff not in this list.
      </p>
    );

  const drawerFooter =
    selected?.kind === "invite" ? (
      <Button
        type="button"
        size="sm"
        className={PRIMARY_BTN}
        disabled={
          busy || !name.trim() || !email.trim() || password.length < 8
        }
        onClick={() => void onInvite()}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : null}
        Invite
      </Button>
    ) : selectedStaff ? (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 rounded-none"
        disabled={togglingId === selectedStaff.id}
        onClick={() => void onToggleActive(selectedStaff)}
      >
        {togglingId === selectedStaff.id ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : null}
        {selectedStaff.active ? "Deactivate" : "Activate"}
      </Button>
    ) : undefined;

  return (
    <div
      className={cn(
        DASHBOARD_MAX_WIDE,
        "flex flex-col gap-1.5 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8",
      )}
    >
      <DashboardPageHero
        icon={UsersRound}
        eyebrow="Serving"
        title="Serving staff"
        description="Invite customer-serving agents. Agents only see Serving, not billing, tenants, or impersonation."
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-none"
          asChild
        >
          <Link href={APP_ROUTES.superAdminServing}>
            <ArrowLeft className="size-3.5" aria-hidden />
            Desk
          </Link>
        </Button>
        <button
          type="button"
          disabled={loading || refreshing}
          onClick={() => void reload(true)}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-none border bg-white text-[#666666]",
            HAIRLINE,
            "transition-colors hover:border-[#0f766e] hover:text-[#0f766e]",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label="Refresh staff"
        >
          {refreshing ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
        </button>
        <Button
          type="button"
          size="sm"
          className={PRIMARY_BTN}
          onClick={() => {
            setSelected({ kind: "invite" });
            history.replaceState(null, "", "#invite");
          }}
        >
          Invite
        </Button>
      </DashboardPageHero>

      {loadError ? <DashboardFeedback kind="error" text={loadError} /> : null}
      {issued ? <DashboardFeedback kind="success" text={issued} /> : null}

      <ServingStaffTheatre
        rows={rows}
        counts={counts}
        loading={loading}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        searchInput={search}
        onSearchInputChange={setSearch}
        selected={selected}
        onSelect={(panel) => {
          setFormError("");
          setSelected(panel);
        }}
        onClearSelection={() => {
          setFormError("");
          setSelected(null);
        }}
        drawerBody={drawerBody}
        drawerFooter={drawerFooter}
      />
    </div>
  );
}
