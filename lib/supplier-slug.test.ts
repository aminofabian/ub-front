import { describe, expect, it } from "bun:test";

import type { SupplierRecord } from "@/lib/api";
import {
  resolveSupplierFromSlug,
  slugifySupplierSegment,
  supplierMatchesSlug,
  supplierSlug,
  supplierSlugSearchHint,
} from "@/lib/supplier-slug";

function supplier(
  partial: Pick<SupplierRecord, "id" | "name"> &
    Partial<Pick<SupplierRecord, "code">>,
): SupplierRecord {
  return {
    id: partial.id,
    name: partial.name,
    code: partial.code ?? null,
    supplierType: "vendor",
    vatPin: null,
    taxExempt: false,
    creditTermsDays: null,
    creditLimit: null,
    rating: null,
    status: "active",
    notes: null,
    paymentMethodPreferred: null,
    paymentDetails: null,
    payoutType: null,
    payoutPhone: null,
    version: 1,
    createdAt: "",
    updatedAt: "",
  };
}

describe("slugifySupplierSegment", () => {
  it("slugifies display names", () => {
    expect(slugifySupplierSegment("Jamro")).toBe("jamro");
    expect(slugifySupplierSegment("Jamro Ltd & Co")).toBe("jamro-ltd-and-co");
  });
});

describe("supplierSlug", () => {
  it("uses the supplier name", () => {
    expect(supplierSlug(supplier({ id: "1", name: "Jamro", code: "J1" }))).toBe(
      "jamro",
    );
  });
});

describe("resolveSupplierFromSlug", () => {
  const jamro = supplier({
    id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    name: "Jamro",
  });
  const other = supplier({
    id: "11111111-2222-4333-8444-555555555555",
    name: "Airtime",
    code: "ATM",
  });
  const jamroDup = supplier({
    id: "99999999-aaaa-4bbb-8ccc-dddddddddddd",
    name: "Jamro",
  });

  it("matches by name slug", () => {
    const r = resolveSupplierFromSlug([jamro, other], "jamro");
    expect(r.match?.id).toBe(jamro.id);
  });

  it("matches by code slug", () => {
    expect(supplierMatchesSlug(other, "atm")).toBe(true);
    const r = resolveSupplierFromSlug([jamro, other], "atm");
    expect(r.match?.id).toBe(other.id);
  });

  it("matches by id", () => {
    const r = resolveSupplierFromSlug([jamro, other], jamro.id);
    expect(r.match?.id).toBe(jamro.id);
  });

  it("returns candidates when ambiguous", () => {
    const r = resolveSupplierFromSlug([jamro, jamroDup, other], "jamro");
    expect(r.match).toBeNull();
    expect(r.candidates).toHaveLength(2);
  });

  it("builds a search hint from the slug", () => {
    expect(supplierSlugSearchHint("jamro-ltd")).toBe("jamro ltd");
  });
});
