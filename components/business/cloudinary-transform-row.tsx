"use client";

import { Sparkles, Wand2, X } from "lucide-react";

import {
  CLOUDINARY_TRANSFORMS,
  cloudinaryTransformUrl,
} from "@/lib/cloudinary-transform";
import { cn } from "@/lib/utils";

const OPTIONS: {
  label: string;
  transform: string | null;
  icon: typeof Wand2;
}[] = [
  { label: "Original", transform: null, icon: X },
  { label: "Auto-enhance", transform: CLOUDINARY_TRANSFORMS.enhance, icon: Sparkles },
  { label: "Remove background", transform: CLOUDINARY_TRANSFORMS.removeBackground, icon: Wand2 },
];

/**
 * One-tap photo improvements, applied on the fly by Cloudinary (no re-upload).
 * The merchant previews each option against the original and picks one.
 */
export function CloudinaryTransformRow({
  baseUrl,
  url,
  onPick,
}: {
  baseUrl: string;
  url: string;
  onPick: (url: string) => void;
}) {
  const base = baseUrl.trim();
  if (!base) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {OPTIONS.map(({ label, transform, icon: Icon }) => {
        const candidate =
          transform === null ? base : cloudinaryTransformUrl(base, transform) ?? base;
        const active = url.trim() === candidate;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onPick(candidate)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                : "border-border/70 bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
