/** Staff till PINs are 4–6 digits; passwords are longer (policy min usually ≥ 8). */
export function looksLikeStaffPin(secret: string): boolean {
  return /^\d{4,6}$/.test(secret.trim());
}
