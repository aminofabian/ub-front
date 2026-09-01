"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";

import { dashboardInputClass } from "@/components/dashboard-page-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCustomer } from "@/lib/api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  onFeedback: (kind: "error" | "success", text: string) => void;
};

export function CustomerCreateDialog({
  open,
  onOpenChange,
  onCreated,
  onFeedback,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setPhone("");
      setBusy(false);
    }
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone) {
      onFeedback("error", "Name and phone are required.");
      return;
    }
    setBusy(true);
    try {
      await createCustomer({
        name: trimmedName,
        email: email.trim() || undefined,
        phones: [{ phone: trimmedPhone, primary: true }],
      });
      onFeedback("success", "Customer created.");
      onCreated();
      onOpenChange(false);
    } catch (err) {
      onFeedback(
        "error",
        err instanceof Error ? err.message : "Could not create customer.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-border/60 px-5 py-4 text-left">
          <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-[#F9F6F0] text-[#8B6F3A]">
            <UserPlus className="size-5" />
          </div>
          <DialogTitle>New customer</DialogTitle>
          <DialogDescription>
            Add someone to your directory. They can be linked at checkout later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4 px-5 py-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Name</span>
            <input
              className={dashboardInputClass(busy)}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Jane Wanjiku"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Phone</span>
            <input
              className={dashboardInputClass(busy)}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="2547… or 07…"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">
              Email <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <input
              className={dashboardInputClass(busy)}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </label>
          <DialogFooter className="gap-2 border-t border-border/50 px-0 pt-4 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {busy ? "Creating…" : "Create customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
