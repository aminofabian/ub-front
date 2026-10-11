import type { CreateUserPayload, JoinPayMode } from "@/lib/api";

export type CredentialMethod = "password" | "invite" | "pin";

export const MIN_PASSWORD_LENGTH = 8;

export type UserDraft = {
  name: string;
  email: string;
  roleId: string;
  credentialMethod: CredentialMethod;
  password: string;
  passwordConfirm: string;
  pin: string;
  branchId: string;
  joinPayMode: JoinPayMode;
};

export const DEFAULT_USER_DRAFT: UserDraft = {
  name: "",
  email: "",
  roleId: "",
  credentialMethod: "password",
  password: "",
  passwordConfirm: "",
  pin: "",
  branchId: "",
  joinPayMode: "half",
};

export type CreateUserDraftResult =
  | { ok: true; payload: CreateUserPayload; success: string }
  | { ok: false; error: string };

type SharedCreateFields = Omit<
  CreateUserPayload,
  "pin" | "password" | "status" | "sendInvite"
>;

export function buildCreateUserPayload(draft: UserDraft): CreateUserDraftResult {
  const shared: SharedCreateFields = {
    name: draft.name,
    email: draft.email,
    roleId: draft.roleId,
    branchId: draft.branchId || undefined,
    joinPayMode: draft.joinPayMode,
  };
  if (draft.credentialMethod === "pin") {
    return pinCreatePayload(draft, shared);
  }
  if (draft.credentialMethod === "password") {
    return passwordCreatePayload(draft, shared);
  }
  return {
    ok: true,
    payload: { ...shared, sendInvite: true, status: "invited" },
    success:
      "Invitation sent. The user will get an email to set their password.",
  };
}

function pinCreatePayload(
  draft: UserDraft,
  shared: SharedCreateFields,
): CreateUserDraftResult {
  if (!/^\d{4,6}$/.test(draft.pin.trim())) {
    return { ok: false, error: "PIN must be 4 to 6 digits." };
  }
  if (!draft.branchId) {
    return {
      ok: false,
      error: "Select a branch — PIN login requires a branch.",
    };
  }
  return {
    ok: true,
    payload: { ...shared, pin: draft.pin.trim(), status: "active" },
    success: "User created with a PIN.",
  };
}

function passwordCreatePayload(
  draft: UserDraft,
  shared: SharedCreateFields,
): CreateUserDraftResult {
  if (draft.password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (draft.password !== draft.passwordConfirm) {
    return { ok: false, error: "Passwords do not match." };
  }
  return {
    ok: true,
    payload: { ...shared, password: draft.password, status: "active" },
    success: "User created. They can sign in with the password you set.",
  };
}
