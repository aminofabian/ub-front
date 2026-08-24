"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  useStorefrontStaffEditOptional,
} from "@/components/storefront/storefront-staff-edit";
import { uploadItemImageFile } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Grocery-style camera chip for storefront product tiles.
 * Only renders while staff edit mode is on (owner/admin).
 */
export function StorefrontProductPhotoButton({
  itemId,
  itemName,
  className,
}: {
  itemId: string;
  itemName: string;
  className?: string;
}) {
  const staff = useStorefrontStaffEditOptional();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!staff?.editMode || !itemId.trim()) {
    return null;
  }

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a photo (JPG, PNG, or HEIC).");
      return;
    }
    setUploading(true);
    try {
      const saved = await uploadItemImageFile(itemId, file, {
        altText: itemName,
        primary: true,
      });
      const url = saved.secureUrl?.trim();
      if (!url) {
        toast.error("Upload finished but no image URL was returned.");
        return;
      }
      staff!.setImageOverride(itemId, url);
      toast.success("Photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={uploading}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          inputRef.current?.click();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "absolute bottom-1.5 right-1.5 z-[3] flex size-8 items-center justify-center rounded-md border border-white/50 bg-black/55 text-white shadow-sm backdrop-blur-[1px] transition-colors hover:bg-black/70 disabled:opacity-70",
          className,
        )}
        aria-label={`Update photo for ${itemName}`}
        title="Update photo"
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Camera className="size-3.5" aria-hidden />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
        }}
      />
    </>
  );
}
