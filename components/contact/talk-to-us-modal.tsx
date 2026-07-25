"use client";

import { useEffect, useId, useState } from "react";

import { landingRootStyle } from "@/components/tenant-console/landing/landing-styles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createContactTillChallenge,
  submitPublicContactMessage,
  validateContactForm,
  type ContactMessageDestination,
  type ContactTillChallenge,
} from "@/lib/contact-messages";
import { cn } from "@/lib/utils";

type TalkToUsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination: ContactMessageDestination;
  slug?: string;
  title?: string;
  description?: string;
};

type FormState = "idle" | "submitting" | "success" | "error";

const BARCODE_BARS = [
  2, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 1, 3, 1, 2,
  2, 1, 1, 3, 2, 1, 2, 1, 1, 2, 3, 1, 1, 2,
] as const;

function formatKsh(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

export function TalkToUsModal({
  open,
  onOpenChange,
  destination,
  slug,
  title = "Talk to us",
  description = "Send a message and we’ll get back to you.",
}: TalkToUsModalProps) {
  const formId = useId();
  const honeypotId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [challenge, setChallenge] = useState<ContactTillChallenge>(() =>
    createContactTillChallenge(),
  );
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [website, setWebsite] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<
      Record<"name" | "email" | "phone" | "message" | "challengeAnswer", string>
    >
  >({});
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setChallengeAnswer("");
      setWebsite("");
      setFieldErrors({});
      setState("idle");
      setError(null);
      return;
    }
    setChallenge(createContactTillChallenge());
  }, [open]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (website.trim()) {
      setState("error");
      setError("Could not send message");
      return;
    }
    const errors = validateContactForm({
      name,
      email,
      phone,
      message,
      challengeAnswer,
      challengeExpected: challenge.expectedAnswer,
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    if (destination === "tenant" && !slug?.trim()) {
      setState("error");
      setError("Shop is unavailable. Refresh and try again.");
      return;
    }

    setState("submitting");
    setError(null);
    try {
      await submitPublicContactMessage(
        destination,
        {
          name,
          email,
          phone: phone.trim() || undefined,
          message,
          sourcePath:
            typeof window !== "undefined" ? window.location.pathname : undefined,
          challenge,
          challengeAnswer: Number.parseInt(challengeAnswer.trim(), 10),
        },
        slug,
      );
      setState("success");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not send message");
      setChallenge(createContactTillChallenge());
      setChallengeAnswer("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "landing-page max-h-[min(92dvh,640px)] w-[calc(100vw-1.25rem)] max-w-md gap-0 overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none",
          "[&>button]:right-2.5 [&>button]:top-2.5 [&>button]:size-7 [&>button]:rounded-none [&>button]:border [&>button]:border-[var(--kiosk-border)] [&>button]:bg-[var(--kiosk-elevated)] [&>button]:text-[var(--kiosk-text-muted)]",
          "[&>button]:hover:bg-[var(--kiosk-gold-soft)] [&>button]:hover:text-[var(--kiosk-text)] [&>button]:hover:border-[var(--kiosk-gold-border)]",
        )}
        overlayClassName="bg-[rgba(20,20,18,0.62)] backdrop-blur-[3px]"
        style={landingRootStyle()}
      >
        <div className="talk-ticket relative flex max-h-[min(92dvh,640px)] flex-col overflow-hidden border border-[var(--kiosk-border)] bg-[color-mix(in_srgb,var(--kiosk-elevated)_96%,#f3efe6)] shadow-[0_28px_80px_-24px_rgba(20,20,18,0.42)]">
          <div aria-hidden className="landing-find-shop-perf h-2.5 w-full shrink-0" />

          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-2.5 h-6 w-6 border-l-2 border-t-2 border-[var(--kiosk-gold)] opacity-70"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-2.5 h-6 w-6 border-r-2 border-t-2 border-[var(--kiosk-gold)] opacity-70"
          />

          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4">
            <div className="mb-3 flex items-end justify-between gap-3 border-b border-dashed border-[var(--kiosk-border)] pb-2.5 pr-8">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
                  Ticket · Message
                </p>
                <DialogHeader className="mt-1 space-y-1 p-0 text-left">
                  <DialogTitle className="font-heading text-[1.5rem] font-semibold leading-none tracking-[-0.03em] text-[var(--kiosk-text)] sm:text-[1.65rem]">
                    {title}
                  </DialogTitle>
                  <DialogDescription className="max-w-[22rem] text-[13px] leading-snug text-[var(--kiosk-text-muted)]">
                    {description}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                  Form
                </p>
                <p className="mt-0.5 font-mono text-[11px] tabular-nums tracking-[0.08em] text-[var(--kiosk-text-dim)]">
                  MSG-01
                </p>
              </div>
            </div>

            {state === "success" ? (
              <div className="talk-ticket-success relative overflow-hidden border border-dashed border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-4 py-7 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
                  Receipt stamped
                </p>
                <p className="mt-3 font-heading text-[2.1rem] font-semibold italic leading-none tracking-[-0.03em] text-[var(--kiosk-text)]">
                  Sent.
                </p>
                <p className="mx-auto mt-3 max-w-[16rem] text-[13px] leading-relaxed text-[var(--kiosk-text-muted)]">
                  Thanks — your message is on the till. We’ll reply soon.
                </p>
                <button
                  type="button"
                  className="landing-nav-ticket landing-nav-ticket--primary mt-5 w-full justify-center"
                  onClick={() => onOpenChange(false)}
                >
                  Close ticket
                </button>
              </div>
            ) : (
              <form
                id={formId}
                className="space-y-2.5"
                onSubmit={(e) => void onSubmit(e)}
              >
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field
                    label="Name"
                    error={fieldErrors.name}
                    value={name}
                    onChange={setName}
                    autoComplete="name"
                    required
                  />
                  <Field
                    label="Email"
                    error={fieldErrors.email}
                    value={email}
                    onChange={setEmail}
                    autoComplete="email"
                    type="email"
                    required
                  />
                </div>
                <Field
                  label="Phone"
                  hint="optional"
                  error={fieldErrors.phone}
                  value={phone}
                  onChange={setPhone}
                  autoComplete="tel"
                  type="tel"
                />
                <label className="block">
                  <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                    Message
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    required
                    className={cn(
                      "talk-ticket-input w-full resize-y border bg-white px-3 py-2 text-[14px] text-[var(--kiosk-text)] outline-none",
                      "placeholder:text-[var(--kiosk-text-faint)]",
                      fieldErrors.message
                        ? "border-[var(--kiosk-danger)]"
                        : "border-[var(--kiosk-border-strong)] focus:border-[var(--kiosk-gold)]",
                    )}
                  />
                  {fieldErrors.message ? (
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--kiosk-danger)]">
                      {fieldErrors.message}
                    </span>
                  ) : null}
                </label>

                <div className="border border-dashed border-[var(--kiosk-border)] bg-[color-mix(in_srgb,var(--kiosk-surface)_70%,white)] px-3 py-2.5">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-gold)]">
                      Human check · {challenge.title}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--kiosk-text-faint)]">
                      Not for bots
                    </p>
                  </div>
                  <p className="mb-2 text-[12px] leading-snug text-[var(--kiosk-text-muted)]">
                    {challenge.blurb} Easy for you — robots usually guess.
                  </p>

                  {(challenge.lines.length > 0 || challenge.metaRows.length > 0) && (
                    <ul className="space-y-1 border-b border-dashed border-[var(--kiosk-border)] pb-2 font-mono text-[11.5px] text-[var(--kiosk-text)]">
                      {challenge.lines.map((line) => (
                        <li
                          key={`${line.label}-${line.qty}-${line.unitPrice}`}
                          className="flex items-baseline justify-between gap-2"
                        >
                          <span className="min-w-0 truncate">
                            {line.qty}× {line.label}{" "}
                            <span className="text-[var(--kiosk-text-faint)]">
                              @ {formatKsh(line.unitPrice)}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {formatKsh(line.qty * line.unitPrice)}
                          </span>
                        </li>
                      ))}
                      {challenge.metaRows.map((row) => (
                        <li
                          key={`${row.label}-${row.value}`}
                          className="flex items-baseline justify-between gap-2 text-[var(--kiosk-text-muted)]"
                        >
                          <span>{row.label}</span>
                          <span className="tabular-nums text-[var(--kiosk-text)]">
                            {row.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <label className="mt-2 flex items-center justify-between gap-3">
                    <span className="min-w-0 text-[13px] leading-snug text-[var(--kiosk-text)]">
                      {challenge.askLabel}
                    </span>
                    <span className="relative w-[6.5rem] shrink-0">
                      {challenge.answerUnit === "KSh" ? (
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[var(--kiosk-text-faint)]">
                          KSh
                        </span>
                      ) : null}
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        aria-label={challenge.askLabel}
                        value={challengeAnswer}
                        onChange={(e) => setChallengeAnswer(e.target.value)}
                        required
                        className={cn(
                          "talk-ticket-input w-full border bg-white py-2 text-right font-mono text-[15px] tabular-nums text-[var(--kiosk-text)] outline-none",
                          challenge.answerUnit === "KSh" ? "pl-9 pr-2" : "px-2",
                          fieldErrors.challengeAnswer
                            ? "border-[var(--kiosk-danger)]"
                            : "border-[var(--kiosk-border-strong)] focus:border-[var(--kiosk-gold)]",
                        )}
                      />
                    </span>
                  </label>
                  {fieldErrors.challengeAnswer ? (
                    <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--kiosk-danger)]">
                      {fieldErrors.challengeAnswer}
                    </span>
                  ) : null}
                </div>

                <div
                  aria-hidden
                  className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
                >
                  <label htmlFor={honeypotId}>Website</label>
                  <input
                    id={honeypotId}
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                {state === "error" && error ? (
                  <div
                    className="border border-dashed border-[color-mix(in_srgb,var(--kiosk-danger)_35%,var(--kiosk-border))] bg-[var(--kiosk-danger-bg)] px-3 py-2.5"
                    role="alert"
                  >
                    <p className="text-[13px] text-[var(--kiosk-text)]">{error}</p>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={state === "submitting"}
                  className="landing-nav-ticket landing-nav-ticket--primary w-full justify-center py-3 disabled:opacity-50"
                >
                  {state === "submitting" ? "Sending…" : "Send message →"}
                </button>
              </form>
            )}

            <div
              aria-hidden
              className="mt-3 hidden items-end justify-between gap-3 border-t border-dashed border-[var(--kiosk-border)] pt-2.5 sm:flex"
            >
              <div className="flex h-5 items-end gap-px overflow-hidden">
                {BARCODE_BARS.map((w, i) => (
                  <span
                    key={`${w}-${i}`}
                    className="bg-[var(--kiosk-text)]"
                    style={{
                      width: w,
                      height: i % 5 === 0 ? "100%" : "78%",
                      opacity: i % 3 === 0 ? 0.35 : 0.85,
                    }}
                  />
                ))}
              </div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--kiosk-text-faint)]">
                Reply · soon
              </p>
            </div>
          </div>

          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[var(--kiosk-gold)] opacity-70"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[var(--kiosk-gold)] opacity-70"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  error,
  value,
  onChange,
  autoComplete,
  type = "text",
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
          {label}
        </span>
        {hint ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--kiosk-text-faint)] opacity-70">
            {hint}
          </span>
        ) : null}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className={cn(
          "talk-ticket-input w-full border bg-white px-3 py-2 text-[14px] text-[var(--kiosk-text)] outline-none",
          "placeholder:text-[var(--kiosk-text-faint)]",
          error
            ? "border-[var(--kiosk-danger)]"
            : "border-[var(--kiosk-border-strong)] focus:border-[var(--kiosk-gold)]",
        )}
      />
      {error ? (
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--kiosk-danger)]">
          {error}
        </span>
      ) : null}
    </label>
  );
}
