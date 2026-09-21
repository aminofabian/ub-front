"use client";

import {
  Building2,
  Check,
  Landmark,
  Loader2,
  Smartphone,
  Store,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchMpesaCustodyAvailability,
  fetchPosStkPushStatus,
  runCustodyReceiveTest,
  type CustodyReceiveTestRecord,
} from "@/lib/api";
import {
  CUSTOM_BANK_ID,
  KENYA_MPESA_BANKS,
  kenyaBankById,
} from "@/lib/kenya-mpesa-banks";
import { toKenyanMsisdn254 } from "@/lib/kenyan-phone";
import { cn } from "@/lib/utils";

export type ReceiveDestinationKind = "till" | "paybill" | "bank";

type Phase = "pick" | "details" | "sending" | "waiting" | "confirm" | "done" | "failed";

type Props = {
  ownerPhone: string;
  countryCode?: string | null;
  onSkip: () => void;
  onDone: () => void;
};

const DEST_OPTIONS: {
  kind: ReceiveDestinationKind;
  title: string;
  blurb: string;
  icon: typeof Store;
}[] = [
  {
    kind: "till",
    title: "Buy Goods till",
    blurb: "Your till number — money lands when the customer enters PIN",
    icon: Store,
  },
  {
    kind: "paybill",
    title: "Paybill",
    blurb: "Business number + account number",
    icon: Building2,
  },
  {
    kind: "bank",
    title: "Bank account",
    blurb: "Pick a bank or type your own paybill + account number",
    icon: Landmark,
  },
];

/**
 * Optional onboarding step: enter till / paybill / bank, send KES 1 STK,
 * confirm cash arrived. Matches questionnaire cream/teal language.
 */
