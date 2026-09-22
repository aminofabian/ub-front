"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Check,
  Loader2,
  MonitorSmartphone,
  Power,
  PowerOff,
  RefreshCw,
  ShieldAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { FormDrawer } from "@/components/form-drawer";
import type { BranchRecord } from "@/lib/api";
import {
  CASHIER_TEMPLATES,
  parseCashierTemplateId,
  readLocalCashierTemplate,
  writeLocalCashierTemplate,
  type CashierTemplateId,
} from "@/lib/cashier-templates";
import {
  formatTillDeviceShortId,
  getOrCreateTillDeviceId,
  humanTillLabel,
  setTillDeviceLabel,
} from "@/lib/till-device";
import {
  approveTillAccessRequest,
  dismissTillAccessRequest,
  listTillAccessRequests,
  listTillDevices,
  patchTillDevice,
  reactivateTillDevice,
  registerTillDevice,
  revokeTillDevice,
  tillDeviceErrorMessage,
  type TillAccessRequestRecord,
  type TillDeviceRecord,
} from "@/lib/till-devices-api";
import { cn } from "@/lib/utils";

type ManageTillsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: BranchRecord[];
  defaultBranchId?: string | null;
};

export function ManageTillsDrawer({
  open,
  onOpenChange,
  branches,
  defaultBranchId,
}: ManageTillsDrawerProps) {
  const [branchId, setBranchId] = useState(
    () => defaultBranchId?.trim() || branches[0]?.id || "",
  );
  const [devices, setDevices] = useState<TillDeviceRecord[]>([]);
  const [pending, setPending] = useState<TillAccessRequestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [localDeviceKey, setLocalDeviceKey] = useState("");
  const [pendingLabels, setPendingLabels] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    setLocalDeviceKey(getOrCreateTillDeviceId());
  }, []);

  useEffect(() => {
    if (!open) return;
    const next = defaultBranchId?.trim() || branches[0]?.id || "";
    if (next) setBranchId(next);
  }, [open, defaultBranchId, branches]);

  const reload = useCallback(async (bid: string) => {
    if (!bid) {
      setDevices([]);
      setPending([]);
      return;
    }
    setLoading(true);
    try {
      const [deviceRows, pendingRows] = await Promise.all([
        listTillDevices({ branchId: bid, includeRevoked: true }),
        listTillAccessRequests({ branchId: bid, status: "pending" }),
      ]);
      setDevices(deviceRows);
      setPending(pendingRows);
      setPendingLabels((prev) => {
        const next = { ...prev };
        for (const row of pendingRows) {
          if (!next[row.id]) next[row.id] = row.suggestedLabel;
        }
        return next;
      });
    } catch (error) {
      toast.error(tillDeviceErrorMessage(error));
      setDevices([]);
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!branchId && branches[0]?.id) {
      setBranchId(branches[0].id);
      return;
    }
    void reload(branchId);
  }, [open, branchId, branches, reload]);

  const active = useMemo(
    () => devices.filter((d) => !d.revokedAt),
    [devices],
  );
  const inactive = useMemo(
    () => devices.filter((d) => Boolean(d.revokedAt)),
    [devices],
  );

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusyKey(key);
    try {
      await fn();
      await reload(branchId);
    } catch (error) {
      toast.error(tillDeviceErrorMessage(error));
    } finally {
      setBusyKey(null);
    }
  };

  const onRegisterThisBrowser = () =>
    void run("register", async () => {
      if (!branchId) {
        toast.error("Select a branch first.");
        return;
      }
      const row = await registerTillDevice({
        branchId,
        label: label.trim() || undefined,
        cashierTemplate: readLocalCashierTemplate(),
      });
      setTillDeviceLabel(humanTillLabel(row.label) ?? "");
      toast.success(
        `Registered as “${humanTillLabel(row.label) ?? row.label}”`,
      );
      setLabel("");
    });

  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Trusted tills"
      description="Register counters cashiers unlock from. Waiting requests appear when someone enters the right PIN on a new computer."
      contextLabel="Business"
      appearance="sharp"
      width="wide"
      icon={
        <MonitorSmartphone
          className="size-4 text-[var(--pos-primary,#0f766e)]"
          aria-hidden
        />
      }
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="min-w-0 text-[12px] text-[color-mix(in_srgb,#141414_55%,transparent)]">
            {pending.length > 0
              ? `${pending.length} waiting · ${active.length} active`
              : `${active.length} active till${active.length === 1 ? "" : "s"}`}
          </p>
          <button
            type="button"
            onClick={() => void reload(branchId)}
            disabled={loading || !branchId}
            className="inline-flex items-center gap-1.5 border border-[color-mix(in_srgb,#141414_12%,transparent)] bg-white px-3 py-2 text-[13px] font-semibold text-[#141414] transition-colors hover:bg-[#FAFAF8] disabled:opacity-50"
          >
            <RefreshCw
              className={cn("size-3.5", loading && "animate-spin")}
              aria-hidden
            />
            Refresh
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <label className="block space-y-1.5 text-sm">
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--pos-primary,#0f766e)]">
            Branch
          </span>
          <select
            className="w-full border border-[color-mix(in_srgb,#141414_12%,transparent)] bg-white px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/30"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={branches.length === 0}
          >
            {branches.length === 0 ? (
              <option value="">No branches</option>
            ) : (
              branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))
            )}
          </select>
        </label>

        <section className="border border-[color-mix(in_srgb,#141414_10%,transparent)] bg-[#FAFAF8] p-3.5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--pos-primary,#0f766e)]">
            This computer
          </p>
          <p className="mt-1 text-[13px] text-[color-mix(in_srgb,#141414_58%,transparent)]">
            Name it and register so PIN unlock works here once this branch has
            trusted tills.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 space-y-1 text-sm">
              <span className="font-medium text-[#141414]">Label</span>
              <input
                className="w-full border border-[color-mix(in_srgb,#141414_12%,transparent)] bg-white px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/30"
                value={label}
                onChange={(e) => setLabel(e.target.value.slice(0, 80))}
                placeholder="e.g. Front counter"
                maxLength={80}
              />
            </label>
            <button
              type="button"
              disabled={!branchId || busyKey === "register"}
              onClick={onRegisterThisBrowser}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 border border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] px-3.5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0d6b63] disabled:opacity-60"
            >
              {busyKey === "register" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <MonitorSmartphone className="size-4" aria-hidden />
              )}
              Register this browser
            </button>
          </div>
          {localDeviceKey ? (
            <p className="mt-2 text-[11px] text-[color-mix(in_srgb,#141414_48%,transparent)]">
              Device {formatTillDeviceShortId(localDeviceKey)}
            </p>
          ) : null}
        </section>

        {loading ? (
          <p className="flex items-center gap-2 text-[13px] text-[color-mix(in_srgb,#141414_55%,transparent)]">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading tills…
          </p>
        ) : (
          <>
            <TillSection
              title="Waiting to register"
              hint="Cashiers who entered the right PIN on an unregistered computer."
              count={pending.length}
              tone="alert"
              empty="No pending unlocks. When someone tries a new till, it shows up here."
            >
              {pending.map((row) => (
                <PendingTillRow
                  key={row.id}
                  row={row}
                  label={pendingLabels[row.id] ?? row.suggestedLabel}
                  onLabelChange={(value) =>
                    setPendingLabels((prev) => ({ ...prev, [row.id]: value }))
                  }
                  busy={busyKey === `pending:${row.id}`}
                  onRegister={() =>
                    void run(`pending:${row.id}`, async () => {
                      await approveTillAccessRequest(
                        row.id,
                        pendingLabels[row.id] ?? row.suggestedLabel,
                      );
                      toast.success(
                        `Trusted “${pendingLabels[row.id] ?? row.suggestedLabel}”`,
                      );
                    })
                  }
                  onDismiss={() =>
                    void run(`pending:${row.id}`, async () => {
                      await dismissTillAccessRequest(row.id);
                      toast.success("Request dismissed");
                    })
                  }
                />
              ))}
            </TillSection>

            <TillSection
              title="Active"
              hint="PIN unlock works on these computers."
              count={active.length}
              empty="No active tills yet — register this browser or approve a waiting request."
            >
              {active.map((device) => (
                <DeviceTillRow
                  key={device.id}
                  device={device}
                  localDeviceKey={localDeviceKey}
                  busy={busyKey === `device:${device.id}`}
                  mode="active"
                  onTemplateChange={(next) =>
                    void run(`device:${device.id}`, async () => {
                      const row = await patchTillDevice(device.id, {
                        cashierTemplate: next,
                      });
                      if (
                        localDeviceKey &&
                        row.deviceKey === localDeviceKey
                      ) {
                        writeLocalCashierTemplate(row.cashierTemplate);
                      }
                      toast.success(
                        row.cashierTemplate === "ledger"
                          ? "This till will use Ledger"
                          : "This till will use Shelf",
                      );
                    })
                  }
                  onToggle={() =>
                    void run(`device:${device.id}`, async () => {
                      await revokeTillDevice(device.id);
                      toast.success("Till deactivated");
                    })
                  }
                />
              ))}
            </TillSection>

            <TillSection
              title="Deactivated"
              hint="Blocked from PIN unlock until you activate again."
              count={inactive.length}
              empty="No deactivated tills."
            >
              {inactive.map((device) => (
                <DeviceTillRow
                  key={device.id}
                  device={device}
                  localDeviceKey={localDeviceKey}
                  busy={busyKey === `device:${device.id}`}
                  mode="inactive"
                  onToggle={() =>
                    void run(`device:${device.id}`, async () => {
                      await reactivateTillDevice(device.id);
                      toast.success("Till activated");
                    })
                  }
                />
              ))}
            </TillSection>
          </>
        )}
      </div>
    </FormDrawer>
  );
}

