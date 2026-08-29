"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PublicSignInDestination } from "@/lib/api";
import { staffDestinationHost } from "@/lib/staff-tenant-resolve";
import { cn } from "@/lib/utils";

type StaffShopPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinations: PublicSignInDestination[];
  email: string;
  busy?: boolean;
  onPick: (destination: PublicSignInDestination) => void;
};

export function StaffShopPickerDialog({
  open,
  onOpenChange,
  destinations,
  email,
  busy = false,
  onPick,
}: StaffShopPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0" side="center">
        <div className="border-b border-black/[0.06] px-6 py-5 dark:border-white/10">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Choose your shop
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">{email}</span> is
              linked to {destinations.length} shops. Pick the one you want to
              sign in to.
            </DialogDescription>
          </DialogHeader>
        </div>

        <ul className="max-h-[min(50dvh,320px)] space-y-2 overflow-y-auto px-4 py-4">
          {destinations.map((row, index) => {
            const host = staffDestinationHost(row);
            return (
              <li key={`${row.slug}:${row.name}`}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onPick(row)}
                  style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
                  className={cn(
                    "group w-full rounded-lg border border-black/[0.08] bg-background px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow] duration-200 ease-out",
                    "hover:border-[var(--auth-accent)]/40 hover:bg-[color-mix(in_srgb,var(--auth-accent)_5%,white)]",
                    "focus-visible:border-[var(--auth-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)]/25",
                    "disabled:pointer-events-none disabled:opacity-60",
                    "dark:border-white/10 dark:hover:bg-[color-mix(in_srgb,var(--auth-accent)_10%,#18181b)]",
                  )}
                >
                  <span className="block font-semibold text-foreground">
                    {row.name}
                  </span>
                  {host ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {host}
                    </span>
                  ) : null}
                  <span className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>Till &amp; office sign-in</span>
                    <span
                      aria-hidden
                      className="font-medium text-[var(--auth-accent)] transition-transform duration-150 group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
