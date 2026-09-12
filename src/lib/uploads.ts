import path from "path";
import { mkdir } from "fs/promises";

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
