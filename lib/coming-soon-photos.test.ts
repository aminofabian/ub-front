import { describe, expect, it } from "bun:test";

import { mergeLandingPhoto } from "@/lib/coming-soon-photos";

describe("mergeLandingPhoto", () => {
  it("keeps stored copy and a photo just saved on another slot", () => {
    const saved = mergeLandingPhoto(
      { headline: "Stored", vitrineImageUrl: "old-cover.jpg" },
      { headline: "Visible", vitrineImageUrl: "new-cover.jpg" },
      "story",
      "story.jpg",
    );

    expect(saved.headline).toBe("Stored");
    expect(saved.vitrineImageUrl).toBe("new-cover.jpg");
    expect(saved.storyImageUrl).toBe("story.jpg");
  });

  it("clears one photo without dropping the others", () => {
    const cleared = mergeLandingPhoto(
      { storyImageUrl: "story.jpg", vitrineImageUrl: "cover.jpg" },
      { storyImageUrl: "story.jpg", vitrineImageUrl: "cover.jpg" },
      "cover",
      null,
    );

    expect(cleared.vitrineImageUrl).toBeNull();
    expect(cleared.storyImageUrl).toBe("story.jpg");
  });
});
