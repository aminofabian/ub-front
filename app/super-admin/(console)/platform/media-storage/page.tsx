"use client";

import { useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { MediaStorageSettingsForm } from "@/components/super-admin/media-storage-settings-form";
import { SuperAdminPageHeader } from "@/components/super-admin/super-admin-page-header";
import { useMediaStorageSettings } from "@/hooks/use-media-storage-settings";

export default function SuperAdminPlatformMediaStoragePage() {
  const { record, form, loadError, saveError, saving, updateField, save } = useMediaStorageSettings();
  const [success, setSuccess] = useState("");

  const run = async (changes: Parameters<typeof save>[0], message: string) => {
    setSuccess("");
    if (await save(changes)) setSuccess(message);
  };

  return (
    <div className="space-y-6">
      <SuperAdminPageHeader
        title="Media storage"
        description="Choose where new product, category, logo and storefront images are stored. Switching takes effect immediately, without a redeploy."
      />

      {loadError ? <AuthAlert variant="error">{loadError}</AuthAlert> : null}
      {saveError ? <AuthAlert variant="error">{saveError}</AuthAlert> : null}
      {success ? <AuthAlert variant="success">{success}</AuthAlert> : null}
      {record?.encryptionEphemeral ? (
        <AuthAlert variant="error">
          APP_PAYMENTS_ENCRYPTION_KEY is not set on the server, so saved keys stop working after a restart.
        </AuthAlert>
      ) : null}
      {record?.secretsError ? <AuthAlert variant="error">{record.secretsError}</AuthAlert> : null}

      <MediaStorageSettingsForm
        record={record}
        form={form}
        disabled={!record || saving}
        onFieldChange={updateField}
        onSaveKeys={() => void run({}, "R2 settings saved.")}
        onUseR2={() => void run({ uploadProvider: "r2" }, "New uploads now go to Cloudflare R2.")}
        onUseCloudinary={() => void run({ uploadProvider: "cloudinary" }, "New uploads now go to Cloudinary.")}
      />
    </div>
  );
}
