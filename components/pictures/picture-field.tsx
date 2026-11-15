"use client";

import { useEffect, useRef, useState } from "react";

import { dashboardHintClass, dashboardLabelClass } from "@/components/dashboard-page-ui";
import { cn } from "@/lib/utils";

/** What the server accepts, checked there by content. Asking for these makes an iPhone hand over a JPEG, not HEIC. */
const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 8 * 1024 * 1024;

/** What the form should do about the picture when it saves: nothing, upload this file, or take the picture off. */
export type PictureChange = { file: File | null; remove: boolean };

export const NO_PICTURE_CHANGE: PictureChange = { file: null, remove: false };

/**
 * One picture for one thing on sale: a dish, a service. It only chooses; the form that owns it
 * uploads on save, so cancelling the form changes nothing.
 */
export function PictureField({
  label = "Picture (optional)",
  currentUrl,
  change,
  onChange,
  hint,
  disabled,
}: {
  label?: string;
  currentUrl: string | null | undefined;
  change: PictureChange;
  onChange: (next: PictureChange) => void;
  hint?: string;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!change.file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(change.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [change.file]);

  const shown = preview ?? (change.remove ? null : currentUrl || null);

  function pick(file: File | undefined) {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      setProblem("Use a JPEG, PNG or WebP picture");
      return;
    }
    if (file.size > MAX_BYTES) {
      setProblem("That picture is too large; use one under 8 MB");
      return;
    }
    setProblem(null);
    onChange({ file, remove: false });
  }

  return (
    <div className="grid gap-1">
      <span className={dashboardLabelClass()}>{label}</span>
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={disabled}
          aria-label={shown ? "Change the picture" : "Choose a picture"}
          onClick={() => input.current?.click()}
          className={cn(
            "relative grid h-24 w-32 shrink-0 place-items-center overflow-hidden rounded-[2px] border",
            "border-[color-mix(in_srgb,var(--order-ink,#121A16)_18%,transparent)] bg-[var(--op-surface,#FCFAF5)]",
            !shown && "border-dashed",
            "transition-colors duration-200 hover:border-[var(--pos-primary,#1D4B3B)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#1D4B3B)] focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- may be a local preview that next/image cannot load
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-xs text-[color-mix(in_srgb,var(--order-ink,#121A16)_68%,transparent)]">
              Add a picture
            </span>
          )}
        </button>
        <div className="grid gap-1 text-sm">
          <button
            type="button"
            disabled={disabled}
            className="min-h-9 text-left font-semibold underline underline-offset-2 disabled:opacity-60"
            onClick={() => input.current?.click()}
          >
            {shown ? "Change picture" : "Choose a picture"}
          </button>
          {shown ? (
            <button
              type="button"
              disabled={disabled}
              className="min-h-9 text-left underline underline-offset-2 disabled:opacity-60"
              onClick={() => {
                setProblem(null);
                onChange({ file: null, remove: Boolean(currentUrl) });
              }}
            >
              Remove picture
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          // The same file may be chosen again after a removal.
          e.target.value = "";
        }}
      />
      {problem ? (
        <span role="alert" className="text-sm text-red-700">
          {problem}
        </span>
      ) : (
        <span className={dashboardHintClass()}>
          {hint ?? "A photo from your phone is fine. Customers see it on your menu."}
        </span>
      )}
    </div>
  );
}
