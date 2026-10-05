"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  "pointer-events-auto w-full max-w-[24rem] border border-[color-mix(in_srgb,var(--order-ink,#15231f)_16%,transparent)] bg-white px-7 py-7 text-center shadow-[0_24px_64px_color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)]";

const themedToastClassNames = {
  toast:
    "font-sans !items-center !justify-center text-center border-border/80 bg-card shadow-lg",
  title: "font-heading text-base font-semibold tracking-tight !text-center",
  description: "font-sans text-sm !text-center text-muted-foreground",
};

function ConfirmToastCard(props: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "destructive" | "default";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { onCancel } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  if (!mounted) return null;
  return createPortal(<ConfirmToastOverlay {...props} />, document.body);
}

function ConfirmToastOverlay({
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
    <div className="fixed inset-0 z-[200] grid place-items-center p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--order-ink,#15231f)_46%,transparent)]"
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
          className="font-heading text-[1.35rem] font-semibold leading-none tracking-[-0.03em] text-foreground"
        >
          {title}
        </p>
        <p
          id="confirm-toast-desc"
          className="mx-auto mt-3 max-w-[18rem] whitespace-pre-line text-balance font-sans text-[13px] leading-relaxed text-muted-foreground"
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
    <div className="mt-6 flex items-center justify-center gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-8 rounded-none px-4 text-xs shadow-none"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant={confirmVariant}
        className="h-8 rounded-none px-4 text-xs shadow-none"
        onClick={onConfirm}
      >
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
      className:
        "!pointer-events-none !m-0 !h-0 !min-h-0 !w-0 !max-w-none !overflow-visible !border-0 !bg-transparent !p-0 !shadow-none",
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
