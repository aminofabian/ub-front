"use client";

import { Check, Loader2 } from "lucide-react";

import type { CountCycleBatchLine } from "@/lib/api";
import { cn } from "@/lib/utils";

import { CountQtyInput } from "./count-qty-input";
import { COUNT_TONE } from "./count-tone";
import { ProductThumb } from "./product-thumb";

type Props = {
  line: CountCycleBatchLine;
  showSystemStock: boolean;
  saving: boolean;
  inputRef: (input: HTMLInputElement | null) => void;
  onCommit: (lineId: string, countedQty: number) => Promise<boolean>;
  onNext: (lineId: string) => void;
};

function metaLine(line: CountCycleBatchLine): string {
  return [line.itemSku || line.barcode, line.aisle ? `Aisle ${line.aisle}` : null, line.unitType]
    .filter(Boolean)
    .join(" · ");
}

/** One product on the shelf: what it is, and a big box for what's physically there. */
export function BatchCountRow({ line, showSystemStock, saving, inputRef, onCommit, onNext }: Props) {
  const counted = line.countedQty != null;
  const meta = metaLine(line);
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-3 transition-colors duration-300",
        counted && COUNT_TONE.tealWash,
      )}
    >
      <ProductThumb name={line.itemName} imageUrl={line.imageUrl} />
      <div className="min-w-0 flex-1">
        <p className={cn("line-clamp-2 text-[15px] font-medium leading-snug", COUNT_TONE.ink)}>
          {line.itemName}
        </p>
        {meta ? <p className={cn("mt-0.5 truncate text-[12.5px]", COUNT_TONE.mute)}>{meta}</p> : null}
        {showSystemStock && line.systemQty != null ? (
          <p className={cn("mt-0.5 text-[12.5px] tabular-nums", COUNT_TONE.faint)}>
            System says {Number(line.systemQty)}
          </p>
        ) : null}
      </div>
      <span className={cn("flex size-5 shrink-0 items-center justify-center", COUNT_TONE.teal)} aria-hidden>
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        {!saving && counted ? <Check className="size-4 stroke-[2.5]" /> : null}
      </span>
      <CountQtyInput
        label={`Count for ${line.itemName}`}
        savedQty={line.countedQty}
        inputRef={inputRef}
        onCommit={(qty) => onCommit(line.lineId, qty)}
        onNext={() => onNext(line.lineId)}
      />
    </div>
  );
}
