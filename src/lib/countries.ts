/** Common African + diaspora countries for registration (ISO 3166-1 alpha-2). */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "DZ", name: "Algérie" },
  { code: "AO", name: "Angola" },
  { code: "BJ", name: "Bénin" },
  { code: "BW", name: "Botswana" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CM", name: "Cameroun" },
  { code: "CV", name: "Cap-Vert" },
  { code: "CF", name: "Centrafrique" },
  { code: "TD", name: "Tchad" },
  { code: "KM", name: "Comores" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "RD Congo" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "DJ", name: "Djibouti" },
  { code: "EG", name: "Égypte" },
  { code: "GQ", name: "Guinée équatoriale" },
  { code: "ER", name: "Érythrée" },
  { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Éthiopie" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambie" },
  { code: "GH", name: "Ghana" },
  { code: "GN", name: "Guinée" },
  { code: "GW", name: "Guinée-Bissau" },
  { code: "KE", name: "Kenya" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libye" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "ML", name: "Mali" },
  { code: "MR", name: "Mauritanie" },
  { code: "MU", name: "Maurice" },
  { code: "MA", name: "Maroc" },
  { code: "MZ", name: "Mozambique" },
  { code: "NA", name: "Namibie" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "RW", name: "Rwanda" },
  { code: "ST", name: "Sao Tomé-et-Principe" },
  { code: "SN", name: "Sénégal" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SO", name: "Somalie" },
  { code: "ZA", name: "Afrique du Sud" },
  { code: "SS", name: "Soudan du Sud" },
  { code: "SD", name: "Soudan" },
  { code: "TZ", name: "Tanzanie" },
  { code: "TG", name: "Togo" },
  { code: "TN", name: "Tunisie" },
  { code: "UG", name: "Ouganda" },
  { code: "ZM", name: "Zambie" },
  { code: "ZW", name: "Zimbabwe" },
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgique" },
  { code: "CA", name: "Canada" },
  { code: "US", name: "États-Unis" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "CN", name: "Chine" },
  { code: "ES", name: "Espagne" },
  { code: "DE", name: "Allemagne" },
  { code: "OTHER", name: "Autre" },
];

export const LANG_OPTIONS = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文" },
] as const;

export type UiLang = (typeof LANG_OPTIONS)[number]["code"];

export const UI_LANGS = LANG_OPTIONS.map((l) => l.code) as UiLang[];

export function isUiLang(v: unknown): v is UiLang {
  return typeof v === "string" && (UI_LANGS as string[]).includes(v);
}

export function normalizeUiLang(v: unknown, fallback: UiLang = "fr"): UiLang {
  return isUiLang(v) ? v : fallback;
}
