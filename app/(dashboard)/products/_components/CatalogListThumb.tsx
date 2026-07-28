"use client";

import Image from "next/image";

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
  group: "20px",
  standalone: "20px",
  variant: "16px",
};

export function CatalogListThumb({
  src,
  titleInitial,
  kind,
  tone: _tone,
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
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          className={catalogListThumbImageClass}
        />
      ) : (
        <span className={catalogListThumbPlaceholderClass}>
          {titleInitial}
        </span>
      )}
    </span>
  );
}
