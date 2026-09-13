import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Videos max 8 minutes; stories max 3 minutes */
export const MAX_VIDEO_DURATION_SEC = 8 * 60;
export const MAX_STORY_DURATION_SEC = 3 * 60;

/**
 * Probe duration with ffprobe if available.
 * Returns seconds or null if unavailable.
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
      { timeout: 15000 }
    );
    const n = parseFloat(String(stdout).trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function parseClientDuration(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
