/** Trigger video download via API (blob fallback for mobile). */
export async function downloadVideo(videoId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/videos/${videoId}/download`, {
      credentials: "include",
    });
    if (res.status === 403) {
      return { ok: false, error: "Téléchargement désactivé par l’auteur" };
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: (data as { error?: string }).error || "Téléchargement impossible" };
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const match = /filename="?([^";]+)"?/i.exec(cd);
    const name = match?.[1] || `afrivoix-${videoId}.mp4`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur réseau" };
  }
}

export function reuseSoundNavigate(opts: {
  soundUrl: string;
  soundName?: string | null;
  soundVolume?: number;
}) {
  try {
    sessionStorage.setItem(
      "afrivoix_reuse_sound",
      JSON.stringify({
        soundUrl: opts.soundUrl,
        soundName: opts.soundName || "Son réutilisé",
        soundVolume: opts.soundVolume ?? 1,
      })
    );
  } catch {
    /* ignore */
  }
  const q = new URLSearchParams();
  q.set("soundUrl", opts.soundUrl);
  if (opts.soundName) q.set("soundName", opts.soundName);
  if (opts.soundVolume != null) q.set("soundVolume", String(opts.soundVolume));
  window.location.href = `/telecharger?${q.toString()}`;
}
