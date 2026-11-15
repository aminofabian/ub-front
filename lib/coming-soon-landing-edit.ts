import {
  fetchBranches,
  fetchBusiness,
  getCloudinarySignature,
  updateBusiness,
  uploadToCloudinary,
} from "@/lib/api";
import {
  mergeLandingPhoto,
  type ComingSoonPhotoSlot,
} from "@/lib/coming-soon-photos";
import {
  buildOnlineStorePatch,
  firstCatalogBranchId,
} from "@/lib/online-store-toggle";
import type { LandingContent } from "@/lib/storefront-templates";

const PHOTO_FOLDER = {
  cover: "cover",
  story: "story",
  shop: "shop",
} as const;

export async function saveComingSoonPhoto(
  slot: ComingSoonPhotoSlot,
  file: File | null,
  visible: LandingContent | null,
): Promise<LandingContent> {
  const business = await fetchBusiness({ toast: false });
  let url: string | null = null;
  if (file) {
    url = await uploadComingSoonPhoto(business.id, slot, file);
  }
  const landingContent = mergeLandingPhoto(
    business.storefront?.landingContent,
    visible,
    slot,
    url,
  );
  await updateBusiness({ storefront: { landingContent } });
  return landingContent;
}

async function uploadComingSoonPhoto(
  businessId: string | undefined,
  slot: ComingSoonPhotoSlot,
  file: File,
): Promise<string> {
  const id = businessId?.trim() ?? "";
  if (!id) {
    throw new Error("Save the business profile first, then add photos.");
  }
  const folder = `ub/${id}/landing/coming-soon/${PHOTO_FOLDER[slot]}`;
  const signature = await getCloudinarySignature(folder);
  const uploaded = await uploadToCloudinary(file, signature);
  return uploaded.secure_url;
}

export async function openStorefrontFromLanding(): Promise<void> {
  const [business, branches] = await Promise.all([
    fetchBusiness({ toast: false }),
    fetchBranches(),
  ]);
  const built = buildOnlineStorePatch({
    enabled: true,
    catalogBranchId: firstCatalogBranchId(
      branches,
      business.storefront?.catalogBranchId ?? "",
    ),
  });
  if (!built.ok) {
    throw new Error("Add a branch first. The shop needs one for prices and stock.");
  }
  await updateBusiness({ storefront: built.payload });
}
