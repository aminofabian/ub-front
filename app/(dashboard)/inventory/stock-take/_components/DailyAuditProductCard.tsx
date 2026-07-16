"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Loader2, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    <article className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="relative aspect-[5/4] w-full bg-muted/60 sm:aspect-[16/10]">
        {shownUrl ? (
          <Image
            src={shownUrl}
            alt={itemName}
            fill
            className="object-contain p-3"
            unoptimized
            sizes="(max-width: 512px) 100vw, 512px"
            priority
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Package className="size-10 opacity-40" aria-hidden />
            <p className="text-xs font-medium">No product photo yet</p>
          </div>
        )}

        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-[1px]">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
        ) : null}

        {canUpload ? (
          <div className="absolute inset-x-0 bottom-0 flex gap-1.5 bg-gradient-to-t from-black/55 via-black/25 to-transparent p-2.5 pt-8">
            <Button
              type="button"
              size="sm"
              className="h-9 flex-1 gap-1.5 rounded-lg bg-background/95 text-foreground shadow-sm hover:bg-background"
              disabled={uploading}
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="size-3.5" aria-hidden />
              Take photo
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 flex-1 gap-1.5 rounded-lg border-white/40 bg-background/80 text-foreground shadow-sm"
              disabled={uploading}
              onClick={() => libraryInputRef.current?.click()}
            >
              <ImagePlus className="size-3.5" aria-hidden />
              Upload
            </Button>
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

      <div className="space-y-1 px-3 py-2.5">
        <h2
          className={cn(
            "text-base font-semibold leading-snug tracking-tight text-foreground",
            "text-balance",
          )}
        >
          {itemName}
        </h2>
        {metaLine ? (
          <p className="truncate text-[11px] text-muted-foreground">{metaLine}</p>
        ) : null}
        {systemStockLabel ? (
          <p className="text-[11px] font-medium text-primary">{systemStockLabel}</p>
        ) : null}
      </div>
    </article>
  );
}
