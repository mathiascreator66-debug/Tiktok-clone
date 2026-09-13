export type CuratedSound = {
  id: string;
  name: string;
  artist: string;
};

/** Liste curatée — pas de fichiers audio, juste des noms style TikTok. */
export const CURATED_SOUNDS: CuratedSound[] = [
  { id: "lofi", name: "Lofi night", artist: "AfriVoix Sounds" },
  { id: "summer", name: "Summer vibes", artist: "AfriVoix Sounds" },
  { id: "drill", name: "Drill instrumental", artist: "AfriVoix Sounds" },
  { id: "piano", name: "Piano émotion", artist: "AfriVoix Sounds" },
  { id: "afro", name: "Afrobeat", artist: "AfriVoix Sounds" },
  { id: "electro", name: "Electro pop", artist: "AfriVoix Sounds" },
  { id: "jazz", name: "Jazz café", artist: "AfriVoix Sounds" },
  { id: "phonk", name: "Phonk", artist: "AfriVoix Sounds" },
  { id: "acoustic", name: "Acoustic guitar", artist: "AfriVoix Sounds" },
  { id: "speed", name: "Speed up", artist: "AfriVoix Sounds" },
];

export function originalSoundName(username: string): string {
  return `Son original — @${username}`;
}

export function soundLabel(name: string | null | undefined, username: string): string {
  const trimmed = (name || "").trim();
  return trimmed || originalSoundName(username);
}
