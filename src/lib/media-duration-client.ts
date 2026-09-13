/** Browser-side HTML5 duration probe for attached videos (comments / panneau). */
export function probeVideoFileDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    video.onloadedmetadata = () => {
      const d = video.duration;
      cleanup();
      if (!Number.isFinite(d) || d <= 0) {
        reject(new Error("Durée vidéo illisible."));
        return;
      }
      resolve(d);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Impossible de lire la vidéo."));
    };
    video.src = url;
  });
}

export async function assertVideoMaxDuration(
  file: File,
  maxSec: number
): Promise<number> {
  const d = await probeVideoFileDuration(file);
  if (d > maxSec + 0.5) {
    throw new Error(
      `Vidéo trop longue (${Math.ceil(d)}s). Maximum ${maxSec} secondes.`
    );
  }
  return d;
}
