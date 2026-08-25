export type CategorySelectSource = {
  id: string;
  name: string;
  active: boolean;
  parentId?: string | null;
};

export type CategorySelectOption = {
  value: string;
  label: string;
  hint?: string;
};

/** Labels for the picker. Duplicate names get the parent so they stay distinct. */
export function categorySelectOptions(
  cats: CategorySelectSource[],
): CategorySelectOption[] {
  const byId = new Map(cats.map((c) => [c.id, c] as const));
  const nameCount = new Map<string, number>();
  for (const c of cats) {
    const key = c.name.trim().toLowerCase();
    nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
  }

  const rows = cats.map((c) => {
    const key = c.name.trim().toLowerCase();
    const dup = (nameCount.get(key) ?? 0) > 1;
    const parent = c.parentId ? byId.get(c.parentId) : undefined;
    const bits: string[] = [];
    if (dup && parent?.name.trim()) bits.push(parent.name.trim());
    if (!c.active) bits.push("off");
    return {
      value: c.id,
      label: c.name,
      hint: bits.length > 0 ? bits.join(" · ") : undefined,
    };
  });

  rows.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  return rows;
}
