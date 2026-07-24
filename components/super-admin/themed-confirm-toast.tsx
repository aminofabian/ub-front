"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ThemedConfirmToastOptions = {
  id: string;
  title: string;
  description: string;
  confirmLabel?: string;
  /** Defaults to destructive (delete/archive). Use default for non-destructive confirms. */
  confirmVariant?: "destructive" | "default";
  onConfirm: () => void | Promise<void>;
};

const toastCardClass =
  "pointer-events-auto w-full max-w-md rounded-none border border-border/60 bg-card px-6 py-5 text-center shadow-lg";

const themedToastClassNames = {
  toast:
    "font-sans !items-center !justify-center text-center border-border/80 bg-card shadow-lg",
  title: "font-heading text-base font-semibold tracking-tight !text-center",
  description: "font-sans text-sm !text-center text-muted-foreground",
};

function ConfirmToastCard({
  title,
  description,
  confirmLabel,
  confirmVariant,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "destructive" | "default";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Dismiss"
        onClick={onCancel}
      />
      <div
        className={cn(toastCardClass, "relative z-10")}
        role="alertdialog"
        aria-labelledby="confirm-toast-title"
        aria-describedby="confirm-toast-desc"
      >
        <p
          id="confirm-toast-title"
          className="font-heading text-xl font-semibold tracking-tight text-foreground"
        >
          {title}
        </p>
        <p
          id="confirm-toast-desc"
          className="mt-2 whitespace-pre-line font-sans text-sm leading-relaxed text-muted-foreground"
        >
          {description}
        </p>
        <ConfirmToastCardActions
          confirmLabel={confirmLabel}
          confirmVariant={confirmVariant}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  );
}

function ConfirmToastCardActions({
  confirmLabel,
  confirmVariant,
  onCancel,
  onConfirm,
}: {
  confirmLabel: string;
  confirmVariant: "destructive" | "default";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" variant={confirmVariant} size="sm" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  );
}

/** Centered confirmation styled with brand fonts and primary accent. */
export function showThemedConfirmToast({
  id,
  title,
  description,
  confirmLabel = "Delete",
  confirmVariant = "destructive",
  onConfirm,
}: ThemedConfirmToastOptions) {
  toast.custom(
    (toastId) => (
      <ConfirmToastCard
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        confirmVariant={confirmVariant}
        onCancel={() => toast.dismiss(toastId)}
        onConfirm={() => {
          toast.dismiss(toastId);
          void onConfirm();
        }}
      />
    ),
    {
      id,
      duration: Infinity,
      position: "top-center",
      unstyled: true,
      className: "!m-0 !w-full !max-w-none !transform-none",
    },
  );
}

const MOBILE_UA = /Android|iPhone|iPad|iPod/i;

/** In-app replacement for the browser “Open Phone?” protocol prompt. */
export function showOpenPhoneToast(phone: string) {
  const display = phone.trim();
  const tel = display.replace(/[\s()-]/g, "");
  if (!tel) return;

  const canDialHere = MOBILE_UA.test(navigator.userAgent);

  showThemedConfirmToast({
    id: `open-phone-${tel}`,
    title: "Open Phone?",
    description: canDialHere
      ? `Call ${display}?`
      : `${display}\n\nCopy the number to dial from your phone.`,
    confirmLabel: canDialHere ? "Open Phone" : "Copy number",
    confirmVariant: "default",
    onConfirm: () => {
      if (canDialHere) {
        window.location.href = `tel:${tel}`;
        return;
      }
      void navigator.clipboard.writeText(display).then(
        () => toast.success("Phone number copied"),
        () => toast.error("Could not copy number"),
      );
    },
  });
}

export function showThemedSuccessToast(message: string) {
  toast.success(message, { classNames: themedToastClassNames });
}

export function showThemedErrorToast(message: string) {
  toast.error(message, { classNames: themedToastClassNames });
}
