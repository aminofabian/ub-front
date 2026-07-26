"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Loader2, MessageSquareWarning } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { submitPublicSupplierComplaint } from "@/lib/public-supplier-portal";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
  shopName: string;
  theme: CSSProperties;
};

const INK_BORDER =
  "border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]";

const fieldClass = cn(
  "w-full border border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_12%,transparent)]",
  "bg-[color-mix(in_srgb,#fff_72%,var(--pos-paper,#f1ece3))] px-3 text-[13px] outline-none",
  "placeholder:text-muted-foreground/55",
  "focus:border-[var(--pos-primary)] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--pos-primary)_28%,transparent)]",
  "disabled:opacity-55",
);

export function PublicSupplierComplaintModal({
  open,
  onOpenChange,
  username,
  shopName,
  theme,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) return;
    setName("");
    setPhone("");
    setMessage("");
    setWebsite("");
    setBusy(false);
    setDone(false);
    setError(null);
  }, [open]);

  const onSubmit = async () => {
    setError(null);
    if (website.trim()) {
      setError("Could not send note");
      return;
    }
    if (message.trim().length < 8) {
      setError("Write a short note (at least a sentence).");
      return;
    }
    setBusy(true);
    try {
      await submitPublicSupplierComplaint(username, {
        name,
        phone,
        message,
      });
      setDone(true);
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send note");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="bottom"
        style={theme}
        className={cn(
          "gap-0 rounded-none border p-0",
          INK_BORDER,
          "h-auto max-h-[min(88dvh,34rem)] bg-[linear-gradient(180deg,#faf8f4_0%,#f3efe7_100%)]",
          "sm:left-1/2 sm:right-auto sm:w-[calc(100vw-2rem)] sm:max-w-md sm:-translate-x-1/2",
          "[&>button]:right-3 [&>button]:top-3 [&>button]:rounded-none",
        )}
      >
        <div
          aria-hidden
          className="mx-auto mt-2.5 h-0.5 w-10 bg-[color-mix(in_srgb,var(--pos-ink,#1c1915)_18%,transparent)] sm:hidden"
        />

        <DialogHeader className="space-y-1 border-b border-[color-mix(in_srgb,var(--pos-ink,#1c1915)_8%,transparent)] px-4 pb-3 pt-3 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Note to {shopName}
          </p>
          <DialogTitle className="flex items-center gap-2.5 text-[1.05rem] font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center bg-[color-mix(in_srgb,var(--pos-primary)_14%,transparent)] text-[var(--pos-primary)]">
              <MessageSquareWarning className="size-4" aria-hidden />
            </span>
            Voice a complaint
          </DialogTitle>
          <DialogDescription className="text-[12px] leading-snug">
            Delays, shortages, pricing — the shop gets this immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {done ? (
            <div
              className={cn(
                "mb-2 border border-dashed bg-white/70 px-4 py-8 text-center",
                "border-[color-mix(in_srgb,var(--pos-primary)_40%,transparent)]",
              )}
            >
              <p className="text-[14px] font-medium">Thanks — note sent.</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {shopName} has your message.
              </p>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="mt-4 h-10 w-full bg-[var(--pos-primary)] text-[12px] font-semibold text-[var(--pos-primary-ink,#fff)]"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 pb-2">
              <input
                className={cn(fieldClass, "h-11")}
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                autoComplete="name"
              />
              <input
                className={cn(fieldClass, "h-11")}
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={busy}
                inputMode="tel"
                autoComplete="tel"
              />
              <textarea
                className={cn(fieldClass, "min-h-[7.5rem] resize-none py-2.5")}
                placeholder="What should the shop know?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={busy}
              />
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
              {error ? (
                <p className="text-[12px] text-rose-700">{error}</p>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSubmit()}
                className="flex h-11 w-full items-center justify-center gap-2 bg-[var(--pos-primary)] text-[13px] font-semibold text-[var(--pos-primary-ink,#fff)] disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Sending…
                  </>
                ) : (
                  "Send note"
                )}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
