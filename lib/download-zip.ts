/** Uncompressed ZIP (STORE). PNGs are already compressed. */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number): Uint8Array {
  const out = new Uint8Array(2);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  return out;
}

function u32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  out[2] = (value >>> 16) & 0xff;
  out[3] = (value >>> 24) & 0xff;
  return out;
}

function encodeName(name: string): Uint8Array {
  return new TextEncoder().encode(name.replace(/\\/g, "/"));
}

type ZipEntry = {
  name: Uint8Array;
  data: Uint8Array;
  crc: number;
  offset: number;
};

/**
 * Build a zip the merchant can save. One file per entry; names should be
 * unique and relative (`logo-light.png`).
 */
export async function filesToZipBlob(files: readonly File[]): Promise<Blob> {
  const entries: ZipEntry[] = [];
  let offset = 0;
  const locals: Uint8Array[] = [];

  for (const file of files) {
    const name = encodeName(file.name || "asset");
    const data = new Uint8Array(await file.arrayBuffer());
    const crc = crc32(data);
    const local = new Uint8Array(
      30 + name.length + data.length,
    );
    let p = 0;
    const write = (chunk: Uint8Array) => {
      local.set(chunk, p);
      p += chunk.length;
    };
    write(u32(0x04034b50));
    write(u16(20));
    write(u16(0));
    write(u16(0));
    write(u16(0));
    write(u16(0));
    write(u32(crc));
    write(u32(data.length));
    write(u32(data.length));
    write(u16(name.length));
    write(u16(0));
    write(name);
    write(data);
    entries.push({ name, data, crc, offset });
    locals.push(local);
    offset += local.length;
  }

  const centrals: Uint8Array[] = [];
  let centralSize = 0;
  for (const entry of entries) {
    const central = new Uint8Array(46 + entry.name.length);
    let p = 0;
    const write = (chunk: Uint8Array) => {
      central.set(chunk, p);
      p += chunk.length;
    };
    write(u32(0x02014b50));
    write(u16(20));
    write(u16(20));
    write(u16(0));
    write(u16(0));
    write(u16(0));
    write(u16(0));
    write(u32(entry.crc));
    write(u32(entry.data.length));
    write(u32(entry.data.length));
    write(u16(entry.name.length));
    write(u16(0));
    write(u16(0));
    write(u16(0));
    write(u16(0));
    write(u32(0));
    write(u32(entry.offset));
    write(entry.name);
    centrals.push(central);
    centralSize += central.length;
  }

  const eocd = new Uint8Array(22);
  let p = 0;
  const write = (chunk: Uint8Array) => {
    eocd.set(chunk, p);
    p += chunk.length;
  };
  write(u32(0x06054b50));
  write(u16(0));
  write(u16(0));
  write(u16(entries.length));
  write(u16(entries.length));
  write(u32(centralSize));
  write(u32(offset));
  write(u16(0));

  const chunks = [...locals, ...centrals, eocd];
  const merged = new Uint8Array(
    chunks.reduce((n, chunk) => n + chunk.byteLength, 0),
  );
  let cursor = 0;
  for (const chunk of chunks) {
    merged.set(chunk, cursor);
    cursor += chunk.byteLength;
  }
  return new Blob([merged.buffer], { type: "application/zip" });
}

export async function downloadFilesAsZip(
  files: readonly File[],
  zipName: string,
): Promise<void> {
  const blob = await filesToZipBlob(files);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = zipName.endsWith(".zip") ? zipName : `${zipName}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function downloadFile(file: File, href?: string): void {
  const url = href ?? URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (!href) {
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }
}
