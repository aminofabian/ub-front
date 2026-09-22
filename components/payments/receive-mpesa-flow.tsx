"use client";

import {
  Building2,
  Check,
  Landmark,
  Loader2,
  Search,
  Smartphone,
  Store,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchMpesaCustodyAvailability,
  fetchPosStkPushStatus,
  runCustodyReceiveTest,
  type CustodyReceiveTestRecord,
} from "@/lib/api";
import {
  CUSTOM_BANK_ID,
  KENYA_MPESA_BANKS,
  kenyaBankByBusinessNumber,
  kenyaBankById,
} from "@/lib/kenya-mpesa-banks";
import { toKenyanMsisdn254 } from "@/lib/kenyan-phone";
import { cn } from "@/lib/utils";

export type ReceiveDestinationKind = "till" | "paybill" | "bank";

type Phase =
  | "pick"
  | "details"
  | "sending"
  | "waiting"
  | "confirm"
  | "done"
  | "failed";

export type ReceiveMpesaInitial = {
  kind?: ReceiveDestinationKind;
  tillNumber?: string;
  businessNumber?: string;
  accountNumber?: string;
  bankId?: string;
  customBankName?: string;
  label?: string;
};

type Props = {
  ownerPhone?: string | null;
  countryCode?: string | null;
  /** soft = onboarding cream/teal; sharp = hub / payments theatre */
  appearance?: "soft" | "sharp";
  /**
   * onboarding = skippable first-time; setup = first configure from Business;
   * update = change an existing destination.
   */
  mode?: "onboarding" | "setup" | "update";
  /**
   * Parent already shows title (e.g. FormDrawer). Skip the flow’s own heading
   * so the modal doesn’t repeat itself.
   */
  embedded?: boolean;
  /** Prefill when updating an existing destination */
  initial?: ReceiveMpesaInitial | null;
  showSkip?: boolean;
  skipLabel?: string;
  doneLabel?: string;
  onSkip?: () => void;
  onDone: () => void;
  onCancel?: () => void;
};

const POPULAR_BANK_IDS = ["equity", "kcb", "coop", "ncba", "absa", "dtb"] as const;

const DEST_OPTIONS: {
  kind: ReceiveDestinationKind;
  title: string;
  blurb: string;
  icon: typeof Store;
}[] = [
  {
    kind: "till",
    title: "Buy Goods till",
    blurb: "Lands as soon as they enter PIN",
    icon: Store,
  },
  {
    kind: "paybill",
    title: "Paybill",
    blurb: "Business number + account",
    icon: Building2,
  },
  {
    kind: "bank",
    title: "Bank account",
    blurb: "Equity, KCB, NCBA, and more",
    icon: Landmark,
  },
];

/**
 * Guided Lipa Na M-Pesa receive setup: pick till / paybill / bank,
 * send KES 1 STK, confirm cash arrived. Shared by onboarding + Business hub.
 */
