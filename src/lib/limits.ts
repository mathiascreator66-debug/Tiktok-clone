/** Upload ceiling: 100 MB = 104 857 600 bytes (videos, stories, related). */
export const MAX_UPLOAD_BYTES = 104_857_600;
export const MAX_UPLOAD_MB = 100;
export const MAX_UPLOAD_LABEL = "100 Mo";

/** Bio max — must stay ≥ 250. */
export const BIO_MAX_LENGTH = 250;

export const MAX_PROFILE_LINKS = 3;
export const MAX_PINNED_VIDEOS = 3;
export const CAPTION_MAX_LENGTH = 300;
export const STORY_CAPTION_MAX = 200;

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export const REPORT_REASONS = [
  { id: "spam", label: "Spam ou publicité" },
  { id: "hate", label: "Haine ou harcèlement" },
  { id: "violence", label: "Violence ou contenus dangereux" },
  { id: "nudity", label: "Nudité ou contenu sexuel" },
  { id: "misinfo", label: "Désinformation" },
  { id: "other", label: "Autre" },
] as const;

export function formatBytesFr(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
