import { apiUrl } from "./config";
import {
  contactChallengePayload,
  createContactTillChallenge,
  type ContactTillChallenge,
} from "./contact-till-challenge";

export type ContactMessageDestination = "platform" | "tenant";

export type {
  ContactChallengeKind,
  ContactTillChallenge,
  ContactTillLine,
} from "./contact-till-challenge";

export { createContactTillChallenge } from "./contact-till-challenge";

export type PublicContactMessagePayload = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  sourcePath?: string;
  challenge: ContactTillChallenge;
  challengeAnswer: number;
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

  const challenge = contactChallengePayload(payload.challenge);
  const body: Record<string, unknown> = {
    name: payload.name.trim(),
    email: payload.email.trim(),
    message: payload.message.trim(),
    challengeKind: challenge.challengeKind,
    lines: challenge.lines,
    challengeAnswer: payload.challengeAnswer,
    website: "",
  };
  if (challenge.tendered != null) body.tendered = challenge.tendered;
  if (challenge.percent != null) body.percent = challenge.percent;
  if (challenge.baseAmount != null) body.baseAmount = challenge.baseAmount;
  if (challenge.secondaryAmount != null) {
    body.secondaryAmount = challenge.secondaryAmount;
  }
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
  challengeAnswer: string;
  challengeExpected: number;
}): Partial<
  Record<"name" | "email" | "phone" | "message" | "challengeAnswer", string>
> {
  const errors: Partial<
    Record<"name" | "email" | "phone" | "message" | "challengeAnswer", string>
  > = {};
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
  const answer = Number.parseInt(input.challengeAnswer.trim(), 10);
  if (!input.challengeAnswer.trim() || Number.isNaN(answer)) {
    errors.challengeAnswer = "Enter your answer";
  } else if (answer !== input.challengeExpected) {
    errors.challengeAnswer = "Not quite — try that till maths again";
  }
  return errors;
}
