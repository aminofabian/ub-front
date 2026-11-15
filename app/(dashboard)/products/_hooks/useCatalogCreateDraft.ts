"use client";

import { useEffect, useRef, useState } from "react";

import {
  dataUrlToFile,
  fileToDataUrl,
} from "@/lib/cashier-create-product-draft";

import {
  catalogCreateDraftHasWork,
  clearCatalogProductCreateDraft,
  loadCatalogProductCreateDraft,
  optionDraftHasWork,
  parentDraftHasWork,
  saveCatalogProductCreateDraft,
  type CatalogCreateOptionDraft,
} from "../_lib/catalog-product-create-draft";
import { EMPTY_PARENT, type ParentDraft } from "../_types";
import {
  newGroupOptionRow,
  type GroupOptionRow,
} from "../_components/CreateGroupOptionsPad";

const SAVE_DELAY_MS = 400;

type SetDraft = (value: ParentDraft | ((prev: ParentDraft) => ParentDraft)) => void;
type SetOptions = (
  value: GroupOptionRow[] | ((prev: GroupOptionRow[]) => GroupOptionRow[]),
) => void;

type Args = {
  businessId: string;
  open: boolean;
  parentDraft: ParentDraft;
  setParentDraft: SetDraft;
  groupOptions: GroupOptionRow[];
  setGroupOptions: SetOptions;
  pendingImage: File | null;
  setPendingImage: (file: File | null) => void;
};

function blankOptions(): GroupOptionRow[] {
  return [newGroupOptionRow(), newGroupOptionRow()];
}

function revokePreviews(rows: GroupOptionRow[]) {
  for (const row of rows) {
    if (row.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(row.imagePreview);
  }
}

function fileToken(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function rowsFromDraft(options: CatalogCreateOptionDraft[]): GroupOptionRow[] {
  if (options.length === 0) return blankOptions();
  return options.map((option) => {
    const file = option.imageDataUrl
      ? dataUrlToFile(option.imageDataUrl, `${option.key}.jpg`)
      : null;
    return newGroupOptionRow({
      key: option.key,
      label: option.label,
      barcode: option.barcode,
      buyingPrice: option.buyingPrice,
      unitPrice: option.unitPrice,
      stock: option.stock || "1",
      sharedProductId: option.sharedProductId,
      imageFile: file,
      imagePreview: file ? URL.createObjectURL(file) : null,
    });
  });
}

function snapshotOptions(
  rows: GroupOptionRow[],
  images: Map<string, string>,
): CatalogCreateOptionDraft[] {
  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    barcode: row.barcode,
    buyingPrice: row.buyingPrice,
    unitPrice: row.unitPrice,
    stock: row.stock || "1",
    sharedProductId: row.sharedProductId ?? null,
    imageDataUrl: images.get(row.key) ?? null,
  }));
}

