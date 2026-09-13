/** Providers, labels & résolution pays — safe côté client. */

export const PAYMENT_PROVIDERS = [
  "MTN",
  "MOOV",
  "ORANGE",
  "WAVE",
  "PAYPAL",
  "CRYPTO",
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<PaymentProvider, string> = {
  MTN: "MTN Money",
  MOOV: "Moov Money",
  ORANGE: "Orange Money",
  WAVE: "Wave",
  PAYPAL: "PayPal",
  CRYPTO: "Crypto (BTC / USDT)",
};

export const PROVIDER_HINTS: Record<PaymentProvider, string> = {
  MTN: "Numéro Mobile Money MTN",
  MOOV: "Numéro Moov Money",
  ORANGE: "Numéro Orange Money",
  WAVE: "Numéro Wave",
  PAYPAL: "E-mail PayPal",
  CRYPTO: "Adresse portefeuille BTC ou USDT",
};

/** Champs requis pour enregistrer un moyen utilisateur */
export function fieldsForProvider(provider: PaymentProvider): {
  phone?: boolean;
  email?: boolean;
  wallet?: boolean;
} {
  if (provider === "PAYPAL") return { email: true };
  if (provider === "CRYPTO") return { wallet: true };
  return { phone: true };
}

export const GLOBAL_COUNTRY = "*";

/** Montants de recharge démo (centimes) */
export const DEMO_TOPUP_AMOUNTS_CENTS = [500, 1000, 2000, 5000] as const;

/**
 * Défauts sensés (utilisés au seed + fallback si DB vide).
 * PayPal / Crypto sont toujours ajoutés via countryCode "*".
 */
export const DEFAULT_COUNTRY_PROVIDERS: Record<
  string,
  { provider: PaymentProvider; currency: string }[]
> = {
  BJ: [
    { provider: "MTN", currency: "XOF" },
    { provider: "MOOV", currency: "XOF" },
    { provider: "ORANGE", currency: "XOF" },
    { provider: "WAVE", currency: "XOF" },
  ],
  CI: [
    { provider: "MTN", currency: "XOF" },
    { provider: "MOOV", currency: "XOF" },
    { provider: "ORANGE", currency: "XOF" },
    { provider: "WAVE", currency: "XOF" },
  ],
  SN: [
    { provider: "ORANGE", currency: "XOF" },
    { provider: "WAVE", currency: "XOF" },
    { provider: "MTN", currency: "XOF" },
  ],
  NG: [{ provider: "MTN", currency: "NGN" }],
  GH: [
    { provider: "MTN", currency: "GHS" },
    { provider: "WAVE", currency: "GHS" },
  ],
  ML: [
    { provider: "ORANGE", currency: "XOF" },
    { provider: "MOOV", currency: "XOF" },
  ],
  NE: [
    { provider: "ORANGE", currency: "XOF" },
    { provider: "MOOV", currency: "XOF" },
  ],
  TG: [
    { provider: "MOOV", currency: "XOF" },
    { provider: "ORANGE", currency: "XOF" },
  ],
  BF: [
    { provider: "ORANGE", currency: "XOF" },
    { provider: "MOOV", currency: "XOF" },
  ],
  [GLOBAL_COUNTRY]: [
    { provider: "PAYPAL", currency: "EUR" },
    { provider: "CRYPTO", currency: "USDT" },
  ],
};

/** Pays seedés explicitement */
export const SEED_PAYMENT_COUNTRIES = ["BJ", "CI", "SN", "NG", GLOBAL_COUNTRY] as const;

export function isPaymentProvider(v: string): v is PaymentProvider {
  return (PAYMENT_PROVIDERS as readonly string[]).includes(v);
}

export function providerLabel(provider: string): string {
  if (isPaymentProvider(provider)) return PROVIDER_LABELS[provider];
  if (provider === "WALLET") return "Solde AfriVoix";
  return provider;
}
