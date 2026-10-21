"use client";

import { LayoutGrid, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ItemTypeRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";
import Link from "next/link";

type AssignDepartmentsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  departments: ItemTypeRecord[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSave: () => void;
  saving?: boolean;
};

export function AssignDepartmentsModal({
  open,
  onOpenChange,
  userName,
  departments,
  selectedIds,
  onToggle,
  onSave,
  saving = false,
}: AssignDepartmentsModalProps) {
  const selected = new Set(selectedIds);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        side="center"
        className="max-h-[min(92dvh,32rem)] max-w-md gap-0 overflow-hidden p-0"
      >
        <div className="shrink-0 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-5 pb-4 pt-5 pr-12">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-[1.0625rem] tracking-[-0.02em]">
              <LayoutGrid
                className="size-4 text-[var(--pos-primary,#0f766e)]"
                aria-hidden
              />
              Assign departments
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-relaxed">
              Choose which departments {userName.trim() || "this Department Head"}{" "}
              can run on the counter. They will only see products in the
              departments you assign.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {departments.length === 0 ? (
            <div className="space-y-2 rounded-none border border-dashed border-[color-mix(in_srgb,var(--order-ink,#15231f)_18%,transparent)] px-3 py-4 text-center">
              <p className="text-[13px] font-medium text-foreground">
                No departments yet
              </p>
              <p className="text-[12px] leading-snug text-muted-foreground">
                Create departments (item types) under Products, then come back
                to assign them.
              </p>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href={APP_ROUTES.products}>Open products</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {departments.map((dept) => {
                const label = dept.label?.trim() || "Department";
                const active = selected.has(dept.id);
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => onToggle(dept.id)}
                    className={cn(
                      "rounded-none border px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                      active
                        ? "border-[var(--pos-primary,#0f766e)] bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_12%,white)] text-[var(--pos-primary,#0f766e)]"
                        : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_10%,transparent)] px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Skip for now
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving || departments.length === 0}
            onClick={onSave}
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save assignments"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
