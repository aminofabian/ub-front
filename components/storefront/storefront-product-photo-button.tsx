"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  useStorefrontStaffEditOptional,
} from "@/components/storefront/storefront-staff-edit";
import { uploadItemImageFile } from "@/lib/api";
import { trackStorefrontEditEvent } from "@/lib/storefront-staff-edit";
import { cn } from "@/lib/utils";

/**
 * Grocery-style camera chip for storefront product tiles.
 * In edit mode the whole parent image area is clickable (absolute inset overlay).
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

  if (!staff?.editMode || !staff?.canEditPhotos || !itemId.trim()) {
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
      trackStorefrontEditEvent("storefront_product_photo_uploaded", {
        itemId,
      });
      toast.success("Photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photo");
      trackStorefrontEditEvent("storefront_edit_save_failed", {
        surface: "product_photo",
        itemId,
      });
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
    <>
      <button
        type="button"
        disabled={uploading}
        onClick={openPicker}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute inset-0 z-[2] cursor-pointer bg-transparent"
        aria-label={`Update photo for ${itemName}`}
        title="Update photo"
      />
      <button
        type="button"
        disabled={uploading}
        onClick={openPicker}
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
