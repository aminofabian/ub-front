import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import {
  loadGuestSession,
  recoverGuestThread,
  sendGuestRecoveryCode,
  verifyGuestRecoveryCode,
} from "@/lib/public-support-api";

const realFetch = globalThis.fetch;

/** A minimal localStorage so the client's session bookkeeping can be asserted. */
function installWindowStorage(): Record<string, string> {
  const store: Record<string, string> = {};
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
      key: () => null,
      length: 0,
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  return store;
}

describe("guest chat OTP recovery", () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = installWindowStorage();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("sends the code to the platform identify endpoint", async () => {
    const fetchMock = mock(
      async () =>
        new Response(
          JSON.stringify({
            phone: "0712345678",
            expiresAt: "2026-11-02T09:00:00Z",
            channel: "SMS",
            maskedHint: "****5678",
          }),
          { status: 201 },
        ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const sent = await sendGuestRecoveryCode("0712345678");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toEndWith("/api/v1/public/shopper/auth/identify/send-code");
    expect(JSON.parse(String(init.body))).toEqual({ phone: "0712345678" });
    expect(sent.maskedHint).toBe("****5678");
  });

  it("returns the single-use verification token", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(JSON.stringify({ phoneVerificationToken: "verify-abc" }), { status: 200 }),
    ) as unknown as typeof fetch;

    expect(await verifyGuestRecoveryCode("0712345678", " 1234 ")).toBe("verify-abc");
  });

  it("surfaces the API's problem detail when a code is wrong", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response(JSON.stringify({ detail: "Incorrect verification code" }), { status: 400 }),
    ) as unknown as typeof fetch;

    await expect(verifyGuestRecoveryCode("0712345678", "0000")).rejects.toThrow(
      "Incorrect verification code",
    );
  });

  it("stores the recovered thread secret so the chat resumes next visit", async () => {
    const fetchMock = mock(
      async () =>
        new Response(
          JSON.stringify({
            conversation: {
              id: "conv-1",
              businessId: "platform",
              conversationType: "VISITOR",
              guestName: "Njeri",
              guestPhone: "0712345678",
              status: "OPEN",
              lastMessageAt: "2026-11-02T08:00:00Z",
              lastMessagePreview: "New online order ORD-1001",
              unreadCount: 0,
              createdAt: "2026-11-01T08:00:00Z",
              updatedAt: "2026-11-02T08:00:00Z",
            },
            token: "fresh-secret",
            messages: [],
          }),
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await recoverGuestThread("kiosk", {
      type: "VISITOR",
      phone: "0712345678",
      phoneVerificationToken: "verify-abc",
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toEndWith("/api/v1/public/support/threads/recover");
    const body = JSON.parse(String(init.body));
    expect(body.phoneVerificationToken).toBe("verify-abc");
    expect(body.guestId).toBeTruthy();
    expect(body.type).toBe("VISITOR");

    const session = loadGuestSession("kiosk");
    expect(session.token).toBe("fresh-secret");
    expect(session.conversationId).toBe("conv-1");
    expect(store["ub.support.guest.phone"]).toBe("0712345678");
  });

  it("explains when the number has no chat here", async () => {
    globalThis.fetch = mock(
      async () => new Response(JSON.stringify({ detail: "No chat" }), { status: 404 }),
    ) as unknown as typeof fetch;

    await expect(
      recoverGuestThread("kiosk", {
        type: "VISITOR",
        phone: "0712345678",
        phoneVerificationToken: "verify-abc",
      }),
    ).rejects.toThrow("We couldn't find a chat for that number here yet.");
  });
});
