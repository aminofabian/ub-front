"use client";

import { useCallback, useEffect, useState } from "react";

import {
  EMPTY_MEDIA_STORAGE_FORM,
  buildMediaStoragePayload,
  mediaStorageFormFromRecord,
  type MediaStorageFormState,
} from "@/lib/media-storage-form";
import {
  fetchMediaStorageSettings,
  updateMediaStorageSettings,
  type MediaStorageSettingsRecord,
} from "@/lib/super-admin-api";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/** Loads and saves super-admin media storage settings (upload provider + R2 bucket). */
export function useMediaStorageSettings() {
  const [record, setRecord] = useState<MediaStorageSettingsRecord | null>(null);
  const [form, setForm] = useState<MediaStorageFormState>(EMPTY_MEDIA_STORAGE_FORM);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  const applyRecord = useCallback((next: MediaStorageSettingsRecord) => {
    setRecord(next);
    setForm(mediaStorageFormFromRecord(next));
  }, []);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      applyRecord(await fetchMediaStorageSettings());
    } catch (error) {
      setLoadError(errorMessage(error, "Could not load media storage settings."));
    }
  }, [applyRecord]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateField = useCallback(
    <K extends keyof MediaStorageFormState>(key: K, value: MediaStorageFormState[K]) => {
      setForm((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  /** Resolves true when saved; on failure the server keeps its previous settings. */
  const save = useCallback(
    async (changes: Partial<MediaStorageFormState> = {}) => {
      setSaveError("");
      setSaving(true);
      try {
        applyRecord(await updateMediaStorageSettings(buildMediaStoragePayload({ ...form, ...changes })));
        return true;
      } catch (error) {
        setSaveError(errorMessage(error, "Could not save media storage settings."));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [applyRecord, form],
  );

  return { record, form, loadError, saveError, saving, updateField, save };
}
