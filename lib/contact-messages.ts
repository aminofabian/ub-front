import { apiUrl } from "./config";

export type ContactMessageDestination = "platform" | "tenant";

export type PublicContactMessagePayload = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  sourcePath?: string;
};

export type ContactMessageListItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  preview: string;
  status: "UNREAD" | "READ" | string;
  createdAt: string;
  readAt: string | null;
};

export type ContactMessageReply = {
  id: string;
  channel: "EMAIL" | "WHATSAPP" | "SMS" | string;
  body: string;
  outcome: string;
  detail: string | null;
  sentByUserId: string | null;
  createdAt: string;
};

export type ContactMessageDetail = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  body: string;
  status: "UNREAD" | "READ" | string;
  createdAt: string;
  readAt: string | null;
  sourcePath: string | null;
  replies: ContactMessageReply[];
};

export type ContactReplyChannel = "EMAIL" | "WHATSAPP" | "SMS";

function browserApiV1Base(): string {
  return apiUrl("/api/v1");
}

async function readFetchErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as {
      detail?: string;
      title?: string;
      message?: string;
    };
    return data.detail || data.message || data.title || res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

export async function submitPublicContactMessage(
  destination: ContactMessageDestination,
  payload: PublicContactMessagePayload,
  slug?: string,
): Promise<{ ok: boolean; id: string }> {
  const path =
    destination === "tenant"
      ? `/public/businesses/${encodeURIComponent((slug ?? "").trim())}/contact-messages`
      : "/public/contact-messages";

  const body: Record<string, string> = {
    name: payload.name.trim(),
    email: payload.email.trim(),
    message: payload.message.trim(),
  };
  const phone = payload.phone?.trim();
  if (phone) body.phone = phone;
  const sourcePath = payload.sourcePath?.trim();
  if (sourcePath) body.sourcePath = sourcePath;

  const res = await fetch(`${browserApiV1Base()}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readFetchErrorMessage(res));
  }
  return (await res.json()) as { ok: boolean; id: string };
}

export function validateContactForm(input: {
  name: string;
  email: string;
  phone: string;
  message: string;
}): Partial<Record<"name" | "email" | "phone" | "message", string>> {
  const errors: Partial<Record<"name" | "email" | "phone" | "message", string>> =
    {};
  if (!input.name.trim()) errors.name = "Name is required";
  if (!input.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = "Enter a valid email";
  }
  if (!input.message.trim()) errors.message = "Message is required";
  if (input.phone.trim() && input.phone.replace(/\D/g, "").length < 9) {
    errors.phone = "Enter a valid phone number";
  }
  return errors;
}
