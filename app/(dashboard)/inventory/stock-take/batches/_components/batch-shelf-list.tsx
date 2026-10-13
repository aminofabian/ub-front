import type { BatchLineFilter } from "@/lib/count-cycle/filter-batch-lines";
import type { BatchShelf } from "@/lib/count-cycle/group-batch-lines";
import { cn } from "@/lib/utils";

import type { CountRowFocus } from "../_hooks/use-count-row-focus";
import { BatchCountRow } from "./batch-count-row";
import { COUNT_TONE } from "./count-tone";

const EMPTY_COPY: Record<BatchLineFilter, string> = {
  todo: "Nothing left to count here. Finish the batch below.",
  counted: "Nothing counted yet.",
  all: "No products match that search.",
};

type Props = {
  shelves: BatchShelf[];
  /** Overrides the per-chip empty message, e.g. while searching. */
  emptyCopy?: string;
  filter: BatchLineFilter;
  showSystemStock: boolean;
  savingLineIds: ReadonlySet<string>;
  register: CountRowFocus["register"];
  onCommit: (lineId: string, qty: number) => Promise<boolean>;
  onNext: (lineId: string) => void;
};

/** The batch walked shelf by shelf, each shelf headed by its category. */
export function BatchShelfList({ shelves, emptyCopy, filter, showSystemStock, savingLineIds, register, onCommit, onNext }: Props) {
  if (shelves.length === 0) {
    return (
      <p className={cn("px-3 py-12 text-center text-[15px]", COUNT_TONE.mute)}>
        {emptyCopy ?? EMPTY_COPY[filter]}
      </p>
    );
  }
  return (
    <div className="flex flex-col">
      {shelves.map((shelf, index) => (
        <section key={`${shelf.category}-${index}`} aria-label={shelf.category}>
          <h3 className={cn("px-3 pb-1.5 pt-5 font-heading text-[15px] font-semibold uppercase tracking-[0.04em]", COUNT_TONE.mute)}>
            {shelf.category}
            <span className={cn("ml-2 font-sans text-[12px] normal-case tracking-normal tabular-nums", COUNT_TONE.faint)}>
              {shelf.lines.length}
            </span>
          </h3>
          <ul className={cn("divide-y border-y", COUNT_TONE.divide, COUNT_TONE.hair)}>
            {shelf.lines.map((line) => (
              <li key={line.lineId}>
                <BatchCountRow
                  line={line}
                  showSystemStock={showSystemStock}
                  saving={savingLineIds.has(line.lineId)}
                  inputRef={register(line.lineId)}
                  onCommit={onCommit}
                  onNext={onNext}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
