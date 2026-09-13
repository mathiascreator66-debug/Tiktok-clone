/** Upload ceiling: 100 MB = 104 857 600 bytes (videos, stories, related). */
export const MAX_UPLOAD_BYTES = 104_857_600;
export const MAX_UPLOAD_MB = 100;
export const MAX_UPLOAD_LABEL = "100 Mo";

/** Duration caps (WAVE 1) */
export const MAX_VIDEO_DURATION_SEC = 8 * 60; // 8 minutes
export const MAX_STORY_DURATION_SEC = 3 * 60; // 3 minutes
/** Panneau / comment attached videos */
export const MAX_COMMENT_VIDEO_DURATION_SEC = 60;
export const MAX_PANNEAU_VIDEO_DURATION_SEC = 60;
export const MIN_AGE = 13;

/** Bio max — must stay ≥ 250. */
export const BIO_MAX_LENGTH = 250;

export const MAX_PROFILE_LINKS = 3;
export const MAX_PINNED_VIDEOS = 3;
export const CAPTION_MAX_LENGTH = 300;
export const STORY_CAPTION_MAX = 200;

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export const REPORT_REASONS = [
  { id: "spam", label: "Spam" },
  { id: "hate", label: "Harcèlement" },
  { id: "illegal", label: "Contenu illégal" },
  { id: "violence", label: "Violence ou contenus dangereux" },
  { id: "nudity", label: "Nudité ou contenu sexuel" },
  { id: "misinfo", label: "Désinformation" },
  { id: "other", label: "Autre" },
] as const;

export const REPORT_TARGET_TYPES = [
  "video",
  "user",
  "comment",
  "story",
  "message",
  "post",
  "community",
  "community_post",
] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export function formatBytesFr(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

export function formatDurationLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Gallery audio attach (mp3/m4a/aac/wav/ogg) — 20 Mo */
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
export const MAX_AUDIO_LABEL = "20 Mo";
export const AUDIO_ACCEPT =
  "audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/wav,audio/wave,audio/x-wav,audio/ogg,audio/webm,.mp3,.m4a,.aac,.wav,.ogg";
export const ALLOWED_AUDIO_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/x-m4a",
]);
export const ALLOWED_AUDIO_EXT = [".mp3", ".m4a", ".aac", ".wav", ".ogg", ".webm"];

export const STORY_QUICK_EMOJIS = ["❤️", "😂", "🔥", "👏", "😮", "😢", "😍", "💯"] as const;
export const STORY_COMMENT_MAX = 200;
