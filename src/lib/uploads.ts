import path from "path";
import { createWriteStream } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import {
  ALLOWED_AUDIO_EXT,
  ALLOWED_AUDIO_MIME,
} from "@/lib/limits";

/** Disk root for user uploads (also under public/ for legacy; served dynamically). */
export const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};

export function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

/** Resolve URL segments under /uploads/… to an absolute path, or null if unsafe. */
export function resolveUploadPath(segments: string[]): string | null {
  if (!segments.length) return null;
  if (segments.some((s) => !s || s === "." || s === ".." || s.includes("\0"))) {
    return null;
  }
  const joined = path.join(UPLOADS_ROOT, ...segments);
  const resolved = path.resolve(joined);
  const root = path.resolve(UPLOADS_ROOT);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return null;
  }
  return resolved;
}

export async function ensureUploadDir(...subdirs: string[]) {
  const dir = path.join(UPLOADS_ROOT, ...subdirs);
  await mkdir(dir, { recursive: true });
  return dir;
}

export function uploadPublicUrl(...parts: string[]) {
  return "/uploads/" + parts.map((p) => p.replace(/^\/+/, "")).join("/");
}

export function isAllowedAudioFile(file: { type: string; name: string }): boolean {
  if (ALLOWED_AUDIO_MIME.has(file.type)) return true;
  const ext = path.extname(file.name).toLowerCase();
  return ALLOWED_AUDIO_EXT.includes(ext);
}

export function audioExtFor(file: { type: string; name: string }): string {
  const fromName = path.extname(file.name).toLowerCase();
  if (ALLOWED_AUDIO_EXT.includes(fromName)) return fromName;
  if (file.type.includes("mpeg") || file.type.includes("mp3")) return ".mp3";
  if (file.type.includes("wav")) return ".wav";
  if (file.type.includes("ogg")) return ".ogg";
  if (file.type.includes("aac")) return ".aac";
  if (file.type.includes("mp4") || file.type.includes("m4a")) return ".m4a";
  return ".mp3";
}

/**
 * Persist a File to disk without an extra full copy when possible.
 * Streams via Web ReadableStream → Node when available; else buffer fallback.
 * No re-encoding — store as-is for fast publish.
 */
export async function saveUploadFile(
  file: File,
  fullPath: string
): Promise<void> {
  const anyFile = file as File & { stream?: () => ReadableStream };
  if (typeof anyFile.stream === "function") {
    try {
      const nodeReadable = Readable.fromWeb(
        anyFile.stream() as import("stream/web").ReadableStream
      );
      await pipeline(nodeReadable, createWriteStream(fullPath));
      return;
    } catch {
      // fall through to buffer
    }
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);
}
