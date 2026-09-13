export type CuratedSound = {
  id: string;
  name: string;
  artist: string;
};

/** Liste curatée — pas de fichiers audio, juste des noms style TikTok. */
export const CURATED_SOUNDS: CuratedSound[] = [
  { id: "lofi", name: "Lofi night", artist: "ClipTok Sounds" },
  { id: "summer", name: "Summer vibes", artist: "ClipTok Sounds" },
  { id: "drill", name: "Drill instrumental", artist: "ClipTok Sounds" },
  { id: "piano", name: "Piano émotion", artist: "ClipTok Sounds" },
  { id: "afro", name: "Afrobeat", artist: "ClipTok Sounds" },
  { id: "electro", name: "Electro pop", artist: "ClipTok Sounds" },
  { id: "jazz", name: "Jazz café", artist: "ClipTok Sounds" },
  { id: "phonk", name: "Phonk", artist: "ClipTok Sounds" },
  { id: "acoustic", name: "Acoustic guitar", artist: "ClipTok Sounds" },
  { id: "speed", name: "Speed up", artist: "ClipTok Sounds" },
];

export function originalSoundName(username: string): string {
  return `Son original — @${username}`;
}

export function soundLabel(name: string | null | undefined, username: string): string {
  const trimmed = (name || "").trim();
  return trimmed || originalSoundName(username);
}
