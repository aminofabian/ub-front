import { afterEach, describe, expect, it } from "bun:test";

import { inertBodySiblingsOf } from "@/lib/inert-body-siblings";

type FakeEl = {
  inert: boolean;
  hasAttribute: (name: string) => boolean;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
};

function createEl(): FakeEl {
  const attrs = new Set<string>();
  return {
    get inert() {
      return attrs.has("inert");
    },
    hasAttribute: (name) => attrs.has(name),
    setAttribute: (name) => {
      attrs.add(name);
    },
    removeAttribute: (name) => {
      attrs.delete(name);
    },
  };
}

function installFakeDocument(children: FakeEl[]) {
  const body = {
    get children() {
      return children;
    },
  };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { body },
  });
  Object.defineProperty(globalThis, "HTMLElement", {
    configurable: true,
    value: class HTMLElement {},
  });
  for (const child of children) {
    Object.setPrototypeOf(child, HTMLElement.prototype);
  }
}

describe("inertBodySiblingsOf", () => {
  const previousDocument = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  const previousHTMLElement = Object.getOwnPropertyDescriptor(
    globalThis,
    "HTMLElement",
  );

  afterEach(() => {
    if (previousDocument) {
      Object.defineProperty(globalThis, "document", previousDocument);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as { document?: unknown }).document;
    }
    if (previousHTMLElement) {
      Object.defineProperty(globalThis, "HTMLElement", previousHTMLElement);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as { HTMLElement?: unknown }).HTMLElement;
    }
  });

  it("inerts other body children and restores them", () => {
    const app = createEl();
    const dialog = createEl();
    const host = createEl();
    installFakeDocument([app, dialog, host]);

    const restore = inertBodySiblingsOf(host as unknown as HTMLElement);

    expect(app.hasAttribute("inert")).toBe(true);
    expect(dialog.hasAttribute("inert")).toBe(true);
    expect(host.hasAttribute("inert")).toBe(false);

    restore();

    expect(app.hasAttribute("inert")).toBe(false);
    expect(dialog.hasAttribute("inert")).toBe(false);
  });

  it("leaves already-inert siblings alone so restore does not clear them", () => {
    const already = createEl();
    already.setAttribute("inert", "");
    const host = createEl();
    installFakeDocument([already, host]);

    const restore = inertBodySiblingsOf(host as unknown as HTMLElement);
    restore();

    expect(already.hasAttribute("inert")).toBe(true);
  });

  it("no-ops when host is missing", () => {
    expect(() => inertBodySiblingsOf(null)()).not.toThrow();
  });
});
