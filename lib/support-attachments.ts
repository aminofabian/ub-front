import {
  getCloudinarySignature,
  uploadToCloudinary,
  type CloudinarySignature,
} from "@/lib/api";

export type SupportAttachmentPayload = {
  url: string;
  publicId?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  bytes?: number | null;
};

export const SUPPORT_ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/csv",
  "text/plain",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_EXT = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "pdf",
  "csv",
  "txt",
  "xls",
  "xlsx",
  "doc",
  "docx",
]);

export const SUPPORT_ATTACHMENT_ACCEPT =
  ".png,.jpg,.jpeg,.webp,.gif,.pdf,.csv,.txt,.xls,.xlsx,.doc,.docx,image/png,image/jpeg,image/webp,image/gif,application/pdf,text/csv,text/plain";

export function isSupportImageContentType(contentType: string | null | undefined): boolean {
  const ct = (contentType ?? "").toLowerCase().split(";")[0]?.trim() ?? "";
  return ct.startsWith("image/");
}

export function validateSupportAttachmentFile(file: File): string | null {
  if (file.size <= 0) return "That file is empty.";
  if (file.size > SUPPORT_ATTACHMENT_MAX_BYTES) {
    return "Files must be 15 MB or smaller.";
  }
  const mime = (file.type || "").toLowerCase();
  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
    : "";
  if (mime && ALLOWED_MIME.has(mime)) return null;
  if (ext && ALLOWED_EXT.has(ext)) return null;
  return "Use an image, PDF, CSV, Excel, Word, or text file.";
}

export function supportAttachmentFolder(conversationId: string): string {
  return `ub/support/${conversationId.trim()}`;
}

export async function uploadSupportAttachmentToCloudinary(
  conversationId: string,
  file: File,
  getSignature: (folder: string) => Promise<CloudinarySignature> = (folder) =>
    getCloudinarySignature(folder, "auto"),
): Promise<SupportAttachmentPayload> {
  const error = validateSupportAttachmentFile(file);
  if (error) throw new Error(error);
  const folder = supportAttachmentFolder(conversationId);
  const sig = await getSignature(folder);
  const result = await uploadToCloudinary(file, {
    ...sig,
    resourceType: sig.resourceType || "auto",
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    fileName: file.name,
    contentType: file.type || guessMimeFromName(file.name),
    bytes: result.bytes ?? file.size,
  };
}

function guessMimeFromName(name: string): string | null {
  const ext = name.includes(".")
    ? name.slice(name.lastIndexOf(".") + 1).toLowerCase()
    : "";
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "pdf":
      return "application/pdf";
    case "csv":
      return "text/csv";
    case "txt":
      return "text/plain";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return null;
  }
}

export function formatAttachmentBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
