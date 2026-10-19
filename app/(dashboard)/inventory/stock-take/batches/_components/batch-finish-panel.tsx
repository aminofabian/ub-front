import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { COUNT_TONE } from "./count-tone";

type Props = {
  counted: number;
  total: number;
  finishing: boolean;
  onFinish: () => void;
};

function finishCopy(counted: number, total: number): string {
  if (counted === 0) return "Count at least one product to finish this batch.";
  if (counted >= total) return `All ${total} counted. Finish to hand the batch to a manager.`;
  const left = total - counted;
  return `${left} still to count. Finish now and ${left === 1 ? "it goes" : "they go"} to the front of tomorrow's batch.`;
}

/** Pinned end-of-floor bar — always in thumb reach on the phone. */
export function BatchFinishPanel({ counted, total, finishing, onFinish }: Props) {
  return (
    <section
      className={cn(
        "flex flex-col gap-2 border-t px-3 pb-3 pt-2.5",
        COUNT_TONE.surface,
        COUNT_TONE.hair,
      )}
    >
      <p className={cn("text-[12.5px] leading-snug", COUNT_TONE.mute)}>
        {finishCopy(counted, total)}
      </p>
      <button
        type="button"
        className={cn(COUNT_TONE.primaryButton, "min-h-12 text-[17px]")}
        disabled={counted === 0 || finishing}
        onClick={onFinish}
      >
        {finishing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Finish batch
      </button>
    </section>
  );
}
