/**
 * Build Cloudinary transformation URLs for uploaded images.
 *
 * Cloudinary applies transforms by inserting segments after `/image/upload/`,
 * and the transformed URL is servable as-is — so "improving" a photo is just
 * swapping the stored URL, no re-upload and no new asset.
 *
 * Supported here: `e_enhance` (auto-brighten/contrast) and
 * `e_background_removal` (subject cut-out for product shots).
 */
export function cloudinaryTransformUrl(
  url: string,
  transform: string,
): string | null {
  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (idx < 0) {
    return null;
  }
  const head = url.slice(0, idx + marker.length);
  const tail = url.slice(idx + marker.length);
  return `${head}${transform}/${tail}`;
}

export const CLOUDINARY_TRANSFORMS = {
  enhance: "e_enhance",
  removeBackground: "e_background_removal",
} as const;