export function ReceiveMpesaFlow({
  ownerPhone = "",
  countryCode,
  appearance = "soft",
  mode: modeProp,
  embedded = false,
  initial,
  showSkip = true,
  skipLabel = "Skip for now",
  doneLabel,
  onSkip,
  onDone,
  onCancel,
}: Props) {
  const mode =
    modeProp ??
    (initial?.kind ? "update" : showSkip ? "onboarding" : "setup");
  const soft = appearance === "soft";
  const isUpdate = mode === "update";
  const [phase, setPhase] = useState<Phase>(() =>
    initial?.kind ? "details" : "pick",
  );
  const [kind, setKind] = useState<ReceiveDestinationKind | null>(
    initial?.kind ?? null,
  );
  const [tillNumber, setTillNumber] = useState(initial?.tillNumber ?? "");
  const [businessNumber, setBusinessNumber] = useState(
    initial?.businessNumber ?? "",
  );
  const [accountNumber, setAccountNumber] = useState(
    initial?.accountNumber ?? "",
  );
  const [bankId, setBankId] = useState(initial?.bankId ?? "");
  const [customBankName, setCustomBankName] = useState(
    initial?.customBankName ?? "",
  );
  const [bankQuery, setBankQuery] = useState("");
  const [phone, setPhone] = useState(ownerPhone ?? "");
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState<{
    available: boolean;
    message: string | null;
  } | null>(null);
  const [testResult, setTestResult] = useState<CustodyReceiveTestRecord | null>(
    null,
  );
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setPhone(ownerPhone ?? "");
  }, [ownerPhone]);

  useEffect(() => {
    let cancelled = false;
    void fetchMpesaCustodyAvailability()
      .then((r) => {
        if (!cancelled) {
          setAvailability({ available: r.available, message: r.message });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailability({
            available: false,
            message: "Could not check M-Pesa receive. You can skip for now.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const filteredBanks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    if (!q) return KENYA_MPESA_BANKS;
    return KENYA_MPESA_BANKS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.businessNumber.includes(q.replace(/\D/g, "")),
    );
  }, [bankQuery]);

  const previewLine = useMemo(() => {
    if (kind === "till" && tillNumber.replace(/\D/g, "").length >= 5) {
      return `Buy Goods · Till ${tillNumber.replace(/\D/g, "")}`;
    }
    if (kind === "paybill" && businessNumber.replace(/\D/g, "")) {
      const acct = accountNumber.trim();
      return acct
        ? `Paybill ${businessNumber.replace(/\D/g, "")} · Acc ${acct}`
        : `Paybill ${businessNumber.replace(/\D/g, "")}`;
    }
    if (kind === "bank") {
      if (bankId === CUSTOM_BANK_ID && customBankName.trim()) {
        return `${customBankName.trim()} · Acc ${accountNumber.trim() || "…"}`;
      }
      const bank = kenyaBankById(bankId);
      if (bank) {
        return `${bank.name} · Acc ${accountNumber.trim() || "…"}`;
      }
    }
    return null;
  }, [
    kind,
    tillNumber,
    businessNumber,
    accountNumber,
    bankId,
    customBankName,
  ]);

  const savedLine = useMemo(() => {
    if (!initial?.kind) return null;
    if (initial.kind === "till" && initial.tillNumber) {
      return `Buy Goods · Till ${initial.tillNumber.replace(/\D/g, "")}`;
    }
    if (initial.kind === "paybill" && initial.businessNumber) {
      const acct = (initial.accountNumber ?? "").trim();
      return acct
        ? `Paybill ${initial.businessNumber} · Acc ${acct}`
        : `Paybill ${initial.businessNumber}`;
    }
    if (initial.kind === "bank") {
      if (initial.bankId === CUSTOM_BANK_ID && initial.customBankName) {
        return `${initial.customBankName} · Acc ${initial.accountNumber ?? "…"}`;
      }
      const bank = kenyaBankById(initial.bankId);
      if (bank) {
        return `${bank.name} · Acc ${initial.accountNumber ?? "…"}`;
      }
      if (initial.label) return initial.label;
    }
    return initial.label ?? null;
  }, [initial]);

  const selectKind = (next: ReceiveDestinationKind) => {
    setKind(next);
    setError("");
    setPhase("details");
    if (next === "bank" && !bankId) {
      setBusinessNumber("");
    }
  };

  const destinationReady = (): boolean => {
    if (kind === "till") {
      return /^\d{5,7}$/.test(tillNumber.replace(/\D/g, ""));
    }
    if (kind === "paybill") {
      return (
        /^\d{5,7}$/.test(businessNumber.replace(/\D/g, "")) &&
        accountNumber.trim().length > 0
      );
    }
    if (kind === "bank") {
      const accountOk = accountNumber.trim().length > 0;
      if (bankId === CUSTOM_BANK_ID) {
        return (
          customBankName.trim().length > 0 &&
          /^\d{5,7}$/.test(businessNumber.replace(/\D/g, "")) &&
          accountOk
        );
      }
      return !!kenyaBankById(bankId) && accountOk;
    }
    return false;
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = useCallback((checkoutRequestId: string) => {
    stopPolling();
    const started = Date.now();
    pollRef.current = setInterval(() => {
      void (async () => {
        try {
          const status = await fetchPosStkPushStatus(checkoutRequestId);
          if (status.success) {
            stopPolling();
            setPhase("confirm");
            return;
          }
          if (status.failed) {
            stopPolling();
            setError(
              status.failureReason ||
                "Payment did not go through. Try again or finish later.",
            );
            setPhase("failed");
            return;
          }
          if (Date.now() - started > 120_000) {
            stopPolling();
            setError(
              "Still waiting on M-Pesa. Check your phone, or finish later from Business → Where M-Pesa lands.",
            );
            setPhase("failed");
          }
        } catch {
          // keep polling through transient errors
        }
      })();
    }, 2_500);
  }, []);

  const sendTest = async () => {
    setError("");
    if (!destinationReady()) {
      setError("Fill in the details above first.");
      return;
    }
    const msisdn =
      countryCode?.toUpperCase() === "KE"
        ? toKenyanMsisdn254(phone) ?? phone.trim()
        : phone.trim();
    if (!msisdn) {
      setError("Enter the Safaricom number that should get the PIN prompt.");
      return;
    }

    const bank = kenyaBankById(bankId);
    const isCustomBank = kind === "bank" && bankId === CUSTOM_BANK_ID;
    const type = kind === "till" ? "till" : "paybill";
    const resolvedBusiness =
      kind === "till"
        ? undefined
        : kind === "bank"
          ? isCustomBank
            ? businessNumber.replace(/\D/g, "")
            : bank!.businessNumber
          : businessNumber.replace(/\D/g, "");
    const label =
      kind === "bank"
        ? isCustomBank
          ? `${customBankName.trim()} ${accountNumber.trim()}`
          : bank
            ? `${bank.name} ${accountNumber.trim()}`
            : undefined
        : initial?.label;

    setPhase("sending");
    try {
      const result = await runCustodyReceiveTest({
        type: type as "till" | "paybill",
        tillNumber: kind === "till" ? tillNumber.replace(/\D/g, "") : undefined,
        businessNumber: resolvedBusiness,
        accountNumber: kind === "till" ? undefined : accountNumber.trim(),
        label,
        phoneNumber: msisdn,
        amount: 1,
      });
      setTestResult(result);
      if (!result.accepted || !result.checkoutRequestId) {
        setError(result.message || "Could not send the prompt.");
        setPhase("failed");
        return;
      }
      setPhase("waiting");
      startPolling(result.checkoutRequestId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the prompt.");
      setPhase("failed");
    }
  };

  const shell = soft
    ? "rounded-2xl sm:rounded-xl"
    : "rounded-none";
  const ctaPrimary = soft
    ? "h-12 rounded-2xl bg-[#0D9488] text-sm font-semibold text-white shadow-[0_8px_24px_-12px_rgba(13,148,136,0.7)] transition-[transform,background-color] duration-150 hover:bg-[#0F766E] active:scale-[0.98] sm:rounded-xl"
    : "h-11 rounded-none bg-[var(--pos-primary,#0f766e)] text-sm font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-[#0d6b63] active:scale-[0.99]";
  const ctaGhost = soft
    ? "h-11 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#1F2937]"
    : "h-10 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";
  const cardIdle = soft
    ? "border-[#E5E7EB] bg-white hover:border-[#0D9488]/50"
    : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white hover:border-[var(--pos-primary,#0f766e)]";
  const cardSelected = soft
    ? "border-[#0D9488] bg-[#F0FDFA] ring-2 ring-[#0D9488]/25"
    : "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] ring-1 ring-[var(--pos-primary,#0f766e)]";
  const wash = soft
    ? "border-[#99F6E4] bg-[#F0FDFA]"
    : "border-[color-mix(in_srgb,var(--pos-primary,#0f766e)_28%,transparent)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_7%,#f3eee6)]";
  const inputClass = soft
    ? "h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm tabular-nums text-[#1F2937] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 sm:rounded-xl"
    : "h-10 w-full rounded-none border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white px-3 text-sm tabular-nums outline-none focus:border-[var(--pos-primary,#0f766e)] focus:ring-1 focus:ring-[var(--pos-primary,#0f766e)]";
  const labelClass = soft
    ? "mb-1.5 block text-xs font-medium text-[#6B7280]"
    : "mb-1.5 block text-[11px] font-semibold tracking-[-0.02em] text-muted-foreground";
  const titleClass = soft
    ? "text-[1.35rem] font-semibold tracking-[-0.03em] text-[#1F2937] sm:text-2xl"
    : "text-[1.15rem] font-semibold tracking-[-0.025em] text-[var(--order-ink,#15231f)]";
  const descClass = soft
    ? "text-sm leading-relaxed text-[#6B7280]"
    : "text-[13px] leading-relaxed text-muted-foreground";

  if (availability && !availability.available) {
    return (
      <div className="flex flex-col gap-5">
        <header className="space-y-2">
          <h2 className={titleClass}>Where should M-Pesa land?</h2>
          <p className={descClass}>
            We’ll turn this on for you shortly. You can add a till later from
            Business or Payments.
          </p>
        </header>
        <p
          className={cn(
            "border px-4 py-3 text-sm text-[#92400E]",
            shell,
            soft
              ? "border-[#FDE68A] bg-[#FFFBEB]"
              : "border-[#FDE68A] bg-[#FFFBEB]",
          )}
        >
          {availability.message ||
            "Kiosk-powered till/paybill is not available yet."}
        </p>
        {(onSkip || onCancel) && (
          <button
            type="button"
            onClick={onSkip ?? onCancel}
            className={ctaPrimary}
          >
            Continue without it
          </button>
        )}
      </div>
    );
  }

  const intro =
    phase === "waiting" || phase === "sending"
      ? {
          title: "Check your phone",
          description:
            "Unlock the Safaricom prompt and enter your M-Pesa PIN.",
        }
      : phase === "confirm"
        ? {
            title: "Did the shilling land?",
            description: `Confirm KES 1 on ${testResult?.destinationSummary ?? "your destination"}.`,
          }
        : phase === "done"
          ? {
              title: "You’re set to receive M-Pesa",
              description:
                "Cashiers and your online shop will send payments here.",
            }
          : mode === "update"
            ? {
                title: "Change where money lands",
                description: "Pick a type, enter details, then prove with KES 1.",
              }
            : mode === "setup"
              ? {
                  title: "Where should customer M-Pesa land?",
                  description: "Pick a type, enter details, then prove with KES 1.",
                }
              : {
                  title: "Where should customer M-Pesa land?",
                  description:
                    "Optional. Set a till, paybill, or bank — or skip for now.",
                };

  const showFlowHeader =
    !embedded ||
    phase === "waiting" ||
    phase === "sending" ||
    phase === "confirm" ||
    phase === "done";

  return (
    <div className="flex flex-col gap-4">
      {showFlowHeader ? (
        <header className="space-y-1.5">
          <h2 className={titleClass}>{intro.title}</h2>
          <p className={descClass}>{intro.description}</p>
        </header>
      ) : null}

      {phase === "pick" || phase === "details" || phase === "failed" ? (
        <>
          {isUpdate && savedLine ? (
            <p
              className={cn(
                "text-[13px]",
                soft ? "text-[#6B7280]" : "text-muted-foreground",
              )}
            >
              Now:{" "}
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  soft ? "text-[#134E4A]" : "text-foreground",
                )}
              >
                {savedLine}
              </span>
            </p>
          ) : null}

          <div
            className="grid gap-2"
            role="radiogroup"
            aria-label="How you receive M-Pesa"
          >
            {DEST_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = kind === opt.kind;
              return (
                <button
                  key={opt.kind}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectKind(opt.kind)}
                  className={cn(
                    "flex items-center gap-3 border px-3.5 py-3 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.99]",
                    shell,
                    selected ? cardSelected : cardIdle,
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center border-2",
                      soft ? "rounded-full" : "rounded-none",
                      selected
                        ? soft
                          ? "border-[#0D9488] bg-[#0D9488]"
                          : "border-[var(--pos-primary,#0f766e)] bg-[var(--pos-primary,#0f766e)]"
                        : soft
                          ? "border-[#D1D5DB] bg-white"
                          : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_28%,transparent)] bg-white",
                    )}
                    aria-hidden
                  >
                    {selected ? (
                      <span
                        className={cn(
                          "size-1.5 bg-white",
                          soft ? "rounded-full" : "rounded-none",
                        )}
                      />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center",
                      soft ? "rounded-xl" : "rounded-none",
                      selected
                        ? soft
                          ? "bg-[#0D9488] text-white"
                          : "bg-[var(--pos-primary,#0f766e)] text-white"
                        : soft
                          ? "bg-[#F3F4F6] text-[#6B7280]"
                          : "bg-[color-mix(in_srgb,var(--order-ink,#15231f)_5%,#f3eee6)] text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-sm font-semibold",
                        soft ? "text-[#1F2937]" : "text-foreground",
                      )}
                    >
                      {opt.title}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-xs",
                        soft ? "text-[#6B7280]" : "text-muted-foreground",
                      )}
                    >
                      {opt.blurb}
                    </span>
                  </span>
                  {selected ? (
                    <Check
                      className={cn(
                        "size-4 shrink-0",
                        soft
                          ? "text-[#0D9488]"
                          : "text-[var(--pos-primary,#0f766e)]",
                      )}
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {kind && (phase === "details" || phase === "failed") ? (
            <div className="space-y-3">
              {kind === "till" ? (
                <Field
                  label="Till number"
                  value={tillNumber}
                  onChange={(v) => setTillNumber(v.replace(/[^\d]/g, ""))}
                  placeholder="e.g. 556677"
                  inputMode="numeric"
                  inputClass={inputClass}
                  labelClass={labelClass}
                />
              ) : null}

              {kind === "paybill" ? (
                <>
                  <Field
                    label="Paybill number"
                    value={businessNumber}
                    onChange={(v) => setBusinessNumber(v.replace(/[^\d]/g, ""))}
                    placeholder="e.g. 123456"
                    inputMode="numeric"
                    inputClass={inputClass}
                    labelClass={labelClass}
                  />
                  <Field
                    label="Account number"
                    value={accountNumber}
                    onChange={setAccountNumber}
                    placeholder="What customers type as Account"
                    inputClass={inputClass}
                    labelClass={labelClass}
                  />
                </>
              ) : null}

              {kind === "bank" ? (
                <BankPicker
                  bankId={bankId}
                  bankQuery={bankQuery}
                  customBankName={customBankName}
                  businessNumber={businessNumber}
                  accountNumber={accountNumber}
                  filteredBanks={filteredBanks}
                  soft={soft}
                  shell={shell}
                  inputClass={inputClass}
                  labelClass={labelClass}
                  onQuery={setBankQuery}
                  onPickBank={(id) => {
                    setBankId(id);
                    if (id === CUSTOM_BANK_ID) {
                      setBusinessNumber("");
                      return;
                    }
                    const b = kenyaBankById(id);
                    if (b) {
                      setBusinessNumber(b.businessNumber);
                      setCustomBankName("");
                    }
                  }}
                  onCustomName={setCustomBankName}
                  onBusinessNumber={(v) =>
                    setBusinessNumber(v.replace(/[^\d]/g, ""))
                  }
                  onAccount={setAccountNumber}
                />
              ) : null}

              <Field
                label="Phone for KES 1 proof"
                value={phone}
                onChange={setPhone}
                placeholder="07XX XXX XXX"
                inputMode="tel"
                inputClass={inputClass}
                labelClass={labelClass}
                hint="Safaricom line — we’ll ping it after you save."
              />

              {previewLine ? (
                <p
                  className={cn(
                    "border px-3 py-2 text-[13px] font-semibold tabular-nums",
                    shell,
                    wash,
                    soft ? "text-[#134E4A]" : "text-foreground",
                  )}
                >
                  Customers will see: {previewLine}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {phase === "sending" || phase === "waiting" ? (
        <div
          className={cn(
            "flex flex-col items-center gap-4 border px-5 py-8 text-center",
            shell,
            wash,
          )}
        >
          <span
            className={cn(
              "relative flex size-16 items-center justify-center bg-white shadow-sm",
              soft ? "rounded-full" : "rounded-none",
            )}
          >
            <Smartphone
              className={cn(
                "size-7",
                soft ? "text-[#0D9488]" : "text-[var(--pos-primary,#0f766e)]",
              )}
              aria-hidden
            />
            <Loader2
              className={cn(
                "absolute -right-1 -top-1 size-5 animate-spin",
                soft ? "text-[#0D9488]" : "text-[var(--pos-primary,#0f766e)]",
              )}
              aria-hidden
            />
          </span>
          <div>
            <p
              className={cn(
                "text-base font-semibold",
                soft ? "text-[#134E4A]" : "text-foreground",
              )}
            >
              {phase === "sending"
                ? "Sending the prompt…"
                : "Waiting for your PIN…"}
            </p>
            <p
              className={cn(
                "mt-1 text-sm",
                soft ? "text-[#0F766E]" : "text-muted-foreground",
              )}
            >
              {testResult?.destinationSummary
                ? testResult.destinationSummary
                : "KES 1 · M-Pesa Express"}
            </p>
          </div>
        </div>
      ) : null}

      {phase === "confirm" ? (
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => {
              setPhase("done");
              onDone();
            }}
            className={cn(ctaPrimary, "flex items-center justify-center gap-2")}
          >
            <Check className="size-4" aria-hidden />
            Yes — money arrived
          </button>
          <button
            type="button"
            onClick={() => {
              setError(
                "Details are saved, but the credit didn’t show. Try a Buy Goods till, or edit again from Business.",
              );
              setPhase("failed");
            }}
            className={cn(
              "h-12 border text-sm font-semibold transition-colors",
              shell,
              soft
                ? "border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
                : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white text-foreground hover:bg-muted/40",
            )}
          >
            No — I don’t see it
          </button>
        </div>
      ) : null}

      {phase === "done" ? (
        <div
          className={cn(
            "flex flex-col items-center gap-3 border px-5 py-6 text-center",
            shell,
            wash,
          )}
        >
          <span
            className={cn(
              "flex size-12 items-center justify-center text-white",
              soft
                ? "rounded-full bg-[#0D9488]"
                : "rounded-none bg-[var(--pos-primary,#0f766e)]",
            )}
          >
            <Check className="size-6" aria-hidden />
          </span>
          <p
            className={cn(
              "text-sm font-semibold",
              soft ? "text-[#134E4A]" : "text-foreground",
            )}
          >
            {testResult?.destinationSummary ?? "M-Pesa destination"} is ready
          </p>
          {doneLabel ? (
            <button type="button" onClick={onDone} className={ctaPrimary}>
              {doneLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className={cn(
            "border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700",
            shell,
          )}
        >
          {error}
        </p>
      ) : null}

      {phase === "pick" || phase === "details" || phase === "failed" ? (
        <div className="flex flex-col gap-2">
          {kind && destinationReady() ? (
            <button
              type="button"
              onClick={() => void sendTest()}
              className={ctaPrimary}
            >
              Save & send KES 1
            </button>
          ) : kind ? (
            <p
              className={cn(
                "text-center text-xs",
                soft ? "text-[#9CA3AF]" : "text-muted-foreground",
              )}
            >
              Fill in the fields above to continue
            </p>
          ) : null}
          {showSkip && onSkip ? (
            <button type="button" onClick={onSkip} className={ctaGhost}>
              {skipLabel}
            </button>
          ) : null}
          {onCancel && !onSkip ? (
            <button type="button" onClick={onCancel} className={ctaGhost}>
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}

      {phase === "waiting" || phase === "sending" ? (
        showSkip && onSkip ? (
          <button
            type="button"
            onClick={() => {
              stopPolling();
              onSkip();
            }}
            className={ctaGhost}
          >
            Skip — I’ll finish later
          </button>
        ) : onCancel ? (
          <button
            type="button"
            onClick={() => {
              stopPolling();
              onCancel();
            }}
            className={ctaGhost}
          >
            Close
          </button>
        ) : null
      ) : null}
    </div>
  );
}

function BankPicker({
  bankId,
  bankQuery,
  customBankName,
  businessNumber,
  accountNumber,
  filteredBanks,
  soft,
  shell,
  inputClass,
  labelClass,
  onQuery,
  onPickBank,
  onCustomName,
  onBusinessNumber,
  onAccount,
}: {
  bankId: string;
  bankQuery: string;
  customBankName: string;
  businessNumber: string;
  accountNumber: string;
  filteredBanks: typeof KENYA_MPESA_BANKS;
  soft: boolean;
  shell: string;
  inputClass: string;
  labelClass: string;
  onQuery: (v: string) => void;
  onPickBank: (id: string) => void;
  onCustomName: (v: string) => void;
  onBusinessNumber: (v: string) => void;
  onAccount: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className={labelClass}>Find your bank</span>
        <span className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={bankQuery}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search Equity, KCB, NCBA…"
            className={cn(inputClass, "pl-9")}
          />
        </span>
      </label>

      {!bankQuery.trim() ? (
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_BANK_IDS.map((id) => {
            const b = kenyaBankById(id);
            if (!b) return null;
            const selected = bankId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onPickBank(id)}
                className={cn(
                  "border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                  shell,
                  selected
                    ? soft
                      ? "border-[#0D9488] bg-[#F0FDFA] text-[#0F766E]"
                      : "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)] text-[var(--pos-primary,#0f766e)]"
                    : soft
                      ? "border-[#E5E7EB] bg-white text-[#374151] hover:border-[#0D9488]/40"
                      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white hover:border-[var(--pos-primary,#0f766e)]",
                )}
              >
                {b.name.replace(/ Bank.*$/, "").replace(/ \(.*\)/, "")}
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        className={cn(
          "max-h-40 overflow-y-auto border",
          shell,
          soft
            ? "border-[#E5E7EB]"
            : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
        )}
      >
        {filteredBanks.map((b) => {
          const selected = bankId === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onPickBank(b.id)}
              className={cn(
                "flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0",
                soft
                  ? "border-[#F3F4F6]"
                  : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)]",
                selected
                  ? soft
                    ? "bg-[#F0FDFA] font-semibold text-[#134E4A]"
                    : "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] font-semibold"
                  : "hover:bg-muted/30",
              )}
            >
              <span className="truncate">{b.name}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                {b.businessNumber}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onPickBank(CUSTOM_BANK_ID)}
          className={cn(
            "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
            bankId === CUSTOM_BANK_ID
              ? soft
                ? "bg-[#F0FDFA] font-semibold text-[#134E4A]"
                : "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_8%,white)] font-semibold"
              : "hover:bg-muted/30",
          )}
        >
          <span>Other bank — enter paybill yourself</span>
        </button>
      </div>

      {bankId && bankId !== CUSTOM_BANK_ID ? (
        <p className="text-[11px] text-muted-foreground">
          Paybill {kenyaBankById(bankId)?.businessNumber} — enter your bank
          account number.
        </p>
      ) : null}

      {bankId === CUSTOM_BANK_ID ? (
        <>
          <Field
            label="Bank name"
            value={customBankName}
            onChange={onCustomName}
            placeholder="e.g. My Bank"
            inputClass={inputClass}
            labelClass={labelClass}
          />
          <Field
            label="Bank M-Pesa paybill"
            value={businessNumber}
            onChange={onBusinessNumber}
            placeholder="5–7 digit paybill"
            inputMode="numeric"
            inputClass={inputClass}
            labelClass={labelClass}
            hint="From your bank’s Lipa Na M-Pesa instructions."
          />
        </>
      ) : null}

      <Field
        label="Bank account number"
        value={accountNumber}
        onChange={onAccount}
        placeholder="Your account number"
        inputMode="numeric"
        inputClass={inputClass}
        labelClass={labelClass}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  hint,
  inputClass,
  labelClass,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel";
  hint?: string;
  inputClass: string;
  labelClass: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
      {hint ? (
        <span className="mt-1.5 block text-[11px] text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/** Build flow initial state from a saved CUSTODY_MPESA displayInstructionsJson. */
export function receiveInitialFromCustodyJson(
  json: string | null | undefined,
  label?: string | null,
): ReceiveMpesaInitial | null {
  if (!json) return null;
  try {
    const o = JSON.parse(json) as Record<string, string>;
    const type = o.type === "paybill" ? "paybill" : "till";
    if (type === "till") {
      return {
        kind: "till",
        tillNumber: o.tillNumber ?? "",
        label: label ?? o.label,
      };
    }
    const businessNumber = o.businessNumber ?? "";
    const bank = kenyaBankByBusinessNumber(businessNumber);
    if (bank) {
      return {
        kind: "bank",
        bankId: bank.id,
        businessNumber: bank.businessNumber,
        accountNumber: o.accountNumber ?? "",
        label: label ?? o.label,
      };
    }
    // Heuristic: long account + known-looking paybill → treat as custom bank
    if ((o.accountNumber ?? "").length >= 6) {
      return {
        kind: "bank",
        bankId: CUSTOM_BANK_ID,
        customBankName: (label ?? o.label ?? "").replace(/\s+\S+$/, "") || "Bank",
        businessNumber,
        accountNumber: o.accountNumber ?? "",
        label: label ?? o.label,
      };
    }
    return {
      kind: "paybill",
      businessNumber,
      accountNumber: o.accountNumber ?? "",
      label: label ?? o.label,
    };
  } catch {
    return null;
  }
}
