/**
 * Registry for surfaces that should confirm before the global header branch
 * changes (D6). Components register via {@link useScopeChangeGuard}.
 */

export type ScopeChangeKind = "branch" | "department";

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

/** Returns true when the scope change may proceed. */
export function confirmScopeChange(
  kind: ScopeChangeKind,
  activeGuards = [...guards.values()].filter((g) => g.isActive()),
): boolean {
  if (activeGuards.length === 0) return true;
  const label = kind === "branch" ? "branch" : "department";
  const detail = activeGuards.map((g) => `• ${g.message}`).join("\n");
  return window.confirm(
    `You have work in progress:\n\n${detail}\n\nChange ${label} anyway? Unsaved changes may not apply to the new scope.`,
  );
}
