/** Constantes & format monétisation — safe côté client (pas de Prisma). */

export const TIP_PLATFORM_FEE_BPS = 1000; // 10%
export const DEMO_CREDIT_CENTS = 500; // 5 €
export const BOOST_COST_CENTS = 200; // 2 €
export const BOOST_DURATION_MS = 24 * 60 * 60 * 1000;
export const PRO_COST_CENTS = 300; // 3 €
export const PRO_TRIAL_DAYS = 7;
export const TIP_AMOUNTS_CENTS = [50, 100, 500] as const;

export type TxType =
  | "credit"
  | "debit"
  | "tip_sent"
  | "tip_received"
  | "boost"
  | "subscription";

export function formatEuros(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const euros = (abs / 100).toFixed(2).replace(".", ",");
  return `${sign}${euros} €`;
}

export function isProActive(user: {
  isPro: boolean;
  proUntil: Date | null;
}): boolean {
  if (!user.isPro) return false;
  if (!user.proUntil) return user.isPro;
  return user.proUntil.getTime() > Date.now();
}

export function tipFeeCents(grossCents: number): number {
  return Math.floor((grossCents * TIP_PLATFORM_FEE_BPS) / 10_000);
}
