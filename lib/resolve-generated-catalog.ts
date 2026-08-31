import type { GenerateProductDescriptionResponse } from "./catalog-description-api";

export async function resolveGeneratedCatalogIds(
  hints: GenerateProductDescriptionResponse,
  opts: {
    canCreateCategory?: boolean;
    canCreateDepartment?: boolean;
    createCategory?: (name: string) => Promise<{ id: string }>;
    createDepartment?: (name: string) => Promise<{ id: string }>;
  },
): Promise<{ categoryId?: string; itemTypeId?: string }> {
  const out: { categoryId?: string; itemTypeId?: string } = {};

  if (hints.categoryId?.trim()) {
    out.categoryId = hints.categoryId.trim();
  } else if (
    hints.createCategory &&
    hints.categoryName?.trim() &&
    opts.canCreateCategory &&
    opts.createCategory
  ) {
    try {
      const created = await opts.createCategory(hints.categoryName.trim());
      out.categoryId = created.id;
    } catch {
      /* description still applies */
    }
  }

  if (hints.itemTypeId?.trim()) {
    out.itemTypeId = hints.itemTypeId.trim();
  } else if (
    hints.createItemType &&
    hints.itemTypeName?.trim() &&
    opts.canCreateDepartment &&
    opts.createDepartment
  ) {
    try {
      const created = await opts.createDepartment(hints.itemTypeName.trim());
      out.itemTypeId = created.id;
    } catch {
      /* description still applies */
    }
  }

  return out;
}
