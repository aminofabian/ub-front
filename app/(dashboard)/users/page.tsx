"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, UserPlus, Users as UsersIcon } from "lucide-react";

import {
  DASHBOARD_MAX_WIDE,
  DashboardFeedback,
  DashboardLoadError,
  DashboardLoading,
  DashboardPageHero,
  dashboardInputClass,
  dashboardSelectClass,
} from "@/components/dashboard-page-ui";
import { useDashboard } from "@/components/dashboard-provider";
import { FormDrawer, FormDrawerFields } from "@/components/form-drawer";
import { StaffProfileDrawer } from "@/components/staff/staff-profile-drawer";
import { Button } from "@/components/ui/button";
import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  assignUserRole,
  createUser,
  deactivateUser,
  deleteUser,
  fetchBranches,
  fetchRoles,
  fetchStaffProfiles,
  fetchUserPin,
  fetchUsers,
  forceLogoutUser,
  setUserItemTypes,
  setUserPassword,
  setUserPin,
  updateStaffProfile,
  updateUser,
  type JoinPayMode,
  type BranchRecord,
  type RoleRecord,
  type UserRecord,
} from "@/lib/api";
import { JOIN_PAY_MODES } from "@/lib/payroll-utils";
import { hasPermission, Permission } from "@/lib/permissions";

import { UsersTheatre } from "./_components/users-theatre";

type CredentialMethod = "invite" | "pin";

type UserDraft = {
  name: string;
  email: string;
  roleId: string;
  credentialMethod: CredentialMethod;
  pin: string;
  branchId: string;
  /** How their first month is paid once salaries unlock on the 25th. */
  joinPayMode: JoinPayMode;
};

const DEFAULT_DRAFT: UserDraft = {
  name: "",
  email: "",
  roleId: "",
  credentialMethod: "invite",
  pin: "",
  branchId: "",
  joinPayMode: "half",
};

