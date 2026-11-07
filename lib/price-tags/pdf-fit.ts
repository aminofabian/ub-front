import { DROP_ORDER, type FaceBlock, type FaceBlockKind } from "@/lib/price-tags/face";

export type MeasuredBlock = {
  block: FaceBlock;
  sizeMm: number;
  lines: string[];
  heightMm: number;
  /** True when the text was made smaller than its template size to fit the width. */
  shrunk?: boolean;
};

export const BLOCK_GAP_MM = 0.4;

export function stackHeight(blocks: readonly MeasuredBlock[]): number {
  if (blocks.length === 0) return 0;
  let total = BLOCK_GAP_MM * (blocks.length - 1);
  for (const entry of blocks) total += entry.heightMm;
  return total;
}

/**
 * Make a face fit its tag instead of spilling onto the next one: drop the
 * least important lines first (see DROP_ORDER), and shorten a two-line name
 * before giving up the barcode. Name and price always stay.
 */
export function fitFaceBlocks(
  measured: readonly MeasuredBlock[],
  availableMm: number,
  shortenName: (entry: MeasuredBlock) => MeasuredBlock,
): { blocks: MeasuredBlock[]; heightMm: number; dropped: FaceBlockKind[] } {
  let blocks = measured.slice();
  const dropped: FaceBlockKind[] = [];
  const fits = () => stackHeight(blocks) <= availableMm + 0.01;

  for (const kind of DROP_ORDER) {
    if (fits()) break;
    if (kind === "barcode") {
      blocks = blocks.map((entry) =>
        entry.block.kind === "name" && entry.lines.length > 1 ? shortenName(entry) : entry,
      );
      if (fits()) break;
    }
    for (let index = blocks.length - 1; index >= 0 && !fits(); index -= 1) {
      if (blocks[index].block.kind !== kind) continue;
      blocks = blocks.slice(0, index).concat(blocks.slice(index + 1));
      dropped.push(kind);
    }
  }
  return { blocks, heightMm: stackHeight(blocks), dropped };
}
