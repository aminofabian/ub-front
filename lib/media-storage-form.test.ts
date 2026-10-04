import { describe, expect, it } from "bun:test";

import {
  EMPTY_MEDIA_STORAGE_FORM,
  buildMediaStoragePayload,
  mediaStorageFormFromRecord,
} from "@/lib/media-storage-form";
import type { MediaStorageSettingsRecord } from "@/lib/super-admin-api";

const RECORD: MediaStorageSettingsRecord = {
  uploadProvider: "r2",
  r2Active: true,
  r2AccountId: "acct",
  r2Endpoint: "",
  r2Bucket: "picshare-media",
  hasR2AccessKeyId: true,
  hasR2SecretAccessKey: true,
  r2PublicBaseUrl: "https://media.example.com",
  secretsReadable: true,
  secretsError: null,
  encryptionEphemeral: false,
  updatedAt: "2026-10-04T12:00:00Z",
};

describe("media storage form", () => {
  it("loads plain fields from the record and leaves secret boxes blank", () => {
    expect(mediaStorageFormFromRecord(RECORD)).toEqual({
      uploadProvider: "r2",
      r2AccountId: "acct",
      r2Endpoint: "",
      r2Bucket: "picshare-media",
      r2PublicBaseUrl: "https://media.example.com",
      r2AccessKeyId: "",
      r2SecretAccessKey: "",
    });
  });

  it("omits blank secrets so stored keys are kept", () => {
    const payload = buildMediaStoragePayload(mediaStorageFormFromRecord(RECORD));

    expect(payload).not.toHaveProperty("r2AccessKeyId");
    expect(payload).not.toHaveProperty("r2SecretAccessKey");
    expect(payload.uploadProvider).toBe("r2");
  });

  it("sends trimmed values and typed secrets", () => {
    const payload = buildMediaStoragePayload({
      ...EMPTY_MEDIA_STORAGE_FORM,
      r2Bucket: "  picshare-media ",
      r2AccessKeyId: " key ",
      r2SecretAccessKey: " secret ",
    });

    expect(payload).toEqual({
      uploadProvider: "cloudinary",
      r2AccountId: "",
      r2Endpoint: "",
      r2Bucket: "picshare-media",
      r2PublicBaseUrl: "",
      r2AccessKeyId: "key",
      r2SecretAccessKey: "secret",
    });
  });
});