function TillSection({
  title,
  hint,
  count,
  empty,
  tone,
  children,
}: {
  title: string;
  hint: string;
  count: number;
  empty: string;
  tone?: "alert";
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[12px] font-semibold uppercase tracking-[0.06em]",
              tone === "alert"
                ? "text-[#B45309]"
                : "text-[var(--pos-primary,#0f766e)]",
            )}
          >
            {title}
          </p>
          <p className="mt-0.5 text-[12px] text-[color-mix(in_srgb,#141414_55%,transparent)]">
            {hint}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex min-w-7 items-center justify-center border px-1.5 py-0.5 text-[11px] font-semibold",
            tone === "alert"
              ? "border-[#F59E0B]/40 bg-[#FFFBEB] text-[#B45309]"
              : "border-[color-mix(in_srgb,#141414_10%,transparent)] bg-white text-[#141414]",
          )}
        >
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="border border-dashed border-[color-mix(in_srgb,#141414_12%,transparent)] bg-white px-3.5 py-3 text-[13px] text-[color-mix(in_srgb,#141414_55%,transparent)]">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-[color-mix(in_srgb,#141414_8%,transparent)] border border-[color-mix(in_srgb,#141414_10%,transparent)] bg-white">
          {children}
        </ul>
      )}
    </section>
  );
}