type Feedback = { kind: "success" | "error"; text: string } | null;

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { me, refreshSession, itemTypes } = useDashboard();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRoleId, setFilterRoleId] = useState("");
  const [filterBranchId, setFilterBranchId] = useState("");
  const [draft, setDraft] = useState<UserDraft>(DEFAULT_DRAFT);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editingName, setEditingName] = useState<Record<string, string>>({});
  const [roleChange, setRoleChange] = useState<Record<string, string>>({});
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviteDrawerOpen, setInviteDrawerOpen] = useState(false);
  const skipInviteDrawerResetAfterCreate = useRef(false);
  const [savingNameId, setSavingNameId] = useState<string | null>(null);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [signingOutId, setSigningOutId] = useState<string | null>(null);
  const [branchChange, setBranchChange] = useState<Record<string, string>>({});
  const [savingBranchId, setSavingBranchId] = useState<string | null>(null);
  const [deptChange, setDeptChange] = useState<Record<string, string[]>>({});
  const [savingDeptId, setSavingDeptId] = useState<string | null>(null);
  const [passwordEditUserId, setPasswordEditUserId] = useState<string | null>(
    null,
  );
  const [passwordDraft, setPasswordDraft] = useState<
    Record<string, { password: string; confirm: string }>
  >({});
  const [savingPasswordId, setSavingPasswordId] = useState<string | null>(null);
  const [pinEditUserId, setPinEditUserId] = useState<string | null>(null);
  const [pinDraft, setPinDraft] = useState<
    Record<string, { pin: string; confirm: string }>
  >({});
  const [savingPinId, setSavingPinId] = useState<string | null>(null);
  const [pinViewUserId, setPinViewUserId] = useState<string | null>(null);
  const [pinViewValue, setPinViewValue] = useState<
    Record<
      string,
      { loading: boolean; pin: string | null; message: string | null }
    >
  >({});
  const [pinRevealed, setPinRevealed] = useState<Record<string, boolean>>({});
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileUserLabel, setProfileUserLabel] = useState("");
  const [payrollInclude, setPayrollInclude] = useState<Record<string, boolean>>(
    {},
  );
  const [payrollSavingId, setPayrollSavingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const isOwner = me?.role?.key === "owner";
  const canCreate = hasPermission(me?.permissions, Permission.UsersCreate);
  const canUpdate = hasPermission(me?.permissions, Permission.UsersUpdate);
  const canReadStaffProfile = hasPermission(
    me?.permissions,
    Permission.StaffProfileRead,
  );
  const canTogglePayroll = hasPermission(
    me?.permissions,
    Permission.StaffHrUpdate,
  );
  const canAssign = hasPermission(me?.permissions, Permission.UsersAssignRole);
  const canDeactivate = hasPermission(
    me?.permissions,
    Permission.UsersDeactivate,
  );

  const loadData = useCallback(() => {
    const filters = {
      status: filterStatus.trim() || undefined,
      roleId: filterRoleId.trim() || undefined,
      branchId: filterBranchId.trim() || undefined,
    };
    return Promise.all([fetchUsers(filters), fetchRoles(), fetchBranches()])
      .then(([userRows, roleRows, branchRows]) => {
        setUsers(userRows);
        setRoles(roleRows);
        setBranches(branchRows);
        setDraft((previous) => {
          const next = { ...previous };
          if (roleRows.length > 0 && !next.roleId) {
            next.roleId = roleRows[0].id;
          }
          return next;
        });
        setLoadFailed(false);
        setFeedback(null);
      })
      .catch((error) => {
        setLoadFailed(true);
        setFeedback({
          kind: "error",
          text:
            error instanceof Error ? error.message : "Failed to load users.",
        });
      })
      .finally(() => {
        setFirstLoadDone(true);
      });
  }, [filterStatus, filterRoleId, filterBranchId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadPayrollFlags = useCallback(async () => {
    if (!canTogglePayroll) {
      setPayrollInclude({});
      return;
    }
    try {
      const profiles = await fetchStaffProfiles();
      const next: Record<string, boolean> = {};
      for (const profile of profiles) {
        next[profile.userId] = profile.publicFields.includeInPayroll !== false;
      }
      setPayrollInclude(next);
    } catch {
      // Payroll toggles stay best-effort; directory still works without them.
    }
  }, [canTogglePayroll]);

  useEffect(() => {
    if (!firstLoadDone) return;
    void loadPayrollFlags();
  }, [firstLoadDone, loadPayrollFlags, users.length, profileUserId]);

  // Deep link: /users?profile=<userId> opens the staff profile drawer.
  useEffect(() => {
    if (!firstLoadDone || !canReadStaffProfile) return;
    const profileId = searchParams.get("profile")?.trim();
    if (!profileId) return;
    const match = users.find((u) => u.id === profileId);
    setProfileUserId(profileId);
    setProfileUserLabel(match ? `${match.name} · ${match.email}` : profileId);
  }, [firstLoadDone, canReadStaffProfile, searchParams, users]);

  // For non-owner users, restrict branch filter to their assigned branch
  useEffect(() => {
    if (!isOwner && me?.branchId) {
      setFilterBranchId(me.branchId);
    }
  }, [isOwner, me?.branchId]);

  const activeFilterCount =
    (filterStatus ? 1 : 0) +
    (filterRoleId ? 1 : 0) +
    (isOwner && filterBranchId ? 1 : 0);

  const branchById = useMemo(() => {
    const map = new Map<string, BranchRecord>();
    for (const b of branches) map.set(b.id, b);
    return map;
  }, [branches]);

  const resetInviteDraft = useCallback(() => {
    setDraft({
      ...DEFAULT_DRAFT,
      roleId: roles[0]?.id ?? "",
      branchId: isOwner ? "" : (me?.branchId ?? ""),
    });
  }, [roles, isOwner, me?.branchId]);

  const onInviteDrawerOpenChange = (open: boolean) => {
    if (!open) {
      if (skipInviteDrawerResetAfterCreate.current) {
        skipInviteDrawerResetAfterCreate.current = false;
      } else {
        resetInviteDraft();
      }
    }
    setInviteDrawerOpen(open);
  };

  const onCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const usePin = draft.credentialMethod === "pin";
    if (usePin && !/^\d{4,6}$/.test(draft.pin.trim())) {
      setFeedback({ kind: "error", text: "PIN must be 4 to 6 digits." });
      return;
    }
    if (usePin && !draft.branchId) {
      setFeedback({
        kind: "error",
        text: "Select a branch — PIN login requires a branch.",
      });
      return;
    }
    setCreating(true);
    setFeedback(null);
    try {
      await createUser({
        name: draft.name,
        email: draft.email,
        roleId: draft.roleId,
        pin: usePin ? draft.pin.trim() : undefined,
        sendInvite: usePin ? undefined : true,
        status: usePin ? "active" : "invited",
        branchId: draft.branchId || undefined,
        joinPayMode: draft.joinPayMode,
      });
      setDraft((previous) => ({ ...DEFAULT_DRAFT, roleId: previous.roleId }));
      await loadData();
      await refreshSession();
      skipInviteDrawerResetAfterCreate.current = true;
      setInviteDrawerOpen(false);
      setFeedback({
        kind: "success",
        text: usePin
          ? "User created with a PIN."
          : "Invitation sent. The user will get an email to set their password.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Create user failed.",
      });
    } finally {
      setCreating(false);
    }
  };

  const onSaveName = async (userId: string) => {
    const name = editingName[userId]?.trim();
    if (!name) {
      return;
    }
    setSavingNameId(userId);
    setFeedback(null);
    try {
      await updateUser(userId, { name });
      await loadData();
      setEditingName((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
      setFeedback({ kind: "success", text: "User updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Update failed.",
      });
    } finally {
      setSavingNameId(null);
    }
  };

  const onAssignRole = async (userId: string) => {
    const row = users.find((u) => u.id === userId);
    const selected = roleChange[userId] ?? row?.role?.id ?? "";
    if (!selected || selected === row?.role?.id) {
      setFeedback({
        kind: "error",
        text: "Choose a different role, then save.",
      });
      return;
    }
    setSavingRoleId(userId);
    setFeedback(null);
    try {
      await assignUserRole(userId, selected);
      setRoleChange((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
      await loadData();
      await refreshSession();
      setFeedback({ kind: "success", text: "Role updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Role update failed.",
      });
    } finally {
      setSavingRoleId(null);
    }
  };

  const onDeactivate = (userId: string) => {
    showThemedConfirmToast({
      id: `deactivate-user-${userId}`,
      title: "Deactivate this user?",
      description:
        "They are signed out of every device and lose access. Their plan seat frees up so you can invite someone else.",
      confirmLabel: "Deactivate",
      onConfirm: async () => {
        setDeactivatingId(userId);
        setFeedback(null);
        try {
          await deactivateUser(userId);
          await loadData();
          await refreshSession();
          setFeedback({ kind: "success", text: "User deactivated." });
        } catch (error) {
          setFeedback({
            kind: "error",
            text: error instanceof Error ? error.message : "Deactivate failed.",
          });
        } finally {
          setDeactivatingId(null);
        }
      },
    });
  };

  const onDelete = (userId: string, email: string) => {
    showThemedConfirmToast({
      id: `delete-user-${userId}`,
      title: "Delete this user permanently?",
      description: `${email} will be removed from the team directory and payroll. Past sales and payslips stay on file. Owner and admin accounts cannot be deleted.`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        setDeletingId(userId);
        setFeedback(null);
        try {
          await deleteUser(userId);
          if (profileUserId === userId) {
            setProfileUserId(null);
            setProfileUserLabel("");
          }
          if (selectedId === userId) {
            setSelectedId(null);
            setMobileShowDetail(false);
          }
          await loadData();
          await refreshSession();
          setFeedback({ kind: "success", text: "User deleted." });
        } catch (error) {
          setFeedback({
            kind: "error",
            text: error instanceof Error ? error.message : "Delete failed.",
          });
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const onTogglePayroll = async (userId: string, include: boolean) => {
    setPayrollSavingId(userId);
    setFeedback(null);
    try {
      const updated = await updateStaffProfile(userId, {
        includeInPayroll: include,
      });
      setPayrollInclude((previous) => ({
        ...previous,
        [userId]: updated.publicFields.includeInPayroll !== false,
      }));
      setFeedback({
        kind: "success",
        text: include
          ? "Added to payroll."
          : "Removed from payroll (still on the team).",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not update payroll inclusion.",
      });
    } finally {
      setPayrollSavingId(null);
    }
  };

  const onForceLogout = (userId: string, email: string) => {
    showThemedConfirmToast({
      id: `force-logout-user-${userId}`,
      title: "Sign this user out everywhere?",
      description: `${email} will be signed out of every device and till. Their password and PIN keep working, so they can sign back in.`,
      confirmLabel: "Sign out",
      onConfirm: async () => {
        setSigningOutId(userId);
        setFeedback(null);
        try {
          const { revokedSessions } = await forceLogoutUser(userId);
          setFeedback({
            kind: "success",
            text:
              revokedSessions > 0
                ? `Signed out of ${revokedSessions} ${
                    revokedSessions === 1 ? "session" : "sessions"
                  }.`
                : "That user was already signed out everywhere.",
          });
        } catch (error) {
          setFeedback({
            kind: "error",
            text: error instanceof Error ? error.message : "Sign out failed.",
          });
        } finally {
          setSigningOutId(null);
        }
      },
    });
  };

  const clearPasswordEdit = (userId: string) => {
    setPasswordEditUserId((current) => (current === userId ? null : current));
    setPasswordDraft((previous) => {
      const next = { ...previous };
      delete next[userId];
      return next;
    });
  };

  const clearPinEdit = (userId: string) => {
    setPinEditUserId((current) => (current === userId ? null : current));
    setPinDraft((previous) => {
      const next = { ...previous };
      delete next[userId];
      return next;
    });
  };

  const clearPinView = (userId: string) => {
    setPinViewUserId((current) => (current === userId ? null : current));
    setPinViewValue((previous) => {
      const next = { ...previous };
      delete next[userId];
      return next;
    });
    setPinRevealed((previous) => {
      const next = { ...previous };
      delete next[userId];
      return next;
    });
  };

  const beginPasswordEdit = (userId: string) => {
    clearPinEdit(userId);
    clearPinView(userId);
    setPasswordEditUserId(userId);
    setPasswordDraft((previous) => ({
      ...previous,
      [userId]: { password: "", confirm: "" },
    }));
  };

  const beginPinEdit = (userId: string) => {
    clearPasswordEdit(userId);
    clearPinView(userId);
    setPinEditUserId(userId);
    setPinDraft((previous) => ({
      ...previous,
      [userId]: { pin: "", confirm: "" },
    }));
  };

  const onViewPin = async (userId: string) => {
    clearPasswordEdit(userId);
    clearPinEdit(userId);
    setPinViewUserId(userId);
    setPinRevealed((previous) => ({ ...previous, [userId]: true }));
    setPinViewValue((previous) => ({
      ...previous,
      [userId]: { loading: true, pin: null, message: null },
    }));
    setFeedback(null);
    try {
      const result = await fetchUserPin(userId);
      if (!result.hasPin) {
        setPinViewValue((previous) => ({
          ...previous,
          [userId]: {
            loading: false,
            pin: null,
            message: "No PIN set for this user.",
          },
        }));
        return;
      }
      if (!result.recoverable || !result.pin) {
        setPinViewValue((previous) => ({
          ...previous,
          [userId]: {
            loading: false,
            pin: null,
            message:
              "This PIN was set before viewable storage. Set a new PIN to enable viewing.",
          },
        }));
        return;
      }
      setPinViewValue((previous) => ({
        ...previous,
        [userId]: { loading: false, pin: result.pin, message: null },
      }));
    } catch (error) {
      clearPinView(userId);
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Failed to load PIN.",
      });
    }
  };

  const onSavePassword = async (userId: string) => {
    const draft = passwordDraft[userId];
    const password = draft?.password ?? "";
    const confirm = draft?.confirm ?? "";
    if (password.length < 8) {
      setFeedback({
        kind: "error",
        text: "Password must be at least 8 characters.",
      });
      return;
    }
    if (password !== confirm) {
      setFeedback({ kind: "error", text: "Passwords do not match." });
      return;
    }
    setSavingPasswordId(userId);
    setFeedback(null);
    try {
      await setUserPassword(userId, password);
      clearPasswordEdit(userId);
      await loadData();
      setFeedback({ kind: "success", text: "Password updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text:
          error instanceof Error ? error.message : "Password update failed.",
      });
    } finally {
      setSavingPasswordId(null);
    }
  };

  const onSavePin = async (userId: string) => {
    const draft = pinDraft[userId];
    const pin = draft?.pin?.trim() ?? "";
    const confirm = draft?.confirm?.trim() ?? "";
    if (!/^\d{4,6}$/.test(pin)) {
      setFeedback({
        kind: "error",
        text: "PIN must be 4 to 6 digits.",
      });
      return;
    }
    if (pin !== confirm) {
      setFeedback({ kind: "error", text: "PINs do not match." });
      return;
    }
    const target = users.find((row) => row.id === userId);
    if (target && !target.branchId) {
      setFeedback({
        kind: "error",
        text: "Assign a branch before setting a PIN (PIN login is branch-scoped).",
      });
      return;
    }
    setSavingPinId(userId);
    setFeedback(null);
    try {
      await setUserPin(userId, pin);
      clearPinEdit(userId);
      await loadData();
      setFeedback({ kind: "success", text: "PIN updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "PIN update failed.",
      });
    } finally {
      setSavingPinId(null);
    }
  };

  const onSaveDepartments = async (userId: string) => {
    const selected = deptChange[userId] ?? [];
    setSavingDeptId(userId);
    setFeedback(null);
    try {
      await setUserItemTypes(userId, selected);
      setDeptChange((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
      await loadData();
      await refreshSession();
      setFeedback({ kind: "success", text: "Departments updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to update departments.",
      });
    } finally {
      setSavingDeptId(null);
    }
  };

  const onSaveBranch = async (userId: string) => {
    const branchId = branchChange[userId] ?? "";
    setSavingBranchId(userId);
    setFeedback(null);
    try {
      await updateUser(userId, { branchId: branchId || undefined });
      setBranchChange((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
      await loadData();
      setFeedback({ kind: "success", text: "Branch updated." });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "Branch update failed.",
      });
    } finally {
      setSavingBranchId(null);
    }
  };

  const clearAllFilters = () => {
    setFilterStatus("");
    setFilterRoleId("");
    if (isOwner) {
      setFilterBranchId("");
    }
  };

  const clearSelection = () => {
    setSelectedId(null);
    setMobileShowDetail(false);
    setPasswordEditUserId(null);
    setPinEditUserId(null);
    setPinViewUserId(null);
  };

  const selectUser = (user: UserRecord) => {
    if (selectedId === user.id) {
      clearSelection();
      return;
    }
    setSelectedId(user.id);
    setMobileShowDetail(true);
    setEditingName((previous) => ({ ...previous, [user.id]: user.name }));
    setRoleChange((previous) => ({
      ...previous,
      [user.id]: user.role?.id ?? "",
    }));
    setBranchChange((previous) => ({
      ...previous,
      [user.id]: user.branchId ?? "",
    }));
    setDeptChange((previous) => ({
      ...previous,
      [user.id]: user.itemTypeIds ?? [],
    }));
    setFeedback(null);
  };

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedId) ?? null,
    [users, selectedId],
  );

  useEffect(() => {
    if (!selectedId) return;
    if (users.some((u) => u.id === selectedId)) return;
    clearSelection();
  }, [users, selectedId]);

  if (!firstLoadDone) {
    return <DashboardLoading label="Loading users…" />;
  }

  if (loadFailed && users.length === 0) {
    return (
      <DashboardLoadError
        title="Could not load users"
        message={feedback?.text ?? "Failed to load users."}
        onRetry={() => {
          setFeedback(null);
          void loadData();
        }}
      />
    );
  }

  return (
    <>
      <div className={cn(DASHBOARD_MAX_WIDE, "gap-1.5")}>
        <DashboardPageHero
          icon={UsersIcon}
          title="Users"
          description="Invite staff, assign roles, and manage sign-in credentials."
        >
          {canCreate ? (
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 shadow-none"
              disabled={roles.length === 0}
              onClick={() => {
                skipInviteDrawerResetAfterCreate.current = false;
                setInviteDrawerOpen(true);
              }}
            >
              <UserPlus className="size-3.5" aria-hidden />
              Invite user
            </Button>
          ) : null}
        </DashboardPageHero>

        {feedback ? (
          <DashboardFeedback kind={feedback.kind} text={feedback.text} />
        ) : null}

        {!canCreate ? (
          <p
            role="note"
            className="rounded-none border border-[#9a2e16]/35 bg-[color-mix(in_srgb,#9a2e16_5%,white)] px-3 py-2 text-xs leading-relaxed text-[#9a2e16]"
          >
            You need <span className="font-mono text-[11px]">users.create</span>{" "}
            to invite users.
          </p>
        ) : null}

        <UsersTheatre
          users={users}
          roles={roles}
          branches={branches}
          branchById={branchById}
          itemTypes={itemTypes}
          currentUserId={me?.id ?? null}
          isOwner={isOwner}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canAssign={canAssign}
          canDeactivate={canDeactivate}
          canReadStaffProfile={canReadStaffProfile}
          canTogglePayroll={canTogglePayroll}
          query={query}
          onQueryChange={setQuery}
          filterStatus={filterStatus}
          onFilterStatus={setFilterStatus}
          filterRoleId={filterRoleId}
          onFilterRoleId={setFilterRoleId}
          filterBranchId={filterBranchId}
          onFilterBranchId={setFilterBranchId}
          activeFilterCount={activeFilterCount}
          onClearFilters={clearAllFilters}
          selectedId={selectedId}
          selectedUser={selectedUser}
          onSelect={selectUser}
          onClearSelection={clearSelection}
          mobileShowDetail={mobileShowDetail}
          editingName={editingName}
          onEditingName={(userId, name) =>
            setEditingName((previous) => ({ ...previous, [userId]: name }))
          }
          savingNameId={savingNameId}
          onSaveName={(userId) => void onSaveName(userId)}
          roleChange={roleChange}
          onRoleChange={(userId, roleId) =>
            setRoleChange((previous) => ({ ...previous, [userId]: roleId }))
          }
          savingRoleId={savingRoleId}
          onAssignRole={(userId) => void onAssignRole(userId)}
          branchChange={branchChange}
          onBranchChange={(userId, branchId) =>
            setBranchChange((previous) => ({ ...previous, [userId]: branchId }))
          }
          savingBranchId={savingBranchId}
          onSaveBranch={(userId) => void onSaveBranch(userId)}
          deptChange={deptChange}
          onDeptChange={(userId, ids) =>
            setDeptChange((previous) => ({ ...previous, [userId]: ids }))
          }
          savingDeptId={savingDeptId}
          onSaveDepartments={(userId) => void onSaveDepartments(userId)}
          payrollInclude={payrollInclude}
          payrollSavingId={payrollSavingId}
          onTogglePayroll={(userId, include) =>
            void onTogglePayroll(userId, include)
          }
          passwordEditUserId={passwordEditUserId}
          passwordDraft={passwordDraft}
          savingPasswordId={savingPasswordId}
          onBeginPasswordEdit={beginPasswordEdit}
          onPasswordDraft={(userId, next) =>
            setPasswordDraft((previous) => ({ ...previous, [userId]: next }))
          }
          onSavePassword={(userId) => void onSavePassword(userId)}
          onClearPasswordEdit={clearPasswordEdit}
          pinEditUserId={pinEditUserId}
          pinDraft={pinDraft}
          savingPinId={savingPinId}
          onBeginPinEdit={beginPinEdit}
          onPinDraft={(userId, next) =>
            setPinDraft((previous) => ({ ...previous, [userId]: next }))
          }
          onSavePin={(userId) => void onSavePin(userId)}
          onClearPinEdit={clearPinEdit}
          pinViewUserId={pinViewUserId}
          pinViewValue={pinViewValue}
          pinRevealed={pinRevealed}
          onViewPin={(userId) => void onViewPin(userId)}
          onTogglePinReveal={(userId) =>
            setPinRevealed((previous) => ({
              ...previous,
              [userId]: !previous[userId],
            }))
          }
          onClearPinView={clearPinView}
          signingOutId={signingOutId}
          deactivatingId={deactivatingId}
          deletingId={deletingId}
          onOpenProfile={(user) => {
            setProfileUserId(user.id);
            setProfileUserLabel(`${user.name} · ${user.email}`);
          }}
          onForceLogout={onForceLogout}
          onDeactivate={onDeactivate}
          onDelete={onDelete}
          onInvite={() => {
            skipInviteDrawerResetAfterCreate.current = false;
            setInviteDrawerOpen(true);
          }}
        />
      </div>

      {canCreate ? (
        <FormDrawer
          open={inviteDrawerOpen}
          onOpenChange={onInviteDrawerOpenChange}
          title="Invite user"
          description="Creates the account and sends them through your configured onboarding flow."
          contextLabel="Team"
          icon={<UserPlus className="size-5 text-primary" aria-hidden />}
          width="wide"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={creating}
                onClick={() => onInviteDrawerOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="invite-user-form"
                className="rounded-none bg-[var(--pos-primary,#0f766e)] text-white"
                disabled={creating || roles.length === 0}
              >
                {creating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Creating…
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" aria-hidden />
                    Create user
                  </>
                )}
              </Button>
            </div>
          }
        >
          <form
            id="invite-user-form"
            className="space-y-6"
            onSubmit={onCreateUser}
          >
            <FormDrawerFields
              legend="Account"
              hint="Email must be unique in your workspace. Choose an email invite (user sets their own password) or a PIN for kiosk/cashier access."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Full name
                  <input
                    className={dashboardInputClass()}
                    placeholder="Jane Doe"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                    required
                    autoComplete="name"
                    aria-label="New user name"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Email
                  <input
                    className={dashboardInputClass()}
                    placeholder="jane@company.com"
                    type="email"
                    value={draft.email}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }))
                    }
                    required
                    autoComplete="email"
                    aria-label="New user email"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Role
                  <select
                    className={dashboardSelectClass()}
                    value={draft.roleId}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        roleId: event.target.value,
                      }))
                    }
                    aria-label="Role for new user"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Branch
                  <select
                    className={dashboardSelectClass()}
                    value={draft.branchId}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        branchId: event.target.value,
                      }))
                    }
                    aria-label="Branch for new user"
                    disabled={!isOwner}
                  >
                    <option value="">No branch (all)</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                  Sign-in method
                  <select
                    className={dashboardSelectClass()}
                    value={draft.credentialMethod}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        credentialMethod: event.target
                          .value as CredentialMethod,
                        pin: event.target.value === "pin" ? previous.pin : "",
                      }))
                    }
                    aria-label="Sign-in method for new user"
                  >
                    <option value="invite">
                      Email invite (sets own password)
                    </option>
                    <option value="pin">PIN (kiosk / cashier)</option>
                  </select>
                </label>
                {draft.credentialMethod === "pin" ? (
                  <label className="sm:col-span-2 flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                    PIN{" "}
                    <span className="font-normal text-muted-foreground/80">
                      (4–6 digits, required for PIN login on a branch)
                    </span>
                    <input
                      className={dashboardInputClass()}
                      placeholder="e.g. 4821"
                      inputMode="numeric"
                      pattern="\d{4,6}"
                      value={draft.pin}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          pin: event.target.value,
                        }))
                      }
                      aria-label="PIN for cashier-style user"
                    />
                  </label>
                ) : (
                  <p className="sm:col-span-2 rounded-none bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    We&apos;ll email this person a secure link to set their own
                    password. They can sign in once they&apos;ve set it.
                  </p>
                )}
                <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground sm:col-span-2">
                  First month salary
                  <select
                    className={dashboardSelectClass()}
                    value={draft.joinPayMode}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        joinPayMode: event.target.value as JoinPayMode,
                      }))
                    }
                    aria-label="First month salary calculation for new user"
                  >
                    {JOIN_PAY_MODES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="font-normal text-[11px] text-muted-foreground/90">
                    How their first month is calculated. Salaries unlock on the
                    25th — before that, the month shows zero for everyone.
                  </span>
                </label>
              </div>
            </FormDrawerFields>
          </form>
        </FormDrawer>
      ) : null}

      <StaffProfileDrawer
        open={profileUserId != null}
        onOpenChange={(open) => {
          if (!open) {
            setProfileUserId(null);
            setProfileUserLabel("");
            if (searchParams.get("profile")) {
              router.replace(APP_ROUTES.users, { scroll: false });
            }
          }
        }}
        userId={profileUserId}
        userLabel={profileUserLabel}
        permissions={me?.permissions}
      />
    </>
  );
}
