"use client";

import { useEffect, useState } from "react";
import { Boxes, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PackageVariantsSection } from "./PackageVariantsSection";
import { emptyPackageDraft, type PackageDraft } from "../_types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentName: string;
  parentId: string | null;
  baseUnitHint?: string;
  currencyCode?: string;
  busy?: boolean;
  onCreatePackages: (
    parentId: string,
    rows: PackageDraft[],
  ) => Promise<boolean>;
};

export function AddPackageModal({
  open,
  onOpenChange,
  parentName,
  parentId,
  baseUnitHint = "base unit",
  currencyCode = "",
  busy = false,
  onCreatePackages,
}: Props) {
  const [rows, setRows] = useState<PackageDraft[]>([emptyPackageDraft()]);

  useEffect(() => {
    if (!open) return;
    setRows([emptyPackageDraft()]);
  }, [open, parentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentId) return;
    const ok = await onCreatePackages(parentId, rows);
    if (ok) onOpenChange(false);
  };

  const validCount = rows.filter(
    (r) => r.name.trim() && r.unitsPerPackage.trim(),
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,40rem)] max-w-lg gap-0 overflow-hidden p-0">
        <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-col">
          <DialogHeader className="border-b border-border/50 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Boxes className="size-5 text-primary" aria-hidden />
              Package sales
            </DialogTitle>
            <DialogDescription>
              Creates a <span className="font-medium text-foreground">new variant SKU</span> for{" "}
              <span className="font-medium text-foreground">{parentName}</span> (e.g. tray of 30).
              Stock stays on the base product — selling one package deducts that many base units.
              This does not change your existing single-unit variant.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <PackageVariantsSection
              showEnableToggle={false}
              enabled
              onEnabledChange={() => {}}
              rows={rows}
              onRowsChange={setRows}
              baseUnitHint={baseUnitHint}
              currencyCode={currencyCode}
            />
          </div>

          <DialogFooter className="border-t border-border/50 bg-muted/20 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || !parentId || validCount === 0}
              className="gap-2"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {validCount > 1
                ? `Add ${validCount} packages`
                : validCount === 1
                  ? "Add package"
                  : "Add package"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
