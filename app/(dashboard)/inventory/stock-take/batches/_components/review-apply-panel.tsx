import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { COUNT_TONE } from "./count-tone";

type Props = { awaiting: number; applying: boolean; onApply: () => void };

/** Posts the batch's counts to stock, or confirms they already are. */
export function ReviewApplyPanel({ awaiting, applying, onApply }: Props) {
  if (awaiting === 0) {
    return (
      <p className={cn("flex items-center gap-2 rounded-xl px-4 py-3 text-[14px] font-medium", COUNT_TONE.tealWash, COUNT_TONE.teal)}>
        <Check className="size-4" aria-hidden />
        These counts are posted. Stock matches the shelf.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={COUNT_TONE.primaryButton} disabled={applying} onClick={onApply}>
        {applying ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Post {awaiting} {awaiting === 1 ? "count" : "counts"} to stock
      </button>
      <p className={cn("text-[13px]", COUNT_TONE.mute)}>
        Each gap becomes a stock adjustment, so the system matches what&apos;s on the shelf.
      </p>
    </div>
  );
}
