"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Phone } from "lucide-react";

import { SmsCreditsDepletedBanner } from "@/components/messaging/sms-credits-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchOpsAlertSettings,
  sendOpsAlertPhoneVerification,
  verifyOpsAlertPhone,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type SetupProgressPhoneModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after successful verification so setup progress can refetch. */
  onVerified?: () => void;
};

export function SetupProgressPhoneModal({
  open,
  onOpenChange,
  onVerified,
}: SetupProgressPhoneModalProps) {
  const [phoneInput, setPhoneInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await fetchOpsAlertSettings();
      if (settings.phoneVerified) {
        onOpenChange(false);
        onVerified?.();
        return;
      }
      if (settings.phone) {
        setPhoneInput(settings.phone);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load phone settings");
    } finally {
      setLoading(false);
    }
  }, [onOpenChange, onVerified]);

  useEffect(() => {
    if (!open) {
      setCodeInput("");
      setCodeSent(false);
      setError(null);
      setHint(null);
      return;
    }
    void hydrate();
  }, [open, hydrate]);

  async function handleSendCode() {
    if (!phoneInput.trim()) return;
    setSendingCode(true);
    setError(null);
    setHint(null);
    try {
      const result = await sendOpsAlertPhoneVerification(phoneInput.trim());
      setPhoneInput(result.phone);
      setCodeSent(true);
      setCodeInput("");
      setHint(`Code sent via ${result.channel} to ${result.phoneMasked}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerify() {
    if (!phoneInput.trim() || codeInput.trim().length !== 4) return;
    setVerifying(true);
    setError(null);
    try {
      await verifyOpsAlertPhone(phoneInput.trim(), codeInput.trim());
      onOpenChange(false);
      onVerified?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="border-b border-[#E6E1D8] bg-[#FCFAF6] px-5 pb-4 pt-5 sm:px-6">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="mb-1 flex size-9 items-center justify-center bg-[#141414] text-[#F5E6C8]">
              <Phone className="size-4" aria-hidden />
            </div>
            <DialogTitle className="text-lg tracking-tight text-[#141414]">
              Add your shop phone
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-[#666666]">
              This number receives sale alerts, low-stock warnings, and login
              codes. We&apos;ll send a short code to confirm it&apos;s yours.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <SmsCreditsDepletedBanner className="rounded-none" />

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#888888]">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="setup-phone-input"
                  className="text-xs font-medium text-[#141414]"
                >
                  Phone number
                </label>
                <input
                  id="setup-phone-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="07XX XXX XXX"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  disabled={sendingCode || verifying}
                  className={cn(
                    "h-10 w-full border border-[#E6E1D8] bg-white px-3 text-sm text-[#141414]",
                    "placeholder:text-[#AAAAAA]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/35",
                    "disabled:opacity-60",
                  )}
                />
              </div>

              {codeSent ? (
                <div className="space-y-1.5">
                  <label
                    htmlFor="setup-phone-code"
                    className="text-xs font-medium text-[#141414]"
                  >
                    4-digit code
                  </label>
                  <input
                    id="setup-phone-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    placeholder="••••"
                    value={codeInput}
                    onChange={(e) =>
                      setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    disabled={verifying}
                    className={cn(
                      "h-10 w-full border border-[#E6E1D8] bg-white px-3 text-sm tracking-[0.3em] text-[#141414]",
                      "placeholder:tracking-normal placeholder:text-[#AAAAAA]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08D48]/35",
                      "disabled:opacity-60",
                    )}
                  />
                </div>
              ) : null}

              {hint ? (
                <p className="text-xs text-[#0D9488]" role="status">
                  {hint}
                </p>
              ) : null}
              {error ? (
                <p className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  onClick={() => onOpenChange(false)}
                  disabled={sendingCode || verifying}
                >
                  Cancel
                </Button>
                {!codeSent ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 bg-[#141414] text-[#F5E6C8] hover:bg-[#2A2A2A]"
                    disabled={sendingCode || !phoneInput.trim()}
                    onClick={() => void handleSendCode()}
                  >
                    {sendingCode ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : null}
                    <span className={sendingCode ? "ml-1.5" : ""}>
                      Send code
                    </span>
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 text-[#8A6B2E]"
                      disabled={sendingCode || verifying}
                      onClick={() => void handleSendCode()}
                    >
                      Resend
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 bg-[#141414] text-[#F5E6C8] hover:bg-[#2A2A2A]"
                      disabled={verifying || codeInput.length !== 4}
                      onClick={() => void handleVerify()}
                    >
                      {verifying ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : null}
                      <span className={verifying ? "ml-1.5" : ""}>Verify</span>
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