function PendingTillRow({
  row,
  label,
  onLabelChange,
  busy,
  onRegister,
  onDismiss,
}: {
  row: TillAccessRequestRecord;
  label: string;
  onLabelChange: (value: string) => void;
  busy: boolean;
  onRegister: () => void;
  onDismiss: () => void;
}) {
  return (
    <li className="bg-[color-mix(in_srgb,#F59E0B_6%,white)] px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center border border-[#F59E0B]/35 bg-[#FFFBEB] text-[#B45309]">
          <ShieldAlert className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[#141414]">
            {row.requestedByName}
            <span className="ml-1.5 text-[12px] font-normal text-[color-mix(in_srgb,#141414_55%,transparent)]">
              waiting
            </span>
          </p>
          <p className="mt-0.5 truncate text-[12px] text-[color-mix(in_srgb,#141414_55%,transparent)]">
            {row.branchName} · {row.deviceShortId || formatTillDeviceShortId(row.deviceKey)} · last seen{" "}
            {formatWhen(row.lastSeenAt)}
          </p>
          <label className="mt-2 block space-y-1 text-sm">
            <span className="text-[11px] font-medium text-[#141414]">
              Till name
            </span>
            <input
              className="w-full border border-[color-mix(in_srgb,#141414_12%,transparent)] bg-white px-2.5 py-2 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/30"
              value={label}
              onChange={(e) => onLabelChange(e.target.value.slice(0, 80))}
              maxLength={80}
              disabled={busy}
            />
          </label>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onRegister}
              className="inline-flex items-center gap-1.5 border border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#0d6b63] disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="size-3.5" aria-hidden />
              )}
              Register till
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDismiss}
              className="inline-flex items-center gap-1.5 border border-[color-mix(in_srgb,#141414_12%,transparent)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#141414] hover:bg-[#FAFAF8] disabled:opacity-60"
            >
              <X className="size-3.5" aria-hidden />
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function DeviceTillRow({
  device,
  localDeviceKey,
  busy,
  mode,
  onToggle,
  onTemplateChange,
}: {
  device: TillDeviceRecord;
  localDeviceKey: string;
  busy: boolean;
  mode: "active" | "inactive";
  onToggle: () => void;
  onTemplateChange?: (next: CashierTemplateId) => void;
}) {
  const isThis = localDeviceKey && device.deviceKey === localDeviceKey;
  return (
    <li className="flex flex-col gap-2.5 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-[#141414]">
          {device.label}
          {isThis ? (
            <span className="ml-1.5 text-[12px] font-normal text-[color-mix(in_srgb,#141414_55%,transparent)]">
              (this browser)
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-[color-mix(in_srgb,#141414_55%,transparent)]">
          {formatTillDeviceShortId(device.deviceKey)} ·{" "}
          {mode === "active"
            ? `registered ${formatWhen(device.registeredAt)}`
            : `off since ${formatWhen(device.revokedAt ?? device.registeredAt)}`}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {mode === "active" && onTemplateChange ? (
          <select
            className="h-8 border border-[color-mix(in_srgb,#141414_12%,transparent)] bg-white px-2 text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/30"
            value={parseCashierTemplateId(device.cashierTemplate)}
            disabled={busy}
            aria-label={`Layout for ${device.label}`}
            onChange={(e) =>
              onTemplateChange(parseCashierTemplateId(e.target.value))
            }
          >
            {CASHIER_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={onToggle}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 border px-2.5 text-[12px] font-semibold disabled:opacity-60",
            mode === "active"
              ? "border-[color-mix(in_srgb,#141414_12%,transparent)] bg-white text-[#141414] hover:border-[#B45309]/40 hover:text-[#B45309]"
              : "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)] text-white hover:bg-[#0d6b63]",
          )}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : mode === "active" ? (
            <PowerOff className="size-3.5" aria-hidden />
          ) : (
            <Power className="size-3.5" aria-hidden />
          )}
          {mode === "active" ? "Deactivate" : "Activate"}
        </button>
      </div>
    </li>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
