"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ImageFocalPointPicker } from "@/components/business/image-focal-point-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCloudinarySignature, uploadToCloudinary } from "@/lib/api";
import type { StorefrontDesignPhoto } from "@/lib/storefront-design";

export function StorefrontHeroPhotoDialog({
  open,
  onOpenChange,
  businessId,
  photo,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string | null;
  photo: StorefrontDesignPhoto | null;
  saving: boolean;
  onSave: (photo: StorefrontDesignPhoto | null) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [draftUrl, setDraftUrl] = useState(photo?.url ?? "");
  const [focalX, setFocalX] = useState(photo?.focalX ?? 50);
  const [focalY, setFocalY] = useState(photo?.focalY ?? 50);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraftUrl(photo?.url ?? "");
    setFocalX(photo?.focalX ?? 50);
    setFocalY(photo?.focalY ?? 50);
  }, [open, photo]);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a photo (JPG, PNG, or HEIC).");
      return;
    }
    if (!businessId?.trim()) {
      toast.error("Could not upload — business id is missing.");
      return;
    }
    setUploading(true);
    try {
      const folder = `ub/${businessId.trim()}/design/hero`;
      const sig = await getCloudinarySignature(folder);
      const result = await uploadToCloudinary(file, sig);
      const url = result.secure_url?.trim();
      if (!url) {
        toast.error("Upload finished but no image URL was returned.");
        return;
      }
      setDraftUrl(url);
      setFocalX(50);
      setFocalY(50);
      toast.success("Photo uploaded — adjust focus, then save");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="bottom" className="gap-4 p-5 sm:max-w-lg sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Hero photo</DialogTitle>
          <DialogDescription>
            The big image behind your welcome. Drag the dot to keep the right
            part visible on phones.
          </DialogDescription>
        </DialogHeader>

        {draftUrl ? (
          <ImageFocalPointPicker
            src={draftUrl}
            alt="Hero"
            focalX={focalX}
            focalY={focalY}
            onChange={(x, y) => {
              setFocalX(x);
              setFocalY(y);
            }}
          />
        ) : (
          <button
            type="button"
            disabled={uploading || !businessId}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground transition hover:bg-muted/70 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="size-5" aria-hidden />
            )}
            {uploading ? "Uploading…" : "Add a hero photo"}
          </button>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {draftUrl ? "Replace photo" : "Choose photo"}
          </Button>
          {draftUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-destructive"
              disabled={uploading || saving}
              onClick={() => {
                setDraftUrl("");
                setFocalX(50);
                setFocalY(50);
              }}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Remove
            </Button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />

        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={saving || uploading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || uploading}
            onClick={() =>
              void onSave(
                draftUrl.trim()
                  ? {
                      url: draftUrl.trim(),
                      focalX,
                      focalY,
                      fit: photo?.fit ?? "cover",
                    }
                  : null,
              )
            }
          >
            {saving ? "Saving…" : "Add to draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
