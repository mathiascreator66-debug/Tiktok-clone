export type StudioRange = "1d" | "7d" | "28d";

export const RANGE_LABELS: Record<StudioRange, string> = {
  "28d": "28 jours",
  "7d": "7 jours",
  "1d": "Aujourd’hui",
};

export const SOURCE_LABELS: Record<string, string> = {
  pour_toi: "Pour toi",
  profil: "Profil",
  recherche: "Recherche",
  abonnements: "Abonnements",
  autre: "Autre",
};
