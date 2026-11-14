"use client";

import { useCallback, useEffect, useState } from "react";

import { dashboardHintClass, dashboardInputClass, dashboardLabelClass, dashboardSelectClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiRequestError } from "@/lib/api";
import {
  createServiceResource,
  fetchServiceResources,
  RESOURCE_TYPES,
  updateServiceResource,
  type ServiceResourceRecord,
} from "@/lib/service-business-api";

function detail(err: unknown, fallback: string): string {
  const payload = err instanceof ApiRequestError ? (err.payload as { detail?: unknown } | null) : null;
  return payload && typeof payload.detail === "string" && payload.detail.trim() ? payload.detail : fallback;
}

/** The chairs, beds, rooms and machines of a branch: add, rename, set a cleaning time, take out of use. */
export function ResourcesDialog({ branchId, onClose }: { branchId: string; onClose: () => void }) {
  const [rows, setRows] = useState<ServiceResourceRecord[] | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("CHAIR");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await fetchServiceResources(branchId));
    } catch {
      setError("Could not load the list.");
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(detail(err, fallback));
    } finally {
      setBusy(false);
      await load();
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !busy ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chairs, beds and rooms</DialogTitle>
          <DialogDescription>
            Each one holds one customer at a time. A free person does not mean a free chair, so both are checked when a service
            starts.
          </DialogDescription>
        </DialogHeader>
        {rows === null ? (
          <p className="text-sm">Loading…</p>
        ) : (
          <div className="grid gap-3">
            {rows.length === 0 ? <p className={dashboardHintClass()}>None yet. Add your first below.</p> : null}
            <ul className="grid max-h-[45vh] gap-2 overflow-y-auto">
              {rows.map((r) => {
                const blocked = r.blockedUntil != null && new Date(r.blockedUntil).getTime() > Date.now();
                return (
                  <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_5rem_auto] items-center gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.name}</span>
                      <span className={dashboardHintClass()}>
                        {RESOURCE_TYPES.find((t) => t.id === r.resourceType)?.label ?? r.resourceType}
                        {!r.active ? " · switched off" : blocked ? " · out of use" : r.busyTicketId ? " · in use now" : " · free"}
                      </span>
                    </span>
                    <label className="grid gap-0.5">
                      <span className="sr-only">Minutes to prepare {r.name} after each customer</span>
                      <input
                        className={dashboardInputClass(false, "text-right font-mono")}
                        inputMode="numeric"
                        title="Minutes to clean or prepare after each customer"
                        defaultValue={r.cleanupMinutes}
                        onBlur={(e) => {
                          const minutes = Number(e.target.value.replace(/[^0-9]/g, "") || "0");
                          if (minutes !== r.cleanupMinutes) {
                            void run(() => updateServiceResource(r.id, { cleanupMinutes: Math.min(240, minutes) }), "Could not save.");
                          }
                        }}
                      />
                    </label>
                    <span className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () =>
                              blocked
                                ? updateServiceResource(r.id, { clearBlock: true })
                                : updateServiceResource(r.id, {
                                    blockedUntil: new Date(Date.now() + 86400000).toISOString(),
                                    blockedReason: "Out of use",
                                  }),
                            "Could not change it.",
                          )
                        }
                      >
                        {blocked ? "Back in use" : "Out today"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void run(() => updateServiceResource(r.id, { active: !r.active }), "Could not change it.")}
                      >
                        {r.active ? "Switch off" : "Switch on"}
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className={dashboardHintClass()}>The number is the minutes to clean or prepare it after each customer.</p>
            <div className="grid grid-cols-[minmax(0,1fr)_8rem_auto] items-end gap-2 border-t pt-3">
              <label className="grid gap-1">
                <span className={dashboardLabelClass()}>Add one</span>
                <input className={dashboardInputClass(false)} placeholder="Bed 2" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <select className={dashboardSelectClass()} aria-label="Kind" value={type} onChange={(e) => setType(e.target.value)}>
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                disabled={busy || !name.trim()}
                onClick={() =>
                  void run(async () => {
                    await createServiceResource({ branchId, name: name.trim(), resourceType: type });
                    setName("");
                  }, "Could not add it.")
                }
              >
                Add
              </Button>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