export function useCatalogCreateDraft({
  businessId,
  open,
  parentDraft,
  setParentDraft,
  groupOptions,
  setGroupOptions,
  pendingImage,
  setPendingImage,
}: Args) {
  const suppress = useRef(false);
  const armed = useRef(false);
  const wroteThisSession = useRef(false);
  const optionImages = useRef(new Map<string, string>());
  const parentImage = useRef<string | null>(null);
  const parentImageToken = useRef<string | null>(null);
  const latest = useRef({ businessId, parentDraft, groupOptions, pendingImage });
  latest.current = { businessId, parentDraft, groupOptions, pendingImage };
  const [restored, setRestored] = useState(false);
  const [session, setSession] = useState(0);

  const resetBlank = () => {
    const current = latest.current;
    setGroupOptions((prev) => {
      revokePreviews(prev);
      return blankOptions();
    });
    setParentDraft({
      ...EMPTY_PARENT,
      itemTypeId: current.parentDraft.itemTypeId,
      openingBranchId: current.parentDraft.openingBranchId,
    });
    setPendingImage(null);
    optionImages.current = new Map();
    parentImage.current = null;
    parentImageToken.current = null;
    setRestored(false);
  };

  const flush = () => {
    const current = latest.current;
    const payload = {
      businessId: current.businessId,
      parent: current.parentDraft,
      options: snapshotOptions(current.groupOptions, optionImages.current),
      imageDataUrl: parentImage.current,
    };
    if (!catalogCreateDraftHasWork(payload)) {
      if (!wroteThisSession.current) return;
      clearCatalogProductCreateDraft(current.businessId);
      wroteThisSession.current = false;
      return;
    }
    saveCatalogProductCreateDraft(payload);
    wroteThisSession.current = true;
  };

  useEffect(() => {
    let cancelled = false;
    for (const row of groupOptions) {
      if (!row.imageFile) {
        optionImages.current.delete(row.key);
        optionImages.current.delete(`${row.key}:token`);
        continue;
      }
      const token = fileToken(row.imageFile);
      if (optionImages.current.get(`${row.key}:token`) === token) continue;
      const file = row.imageFile;
      void fileToDataUrl(file)
        .then((url) => {
          if (cancelled || !url) return;
          optionImages.current.set(row.key, url);
          optionImages.current.set(`${row.key}:token`, token);
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [groupOptions]);

  useEffect(() => {
    if (!pendingImage) {
      if (parentImageToken.current) {
        parentImageToken.current = null;
        parentImage.current = null;
      }
      return;
    }
    const token = fileToken(pendingImage);
    if (parentImageToken.current === token) return;
    parentImageToken.current = token;
    const image = pendingImage;
    let cancelled = false;
    void fileToDataUrl(image)
      .then((url) => {
        if (cancelled || parentImageToken.current !== token || !url) return;
        parentImage.current = url;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pendingImage]);

  useEffect(() => {
    if (!open) return;
    suppress.current = false;
    const draft = loadCatalogProductCreateDraft(businessId);
    if (draft && catalogCreateDraftHasWork(draft)) {
      setGroupOptions((prev) => {
        revokePreviews(prev);
        return rowsFromDraft(draft.options);
      });
      setParentDraft(draft.parent);
      optionImages.current = new Map(
        draft.options.flatMap((option) =>
          option.imageDataUrl ? [[option.key, option.imageDataUrl] as const] : [],
        ),
      );
      parentImage.current = draft.imageDataUrl;
      parentImageToken.current = null;
      const file = draft.imageDataUrl
        ? dataUrlToFile(draft.imageDataUrl, "product-photo.jpg")
        : null;
      setPendingImage(file);
      setRestored(true);
    } else {
      resetBlank();
    }
    setSession((value) => value + 1);
    return () => {
      if (armed.current && !suppress.current) flush();
      armed.current = false;
    };
    // Hydrate only when the form opens. resetBlank/flush read the latest refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, businessId]);

  useEffect(() => {
    if (!open) return;
    armed.current = true;
  }, [open, session]);

  useEffect(() => {
    if (!open || session === 0 || suppress.current) return;
    const timer = window.setTimeout(() => {
      if (!suppress.current) flush();
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [open, session, parentDraft, groupOptions, pendingImage]);

  const hasWork =
    parentDraftHasWork(parentDraft) ||
    Boolean(pendingImage) ||
    groupOptions.some(
      (row) => optionDraftHasWork({ ...row, imageDataUrl: row.imageFile ? "1" : null }),
    );

  const forgetDraft = () => {
    suppress.current = true;
    wroteThisSession.current = false;
    clearCatalogProductCreateDraft(businessId);
    setRestored(false);
  };

  const resumeSaving = () => {
    suppress.current = false;
  };

  const discardDraft = () => {
    suppress.current = true;
    clearCatalogProductCreateDraft(businessId);
    resetBlank();
    suppress.current = false;
  };

  return { restored, hasWork, forgetDraft, resumeSaving, discardDraft };
}
