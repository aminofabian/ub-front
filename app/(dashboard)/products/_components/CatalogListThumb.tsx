"use client";

import Image from "next/image";
import { Package } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  catalogListThumbFrameClass,
  catalogListThumbImageClass,
  catalogListThumbPlaceholderClass,
  type CatalogRowKind,
  type CatalogRowTone,
} from "./catalog-list-styles";

type Props = {
  src: string | null;
  titleInitial: string;
  kind: CatalogRowKind;
  tone: CatalogRowTone;
  isActive?: boolean;
  isInactive?: boolean;
};

const THUMB_SIZES: Record<CatalogRowKind, string> = {
  group: "32px",
  standalone: "28px",
  variant: "24px",
};

export function CatalogListThumb({
  src,
  titleInitial,
  kind,
  tone,
  isActive,
  isInactive,
}: Props) {
  const sizes = THUMB_SIZES[kind];

  return (
    <span
      className={catalogListThumbFrameClass(kind, {
        active: isActive,
        inactive: isInactive,
      })}
    >
      {src ? (
        <>
          <Image
            src={src}
            alt=""
            fill
            sizes={sizes}
            className={catalogListThumbImageClass}
          />
          <span
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.12] via-transparent to-white/[0.06] mix-blend-normal"
            aria-hidden
          />
        </>
      ) : (
        <span
          className={cn(
            catalogListThumbPlaceholderClass,
          )}
        >
          {kind === "variant" ? (
            <Package
              className="size-3.5 text-muted-foreground/40"
              aria-hidden
            />
          ) : (
            <span
              className={cn(
                "flex h-full w-full items-center justify-center border border-dashed font-bold tracking-tight",
                tone.accentLight,
                kind === "group" ? "text-sm" : "text-xs",
              )}
            >
              {titleInitial}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
