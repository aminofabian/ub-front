import type { TagProduct } from "@/lib/price-tags/types";

/**
 * Print a whole department, category, shelf zone or catalogue without loading
 * it all onto the sheet: read a page of products, send it, read the next.
 * Position is counted in the server's sorted list, so a stopped run resumes
 * at the first product not yet sent and never prints a label twice.
 */

export type CatalogPage = {
  products: (TagProduct | null)[];
  /** Every product matching the filters, before any are skipped. */
  total: number;
  last: boolean;
};

export type CatalogRunProgress = {
  /** Catalogue position: products before this one are done (sent or skipped). */
  position: number;
  total: number | null;
  productsSent: number;
  tagsSent: number;
  skippedUnpriced: number;
  skippedUnsellable: number;
};

export type CatalogRunOptions = {
  /** Catalogue position to start from; 0 for a fresh run, or a stopped run's `position`. */
  startAt: number;
  copies: number;
  skipUnpriced: boolean;
  /** Labels per printed row (2 for a 2-across roll). Batches fill whole rows. */
  perRow: number;
  pageSize?: number;
  /** About how many tags to send at once. */
  targetBatchTags?: number;
  fetchPage: (page: number, size: number) => Promise<CatalogPage>;
  send: (products: TagProduct[], copies: number) => Promise<void>;
  /** Resolves when the run may go on; returns true to stop before the next batch. */
  checkpoint: () => Promise<boolean>;
  onProgress?: (progress: CatalogRunProgress) => void;
};

export type CatalogRunResult = CatalogRunProgress & { finished: boolean };

export class CatalogRunError extends Error {
  constructor(
    message: string,
    /** Safe place to resume: the first product of the batch that failed. */
    readonly progress: CatalogRunProgress,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CatalogRunError";
  }
}

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_BATCH_TAGS = 48;
export const MAX_RUN_COPIES = 20;

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Products per batch so the batch's tags fill whole rows: with 2 across and
 * 1 copy each, an even number of products. Close to `targetTags` tags.
 */
export function batchProductCount(copies: number, perRow: number, targetTags: number): number {
  const across = Math.max(1, Math.floor(perRow));
  const each = Math.max(1, Math.floor(copies));
  const unit = across / gcd(each, across);
  const units = Math.max(1, Math.floor(targetTags / (unit * each)));
  return unit * units;
}

type Pending = { product: TagProduct; position: number };

export async function runCatalog(options: CatalogRunOptions): Promise<CatalogRunResult> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const copies = Math.min(MAX_RUN_COPIES, Math.max(1, Math.floor(options.copies)));
  const batchSize = batchProductCount(copies, options.perRow, options.targetBatchTags ?? DEFAULT_BATCH_TAGS);
  const progress: CatalogRunProgress = {
    position: Math.max(0, Math.floor(options.startAt)),
    total: null,
    productsSent: 0,
    tagsSent: 0,
    skippedUnpriced: 0,
    skippedUnsellable: 0,
  };
  let pending: Pending[] = [];
  /** Position just after the last product read from the server. */
  let readUpTo = progress.position;
  let page = Math.floor(progress.position / pageSize);
  let exhausted = false;

  const report = () => options.onProgress?.({ ...progress });

  const sendBatch = async (batch: Pending[]) => {
    if (await options.checkpoint()) return false;
    try {
      await options.send(
        batch.map((entry) => entry.product),
        copies,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "The batch could not be sent.";
      throw new CatalogRunError(message, { ...progress }, error);
    }
    progress.productsSent += batch.length;
    progress.tagsSent += batch.length * copies;
    pending = pending.slice(batch.length);
    progress.position = pending.length > 0 ? pending[0].position : readUpTo;
    report();
    return true;
  };

  while (!exhausted || pending.length > 0) {
    while (!exhausted && pending.length < batchSize) {
      let result: CatalogPage;
      try {
        result = await options.fetchPage(page, pageSize);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not read the catalogue.";
        throw new CatalogRunError(message, { ...progress }, error);
      }
      progress.total = result.total;
      const first = page * pageSize;
      result.products.forEach((product, offset) => {
        const position = first + offset;
        if (position < readUpTo) return;
        readUpTo = position + 1;
        if (!product) progress.skippedUnsellable += 1;
        else if (options.skipUnpriced && product.sellingPrice == null) progress.skippedUnpriced += 1;
        else pending.push({ product, position });
      });
      if (result.products.length === 0 || result.last) exhausted = true;
      page += 1;
      // Skipped products are done too; move the resume point past them.
      if (pending.length === 0) progress.position = readUpTo;
      report();
    }
    if (pending.length === 0) break;
    const batch = pending.slice(0, batchSize);
    if (!(await sendBatch(batch))) return { ...progress, finished: false };
  }
  return { ...progress, finished: true };
}
