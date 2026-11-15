"use client";

import { useState } from "react";

import { dashboardInputClass, dashboardLabelClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ReasonRequest = {
  title: string;
  hint: string;
  /** What the confirming button says, e.g. "Cancel the dish". */
  confirm: string;
  /** A reason must be typed before it can be confirmed. */
  required: boolean;
  run: (reason: string) => void;
};

/**
 * Asks why something is being cancelled or written off. In the page rather than a browser prompt:
 * a prompt cannot say what is required, looks like the browser and not the shop's own screen, and
 * some tablets set up as a kiosk do not show one at all.
 */
export function ReasonDialog({ request, onClose }: { request: ReasonRequest; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState(false);

  function submit() {
    const text = reason.trim();
    if (request.required && !text) return setMissing(true);
    request.run(text);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => (o ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          <DialogDescription>{request.hint}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="grid gap-1">
            <span className={dashboardLabelClass()}>Reason{request.required ? "" : " (optional)"}</span>
            <input
              className={dashboardInputClass(missing)}
              value={reason}
              maxLength={200}
              autoFocus
              aria-invalid={missing}
              onChange={(e) => {
                setReason(e.target.value);
                setMissing(false);
              }}
            />
          </label>
          {missing ? (
            <p role="alert" className="mt-1 text-sm text-red-700">
              Type a reason first.
            </p>
          ) : null}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Go back
            </Button>
            <Button type="submit">{request.confirm}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
