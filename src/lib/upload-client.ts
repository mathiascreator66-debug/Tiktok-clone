/**
 * XHR FormData upload with real progress (fetch has no upload progress).
 * Resolves with parsed JSON; rejects on network / non-OK with { error }.
 */
export function uploadFormData<T = unknown>(
  url: string,
  form: FormData,
  onProgress?: (pct: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !onProgress) return;
      onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      let data: unknown = {};
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch {
        data = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve(data as T);
        return;
      }
      const err =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : "Erreur lors de l'envoi.";
      reject(Object.assign(new Error(err), { status: xhr.status, data }));
    };
    xhr.onerror = () => reject(new Error("Erreur réseau."));
    xhr.onabort = () => reject(new Error("Envoi annulé."));
    xhr.send(form);
  });
}
