"use client";

import type { ReactNode } from "react";

import {
  dashboardHintClass,
  dashboardInputClass,
  dashboardLabelClass,
} from "@/components/dashboard-page-ui";
import { SaSection } from "@/components/super-admin/sa-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MediaStorageFormState } from "@/lib/media-storage-form";
import type { MediaStorageSettingsRecord } from "@/lib/super-admin-api";

type TextField = "r2AccountId" | "r2Endpoint" | "r2Bucket" | "r2PublicBaseUrl";
type SecretField = "r2AccessKeyId" | "r2SecretAccessKey";

const TEXT_FIELDS: { key: TextField; label: string; placeholder: string; hint?: string }[] = [
  { key: "r2AccountId", label: "Account ID", placeholder: "06e23107aa…" },
  { key: "r2Bucket", label: "Bucket", placeholder: "picshare-media" },
  {
    key: "r2PublicBaseUrl",
    label: "Public base URL",
    placeholder: "https://media.example.com",
    hint: "Saved into every new image URL, so prefer a custom domain over the rate-limited r2.dev URL.",
  },
  {
    key: "r2Endpoint",
    label: "S3 endpoint (optional)",
    placeholder: "Derived from the account ID when blank",
  },
];

const SECRET_FIELDS: { key: SecretField; label: string; storedFlag: keyof MediaStorageSettingsRecord }[] = [
  { key: "r2AccessKeyId", label: "Access key ID", storedFlag: "hasR2AccessKeyId" },
  { key: "r2SecretAccessKey", label: "Secret access key", storedFlag: "hasR2SecretAccessKey" },
];

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={dashboardLabelClass()}>
        {label}
      </Label>
      {children}
      {hint ? <p className={dashboardHintClass()}>{hint}</p> : null}
    </div>
  );
}

export function MediaStorageSettingsForm({
  record,
  form,
  disabled,
  onFieldChange,
  onSaveKeys,
  onUseR2,
  onUseCloudinary,
}: {
  record: MediaStorageSettingsRecord | null;
  form: MediaStorageFormState;
  disabled: boolean;
  onFieldChange: (key: TextField | SecretField, value: string) => void;
  onSaveKeys: () => void;
  onUseR2: () => void;
  onUseCloudinary: () => void;
}) {
  const usingR2 = record?.r2Active ?? false;
  return (
    <div className="space-y-6">
      <SaSection
        title="Where new uploads go"
        description={
          usingR2
            ? "New images are stored on Cloudflare R2. Existing Cloudinary images keep working."
            : "New images are stored on Cloudinary. Save R2 keys below, then switch — the switch is refused unless a test file can be written to the bucket."
        }
        actions={
          usingR2 ? (
            <Button type="button" variant="outline" disabled={disabled} onClick={onUseCloudinary}>
              Switch back to Cloudinary
            </Button>
          ) : (
            <Button type="button" disabled={disabled} onClick={onUseR2}>
              Switch uploads to R2
            </Button>
          )
        }
      >
        <p className="text-sm">
          Current provider: <span className="font-semibold">{usingR2 ? "Cloudflare R2" : "Cloudinary"}</span>
        </p>
      </SaSection>

      <SaSection
        title="Cloudflare R2 bucket"
        description="Use an R2 API token scoped to this bucket with Object Read & Write. Keys are stored encrypted."
        footer={
          <Button type="button" variant="outline" disabled={disabled} onClick={onSaveKeys}>
            Save R2 settings
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {TEXT_FIELDS.map(({ key, label, placeholder, hint }) => (
            <Field key={key} id={`media-${key}`} label={label} hint={hint}>
              <Input
                id={`media-${key}`}
                className={dashboardInputClass()}
                placeholder={placeholder}
                value={form[key]}
                disabled={disabled}
                onChange={(event) => onFieldChange(key, event.target.value)}
              />
            </Field>
          ))}
          {SECRET_FIELDS.map(({ key, label, storedFlag }) => (
            <Field key={key} id={`media-${key}`} label={label}>
              <Input
                id={`media-${key}`}
                type="password"
                autoComplete="off"
                className={dashboardInputClass()}
                placeholder={record?.[storedFlag] ? "••••••••  (leave blank to keep)" : `Paste ${label.toLowerCase()}`}
                value={form[key]}
                disabled={disabled}
                onChange={(event) => onFieldChange(key, event.target.value)}
              />
            </Field>
          ))}
        </div>
      </SaSection>
    </div>
  );
}
