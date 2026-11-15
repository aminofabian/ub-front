"use client";

import { useEffect, useState } from "react";

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
  WORK_DAYS,
  fetchStaffWorkingHours,
  setStaffWorkingHours,
  workingHoursError,
  workingHoursSummary,
  type WorkingHours,
} from "@/lib/service-calendar";

const USUAL = { open: "08:00", close: "18:00" };

/**
 * The days and hours one person works. Outside them they cannot be booked, at the counter or
 * online. With no days ticked they work whenever the shop is open.
 */
export function WorkingHoursDialog({ staff, onClose }: { staff: { id: string; name: string }[]; onClose: () => void }) {
  const [staffId, setStaffId] = useState(staff.length === 1 ? staff[0]!.id : "");
  const [days, setDays] = useState<WorkingHours | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const name = staff.find((s) => s.id === staffId)?.name ?? "They";

  useEffect(() => {
    if (!staffId) return;
    let live = true;
    setDays(null);
    setError(null);
    setDone(null);
    fetchStaffWorkingHours(staffId)
      .then((found) => {
        if (live) setDays(found);
      })
      .catch(() => {
        if (live) setError("Could not load their hours. Choose them again.");
      });
    return () => {
      live = false;
    };
  }, [staffId]);

  async function save(next: WorkingHours) {
    const problem = workingHoursError(next);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      const saved = await setStaffWorkingHours(staffId, next);
      setDays(saved);
      setDone(Object.keys(saved).length > 0 ? `Saved. ${name}: ${workingHoursSummary(saved)}.` : `Saved. ${name} works whenever the shop is open.`);
    } catch (err) {
      const detail = err instanceof ApiRequestError ? (err.payload as { detail?: unknown } | null)?.detail : null;
      setError(typeof detail === "string" && detail.trim() ? detail : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (!open && !busy ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Working hours</DialogTitle>
          <DialogDescription>
            The days and hours each person works. Outside them nobody can book them. Leave every day unticked and they
            work whenever the shop is open.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Who</span>
            <select className={dashboardSelectClass()} value={staffId} disabled={busy} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Choose…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {staffId && days == null && !error ? (
            <p className={dashboardHintClass()} aria-busy="true">
              Loading their hours…
            </p>
          ) : null}
          {days != null ? (
            <ul className="divide-y" aria-label={`${name}'s week`}>
              {WORK_DAYS.map(({ key, label }) => {
                const day = days[key];
                return (
                  <li key={key} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
                    <label className="flex w-32 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={day != null}
                        disabled={busy}
                        onChange={(e) => {
                          setDone(null);
                          setError(null);
                          const next = { ...days };
                          if (e.target.checked) next[key] = { ...USUAL };
                          else delete next[key];
                          setDays(next);
                        }}
                      />
                      {label}
                    </label>
                    {day ? (
                      <span className="flex items-center gap-1.5 text-sm">
                        <input
                          type="time"
                          aria-label={`${label} from`}
                          className={dashboardInputClass(busy, "w-[7.5rem]")}
                          disabled={busy}
                          value={day.open}
                          onChange={(e) => setDays({ ...days, [key]: { ...day, open: e.target.value } })}
                        />
                        <span className="text-[var(--op-muted)]">to</span>
                        <input
                          type="time"
                          aria-label={`${label} until`}
                          className={dashboardInputClass(busy, "w-[7.5rem]")}
                          disabled={busy}
                          value={day.close}
                          onChange={(e) => setDays({ ...days, [key]: { ...day, close: e.target.value } })}
                        />
                      </span>
                    ) : (
                      <span className={dashboardHintClass()}>
                        {Object.keys(days).length > 0 ? "Not working" : "As the shop"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
          {done ? (
            <p role="status" className="text-sm">
              {done}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Close
          </Button>
          <Button disabled={busy || days == null} onClick={() => (days ? void save(days) : undefined)}>
            {busy ? "Saving…" : "Save hours"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
