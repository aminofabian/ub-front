"use client";

import { Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useDashboard } from "@/components/dashboard-provider";
import { SetupExplainer } from "@/components/setup/setup-explainer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createBranch, withSuppressedHttpErrorToasts } from "@/lib/api";
import type { BranchSetupHint } from "@/lib/setup-requirements";

type Props = {
  hint?: BranchSetupHint;
  onDone: () => void;
  onDismiss: () => void;
};

const WHAT_IS_A_BRANCH =
  "A branch is one place you sell from: a shop, a stall or a warehouse. Each branch keeps its own stock, tills and shifts.";
const WHY_A_BRANCH =
  "Every price, stock count and sale is saved against a branch. Without one there is nowhere to put them.";

/**
 * Shown when something needs a branch and the person has none to use: create the first one,
 * pick one of several, or (for accounts that can't create branches) say who to ask.
 */
export function BranchSetupDialog({ hint, onDone, onDismiss }: Props) {
  const {
    branches,
    branchesLoading,
    canManageBusinessSettings,
    refreshBranches,
    setBranchId,
  } = useDashboard();
  const active = branches.filter((b) => b.active);

  const mode: "create" | "pick" | "ask" =
    hint === "assign"
      ? "ask"
      : active.length === 0 && !branchesLoading
        ? canManageBusinessSettings
          ? "create"
          : "ask"
        : "pick";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <DialogContent side="center" className="sm:max-w-md">
        {mode === "create" ? (
          <CreateBranch
            refreshBranches={refreshBranches}
            onDone={onDone}
            onDismiss={onDismiss}
          />
        ) : mode === "pick" ? (
          <PickBranch
            branches={active}
            loading={branchesLoading}
            onPick={(id) => {
              setBranchId(id);
              onDone();
            }}
            onDismiss={onDismiss}
          />
        ) : (
          <AskForBranch assignHint={hint === "assign"} onDismiss={onDismiss} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Header({ title, lead }: { title: string; lead: string }) {
  return (
    <DialogHeader className="flex flex-row items-start gap-3 space-y-0 text-left">
      <span
        className="mt-1 flex size-8 shrink-0 items-center justify-center bg-[var(--op-accent,#1D4B3B)] text-white"
        aria-hidden
      >
        <Building2 className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1 pr-6">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="text-[13px] leading-relaxed">
          {lead}
        </DialogDescription>
      </div>
    </DialogHeader>
  );
}

function CreateBranch({
  refreshBranches,
  onDone,
  onDismiss,
}: {
  refreshBranches: () => Promise<void>;
  onDone: () => void;
  onDismiss: () => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the branch a name, for example Main shop.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const created = await withSuppressedHttpErrorToasts(() =>
        createBranch({
          name: trimmed,
          address: address.trim() || undefined,
        }),
      );
      // The dashboard selects the shop's only branch on its own once the list reloads.
      await refreshBranches();
      toast.success(`Branch created: ${created.name}`);
      onDone();
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Could not create the branch. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Header
        title="Add your first branch"
        lead="You need a branch before you can add products or take a sale."
      />
      <SetupExplainer
        items={[
          { label: "What is a branch?", body: WHAT_IS_A_BRANCH },
          {
            label: "Why it matters",
            body: `${WHY_A_BRANCH} You can add more branches later.`,
          },
        ]}
      />
      <label className="space-y-1.5 text-sm">
        <span className="font-medium">Branch name</span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 120))}
          placeholder="e.g. Main shop"
          maxLength={120}
          autoFocus
          disabled={saving}
        />
      </label>
      <label className="space-y-1.5 text-sm">
        <span className="font-medium">
          Address{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value.slice(0, 255))}
          placeholder="e.g. Moi Avenue, Nairobi"
          maxLength={255}
          disabled={saving}
        />
      </label>
      {error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={saving} onClick={onDismiss}>
          Not now
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create branch"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function PickBranch({
  branches,
  loading,
  onPick,
  onDismiss,
}: {
  branches: { id: string; name: string }[];
  loading: boolean;
  onPick: (id: string) => void;
  onDismiss: () => void;
}) {
  const [choice, setChoice] = useState(branches[0]?.id ?? "");
  const selected = branches.some((b) => b.id === choice)
    ? choice
    : (branches[0]?.id ?? "");

  return (
    <div className="flex flex-col gap-4">
      <Header
        title="Choose a branch"
        lead="Pick the branch you are working in, then carry on."
      />
      <SetupExplainer
        items={[
          { label: "What is a branch?", body: WHAT_IS_A_BRANCH },
          { label: "Why it matters", body: WHY_A_BRANCH },
        ]}
      />
      {loading && branches.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Loading branches…</p>
      ) : (
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Branch</span>
          <select
            className="h-9 w-full rounded-[2px] border border-input bg-background px-3 text-sm"
            value={selected}
            onChange={(e) => setChoice(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDismiss}>
          Not now
        </Button>
        <Button type="button" disabled={!selected} onClick={() => onPick(selected)}>
          Use this branch
        </Button>
      </DialogFooter>
    </div>
  );
}

function AskForBranch({
  assignHint,
  onDismiss,
}: {
  assignHint: boolean;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Header
        title={
          assignHint ? "Your account has no branch yet" : "This shop has no branch yet"
        }
        lead={
          assignHint
            ? "Ask the shop owner or a manager to place you on one, then try again."
            : "Ask the shop owner to add a branch, then try again."
        }
      />
      <SetupExplainer
        items={[
          { label: "What is a branch?", body: WHAT_IS_A_BRANCH },
          { label: "Why it matters", body: WHY_A_BRANCH },
        ]}
      />
      <DialogFooter>
        <Button type="button" onClick={onDismiss}>
          Got it
        </Button>
      </DialogFooter>
    </div>
  );
}
