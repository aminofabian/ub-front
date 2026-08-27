"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DashboardFeedback } from "@/components/dashboard-page-ui";
import { approveDrawout, rejectDrawout, type DrawoutRecord } from "@/lib/api";

export function DrawoutApprovalActions({
  drawout,
  onChanged,
}: {
  drawout: DrawoutRecord;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  if (drawout.status !== "PENDING_APPROVAL") {
    return null;
  }

  async function approve() {
    setError("");
    setBusy("approve");
    try {
      await approveDrawout(drawout.id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not approve this drawout.");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    const note = reason.trim();
    if (!note) {
      setError("Add a short reason for rejecting.");
      return;
    }
    setError("");
    setBusy("reject");
    try {
      await rejectDrawout(drawout.id, note);
      setRejectOpen(false);
      setReason("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reject this drawout.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-1.5">
      {rejectOpen ? (
        <div className="space-y-1.5">
          <textarea
            className="min-h-[2.75rem] w-full resize-y border border-border/70 bg-background px-2 py-1.5 text-xs"
            placeholder="Why are you rejecting this drawout?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={2}
          />
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              className="h-7 rounded-none px-2.5 text-[11px]"
              disabled={busy != null}
              onClick={() => void reject()}
            >
              {busy === "reject" ? "Rejecting…" : "Confirm reject"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 rounded-none px-2.5 text-[11px]"
              disabled={busy != null}
              onClick={() => {
                setRejectOpen(false);
                setError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            className="h-7 rounded-none px-2.5 text-[11px]"
            disabled={busy != null}
            onClick={() => void approve()}
          >
            {busy === "approve" ? "Approving…" : "Approve"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-none px-2.5 text-[11px]"
            disabled={busy != null}
            onClick={() => setRejectOpen(true)}
          >
            Reject
          </Button>
        </div>
      )}
      {error ? <DashboardFeedback kind="error" text={error} /> : null}
    </div>
  );
}
