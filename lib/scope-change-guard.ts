/**
 * Registry for surfaces that should confirm before the global header branch
 * changes (D6). Components register via {@link useScopeChangeGuard}.
 */

import { showThemedConfirmToast } from "@/components/super-admin/themed-confirm-toast";

export type ScopeChangeKind = "branch" | "department" | "shelf-zone";

type ScopeGuard = {
  id: string;
  message: string;
  isActive: () => boolean;
};

const guards = new Map<string, ScopeGuard>();

export function registerScopeGuard(guard: ScopeGuard): () => void {
  guards.set(guard.id, guard);
  return () => {
    guards.delete(guard.id);
  };
}

/**
 * Runs `onConfirm` immediately when no guards are active; otherwise shows a
 * themed confirm toast and runs `onConfirm` only if the user proceeds.
 */
export function confirmScopeChange(
  kind: ScopeChangeKind,
  onConfirm: () => void,
  activeGuards = [...guards.values()].filter((g) => g.isActive()),
): void {
  if (activeGuards.length === 0) {
    onConfirm();
    return;
  }
  const label =
    kind === "branch"
      ? "branch"
      : kind === "department"
        ? "department"
        : "shelf zone";
  const detail = activeGuards.map((g) => `• ${g.message}`).join("\n");
  showThemedConfirmToast({
    id: `scope-change-${kind}`,
    title: `Change ${label}?`,
    description: `You have work in progress:\n\n${detail}\n\nUnsaved changes may not apply to the new scope.`,
    confirmLabel: "Change anyway",
    confirmVariant: "default",
    onConfirm,
  });
}
