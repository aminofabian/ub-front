"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
  Plus,
  Search,
} from "lucide-react";

import { AddBranchDrawer } from "@/components/branches/add-branch-drawer";
import type { BranchRecord } from "@/lib/api";
import { APP_ROUTES } from "@/lib/config";
import { cn } from "@/lib/utils";

type BranchSwitcherProps = {
  branches: readonly BranchRecord[];
  branchId: string;
  onChange: (branchId: string) => void;
  loading?: boolean;
  /**
   * `header` is the compact pill + floating menu used in the desktop app bar.
   * `inline` expands inside its parent (the tablet More sheet).
   */
  variant?: "header" | "inline";
  /** Owners/admins may create a branch from inside the menu. */
  canManage?: boolean;
  /** Refresh the list and make the new branch current. */
  onCreated?: (branch: BranchRecord) => void | Promise<void>;
  className?: string;
};

const SEARCH_THRESHOLD = 5;

function branchMatches(branch: BranchRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    branch.name.toLowerCase().includes(q) ||
    (branch.address ?? "").toLowerCase().includes(q)
  );
}

/**
 * Branch switcher with the "add a new branch" action living exactly where
 * people expect it: inside the branch menu itself.
 */
export function BranchSwitcher({
  branches,
  branchId,
  onChange,
  loading = false,
  variant = "header",
  canManage = false,
  onCreated,
  className,
}: BranchSwitcherProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");

  const current = branches.find((branch) => branch.id === branchId) ?? null;
  const inline = variant === "inline";
  const showSearch = branches.length > SEARCH_THRESHOLD;

  const visibleBranches = useMemo(
    () => branches.filter((branch) => branchMatches(branch, query)),
    [branches, query],
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const startAdd = () => {
    setOpen(false);
    setAddOpen(true);
  };

  const triggerLabel = current?.name
    ? current.name
    : loading
      ? "Loading…"
      : branches.length === 0
        ? canManage
          ? "Add branch"
          : "No branch"
        : "Select branch";

  const panel = open ? (
    <div
      id={listId}
      role="group"
      aria-label="Branches"
      className={cn(
        "overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--order-ink,#15231f)_14%,transparent)] bg-white",
        "shadow-[0_14px_38px_-10px_color-mix(in_srgb,var(--order-ink,#15231f)_30%,transparent)]",
        inline
          ? "mt-1"
          : "absolute right-0 top-[calc(100%+6px)] z-[70] w-[min(20rem,calc(100vw-1.5rem))]",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] px-3 py-2">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.15em] text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)]">
          Switch branch
        </p>
        <span className="shrink-0 text-[10px] font-medium tabular-nums text-[color-mix(in_srgb,var(--order-ink,#15231f)_42%,transparent)]">
          {branches.length} {branches.length === 1 ? "location" : "locations"}
        </span>
      </div>

      {showSearch ? (
        <div className="border-b border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] p-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[color-mix(in_srgb,var(--order-ink,#15231f)_38%,transparent)]"
              aria-hidden
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a branch…"
              aria-label="Find a branch"
              className={cn(
                "h-8 w-full rounded-md border bg-white pl-7 pr-2 text-[12px] tracking-[-0.01em]",
                "border-[color-mix(in_srgb,var(--order-ink,#15231f)_12%,transparent)]",
                "placeholder:text-[color-mix(in_srgb,var(--order-ink,#15231f)_36%,transparent)]",
                "focus-visible:border-[var(--pos-primary,#0f766e)] focus-visible:outline-none",
              )}
              autoFocus
            />
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-y-auto p-1",
          inline
            ? "max-h-[min(13rem,34dvh)]"
            : "max-h-[min(18rem,50dvh)]",
        )}
      >
        {visibleBranches.length > 0 ? (
          visibleBranches.map((branch) => {
            const active = branch.id === branchId;
            return (
              <button
                key={branch.id}
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => pick(branch.id)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pos-primary,#0f766e)]/30",
                  active
                    ? "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_9%,white)]"
                    : "hover:bg-[color-mix(in_srgb,var(--order-ink,#15231f)_4%,white)]",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg border",
                    active
                      ? "border-[var(--pos-primary,#0f766e)]/25 bg-white text-[var(--pos-primary,#0f766e)]"
                      : "border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_3%,white)] text-[color-mix(in_srgb,var(--order-ink,#15231f)_48%,transparent)]",
                  )}
                  aria-hidden
                >
                  <MapPin className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-[12.5px] tracking-[-0.015em]",
                      active
                        ? "font-semibold text-[var(--order-ink,#15231f)]"
                        : "font-medium text-[var(--order-ink,#15231f)]",
                    )}
                  >
                    {branch.name}
                  </span>
                  {branch.address?.trim() ? (
                    <span className="mt-0.5 block truncate text-[10.5px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_44%,transparent)]">
                      {branch.address}
                    </span>
                  ) : (
                    <span className="mt-0.5 block text-[10.5px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_40%,transparent)]">
                      {active ? "You are here" : "Branch"}
                    </span>
                  )}
                </span>
                {active ? (
                  <Check
                    className="size-4 shrink-0 text-[var(--pos-primary,#0f766e)]"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                ) : (
                  <span className="size-4 shrink-0" aria-hidden />
                )}
              </button>
            );
          })
        ) : (
          <div className="px-3 py-5 text-center">
            <p className="text-[12px] font-medium text-[var(--order-ink,#15231f)]">
              {query.trim()
                ? "No branch matches that search"
                : loading
                  ? "Loading branches…"
                  : "No branches yet"}
            </p>
            <p className="mt-1 text-[10.5px] leading-snug text-[color-mix(in_srgb,var(--order-ink,#15231f)_46%,transparent)]">
              {query.trim()
                ? "Try a different name or clear the search."
                : canManage
                  ? "Add the first place you sell from to get started."
                  : "Ask an owner to add one."}
            </p>
          </div>
        )}
      </div>

      {canManage ? (
        <button
          type="button"
          onClick={startAdd}
          className={cn(
            "flex w-full items-center gap-2.5 border-t px-3 py-2.5 text-left transition-colors",
            "border-[color-mix(in_srgb,var(--order-ink,#15231f)_9%,transparent)]",
            "bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_5%,white)]",
            "hover:bg-[color-mix(in_srgb,var(--pos-primary,#0f766e)_10%,white)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pos-primary,#0f766e)]/30",
          )}
        >
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--pos-primary,#0f766e)] text-white"
            aria-hidden
          >
            <Plus className="size-4" strokeWidth={2.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-semibold tracking-[-0.015em] text-[var(--order-ink,#15231f)]">
              Add a new branch
            </span>
            <span className="mt-0.5 block text-[10.5px] text-[color-mix(in_srgb,var(--order-ink,#15231f)_46%,transparent)]">
              Open another shop, counter, or stall
            </span>
          </span>
          <ChevronRight
            className="size-3.5 shrink-0 text-[color-mix(in_srgb,var(--order-ink,#15231f)_36%,transparent)]"
            aria-hidden
          />
        </button>
      ) : null}

      <div className="border-t border-[color-mix(in_srgb,var(--order-ink,#15231f)_8%,transparent)] bg-[color-mix(in_srgb,var(--order-ink,#15231f)_2%,white)] px-3 py-1.5">
        <Link
          href={APP_ROUTES.branches}
          onClick={() => setOpen(false)}
          className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[color-mix(in_srgb,var(--order-ink,#15231f)_52%,transparent)] transition-colors hover:text-[var(--pos-primary,#0f766e)]"
        >
          Manage branches
          <ChevronRight className="size-3" aria-hidden />
        </Link>
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={cn(inline ? "w-full min-w-0" : "relative", className)}
    >
      <button
        ref={triggerRef}
        type="button"
        data-shell-branch-select=""
        onClick={() => setOpen((value) => !value)}
        disabled={loading && branches.length === 0}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label="Select branch"
        title="Switch or add a branch"
        className={cn(
          inline
            ? cn(
                "flex w-full items-center justify-between gap-2 py-2.5 text-left",
                "text-[13px] font-medium tracking-[-0.01em] text-[var(--order-ink,#15231f)]",
                "focus-visible:outline-none disabled:opacity-50",
              )
            : cn(
                "inline-flex h-8 max-w-[11rem] items-center gap-1.5 rounded-md border bg-background px-2",
                "text-xs font-medium text-foreground shadow-sm",
                "transition-[border-color,background-color] hover:bg-muted/40",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                "disabled:cursor-wait disabled:opacity-50",
                open && "border-[var(--pos-primary,#0f766e)]/50 bg-muted/30",
              ),
        )}
      >
        {current ? (
          <MapPin
            className={cn(
              "shrink-0 text-[var(--pos-primary,#0f766e)]",
              inline ? "size-3.5" : "size-3.5",
            )}
            aria-hidden
          />
        ) : (
          <Plus
            className="size-3.5 shrink-0 text-[var(--pos-primary,#0f766e)]"
            aria-hidden
          />
        )}
        <span className={cn("min-w-0 truncate", inline && "flex-1")}>
          {triggerLabel}
        </span>
        <ChevronDown
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {panel}

      <AddBranchDrawer
        open={addOpen}
        onOpenChange={setAddOpen}
        existingBranches={branches}
        onCreated={onCreated}
      />
    </div>
  );
}
