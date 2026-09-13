import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Videos max 8 minutes; stories max 3 minutes */
export const MAX_VIDEO_DURATION_SEC = 8 * 60;
export const MAX_STORY_DURATION_SEC = 3 * 60;
export const MAX_COMMENT_VIDEO_DURATION_SEC = 60;
export const MAX_PANNEAU_VIDEO_DURATION_SEC = 60;

/**
 * Probe duration with ffprobe if available.
 * Prefer client-reported HTML5 duration to avoid blocking uploads.
 * Timeout kept short (3s) so a missing/slow ffprobe never freezes publish.
 */
export async function probeDurationSeconds(
  filePath: string
): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { timeout: 3000 }
    );
    const n = parseFloat(String(stdout).trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Use client duration when present (validated HTML5 metadata).
 * Only fall back to ffprobe when client did not send a duration.
 * Avoids double-work and keeps publish snappy.
 */
export async function resolveDurationSeconds(
  filePath: string,
  clientDuration: number | null,
  opts?: { forceProbe?: boolean }
): Promise<number | null> {
  if (clientDuration != null && !opts?.forceProbe) {
    return clientDuration;
  }
  const probed = await probeDurationSeconds(filePath);
  return probed ?? clientDuration;
}

export function parseClientDuration(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
