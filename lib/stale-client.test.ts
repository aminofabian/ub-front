import { describe, expect, it } from "bun:test";

import {
  isHtmlLikeApiBody,
  isNewerClientBuild,
  isStaleAssetError,
  parseClientVersionPayload,
} from "@/lib/stale-client";

describe("stale client detection", () => {
  it("flags webpack chunk load failures", () => {
    const err = new Error("Loading chunk 12 failed.\n(error: /_next/static/chunks/12.js)");
    err.name = "ChunkLoadError";
    expect(isStaleAssetError(err)).toBe(true);
    expect(
      isStaleAssetError(
        new Error("Failed to fetch dynamically imported module: https://kiosk.ke/_next/static/chunks/app.js"),
      ),
    ).toBe(true);
    expect(isStaleAssetError(new Error("This item is out of stock"))).toBe(false);
  });

  it("flags HTML / Vercel deploy pages as stale API bodies", () => {
    expect(
      isHtmlLikeApiBody("text/html; charset=utf-8", "<!DOCTYPE html><html>"),
    ).toBe(true);
    expect(isHtmlLikeApiBody("application/json", '{"title":"Not found"}')).toBe(
      false,
    );
    expect(
      isHtmlLikeApiBody("text/plain", "DEPLOYMENT_NOT_FOUND"),
    ).toBe(true);
  });

  it("parses version payloads", () => {
    expect(parseClientVersionPayload({ buildId: "abc" })).toBe("abc");
    expect(parseClientVersionPayload({})).toBeNull();
  });

  it("does not treat matching or dev builds as newer", () => {
    expect(isNewerClientBuild(null)).toBe(false);
    expect(isNewerClientBuild("dev")).toBe(false);
  });
});
