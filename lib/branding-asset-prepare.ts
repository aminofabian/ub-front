/** Fit a generated square into a favicon-sized PNG under the upload cap. */

const FAVICON_PX = 256;

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Could not encode the image."));
      },
      type,
      quality,
    );
  });
}

export async function resizePngToSquare(
  file: File,
  px: number,
): Promise<File> {
  if (typeof createImageBitmap !== "function") {
    return file;
  }
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }
    ctx.clearRect(0, 0, px, px);
    ctx.drawImage(bitmap, 0, 0, px, px);
    const blob = await canvasToBlob(canvas, "image/png");
    const base = file.name.replace(/\.[^.]+$/, "") || "asset";
    return new File([blob], `${base}.png`, { type: "image/png" });
  } finally {
    bitmap.close();
  }
}

export async function prepareFaviconFile(file: File): Promise<File> {
  return resizePngToSquare(file, FAVICON_PX);
}
