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

/** End of the list: wrap the batch up, with what happens to anything skipped. */
export function BatchFinishPanel({ counted, total, finishing, onFinish }: Props) {
  return (
    <section className="flex flex-col gap-3 px-3 pb-6 pt-5">
      <p className={cn("text-[14px] leading-relaxed", COUNT_TONE.mute)}>{finishCopy(counted, total)}</p>
      <button
        type="button"
        className={COUNT_TONE.primaryButton}
        disabled={counted === 0 || finishing}
        onClick={onFinish}
      >
        {finishing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Finish batch
      </button>
    </section>
  );
}
