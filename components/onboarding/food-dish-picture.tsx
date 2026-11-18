"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { FOCUS_RING } from "@/components/onboarding/setup-ui";
import { foodMenuPictureError } from "@/lib/onboarding-questionnaire";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Optional picture for one dish on the setup menu. Choosing a file does not upload it —
 * setup uploads after the dish exists.
 */
export function FoodDishPicture({
  file,
  dishLabel,
  onFile,
  onProblem,
}: {
  file: File | null;
  dishLabel: string;
  onFile: (file: File | null) => void;
  onProblem: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(chosen: File | undefined) {
    if (!chosen) {
      return;
    }
    const problem = foodMenuPictureError(chosen);
    if (problem) {
      onProblem(problem);
      return;
    }
    onProblem(null);
    onFile(chosen);
  }

  return (
    <div className="relative size-12 shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={
          file
            ? `Change the picture for ${dishLabel}`
            : `Add a picture for ${dishLabel} (optional)`
        }
        className={cn(
          "grid size-12 place-items-center overflow-hidden rounded-[2px] border bg-[#FCFAF5] text-[#556159]",
          "transition-colors duration-200 hover:border-[#1D4B3B] hover:text-[#1D4B3B]",
          file
            ? "border-[rgba(18,26,22,0.18)]"
            : "border-dashed border-[rgba(18,26,22,0.28)]",
          FOCUS_RING,
        )}
      >
        {preview ? (
          // A local file preview cannot go through next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-4" aria-hidden />
        )}
      </button>
      {file ? (
        <button
          type="button"
          onClick={() => {
            onProblem(null);
            onFile(null);
          }}
          aria-label={`Remove the picture for ${dishLabel}`}
          className={cn(
            "absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-[2px]",
            "border border-[rgba(18,26,22,0.18)] bg-[#FCFAF5] text-[#556159]",
            "hover:border-[#8F3F2F] hover:text-[#8F3F2F]",
            FOCUS_RING,
          )}
        >
          <X className="size-3" aria-hidden />
        </button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
