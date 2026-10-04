import type {
  MediaStorageSettingsRecord,
  MediaUploadProvider,
  UpdateMediaStorageSettingsPayload,
} from "@/lib/super-admin-api";

export type MediaStorageFormState = {
  uploadProvider: MediaUploadProvider;
  r2AccountId: string;
  r2Endpoint: string;
  r2Bucket: string;
  r2PublicBaseUrl: string;
  /** Blank keeps the stored key. */
  r2AccessKeyId: string;
  /** Blank keeps the stored key. */
  r2SecretAccessKey: string;
};

export const EMPTY_MEDIA_STORAGE_FORM: MediaStorageFormState = {
  uploadProvider: "cloudinary",
  r2AccountId: "",
  r2Endpoint: "",
  r2Bucket: "",
  r2PublicBaseUrl: "",
  r2AccessKeyId: "",
  r2SecretAccessKey: "",
};

export function mediaStorageFormFromRecord(
  record: MediaStorageSettingsRecord,
): MediaStorageFormState {
  return {
    uploadProvider: record.uploadProvider,
    r2AccountId: record.r2AccountId,
    r2Endpoint: record.r2Endpoint,
    r2Bucket: record.r2Bucket,
    r2PublicBaseUrl: record.r2PublicBaseUrl,
    r2AccessKeyId: "",
    r2SecretAccessKey: "",
  };
}

/** Sends every plain field; secrets only when typed, so a blank box never wipes a stored key. */
export function buildMediaStoragePayload(
  form: MediaStorageFormState,
): UpdateMediaStorageSettingsPayload {
  const payload: UpdateMediaStorageSettingsPayload = {
    uploadProvider: form.uploadProvider,
    r2AccountId: form.r2AccountId.trim(),
    r2Endpoint: form.r2Endpoint.trim(),
    r2Bucket: form.r2Bucket.trim(),
    r2PublicBaseUrl: form.r2PublicBaseUrl.trim(),
  };
  if (form.r2AccessKeyId.trim()) {
    payload.r2AccessKeyId = form.r2AccessKeyId.trim();
  }
  if (form.r2SecretAccessKey.trim()) {
    payload.r2SecretAccessKey = form.r2SecretAccessKey.trim();
  }
  return payload;
}
