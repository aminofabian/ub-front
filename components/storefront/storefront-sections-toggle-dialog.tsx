"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  STOREFRONT_SECTION_SCHEMAS,
  type StorefrontSectionId,
} from "@/lib/storefront-design";
import { cn } from "@/lib/utils";

/** Sections merchants can flip on/off from the live shop (not free-form). */
const TOGGLEABLE_SECTION_IDS: StorefrontSectionId[] = [
  "announcement",
  "promo",
  "hero",
  "about",
  "social",
  "contact",
  "products",
];

/** Sections with a matching quick-edit dialog — show an Edit affordance. */
const EDITABLE_SECTION_IDS: readonly StorefrontSectionId[] = [
  "announcement",
  "promo",
  "hero",
  "about",
  "contact",
];

export function StorefrontSectionsToggleDialog({
  open,
  onOpenChange,
  enabledById,
  saving,
  onToggle,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabledById: Partial<Record<StorefrontSectionId, boolean>>;
  saving: boolean;
  onToggle: (id: StorefrontSectionId, enabled: boolean) => Promise<void>;
  onEdit?: (id: StorefrontSectionId) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="bottom" className="gap-4 p-5 sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Sections</DialogTitle>
          <DialogDescription>
            Turn storefront blocks on or off. Theme shelves stay until you hide
            products.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {TOGGLEABLE_SECTION_IDS.map((id) => {
            const schema = STOREFRONT_SECTION_SCHEMAS.find((s) => s.id === id)!;
            const enabled = enabledById[id] === true;
            // products defaults to on when never configured
            const shown =
              id === "products" ? enabledById[id] !== false : enabled;
            return (
              <li
                key={id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {schema.label}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {schema.description}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {onEdit && shown && EDITABLE_SECTION_IDS.includes(id) ? (
                    <button
                      type="button"
                      onClick={() => onEdit(id)}
                      className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-amber-950 underline-offset-2 hover:underline"
                      aria-label={`Edit ${schema.label} content`}
                    >
                      Edit
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={shown}
                    disabled={saving}
                    onClick={() => void onToggle(id, !shown)}
                    className={cn(
                      "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60",
                      shown ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform",
                        shown ? "left-5" : "left-0.5",
                      )}
                      aria-hidden
                    />
                    <span className="sr-only">
                      {shown ? `Hide ${schema.label}` : `Show ${schema.label}`}
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
