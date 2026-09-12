/** Compteur style TikTok (FR) : 1 234 · 12,3 K · 1,1 M */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    const s = k >= 100 ? Math.round(k).toString() : k.toFixed(1).replace(".", ",").replace(/,0$/, "");
    return `${s} K`;
  }
  const m = n / 1_000_000;
  const s = m >= 100 ? Math.round(m).toString() : m.toFixed(1).replace(".", ",").replace(/,0$/, "");
  return `${s} M`;
}

/** Timestamp court inbox (ex. « 14 h », « 3 j »). */
export function formatInboxTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diffMs = Date.now() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "maintenant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
