"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Loader2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard-provider";
import {
  ApiRequestError,
  fetchMe,
  loginWithPassword,
  loginWithPin,
  unlockWithPinSession,
  logoutRemoteAndRedirectToLogin,
} from "@/lib/api";
import { signOutClientAndRedirectToLogin } from "@/lib/auth";
import { APP_ROUTES } from "@/lib/config";
import { POS_TILL_IDLE_LOCK_MS } from "@/lib/pos-till-lock-constants";
import { createPosTillIdleController } from "@/lib/pos-till-idle";
import { POS_SESSION_EXPIRED_EVENT } from "@/lib/pos-soft-auth";
import {
  assertTillUnlockUserAllowed,
  formatTillUnlockError,
  resolveTillUnlockEmail,
  type PosTillUnlockMethod,
  type PosTillUnlockMode,
} from "@/lib/pos-till-unlock";
import {
  broadcastTillLock,
  broadcastTillUnlock,
  subscribeToTillLockBroadcasts,
} from "@/lib/till-lock-broadcast";
import {
  clearPersistedTillLock,
  readPersistedTillLock,
  writePersistedTillLock,
} from "@/lib/till-lock-persist";
import {
  clearTillUnlockContext,
  hasTillUnlockContext,
  readTillUnlockContext,
  updateTillUnlockBranchId,
  writeTillUnlockContext,
  type TillUnlockContext,
} from "@/lib/till-unlock-context";
import { cn } from "@/lib/utils";

export type PosTillLockReason = "manual" | "idle" | "session";

export type UnlockWithPinInput = {
  /** PIN when method is pin (default). */
  pin?: string;
  /** Password when method is password (owners/admins without PIN). */
  password?: string;
  method?: PosTillUnlockMethod;
  mode?: PosTillUnlockMode;
  /** Required when mode is `switch`. */
  email?: string;
};

type LockOptions = {
  reason?: PosTillLockReason;
  /** When true, do not rebroadcast (sibling tab already announced). */
  remote?: boolean;
};

type PosTillLockContextValue = {
  locked: boolean;
  lockReason: PosTillLockReason | null;
  lock: (opts?: LockOptions) => void;
  unlockWithPin: (input: UnlockWithPinInput | string) => Promise<void>;
};

const PosTillLockContext = createContext<PosTillLockContextValue | null>(null);

export function usePosTillLock(): PosTillLockContextValue {
  const ctx = useContext(PosTillLockContext);
  if (!ctx) {
    throw new Error("usePosTillLock must be used within PosTillLockProvider");
  }
  return ctx;
}

/** Safe for optional consumers (e.g. barcode wedge) outside the provider. */
export function useOptionalPosTillLock(): PosTillLockContextValue | null {
  return useContext(PosTillLockContext);
}

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
] as const;

type PosTillLockProviderProps = {
  children: ReactNode;
};

