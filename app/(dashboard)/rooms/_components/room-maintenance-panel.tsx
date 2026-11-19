"use client";

import { Camera, Check, Loader2, Wrench, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useDashboard } from "@/components/dashboard-provider";
import { Button } from "@/components/ui/button";
import { ApiRequestError } from "@/lib/api";
import {
  dashboardHintClass,
  dashboardInputClass,
} from "@/components/dashboard-page-ui";
import {
  fetchRoomIssues,
  raiseRoomIssue,
  updateRoomIssue,
  uploadRoomIssuePhoto,
  type MaintenanceIssueRecord,
  type RoomRecord,
} from "@/lib/rooms-api";
import { cn } from "@/lib/utils";

type Cleaner = { staffProfileId: string; name: string };

/**
 * A room's maintenance issues inside the Manage-rooms drawer (ADR 0030 Phase 2). A maintenance issue
 * is a persistent ticket — what broke, who's on it, is it done — that OUTLIVES the housekeeping note,
 * which is wiped when the room is turned clean. Raising one takes the room out of service; closing
 * one leaves housekeeping to staff. Collapsed by default so the drawer stays light; the room's open
 * count shows in the header either way.
 */
export function RoomMaintenancePanel({
  room,
  cleaners,
  busy,
  setBusy,
  setError,
  onAfterChange,
}: {
  room: RoomRecord;
  cleaners: Cleaner[];
  busy: boolean;
  setBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
  onAfterChange: () => void | Promise<void>;
}) {
  const { business } = useDashboard();
  const [open, setOpen] = useState(false);
  const [issues, setIssues] = useState<MaintenanceIssueRecord[] | null>(null);
  const [raising, setRaising] = useState(false);
  const [desc, setDesc] = useState("");
  const [assignee, setAssignee] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load the room's history the first time the panel is opened.
  useEffect(() => {
    if (!open || issues !== null) return;
    void fetchRoomIssues(room.id)
      .then(setIssues)
      .catch(() => setIssues([]));
  }, [open, issues, room.id]);

  function fail(e: unknown, fallback: string) {
    setError(e instanceof ApiRequestError && e.message ? e.message : fallback);
  }

  async function pickPhoto(file: File | undefined) {
    if (!file || !business?.id) return;
    setUploading(true);
    setError(null);
    try {
      setPhotoUrl(await uploadRoomIssuePhoto(file, business.id));
    } catch (e) {
      fail(e, "Could not upload the photo. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function raise() {
    if (!desc.trim()) return setError("Say what needs fixing");
    setBusy(true);
    setError(null);
    try {
      await raiseRoomIssue(room.id, {
        description: desc.trim(),
        photoUrl: photoUrl ?? undefined,
        assignedStaffProfileId: assignee || undefined,
      });
      setDesc("");
      setAssignee("");
      setPhotoUrl(null);
      setRaising(false);
      setIssues(await fetchRoomIssues(room.id).catch(() => issues ?? []));
      await onAfterChange();
    } catch (e) {
      fail(e, "Could not raise the issue. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function move(issue: MaintenanceIssueRecord, status: MaintenanceIssueRecord["status"]) {
    setBusy(true);
    setError(null);
    try {
      const updated = await updateRoomIssue(issue.id, { status });
      setIssues((prev) => (prev ?? []).map((i) => (i.id === issue.id ? updated : i)));
      await onAfterChange();
    } catch (e) {
      fail(e, "Could not update the issue. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const openCount = room.openIssueCount;

  return (
    <div className="rounded-[2px] border border-[color-mix(in_srgb,var(--op-ink,#121A16)_10%,transparent)] bg-[color-mix(in_srgb,var(--op-ink,#121A16)_2%,transparent)] px-2 py-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left text-xs"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--op-ink,#121A16)]">
          <Wrench className="size-3.5" aria-hidden />
          Maintenance
          {openCount > 0 ? (
            <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,#8f3f2f_14%,transparent)] px-1.5 text-[10px] font-semibold text-[#8f3f2f]">
              {openCount} open
            </span>
          ) : null}
        </span>
        <span className={dashboardHintClass()}>{open ? "Hide" : "View / raise"}</span>
      </button>

      {open ? (
        <div className="mt-2 flex flex-col gap-2">
          {/* The room's history, newest first. */}
          {issues === null ? (
            <p className={dashboardHintClass()}>Loading…</p>
          ) : issues.length === 0 ? (
            <p className={dashboardHintClass()}>No issues raised on this room.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {issues.map((issue) => (
                <li
                  key={issue.id}
                  className="flex items-start justify-between gap-2 rounded-[2px] bg-[var(--op-surface,#FCFAF5)] px-2 py-1.5 text-xs"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <StatusPill status={issue.status} />
                      <span className="min-w-0 truncate font-medium text-[var(--op-ink,#121A16)]">
                        {issue.description}
                      </span>
                    </span>
                    <span className={cn(dashboardHintClass(), "mt-0.5 flex flex-wrap items-center gap-x-2")}>
                      {issue.assignedName ? <span>{issue.assignedName}</span> : null}
                      {issue.photoUrl ? (
                        <a
                          href={issue.photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[var(--pos-primary,#1D4B3B)] underline"
                        >
                          <Camera className="size-3" aria-hidden /> photo
                        </a>
                      ) : null}
                    </span>
                  </span>
                  {issue.status !== "DONE" ? (
                    <span className="flex shrink-0 gap-1">
                      {issue.status === "OPEN" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-1.5 text-[11px]"
                          disabled={busy}
                          onClick={() => void move(issue, "IN_PROGRESS")}
                        >
                          Start
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-1.5 text-[11px]"
                        disabled={busy}
                        onClick={() => void move(issue, "DONE")}
                      >
                        <Check className="size-3" aria-hidden /> Done
                      </Button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {/* Raise a new issue. */}
          {raising ? (
            <div className="flex flex-col gap-2 rounded-[2px] bg-[var(--op-surface,#FCFAF5)] p-2">
              <input
                className={dashboardInputClass(false, "h-8 text-xs")}
                placeholder="What needs fixing — cracked basin, broken lock…"
                maxLength={500}
                value={desc}
                disabled={busy}
                onChange={(e) => setDesc(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                {cleaners.length > 0 ? (
                  <select
                    aria-label="Assign to"
                    className="h-8 rounded-[2px] border bg-[var(--op-surface,#FCFAF5)] px-2 text-xs focus-visible:border-[var(--pos-primary,#1D4B3B)] focus-visible:outline-none disabled:opacity-60"
                    value={assignee}
                    disabled={busy}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {cleaners.map((c) => (
                      <option key={c.staffProfileId} value={c.staffProfileId}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void pickPhoto(e.target.files?.[0])}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  disabled={busy || uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Camera className="size-3.5" aria-hidden />
                  )}
                  {photoUrl ? "Photo added" : "Add photo"}
                </Button>
                {photoUrl ? (
                  <button
                    type="button"
                    className={cn(dashboardHintClass(), "inline-flex items-center gap-0.5")}
                    onClick={() => setPhotoUrl(null)}
                    disabled={busy}
                  >
                    <X className="size-3" aria-hidden /> remove
                  </button>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={busy}
                  onClick={() => {
                    setRaising(false);
                    setDesc("");
                    setAssignee("");
                    setPhotoUrl(null);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" className="h-7 px-2 text-xs" disabled={busy || uploading} onClick={() => void raise()}>
                  Raise issue
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-fit px-2 text-xs"
              disabled={busy}
              onClick={() => setRaising(true)}
            >
              <Wrench className="size-3" aria-hidden /> Raise an issue
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: MaintenanceIssueRecord["status"] }) {
  const label = status === "IN_PROGRESS" ? "In progress" : status === "DONE" ? "Done" : "Open";
  const tone =
    status === "DONE"
      ? "bg-[color-mix(in_srgb,var(--pos-primary,#1D4B3B)_12%,transparent)] text-[var(--pos-primary,#1D4B3B)]"
      : status === "IN_PROGRESS"
        ? "bg-[color-mix(in_srgb,#b7791f_16%,transparent)] text-[#8a5a12]"
        : "bg-[color-mix(in_srgb,#8f3f2f_14%,transparent)] text-[#8f3f2f]";
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-1.5 text-[10px] font-semibold", tone)}>
      {label}
    </span>
  );
}
