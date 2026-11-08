"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  MarketplaceAttachNote,
  MarketplaceAttachResult,
} from "@/lib/marketplace-api";
import { cn } from "@/lib/utils";

import {
  describeAttachResult,
  groupAttachNotes,
  noteLabel,
  plural,
} from "./supplier-attach";
import { supCard, supSectionCard } from "./supplier-ui-tokens";

type Props = {
  result: MarketplaceAttachResult;
  /** How many products were ticked, or null when the whole shelf was added. */
  requested: number | null;
  /** The supplier was already in the directory, so this topped it up. */
  topUp: boolean;
  onDone: () => void;
};

/** Lists longer than this start folded, so a big shelf does not bury the rest. */
const OPEN_UNTIL = 10;

function NoteSection({
  title,
  hint,
  notes,
  problem = false,
}: {
  title: string;
  hint: string;
  notes: MarketplaceAttachNote[];
  problem?: boolean;
}) {
  if (notes.length === 0) return null;
  return (
    <details
      open={notes.length <= OPEN_UNTIL}
      className={cn(supSectionCard, "group")}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">
            {title}{" "}
            <span className="tabular-nums text-muted-foreground">
              ({notes.length})
            </span>
          </span>
          <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
            {hint}
          </span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ul className="border-t border-border">
        {notes.map((note, index) => (
          <li
            key={`${note.name ?? ""}|${note.barcode ?? ""}|${index}`}
            className="border-b border-border px-3 py-2 last:border-b-0"
          >
            <p className="text-sm text-foreground">{noteLabel(note)}</p>
            <p
              className={cn(
                "mt-0.5 text-[11px] leading-snug",
                problem ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {[note.barcode, note.reason].filter(Boolean).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * The end of "Add supplier": what happened to each product. Products the shop
 * already had were linked rather than added again, and anything that could not
 * be added says why.
 */
export function SupplierAttachReport({
  result,
  requested,
  topUp,
  onDone,
}: Props) {
  const groups = groupAttachNotes(result);
  const { title } = describeAttachResult(result, requested, { topUp });
  const rows = [
    { value: result.createdItems, label: "new items created and linked" },
    {
      value: result.linkedExisting,
      label: "already in your shop, linked instead of added again",
    },
    { value: result.alreadyLinked, label: "already linked to this supplier" },
    { value: result.skipped, label: "not added" },
  ].filter((row) => row.value > 0);
  const omitted = result.notesOmitted ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5">
        <section className={cn(supCard, "px-3 py-2.5")}>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h3 className="text-base font-medium text-foreground">{title}</h3>
            {result.supplierNumber ? (
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {result.supplierNumber}
              </span>
            ) : null}
          </div>
          {rows.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {rows.map((row) => (
                <li key={row.label} className="flex items-baseline gap-2">
                  <span className="w-8 shrink-0 text-right text-base font-medium tabular-nums text-foreground">
                    {row.value}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {row.label}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground">
              No products were linked.
            </p>
          )}
        </section>

        <NoteSection
          title="Already in your shop"
          hint="Linked to this supplier instead of being added again, so nothing is duplicated."
          notes={groups.existing}
        />
        <NoteSection
          title="Already linked to this supplier"
          hint="Nothing to change."
          notes={groups.alreadyLinked}
        />
        <NoteSection
          title="Not added"
          hint="These could not be added. You can add them from Products."
          notes={groups.skipped}
          problem
        />
        {omitted > 0 ? (
          <p className="text-[12px] text-muted-foreground">
            {omitted} more {plural(omitted, "product")} not listed here.
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-[var(--op-rule)] bg-[var(--op-surface)] px-3 py-3 sm:px-5">
        <div className="flex justify-end">
          <Button
            type="button"
            className="h-12 w-full rounded-xl px-4 font-semibold sm:h-9 sm:w-auto sm:rounded-xl"
            onClick={onDone}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
