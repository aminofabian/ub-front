"use client";

import { Camera, Loader2 } from "lucide-react";
import {
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { useStorefrontStaffEditOptional } from "@/components/storefront/storefront-staff-edit";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** Opens the file picker and uploads. Return the new URL (or void). */
  onUpload: (file: File) => Promise<string | void>;
  label: string;
  className?: string;
  /** Show a small camera badge in the corner. */
  showBadge?: boolean;
  disabled?: boolean;
};

/**
 * Makes an entire media hit target open a file picker in edit mode.
 * Shopper / edit-off: children only.
 */
export function StorefrontEditableMedia({
  children,
  onUpload,
  label,
  className,
  showBadge = true,
  disabled = false,
}: Props) {
  const staff = useStorefrontStaffEditOptional();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!staff?.editMode || disabled) {
    return <>{children}</>;
  }

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a photo (JPG, PNG, or HEIC).");
      return;
    }
    setUploading(true);
    try {
      await onUpload(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function openPicker(e: React.SyntheticEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (uploading) return;
    inputRef.current?.click();
  }

  return (
    <div className={cn("relative inline-flex max-w-full", className)}>
      <button
        type="button"
        disabled={uploading}
        onClick={openPicker}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "relative block max-w-full cursor-pointer rounded-sm text-left outline-none",
          "ring-offset-1 transition-[box-shadow]",
          "hover:ring-2 hover:ring-amber-500/45",
          "focus-visible:ring-2 focus-visible:ring-amber-500/60",
          uploading && "opacity-70",
        )}
        aria-label={`Update ${label}`}
        title={`Update ${label}`}
      >
        {children}
        {showBadge ? (
          <span
            className="pointer-events-none absolute bottom-1 right-1 z-[3] flex size-7 items-center justify-center rounded-md border border-white/50 bg-black/55 text-white shadow-sm backdrop-blur-[1px]"
            aria-hidden
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Camera className="size-3.5" />
            )}
          </span>
        ) : null}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          void handleFile(e.target.files?.[0]);
        }}
      />
    </div>
  );
}
