import { afterEach, describe, expect, it, mock } from "bun:test";

import { uploadGuestAttachment } from "@/lib/public-support-api";

const realFetch = globalThis.fetch;

const STORED = {
  public_id: "ub/support/t1/a.pdf",
  secure_url: "https://media.example.com/ub/support/t1/a.pdf",
  resource_type: "raw",
};

describe("uploadGuestAttachment", () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("posts the file to the thread's attachments endpoint without a JSON content type", async () => {
    const fetchMock = mock(async () => new Response(JSON.stringify(STORED), { status: 201 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await uploadGuestAttachment(
      "kiosk",
      "t1",
      new File(["%PDF-1.7"], "a.pdf", { type: "application/pdf" }),
    );

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toEndWith("/api/v1/public/support/threads/t1/attachments");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    expect((init.headers as Record<string, string>)["X-Guest-Id"]).toBeTruthy();
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
    expect(result).toEqual(STORED);
  });

  it("reports a failed upload", async () => {
    globalThis.fetch = mock(async () => new Response("", { status: 503 })) as unknown as typeof fetch;

    await expect(
      uploadGuestAttachment("kiosk", "t1", new File(["x"], "a.txt", { type: "text/plain" })),
    ).rejects.toThrow("503");
  });
});
