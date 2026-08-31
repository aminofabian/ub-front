/**
 * Till-local idle lock (separate from server APP_AUTH_IDLE_TIMEOUT_HOURS and
 * from the 3-minute session heartbeat). Fires after this much pointer /
 * keyboard silence — long enough for M-Pesa waits and slow product forms.
 */
export const POS_TILL_IDLE_LOCK_MS = 15 * 60 * 1000;