export function OnboardingReceiveMpesaStep({
  ownerPhone,
  countryCode,
  onSkip,
  onDone,
}: Props) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [kind, setKind] = useState<ReceiveDestinationKind | null>(null);
  const [tillNumber, setTillNumber] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankId, setBankId] = useState("");
  const [customBankName, setCustomBankName] = useState("");
  const [phone, setPhone] = useState(ownerPhone);
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
    setPhone(ownerPhone);
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

  const selectKind = (next: ReceiveDestinationKind) => {
    setKind(next);
    setError("");
    setPhase("details");
    if (next === "bank") {
      setBusinessNumber("");
      setBankId("");
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
      const bank = kenyaBankById(bankId);
      return !!bank && accountOk;
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
                "Payment did not go through. Try again or skip for now.",
            );
            setPhase("failed");
            return;
          }
          if (Date.now() - started > 120_000) {
            stopPolling();
            setError(
              "Still waiting on M-Pesa. Check your phone, or skip and set this up later in Payments.",
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
        : undefined;
    const payload = {
      type: type as "till" | "paybill",
      tillNumber: kind === "till" ? tillNumber.replace(/\D/g, "") : undefined,
      businessNumber: resolvedBusiness,
      accountNumber: kind === "till" ? undefined : accountNumber.trim(),
      label,
      phoneNumber: msisdn,
      amount: 1,
    };

    setPhase("sending");
    try {
      const result = await runCustodyReceiveTest(payload);
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

  if (availability && !availability.available) {
    return (
      <div className="flex flex-col gap-5">
        <StepIntro
          title="Where should M-Pesa land?"
          description="We’ll turn this on for you shortly. You can skip and add a till later from Payments."
        />
        <p className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
          {availability.message ||
            "Kiosk-powered till/paybill is not available yet."}
        </p>
        <button
          type="button"
          onClick={onSkip}
          className="h-12 rounded-2xl bg-[#0D9488] text-sm font-semibold text-white shadow-[0_8px_24px_-12px_rgba(13,148,136,0.7)] hover:bg-[#0F766E] sm:rounded-xl"
        >
          Continue without it
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <StepIntro
        title={
          phase === "waiting" || phase === "sending"
            ? "Check your phone"
            : phase === "confirm"
              ? "Did the shilling land?"
              : phase === "done"
                ? "You’re set to receive M-Pesa"
                : "Where should customer M-Pesa land?"
        }
        description={
          phase === "waiting" || phase === "sending"
            ? "Enter your M-Pesa PIN on the prompt. We’re watching for the payment."
            : phase === "confirm"
              ? `We saw a successful PIN for ${testResult?.destinationSummary ?? "your destination"}. Confirm it shows on your till, paybill, or bank.`
              : phase === "done"
                ? "Cashiers and your online shop can take M-Pesa to this destination. No API keys needed."
                : "Optional — enter a till, paybill, or bank account. We’ll send KES 1 to prove it works. Skip anytime."
        }
      />

      {phase === "pick" || phase === "details" || phase === "failed" ? (
        <>
          <div className="grid gap-2">
            {DEST_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = kind === opt.kind;
              return (
                <button
                  key={opt.kind}
                  type="button"
                  onClick={() => selectKind(opt.kind)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors sm:rounded-xl",
                    selected
                      ? "border-[#0D9488] bg-[#F0FDFA] ring-2 ring-[#0D9488]/25"
                      : "border-[#E5E7EB] bg-white hover:border-[#0D9488]/50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                      selected
                        ? "bg-[#0D9488] text-white"
                        : "bg-[#F3F4F6] text-[#6B7280]",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#1F2937]">
                      {opt.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#6B7280]">
                      {opt.blurb}
                    </span>
                  </span>
                  {selected ? (
                    <Check className="mt-1 size-4 shrink-0 text-[#0D9488]" />
                  ) : null}
                </button>
              );
            })}
          </div>

          {kind && (phase === "details" || phase === "failed") ? (
            <div className="space-y-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:rounded-xl">
              {kind === "till" ? (
                <Field
                  label="Till number"
                  value={tillNumber}
                  onChange={setTillNumber}
                  placeholder="e.g. 556677"
                  inputMode="numeric"
                />
              ) : null}
              {kind === "paybill" ? (
                <>
                  <Field
                    label="Paybill business number"
                    value={businessNumber}
                    onChange={setBusinessNumber}
                    placeholder="e.g. 123456"
                    inputMode="numeric"
                  />
                  <Field
                    label="Account number"
                    value={accountNumber}
                    onChange={setAccountNumber}
                    placeholder="Account shown to customers"
                  />
                </>
              ) : null}
              {kind === "bank" ? (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-[#6B7280]">
                      Bank
                    </span>
                    <select
                      value={bankId}
                      onChange={(e) => {
                        const next = e.target.value;
                        setBankId(next);
                        if (next === CUSTOM_BANK_ID) {
                          setBusinessNumber("");
                          return;
                        }
                        const b = kenyaBankById(next);
                        if (b) {
                          setBusinessNumber(b.businessNumber);
                          setCustomBankName("");
                        }
                      }}
                      className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm text-[#1F2937] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 sm:rounded-xl"
                    >
                      <option value="">Choose bank…</option>
                      {KENYA_MPESA_BANKS.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} · {b.businessNumber}
                        </option>
                      ))}
                      <option value={CUSTOM_BANK_ID}>
                        Other bank — enter paybill yourself
                      </option>
                    </select>
                  </label>
                  {bankId && bankId !== CUSTOM_BANK_ID ? (
                    <p className="text-[11px] text-[#9CA3AF]">
                      Paybill {kenyaBankById(bankId)?.businessNumber} — enter
                      the account number your bank gave you for M-Pesa.
                    </p>
                  ) : null}
                  {bankId === CUSTOM_BANK_ID ? (
                    <>
                      <Field
                        label="Bank name"
                        value={customBankName}
                        onChange={setCustomBankName}
                        placeholder="e.g. My Bank"
                      />
                      <Field
                        label="Bank M-Pesa paybill"
                        value={businessNumber}
                        onChange={setBusinessNumber}
                        placeholder="5–7 digit paybill"
                        inputMode="numeric"
                        hint="The paybill number on your bank’s Lipa Na M-Pesa instructions."
                      />
                    </>
                  ) : null}
                  <Field
                    label="Bank account number"
                    value={accountNumber}
                    onChange={setAccountNumber}
                    placeholder="Your account number"
                    inputMode="numeric"
                  />
                </>
              ) : null}

              <Field
                label="Phone for the test prompt"
                value={phone}
                onChange={setPhone}
                placeholder="07XX XXX XXX"
                inputMode="tel"
                hint="We’ll send KES 1 here. Use a Safaricom line you can unlock now."
              />
            </div>
          ) : null}
        </>
      ) : null}

      {phase === "sending" || phase === "waiting" ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-[#99F6E4] bg-[#F0FDFA] px-5 py-8 text-center sm:rounded-xl">
          <span className="relative flex size-16 items-center justify-center rounded-full bg-white shadow-sm">
            <Smartphone className="size-7 text-[#0D9488]" aria-hidden />
            <Loader2
              className="absolute -right-1 -top-1 size-5 animate-spin text-[#0D9488]"
              aria-hidden
            />
          </span>
          <div>
            <p className="text-base font-semibold text-[#134E4A]">
              {phase === "sending"
                ? "Sending the prompt…"
                : "Waiting for your PIN…"}
            </p>
            <p className="mt-1 text-sm text-[#0F766E]">
              {testResult?.destinationSummary
                ? `Destination: ${testResult.destinationSummary}`
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
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0D9488] text-sm font-semibold text-white hover:bg-[#0F766E] sm:rounded-xl"
          >
            <Check className="size-4" aria-hidden />
            Yes — money arrived
          </button>
          <button
            type="button"
            onClick={() => {
              setError(
                "Saved your details, but the credit didn’t show. You can edit this later in Payments, or try a Buy Goods till under Kiosk’s Head Office.",
              );
              setPhase("failed");
            }}
            className="h-12 rounded-2xl border border-[#E5E7EB] bg-white text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] sm:rounded-xl"
          >
            No — I don’t see it
          </button>
        </div>
      ) : null}

      {phase === "done" ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#99F6E4] bg-[#F0FDFA] px-5 py-6 text-center sm:rounded-xl">
          <span className="flex size-12 items-center justify-center rounded-full bg-[#0D9488] text-white">
            <Check className="size-6" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-[#134E4A]">
            {testResult?.destinationSummary ?? "M-Pesa destination"} is ready
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:rounded-xl">
          {error}
        </p>
      ) : null}

      {phase === "pick" || phase === "details" || phase === "failed" ? (
        <div className="flex flex-col gap-2">
          {kind && destinationReady() ? (
            <button
              type="button"
              onClick={() => void sendTest()}
              className="h-12 rounded-2xl bg-[#0D9488] text-sm font-semibold text-white shadow-[0_8px_24px_-12px_rgba(13,148,136,0.7)] hover:bg-[#0F766E] sm:rounded-xl"
            >
              Send KES 1 test prompt
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSkip}
            className="h-11 text-sm font-medium text-[#6B7280] hover:text-[#1F2937]"
          >
            Skip for now
          </button>
        </div>
      ) : null}

      {phase === "waiting" || phase === "sending" ? (
        <button
          type="button"
          onClick={() => {
            stopPolling();
            onSkip();
          }}
          className="h-11 text-sm font-medium text-[#6B7280] hover:text-[#1F2937]"
        >
          Skip — I’ll finish later
        </button>
      ) : null}
    </div>
  );
}

function StepIntro({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-[#1F2937] sm:text-2xl">
        {title}
      </h2>
      <p className="text-sm leading-relaxed text-[#6B7280]">{description}</p>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel";
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[#6B7280]">
        {label}
      </span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm tabular-nums text-[#1F2937] outline-none focus:border-[#0D9488] focus:ring-2 focus:ring-[#0D9488]/20 sm:rounded-xl"
      />
      {hint ? (
        <span className="mt-1.5 block text-[11px] text-[#9CA3AF]">{hint}</span>
      ) : null}
    </label>
  );
}
