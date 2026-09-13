const DATA_SAVER_KEY = "afrivoix_data_saver";

export function getDataSaver(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DATA_SAVER_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDataSaver(on: boolean) {
  try {
    localStorage.setItem(DATA_SAVER_KEY, on ? "1" : "0");
    window.dispatchEvent(new Event("afrivoix-data-saver"));
  } catch {
    /* */
  }
}

/** Very small FR↔EN dictionary for one-tap best-effort translation. */
const FR_EN: Record<string, string> = {
  bonjour: "hello",
  salut: "hi",
  merci: "thank you",
  oui: "yes",
  non: "no",
  amour: "love",
  musique: "music",
  danse: "dance",
  afrique: "africa",
  vidéo: "video",
  aimer: "like",
  commenter: "comment",
  partager: "share",
  suivre: "follow",
  hello: "bonjour",
  hi: "salut",
  "thank you": "merci",
  yes: "oui",
  no: "non",
  love: "amour",
  music: "musique",
  dance: "danse",
  africa: "afrique",
  video: "vidéo",
  like: "aimer",
  comment: "commenter",
  share: "partager",
  follow: "suivre",
};

export function translateBestEffort(text: string, to: "en" | "fr" = "en"): string {
  const words = text.split(/(\s+)/);
  return words
    .map((w) => {
      const key = w.toLowerCase();
      const hit = FR_EN[key];
      if (!hit) return w;
      // If target en and word looks french-mapped
      if (to === "en") return FR_EN[key] || w;
      // reverse: if english key mapped to french when to=fr
      const rev = Object.entries(FR_EN).find(([, v]) => v === key);
      return rev ? rev[0] : w;
    })
    .join("");
}
