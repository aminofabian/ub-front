"use client";

import { CheckCircle2, ExternalLink, Globe, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  changeMyShopAddress,
  checkMyShopAddress,
  fetchMyShopAddress,
  withSuppressedHttpErrorToasts,
  type ShopAddressChange,
  type ShopAddressStatus,
} from "@/lib/api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the address has changed, so the list behind can reload. */
  onChanged: () => void;
};

type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; host: string }
  | { state: "no"; reason: string };

/** What the person typed, as the server will read it: lower case, no spaces, no pasted suffix. */
export function tidyAddressName(raw: string, suffix: string | null): string {
  let value = raw.trim().toLowerCase().replace(/^https?:\/\//, "");
  value = value.split("/")[0] ?? "";
  if (suffix && value.endsWith(`.${suffix}`)) {
    value = value.slice(0, -(suffix.length + 1));
  }
  return value.replace(/\s+/g, "");
}

const CHANNEL_WORDS: Record<string, string> = {
  email: "email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

/** "email and WhatsApp", for the confirmation line. */
export function describeChannels(channels: string[]): string {
  const words = channels.map((c) => CHANNEL_WORDS[c] ?? c);
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

function waitText(nextAllowedAt: string): string {
  const date = new Date(nextAllowedAt);
  if (Number.isNaN(date.getTime())) return "You changed your address recently.";
  const day = date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `You changed your address recently. You can pick a new name from ${day}.`;
}

/**
 * Lets the owner swap the shop's free address for a shorter or tidier one. The old address
 * keeps working, so nothing printed or bookmarked breaks.
 */
export function ChangeAddressDialog({ open, onOpenChange, onChanged }: Props) {
  const [status, setStatus] = useState<ShopAddressStatus | null>(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<ShopAddressChange | null>(null);
  const checkSeq = useRef(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus(null);
    setLoadError("");
    setName("");
    setCheck({ state: "idle" });
    setError("");
    setDone(null);
    withSuppressedHttpErrorToasts(() => fetchMyShopAddress())
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(
          e instanceof Error && e.message
            ? e.message
            : "Could not load your address. Try again.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const suffix = status?.suffix ?? null;
  const tidy = tidyAddressName(name, suffix);

  // Ask the server whether the name is free, a moment after the person stops typing.
  useEffect(() => {
    if (!open || !status?.available || done) return;
    const seq = ++checkSeq.current;
    if (!tidy || tidy === status.currentName) {
      setCheck({ state: "idle" });
      return;
    }
    setCheck({ state: "checking" });
    const timer = window.setTimeout(() => {
      withSuppressedHttpErrorToasts(() => checkMyShopAddress(tidy))
        .then((result) => {
          if (seq !== checkSeq.current) return;
          setCheck(
            result.available && result.host
              ? { state: "ok", host: result.host }
              : {
                  state: "no",
                  reason: result.reason || "That name can't be used.",
                },
          );
        })
        .catch(() => {
          if (seq !== checkSeq.current) return;
          // The save itself checks again, so a failed look-up only loses the hint.
          setCheck({ state: "idle" });
        });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [open, status, tidy, done]);

  const submit = async () => {
    if (!tidy || saving) return;
    setError("");
    setSaving(true);
    try {
      const result = await withSuppressedHttpErrorToasts(() =>
        changeMyShopAddress(tidy),
      );
      setDone(result);
      onChanged();
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Could not change the address. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const waiting = status?.nextNewNameAllowedAt ?? null;
  const others = status?.otherAddresses ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="premium-portal sm:max-w-md">
        <DialogHeader className="flex flex-row items-start gap-3 space-y-0 text-left">
          <span
            className="mt-1 flex size-8 shrink-0 items-center justify-center bg-[var(--op-accent,#1D4B3B)] text-white"
            aria-hidden
          >
            <Globe className="size-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1 pr-6">
            <DialogTitle>
              {done ? "Your address has changed" : "Change your shop address"}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              {done
                ? "Customers and staff can use the new address straight away."
                : "Pick a shorter or tidier name. Your old address keeps working, so links and QR codes you have shared still open the shop."}
            </DialogDescription>
          </div>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col gap-3 text-[13px] leading-relaxed">
            <p className="flex items-start gap-2">
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-[var(--pos-primary,#0f766e)]"
                aria-hidden
              />
              <span>
                New address{" "}
                <span className="break-all font-mono text-[12px] font-semibold">
                  {done.host}
                </span>
              </span>
            </p>
            {done.previousHost ? (
              <p className="text-muted-foreground">
                <span className="break-all font-mono text-[12px]">
                  {done.previousHost}
                </span>{" "}
                still opens the shop. Anyone signed in there stays signed in.
              </p>
            ) : null}
            <p className="text-muted-foreground">
              {done.notified.length > 0
                ? `We sent the new address to the shop owner by ${describeChannels(done.notified)}.`
                : "We could not send a notice, so share the new address with your team yourself."}{" "}
              You will sign in once more the first time you open the new
              address.
            </p>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
              <Button asChild>
                <a href={done.url} target="_blank" rel="noreferrer">
                  Open new address
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </Button>
            </DialogFooter>
          </div>
        ) : loadError ? (
          <p role="alert" className="text-[13px] text-destructive">
            {loadError}
          </p>
        ) : !status ? (
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading your address
          </p>
        ) : !status.available ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Free addresses are not available on this installation.
          </p>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {status.currentHost ? (
              <p className="text-[13px] text-muted-foreground">
                Now{" "}
                <span className="break-all font-mono text-[12px] text-foreground">
                  {status.currentHost}
                </span>
              </p>
            ) : null}
            <label className="space-y-1.5 text-sm">
              <span className="font-medium">New name</span>
              <span className="flex items-stretch">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={status.currentName?.replace(/-/g, "") || "myshop"}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={status.maxLength + (suffix ? suffix.length + 9 : 0)}
                  aria-describedby="change-address-hint"
                  className="min-w-0 flex-1 font-mono"
                />
                <span className="flex shrink-0 items-center border border-l-0 border-[var(--op-rule,rgba(0,0,0,0.14))] px-2 font-mono text-[12px] text-muted-foreground">
                  .{suffix}
                </span>
              </span>
            </label>
            <p
              id="change-address-hint"
              aria-live="polite"
              className={
                check.state === "no"
                  ? "text-[12px] text-destructive"
                  : "text-[12px] text-muted-foreground"
              }
            >
              {check.state === "checking"
                ? "Checking"
                : check.state === "ok"
                  ? `${check.host} is free.`
                  : check.state === "no"
                    ? check.reason
                    : `Letters and numbers, ${status.minLength} to ${status.maxLength} characters.`}
            </p>
            {waiting ? (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {waitText(waiting)}
                {others.length > 0
                  ? " You can still go back to an address you already hold."
                  : ""}
              </p>
            ) : null}
            {others.length > 0 ? (
              <div className="text-[12px] leading-relaxed text-muted-foreground">
                <p>Addresses you already hold. Tap one to go back to it.</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {others.map((host) => (
                    <li key={host}>
                      <button
                        type="button"
                        className="border border-[var(--op-rule,rgba(0,0,0,0.14))] px-1.5 py-0.5 font-mono text-[11px] text-foreground hover:bg-black/5"
                        onClick={() => setName(tidyAddressName(host, suffix))}
                      >
                        {host}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="text-[13px] text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !tidy || check.state !== "ok"}
              >
                {saving ? "Changing" : "Change address"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
