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
  submitPublicContactMessage,
  validateContactForm,
  type ContactMessageDestination,
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

export function TalkToUsModal({
  open,
  onOpenChange,
  destination,
  slug,
  title = "Talk to us",
  description = "Send a message and we’ll get back to you.",
}: TalkToUsModalProps) {
  const formId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"name" | "email" | "phone" | "message", string>>
  >({});
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setFieldErrors({});
      setState("idle");
      setError(null);
    }
  }, [open]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateContactForm({ name, email, phone, message });
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
        },
        slug,
      );
      setState("success");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not send message");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "landing-page max-h-[min(92dvh,720px)] w-[calc(100vw-2rem)] max-w-md gap-0 overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none",
          "[&>button]:right-3 [&>button]:top-3 [&>button]:size-8 [&>button]:rounded-none [&>button]:border [&>button]:border-[var(--kiosk-border)] [&>button]:bg-[var(--kiosk-elevated)] [&>button]:text-[var(--kiosk-text-muted)]",
          "[&>button]:hover:bg-[var(--kiosk-gold-soft)] [&>button]:hover:text-[var(--kiosk-text)] [&>button]:hover:border-[var(--kiosk-gold-border)]",
        )}
        overlayClassName="bg-[rgba(20,20,18,0.62)] backdrop-blur-[3px]"
        style={landingRootStyle()}
      >
        <div className="talk-ticket relative overflow-hidden border border-[var(--kiosk-border)] bg-[color-mix(in_srgb,var(--kiosk-elevated)_96%,#f3efe6)] shadow-[0_28px_80px_-24px_rgba(20,20,18,0.42)]">
          <div aria-hidden className="landing-find-shop-perf h-3 w-full" />

          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-3 h-8 w-8 border-l-2 border-t-2 border-[var(--kiosk-gold)] opacity-70"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-3 h-8 w-8 border-r-2 border-t-2 border-[var(--kiosk-gold)] opacity-70"
          />

          <div className="relative px-5 pb-5 pt-4 sm:px-7">
            <div className="mb-4 flex items-end justify-between gap-3 border-b border-dashed border-[var(--kiosk-border)] pb-3 pr-8">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
                  Ticket · Message
                </p>
                <DialogHeader className="mt-1.5 space-y-1.5 p-0 text-left">
                  <DialogTitle className="font-heading text-[1.75rem] font-semibold leading-none tracking-[-0.03em] text-[var(--kiosk-text)]">
                    {title}
                  </DialogTitle>
                  <DialogDescription className="max-w-[22rem] text-[13.5px] leading-relaxed text-[var(--kiosk-text-muted)]">
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
              <div className="talk-ticket-success relative overflow-hidden border border-dashed border-[var(--kiosk-gold-border)] bg-[var(--kiosk-gold-soft)] px-4 py-8 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-gold)]">
                  Receipt stamped
                </p>
                <p className="mt-3 font-heading text-[2.35rem] font-semibold italic leading-none tracking-[-0.03em] text-[var(--kiosk-text)]">
                  Sent.
                </p>
                <p className="mx-auto mt-3 max-w-[16rem] text-[13px] leading-relaxed text-[var(--kiosk-text-muted)]">
                  Thanks — your message is on the till. We’ll reply soon.
                </p>
                <button
                  type="button"
                  className="landing-nav-ticket landing-nav-ticket--primary mt-6 w-full justify-center"
                  onClick={() => onOpenChange(false)}
                >
                  Close ticket
                </button>
              </div>
            ) : (
              <form
                id={formId}
                className="space-y-3.5"
                onSubmit={(e) => void onSubmit(e)}
              >
                <div className="grid gap-3.5 sm:grid-cols-2">
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
                  <span className="mb-1.5 flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--kiosk-text-faint)]">
                      Message
                    </span>
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    required
                    className={cn(
                      "talk-ticket-input w-full resize-y border bg-white px-3.5 py-3 text-[15px] text-[var(--kiosk-text)] outline-none",
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

                {state === "error" && error ? (
                  <div
                    className="border border-dashed border-[color-mix(in_srgb,var(--kiosk-danger)_35%,var(--kiosk-border))] bg-[var(--kiosk-danger-bg)] px-3.5 py-3"
                    role="alert"
                  >
                    <p className="text-[13px] text-[var(--kiosk-text)]">{error}</p>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={state === "submitting"}
                  className="landing-nav-ticket landing-nav-ticket--primary w-full justify-center py-3.5 disabled:opacity-50"
                >
                  {state === "submitting" ? "Sending…" : "Send message →"}
                </button>
              </form>
            )}

            <div
              aria-hidden
              className="mt-5 flex items-end justify-between gap-3 border-t border-dashed border-[var(--kiosk-border)] pt-3"
            >
              <div className="flex h-7 items-end gap-px overflow-hidden">
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
            className="pointer-events-none absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-[var(--kiosk-gold)] opacity-70"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-[var(--kiosk-gold)] opacity-70"
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
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
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
          "talk-ticket-input w-full border bg-white px-3.5 py-3 text-[15px] text-[var(--kiosk-text)] outline-none",
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
