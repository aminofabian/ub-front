"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Store,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { APP_ROUTES } from "@/lib/config";
import { getSessionTokens } from "@/lib/auth";
import {
  fetchBranches,
  fetchBusiness,
  fetchMe,
  updateBusiness,
  type BranchRecord,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryHex?: string | null;
};

function branchLocationLabel(branch: BranchRecord): string {
  const address = branch.address?.trim();
  if (address) {
    return address;
  }
  return branch.name;
}

function inputClass() {
  return cn(
    "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-sm",
    "placeholder:text-muted-foreground/70",
    "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
  );
}

export function StorefrontSetupModal({
  open,
  onOpenChange,
  primaryHex,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [storeLabel, setStoreLabel] = useState("");

  const primary =
    primaryHex && /^#[0-9a-fA-F]{6}$/.test(primaryHex.trim())
      ? primaryHex.trim()
      : null;

  const activeBranches = branches.filter((b) => b.active);
  const singleBranch = activeBranches.length === 1;

  const load = useCallback(async () => {
    if (!getSessionTokens()) {
      setError("Sign in as the shop owner to continue.");
      setBranches([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const me = await fetchMe();
      if ((me.role?.key ?? "").trim().toLowerCase() !== "owner") {
        setError("Only the business owner can enable the online shop.");
        setBranches([]);
        return;
      }
      const [biz, list] = await Promise.all([
        fetchBusiness(),
        fetchBranches(),
      ]);
      const active = list.filter((b) => b.active);
      setBranches(list);
      setStoreLabel(String(biz.storefront?.label ?? biz.name ?? "").trim());
      const existing = String(biz.storefront?.catalogBranchId ?? "").trim();
      if (existing && active.some((b) => b.id === existing)) {
        setSelectedBranchId(existing);
      } else if (active.length === 1) {
        setSelectedBranchId(active[0]!.id);
      } else {
        setSelectedBranchId("");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load your shop settings.",
      );
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void load();
    } else {
      setError(null);
      setSaving(false);
    }
  }, [open, load]);

  const onEnable = async () => {
    if (!selectedBranchId.trim()) {
      setError("Choose which location will power your online catalog.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateBusiness({
        storefront: {
          enabled: true,
          catalogBranchId: selectedBranchId.trim(),
          label: storeLabel.trim() || null,
        },
      });
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not enable your storefront.",
      );
    } finally {
      setSaving(false);
    }
  };

  const ownerBlocked =
    !!error?.includes("Only the business owner") ||
    !!error?.includes("Sign in as the shop owner");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SetupModalHeader primary={primary} />
        <div className="max-h-[min(60vh,28rem)] overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" aria-hidden />
              <p className="text-sm">Loading your branches…</p>
            </div>
          ) : activeBranches.length === 0 ? (
            <div className="space-y-4 py-2 text-center">
              {error ? (
                <div className="mb-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-left text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>{error}</p>
                </div>
              ) : null}
              {!ownerBlocked ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Add at least one active branch before opening your online
                    shop.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={APP_ROUTES.branches}>Manage branches</Link>
                  </Button>
                </>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {error ? (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>{error}</p>
                </div>
              ) : null}
              <SetupFormFields
                singleBranch={singleBranch}
                activeBranches={activeBranches}
                selectedBranchId={selectedBranchId}
                onSelectBranch={setSelectedBranchId}
                storeLabel={storeLabel}
                onStoreLabelChange={setStoreLabel}
              />
            </div>
          )}
        </div>
        {activeBranches.length > 0 && !ownerBlocked ? (
          <DialogFooter className="border-t border-border/60 bg-muted/20 px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onEnable()}
              disabled={loading || saving || !selectedBranchId.trim()}
              style={
                primary
                  ? { backgroundColor: primary, borderColor: primary }
                  : undefined
              }
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Enabling…
                </>
              ) : (
                "Open my shop"
              )}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SetupModalHeader({ primary }: { primary: string | null }) {
  return (
    <div
      className="relative overflow-hidden px-5 pb-4 pt-5"
      style={
        primary
          ? {
              background: `linear-gradient(135deg, color-mix(in srgb, ${primary} 18%, white), color-mix(in srgb, ${primary} 6%, white))`,
            }
          : undefined
      }
    >
      <DialogHeader className="relative gap-2 pr-10">
        <span
          className="inline-flex size-10 items-center justify-center rounded-xl bg-background/80 shadow-sm"
          style={primary ? { color: primary } : undefined}
        >
          <Store className="size-5" aria-hidden />
        </span>
        <DialogTitle>Set up your online shop</DialogTitle>
        <DialogDescription className="text-pretty">
          Pick the branch shoppers will see stock and prices from, then go live
          on this domain.
        </DialogDescription>
      </DialogHeader>
    </div>
  );
}

function SetupFormFields({
  singleBranch,
  activeBranches,
  selectedBranchId,
  onSelectBranch,
  storeLabel,
  onStoreLabelChange,
}: {
  singleBranch: boolean;
  activeBranches: BranchRecord[];
  selectedBranchId: string;
  onSelectBranch: (id: string) => void;
  storeLabel: string;
  onStoreLabelChange: (value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <label htmlFor="sf-label" className="text-sm font-medium">
          Shop name on storefront
          <span className="font-normal text-muted-foreground"> (optional)</span>
        </label>
        <input
          id="sf-label"
          className={inputClass()}
          value={storeLabel}
          onChange={(e) => onStoreLabelChange(e.target.value)}
          placeholder="e.g. HomeBest Online"
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {singleBranch ? "Confirm your shop location" : "Choose your location"}
        </legend>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {singleBranch
            ? "This branch will power your public catalog — stock and prices come from here."
            : "Select which branch customers should shop from."}
        </p>
        <ul className="space-y-2">
          {activeBranches.map((branch) => {
            const selected = selectedBranchId === branch.id;
            return (
              <li key={branch.id}>
                <button
                  type="button"
                  onClick={() => onSelectBranch(branch.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all",
                    selected
                      ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20"
                      : "border-border/80 bg-card hover:border-primary/30 hover:bg-accent/30",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                      selected
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <MapPin className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{branch.name}</span>
                      {selected ? (
                        <CheckCircle2
                          className="size-4 shrink-0 text-primary"
                          aria-hidden
                        />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {branchLocationLabel(branch)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>
    </>
  );
}