export function PosTillLockProvider({ children }: PosTillLockProviderProps) {
  const { me, branchId, refreshSession, loading } = useDashboard();
  const [locked, setLocked] = useState(false);
  const [lockReason, setLockReason] = useState<PosTillLockReason | null>(null);
  const lockedRef = useRef(false);
  const idleRef = useRef(
    createPosTillIdleController(POS_TILL_IDLE_LOCK_MS, () => {
      lockRef.current({ reason: "idle" });
    }),
  );
  const lockRef = useRef<(opts?: LockOptions) => void>(() => undefined);

  // Restore lock before paint so F5 does not flash an unlocked till.
  useLayoutEffect(() => {
    const persisted = readPersistedTillLock();
    if (!persisted) {
      return;
    }
    setLocked(true);
    setLockReason(persisted.reason);
    lockedRef.current = true;
  }, []);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  // Persist unlock context whenever session is ready (assigned branch for PIN).
  useEffect(() => {
    const pinBranch = me?.branchId?.trim() || branchId.trim();
    if (loading || !me?.id || !me.email?.trim() || !pinBranch) {
      return;
    }
    writeTillUnlockContext({
      email: me.email,
      branchId: pinBranch,
      displayName: me.name?.trim() || me.email,
      userId: me.id,
    });
  }, [loading, me?.id, me?.email, me?.name, me?.branchId, branchId]);

  // Keep unlock branch aligned with the user's assigned branch while unlocked.
  useEffect(() => {
    if (locked) {
      return;
    }
    const pinBranch = me?.branchId?.trim() || branchId.trim();
    if (!pinBranch) {
      return;
    }
    updateTillUnlockBranchId(pinBranch);
  }, [branchId, me?.branchId, locked]);

  const lock = useCallback((opts?: LockOptions) => {
    const reason = opts?.reason ?? "manual";
    // Drop focus from search / shelf so PIN digits are not eaten underneath.
    if (typeof document !== "undefined") {
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        active.blur();
      }
    }
    setLocked(true);
    setLockReason(reason);
    writePersistedTillLock(reason);
    if (!opts?.remote) {
      broadcastTillLock(reason);
    }
  }, []);

  const unlockLocal = useCallback(() => {
    setLocked(false);
    setLockReason(null);
    clearPersistedTillLock();
  }, []);

  useEffect(() => {
    lockRef.current = lock;
  }, [lock]);

  // Sibling tabs: lock/unlock together on the same device.
  useEffect(() => {
    return subscribeToTillLockBroadcasts((msg) => {
      if (msg.type === "lock") {
        lock({ reason: msg.reason, remote: true });
        return;
      }
      unlockLocal();
    });
  }, [lock, unlockLocal]);

  useEffect(() => {
    if (locked) {
      idleRef.current.clear();
      return;
    }

    const idle = idleRef.current;
    idle.reset();

    const onActivity = () => {
      if (lockedRef.current) {
        return;
      }
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      idle.reset();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    const onVisibility = () => {
      if (document.hidden) {
        idle.clear();
      } else if (!lockedRef.current) {
        idle.reset();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      idle.clear();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [locked]);

  // Soft session expiry → PIN overlay when unlock context exists.
  useEffect(() => {
    const onExpired = () => {
      if (hasTillUnlockContext()) {
        lock({ reason: "session" });
      }
    };
    window.addEventListener(POS_SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      window.removeEventListener(POS_SESSION_EXPIRED_EVENT, onExpired);
    };
  }, [lock]);

  const unlockWithPin = useCallback(
    async (input: UnlockWithPinInput | string) => {
      const normalized: UnlockWithPinInput =
        typeof input === "string"
          ? { pin: input, mode: "same", method: "pin" }
          : input;
      const mode: PosTillUnlockMode = normalized.mode ?? "same";
      const method: PosTillUnlockMethod = normalized.method ?? "pin";
      const ctx = readTillUnlockContext();
      // PIN login is bound to the user's assigned branch; password login is not.
      const branchIdForContext =
        me?.branchId?.trim() ||
        ctx?.branchId?.trim() ||
        branchId.trim();
      if (method === "pin" && !branchIdForContext) {
        throw new Error(
          "Branch missing. Use Password unlock, or full sign out.",
        );
      }
      if (mode === "same" && !ctx) {
        throw new Error(
          "Unlock context missing. Use full sign out, then sign in again.",
        );
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new Error("Reconnect to unlock.");
      }

      const email = resolveTillUnlockEmail({
        mode,
        context: ctx,
        email: normalized.email,
      });
      const previousUserId = ctx?.userId ?? me?.id ?? null;

      if (method === "password") {
        const password = normalized.password?.trim() ?? "";
        if (password.length < 1) {
          throw new Error("Enter your password.");
        }
        await loginWithPassword(email, password, { toast: false });
      } else {
        const pinTrimmed = normalized.pin?.trim() ?? "";
        if (!/^\d{4,6}$/.test(pinTrimmed)) {
          throw new Error("Enter your 4–6 digit PIN.");
        }
        // Same-cashier + live refresh: unlock-pin (no refresh rotation).
        // Switch cashier / soft-expired session: full login-pin.
        const preferUnlockOnly =
          mode === "same" && lockReason !== "session";
        if (preferUnlockOnly) {
          const unlocked = await unlockWithPinSession(
            email,
            pinTrimmed,
            branchIdForContext,
          );
          if (!unlocked) {
            await loginWithPin(email, pinTrimmed, branchIdForContext);
          }
        } else {
          await loginWithPin(email, pinTrimmed, branchIdForContext);
        }
      }
      await refreshSession();

      const nextMe = await fetchMe();
      try {
        assertTillUnlockUserAllowed({
          mode,
          previousUserId,
          nextUserId: nextMe.id,
        });
      } catch (err) {
        clearTillUnlockContext();
        throw err;
      }

      const nextBranch =
        nextMe.branchId?.trim() || branchIdForContext || branchId.trim();
      if (nextBranch) {
        writeTillUnlockContext({
          email: nextMe.email,
          branchId: nextBranch,
          displayName: nextMe.name?.trim() || nextMe.email,
          userId: nextMe.id,
        });
      }

      unlockLocal();
      broadcastTillUnlock();
    },
    [
      refreshSession,
      branchId,
      me?.id,
      me?.branchId,
      lockReason,
      unlockLocal,
    ],
  );

  const value = useMemo(
    () => ({ locked, lockReason, lock, unlockWithPin }),
    [locked, lockReason, lock, unlockWithPin],
  );

  return (
    <PosTillLockContext.Provider value={value}>
      <div
        className={cn(locked && "pointer-events-none select-none")}
        inert={locked || undefined}
        aria-hidden={locked || undefined}
      >
        {children}
      </div>
      <PosTillLockOverlay />
    </PosTillLockContext.Provider>
  );
}

function PosTillLockOverlay() {
  const { locked, lockReason, unlockWithPin } = usePosTillLock();
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [switchEmail, setSwitchEmail] = useState("");
  const [mode, setMode] = useState<PosTillUnlockMode>("same");
  const [method, setMethod] = useState<PosTillUnlockMethod>("pin");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ctx, setCtx] = useState<TillUnlockContext | null>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!locked) {
      setPin("");
      setPassword("");
      setSwitchEmail("");
      setMode("same");
      setMethod("pin");
      setError("");
      setBusy(false);
      return;
    }
    setCtx(readTillUnlockContext());
    const focusUnlockField = () => {
      const el =
        mode === "switch"
          ? emailInputRef.current
          : method === "password"
            ? passwordInputRef.current
            : pinInputRef.current;
      el?.focus({ preventScroll: true });
    };
    // Retry: inert on the till shell can race with focus restoration to search.
    const t0 = window.setTimeout(focusUnlockField, 0);
    const t1 = window.setTimeout(focusUnlockField, 50);
    const t2 = window.setTimeout(focusUnlockField, 200);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [locked, mode, method]);

  // Block underlying keyboard shortcuts / search focus while locked (capture).
  useEffect(() => {
    if (!locked) {
      return;
    }
    const isUnlockField = (target: EventTarget | null) =>
      target instanceof HTMLInputElement &&
      (target.dataset.tillUnlockPin === "1" ||
        target.dataset.tillUnlockPassword === "1" ||
        target.dataset.tillUnlockEmail === "1");

    const block = (e: KeyboardEvent) => {
      if (isUnlockField(e.target)) {
        return;
      }
      // Digits / enter were landing in the POS search under the dimmer.
      e.preventDefault();
      e.stopPropagation();
      const el =
        mode === "switch"
          ? emailInputRef.current
          : method === "password"
            ? passwordInputRef.current
            : pinInputRef.current;
      if (!el || el.disabled) {
        return;
      }
      el.focus({ preventScroll: true });
      if (
        e.key.length === 1 &&
        mode !== "switch" &&
        method === "pin" &&
        /^\d$/.test(e.key)
      ) {
        // Manually append — preventDefault means the input won't receive the key.
        setPin((prev) => `${prev}${e.key}`.replace(/\D/g, "").slice(0, 6));
        setError("");
      }
    };
    window.addEventListener("keydown", block, true);
    return () => window.removeEventListener("keydown", block, true);
  }, [locked, mode, method]);

  if (!locked) {
    return null;
  }

  const title =
    lockReason === "session" ? "Session expired" : "Till locked";
  const subtitle =
    mode === "switch"
      ? method === "password"
        ? "Enter another user’s email and password. The previous cart stays parked on this device."
        : "Enter another cashier or manager email and PIN. The previous cart stays parked on this device."
      : method === "password"
        ? lockReason === "session"
          ? "Enter your password to keep selling — your cart is saved on this device."
          : "Enter your password to unlock (owners/admins without a PIN)."
        : lockReason === "session"
          ? "Enter your PIN to keep selling — your cart is saved on this device."
          : "Enter your PIN to unlock.";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await unlockWithPin({
        method,
        pin: method === "pin" ? pin : undefined,
        password: method === "password" ? password : undefined,
        mode,
        email: mode === "switch" ? switchEmail : undefined,
      });
    } catch (err) {
      const raw =
        err instanceof ApiRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not unlock.";
      setError(formatTillUnlockError(raw, method));
      if (method === "password") {
        setPassword("");
        passwordInputRef.current?.focus();
      } else {
        setPin("");
        pinInputRef.current?.focus();
      }
    } finally {
      setBusy(false);
    }
  };

  const returnPath =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : APP_ROUTES.cashier;

  const switchReady =
    mode === "same" ||
    (switchEmail.trim().includes("@") && switchEmail.trim().length > 3);
  const secretReady =
    method === "password" ? password.length >= 1 : pin.length >= 4;

  const fieldClass = cn(
    "mt-1 flex h-11 w-full rounded-md border border-input bg-background px-3",
    "text-sm text-foreground outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:opacity-60",
  );

  const overlay = (
    <>
      <div className="fixed inset-0 z-[200] bg-black/50" aria-hidden />
      <div
        className="fixed top-1/2 left-1/2 z-[210] w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-till-lock-title"
      >
        <div className="mb-3 flex items-center gap-2 text-foreground">
          <Lock className="size-5 shrink-0" aria-hidden />
          <h2
            id="pos-till-lock-title"
            className="text-lg font-semibold tracking-tight"
          >
            {title}
          </h2>
        </div>
        {mode === "same" && ctx?.displayName ? (
          <p className="text-sm font-medium text-foreground">
            {ctx.displayName}
          </p>
        ) : null}
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

        <div className="mt-3 flex gap-3 text-xs">
          <button
            type="button"
            className={cn(
              "font-medium underline-offset-2 hover:underline",
              method === "pin" ? "text-foreground" : "text-muted-foreground",
            )}
            disabled={busy}
            onClick={() => {
              setMethod("pin");
              setPassword("");
              setError("");
            }}
          >
            PIN
          </button>
          <button
            type="button"
            className={cn(
              "font-medium underline-offset-2 hover:underline",
              method === "password"
                ? "text-foreground"
                : "text-muted-foreground",
            )}
            disabled={busy}
            onClick={() => {
              setMethod("password");
              setPin("");
              setError("");
            }}
          >
            Password
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={(e) => void onSubmit(e)}>
          {mode === "switch" ? (
            <label className="block text-xs font-medium text-muted-foreground">
              Email
              <input
                ref={emailInputRef}
                data-till-unlock-email="1"
                type="email"
                autoComplete="username"
                value={switchEmail}
                disabled={busy}
                onChange={(e) => {
                  setSwitchEmail(e.target.value);
                  setError("");
                }}
                className={fieldClass}
              />
            </label>
          ) : null}
          {method === "password" ? (
            <label className="block text-xs font-medium text-muted-foreground">
              Password
              <input
                ref={passwordInputRef}
                data-till-unlock-password="1"
                type="password"
                autoComplete="current-password"
                value={password}
                disabled={busy}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className={fieldClass}
              />
            </label>
          ) : (
            <label className="block text-xs font-medium text-muted-foreground">
              PIN
              <input
                ref={pinInputRef}
                data-till-unlock-pin="1"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                value={pin}
                disabled={busy}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                className={cn(fieldClass, "text-base tracking-[0.2em]")}
              />
            </label>
          )}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            className="w-full"
            disabled={busy || !secretReady || !switchReady}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : mode === "switch" ? (
              "Switch & unlock"
            ) : (
              "Unlock"
            )}
          </Button>
        </form>

        <button
          type="button"
          className="mt-3 w-full text-center text-xs font-medium text-foreground underline-offset-2 hover:underline"
          disabled={busy}
          onClick={() => {
            setMode((m) => (m === "same" ? "switch" : "same"));
            setError("");
            setPin("");
            setPassword("");
          }}
        >
          {mode === "same"
            ? "Switch cashier / manager"
            : "Back to same cashier"}
        </button>

        <button
          type="button"
          className="mt-2 w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
          disabled={busy}
          onClick={() => {
            clearTillUnlockContext();
            void logoutRemoteAndRedirectToLogin().catch(() => {
              signOutClientAndRedirectToLogin("till lock full sign out", {
                nextPath: returnPath.startsWith("/")
                  ? returnPath
                  : APP_ROUTES.cashier,
              });
            });
          }}
        >
          Full sign out
        </button>
      </div>
    </>
  );

  if (typeof document === "undefined") {
    return overlay;
  }
  return createPortal(overlay, document.body);
}
