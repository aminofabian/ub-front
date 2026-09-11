/** First-run till PIN is exactly four digits (unlock still accepts 4–6). */
export const TILL_SETUP_PIN_LENGTH = 4;

const PIN_RE = /^\d{4}$/;

export type TillSetupPinError =
  | "length"
  | "confirm-empty"
  | "mismatch";

export function validateNewTillPin(
  pin: string,
  confirmPin: string,
): TillSetupPinError | null {
  const next = pin.replace(/\D/g, "");
  const confirm = confirmPin.replace(/\D/g, "");
  if (next.length !== TILL_SETUP_PIN_LENGTH || !PIN_RE.test(next)) {
    return "length";
  }
  if (confirm.length === 0) {
    return "confirm-empty";
  }
  if (next !== confirm) {
    return "mismatch";
  }
  return null;
}

export function formatTillSetupPinError(kind: TillSetupPinError): string {
  switch (kind) {
    case "length":
      return "Choose 4 digits. You will type these to unlock the till.";
    case "confirm-empty":
      return "Type the same 4 digits again to confirm.";
    case "mismatch":
      return "Those PINs do not match. Type the same 4 digits twice.";
  }
}

/** Soft-expired session cannot call setOwnPin until the password re-auths. */
export function tillSetupNeedsPassword(lockReason: string | null): boolean {
  return lockReason === "session";
}

export function isTillPinSetupNeeded(hasPin: boolean | undefined): boolean {
  return hasPin === false;
}
