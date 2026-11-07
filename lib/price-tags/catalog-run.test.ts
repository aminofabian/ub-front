import { describe, expect, it } from "vitest";

import { CatalogRunError, batchProductCount, runCatalog, type CatalogPage } from "@/lib/price-tags/catalog-run";
import type { TagProduct } from "@/lib/price-tags/types";

function product(index: number, price: number | null = 100): TagProduct {
  return {
    id: `p${index}`,
    name: `Product ${index}`,
    sku: `S${index}`,
    barcode: "",
    categoryName: "",
    unitType: "",
    sellingPrice: price,
    catalogWasPrice: null,
    pricePer: "",
  };
}

/** A fake catalogue: `null` marks a product that cannot be sold. */
function catalogue(rows: (TagProduct | null)[]) {
  const reads: number[] = [];
  const fetchPage = async (page: number, size: number): Promise<CatalogPage> => {
    reads.push(page);
    const slice = rows.slice(page * size, page * size + size);
    return { products: slice, total: rows.length, last: (page + 1) * size >= rows.length };
  };
  return { fetchPage, reads };
}

const go = async () => false;

describe("printing a whole catalogue", () => {
  it("sizes batches to fill whole rows on a multi-across roll", () => {
    expect(batchProductCount(1, 2, 48)).toBe(48);
    expect(batchProductCount(1, 2, 47)).toBe(46);
    expect(batchProductCount(3, 2, 48)).toBe(16);
    expect(batchProductCount(1, 3, 10)).toBe(9);
    expect(batchProductCount(50, 1, 48)).toBe(1);
  });

  it("sends every product once, in order, page by page", async () => {
    const rows = Array.from({ length: 23 }, (_, index) => product(index));
    const { fetchPage } = catalogue(rows);
    const sent: string[][] = [];
    const result = await runCatalog({
      startAt: 0,
      copies: 1,
      skipUnpriced: true,
      perRow: 2,
      pageSize: 10,
      targetBatchTags: 6,
      fetchPage,
      send: async (products) => {
        sent.push(products.map((row) => row.id));
      },
      checkpoint: go,
    });
    expect(result.finished).toBe(true);
    expect(sent.flat()).toEqual(rows.map((row) => row.id));
    expect(sent.slice(0, -1).every((batch) => batch.length % 2 === 0)).toBe(true);
    expect(result).toMatchObject({ productsSent: 23, tagsSent: 23, position: 23, total: 23 });
  });

  it("skips unpriced and unsellable products and counts them", async () => {
    const { fetchPage } = catalogue([product(0), product(1, null), null, product(3)]);
    const sent: string[] = [];
    const result = await runCatalog({
      startAt: 0, copies: 2, skipUnpriced: true, perRow: 1, pageSize: 2, fetchPage,
      send: async (products) => { sent.push(...products.map((row) => row.id)); },
      checkpoint: go,
    });
    expect(sent).toEqual(["p0", "p3"]);
    expect(result).toMatchObject({ tagsSent: 4, skippedUnpriced: 1, skippedUnsellable: 1, position: 4 });
  });

  it("stops between batches and resumes without reprinting", async () => {
    const rows = Array.from({ length: 12 }, (_, index) => product(index));
    const first = catalogue(rows);
    const sent: string[] = [];
    let batches = 0;
    const stopped = await runCatalog({
      startAt: 0, copies: 1, skipUnpriced: true, perRow: 2, pageSize: 5, targetBatchTags: 4,
      fetchPage: first.fetchPage,
      send: async (products) => { sent.push(...products.map((row) => row.id)); },
      checkpoint: async () => { batches += 1; return batches > 2; },
    });
    expect(stopped.finished).toBe(false);
    expect(stopped.position).toBe(8);
    const second = catalogue(rows);
    const resumed = await runCatalog({
      startAt: stopped.position, copies: 1, skipUnpriced: true, perRow: 2, pageSize: 5, targetBatchTags: 4,
      fetchPage: second.fetchPage,
      send: async (products) => { sent.push(...products.map((row) => row.id)); },
      checkpoint: go,
    });
    expect(second.reads[0]).toBe(1);
    expect(resumed.finished).toBe(true);
    expect(sent).toEqual(rows.map((row) => row.id));
  });

  it("reports where to resume when a batch fails", async () => {
    const rows = Array.from({ length: 6 }, (_, index) => product(index));
    const { fetchPage } = catalogue(rows);
    let calls = 0;
    const run = runCatalog({
      startAt: 0, copies: 1, skipUnpriced: true, perRow: 2, pageSize: 10, targetBatchTags: 2, fetchPage,
      send: async () => { calls += 1; if (calls === 2) throw new Error("Printer offline"); },
      checkpoint: go,
    });
    await expect(run).rejects.toBeInstanceOf(CatalogRunError);
    const error = await run.catch((e: CatalogRunError) => e);
    expect(error.message).toBe("Printer offline");
    expect(error.progress).toMatchObject({ position: 2, productsSent: 2 });
  });
});
