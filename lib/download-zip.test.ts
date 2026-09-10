import { describe, expect, test } from "bun:test";

import { filesToZipBlob } from "@/lib/download-zip";

describe("filesToZipBlob", () => {
  test("packs each file so the zip is larger than the payloads", async () => {
    const a = new File([new Uint8Array([1, 2, 3, 4])], "logo-light.png", {
      type: "image/png",
    });
    const b = new File([new Uint8Array([5, 6, 7, 8, 9])], "favicon.png", {
      type: "image/png",
    });
    const blob = await filesToZipBlob([a, b]);
    expect(blob.type).toBe("application/zip");
    expect(blob.size).toBeGreaterThan(a.size + b.size);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
  });
});
