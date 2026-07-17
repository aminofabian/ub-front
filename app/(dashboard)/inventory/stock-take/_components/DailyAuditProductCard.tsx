"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Loader2, Package } from "lucide-react";

import { uploadItemImageFile } from "@/lib/api";
import { cn } from "@/lib/utils";

type DailyAuditProductCardProps = {
  itemId: string;
  itemName: string;
  imageUrl: string | null;
  metaLine: string;
  systemStockLabel?: string | null;
  canUpload: boolean;
  onImageUploaded: (imageUrl: string) => void;
  onError?: (message: string) => void;
};

export function DailyAuditProductCard({
  itemId,
  itemName,
  imageUrl,
  metaLine,
  systemStockLabel,
  canUpload,
  onImageUploaded,
  onError,
}: DailyAuditProductCardProps) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const shownUrl = previewUrl || imageUrl;

  const handleFile = async (file: File | null | undefined) => {
    if (!file || !canUpload) return;
    if (!file.type.startsWith("image/")) {
      onError?.("Choose a photo (JPG, PNG, or HEIC).");
      return;
    }
    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    try {
      const saved = await uploadItemImageFile(itemId, file, {
        altText: itemName,
        primary: true,
      });
      const url = saved.secureUrl?.trim() || localPreview;
      onImageUploaded(url);
      if (saved.secureUrl?.trim()) {
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
      }
    } catch (e) {
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
      onError?.(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <article className="flex min-w-0 items-center gap-3">
      <div
        className={cn(
          "relative size-[4.5rem] shrink-0 overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-muted/80 via-muted/40 to-background",
          "ring-1 ring-border/70 shadow-sm",
        )}
      >
        {shownUrl ? (
          <Image
            src={shownUrl}
            alt={itemName}
            fill
            className="object-contain p-1.5"
            unoptimized
            sizes="72px"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Package className="size-7 opacity-35" aria-hidden />
          </div>
        )}

        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="line-clamp-2 text-[1.05rem] font-semibold leading-snug tracking-tight text-foreground">
          {itemName}
        </h2>
        {metaLine ? (
          <p className="truncate text-[11px] text-muted-foreground">{metaLine}</p>
        ) : null}
        {systemStockLabel ? (
          <p className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {systemStockLabel}
          </p>
        ) : null}

        {canUpload ? (
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              type="button"
              disabled={uploading}
              onClick={() => cameraInputRef.current?.click()}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium",
                "bg-foreground text-background shadow-sm transition active:scale-[0.97]",
                "disabled:opacity-50",
              )}
            >
              <Camera className="size-3.5" aria-hidden />
              Photo
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => libraryInputRef.current?.click()}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium",
                "border border-border/80 bg-background/80 text-foreground",
                "transition active:scale-[0.97] disabled:opacity-50",
              )}
            >
              <ImagePlus className="size-3.5" aria-hidden />
              Upload
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void handleFile(file);
              }}
            />
            <input
              ref={libraryInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void handleFile(file);
              }}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
