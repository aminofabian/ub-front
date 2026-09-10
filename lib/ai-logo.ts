/** Convert an Images-API Base64 payload into a File the branding uploader already accepts. */
export function fileFromImageBase64(
  base64: string,
  mimeType: string,
  filename: string,
): File {
  const clean = base64.replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const type = mimeType.trim() || "image/png";
  return new File([bytes], filename, { type });
}

/** Short starter prompts that match the shop type the merchant already picked. */
export function logoPromptChips(shopType?: string): string[] {
  const type = (shopType ?? "").toLowerCase();
  let extra = "Simple geometric mark";
  if (type.includes("butcher")) {
    extra = "Bold butcher mark, no extra text";
  } else if (
    type.includes("fresh") ||
    type.includes("grocery") ||
    type.includes("market") ||
    type.includes("produce")
  ) {
    extra = "Leaf in a circle, no extra text";
  } else if (type.includes("cosmetic") || type.includes("beauty")) {
    extra = "Elegant droplet mark, no extra text";
  } else if (type.includes("wine") || type.includes("spirit")) {
    extra = "Simple bottle mark, no extra text";
  } else if (type.includes("mini") || type.includes("mart")) {
    extra = "Simple shop-bag mark, no extra text";
  }
  return [extra, "Letter from the shop name"];
}
