import { notFound } from "next/navigation";

import { DevOnboardingPreview } from "./preview-client";

export default function DevOnboardingPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <DevOnboardingPreview />;
}
