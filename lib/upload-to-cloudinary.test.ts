import { afterEach, describe, expect, it, mock } from "bun:test";

import { buildMediaUploadForm, uploadToCloudinary, type CloudinarySignature } from "@/lib/api";

const realFetch = globalThis.fetch;

const STORED = {
  public_id: "ub/biz/items/1/abc.png",
  secure_url: "https://media.example.com/ub/biz/items/1/abc.png",
  format: "png",
};

const CLOUDINARY_SIGNATURE: CloudinarySignature = {
  provider: "cloudinary",
  cloudName: "demo",
  apiKey: "key",
  timestamp: 1,
  signature: "sig",
  folder: "ub/biz/items/1",
  resourceType: "image",
};

function stubFetch() {
  const fetchMock = mock(async () =>
    new Response(JSON.stringify(STORED), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const pngFile = () => new File([new Uint8Array([0x89, 0x50])], "a.png", { type: "image/png" });

describe("uploadToCloudinary", () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("posts to Cloudinary with the signature when the provider is cloudinary", async () => {
    const fetchMock = stubFetch();

    await uploadToCloudinary(pngFile(), CLOUDINARY_SIGNATURE);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
    expect((init.body as FormData).get("signature")).toBe("sig");
  });

  it("treats a missing provider (older servers) as Cloudinary", async () => {
    const fetchMock = stubFetch();

    await uploadToCloudinary(pngFile(), { ...CLOUDINARY_SIGNATURE, provider: undefined });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("api.cloudinary.com");
  });

  it("posts the file and folder to the backend when the provider is r2", async () => {
    const fetchMock = stubFetch();

    const result = await uploadToCloudinary(pngFile(), {
      ...CLOUDINARY_SIGNATURE,
      provider: "r2",
      signature: "",
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toEndWith("/api/v1/media/upload");
    expect(String(url)).not.toContain("cloudinary");
    expect((init.body as FormData).get("folder")).toBe("ub/biz/items/1");
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
    expect((init.body as FormData).get("resourceType")).toBeNull();
    expect(result).toEqual(STORED);
  });

  it("forwards attachment resource types and honours a caller-supplied backend uploader", async () => {
    const fetchMock = stubFetch();
    const backendUpload = mock(async () => STORED);

    await uploadToCloudinary(
      pngFile(),
      { ...CLOUDINARY_SIGNATURE, provider: "r2", folder: "ub/support/t1", resourceType: "auto" },
      backendUpload,
    );

    expect(backendUpload).toHaveBeenCalledWith(expect.any(File), "ub/support/t1", "auto");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("buildMediaUploadForm", () => {
  it("adds resourceType only for non-image uploads", () => {
    expect(buildMediaUploadForm(pngFile(), "ub/x", "image").get("resourceType")).toBeNull();
    expect(buildMediaUploadForm(pngFile(), "ub/x").get("resourceType")).toBeNull();
    expect(buildMediaUploadForm(pngFile(), "ub/x", "auto").get("resourceType")).toBe("auto");
    expect(buildMediaUploadForm(pngFile(), "ub/x", "auto").get("folder")).toBe("ub/x");
  });
});
