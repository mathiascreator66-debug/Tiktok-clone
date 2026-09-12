"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, ImagePlus } from "lucide-react";

export default function StoryUploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setIsVideo(f.type.startsWith("video/"));
    setPreview(URL.createObjectURL(f));
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choisissez une image ou une courte vidéo.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Fichier trop lourd (max 15 Mo).");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      if (caption.trim()) form.append("caption", caption.trim());
      form.append("media", file);
      const res = await fetch("/api/stories", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'envoi.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md mx-auto space-y-5">
      <div
        onClick={() => fileRef.current?.click()}
        className="relative aspect-[9/16] max-h-[50vh] rounded-2xl border-2 border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-[#25f4ee]/50 transition"
      >
        {preview ? (
          isVideo ? (
            <video
              src={preview}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              loop
              autoPlay
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )
        ) : (
          <>
            <ImagePlus size={48} className="text-white/30 mb-3" />
            <p className="text-white/50 text-sm">Image ou vidéo courte</p>
            <p className="text-white/30 text-xs mt-1">
              JPEG, PNG, WebP, MP4 — max 15 Mo · expire en 24 h
            </p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">
          Légende (optionnel)
        </label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="Ajoutez une légende…"
          className="w-full bg-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[#25f4ee] resize-none"
        />
      </div>

      {error && (
        <p className="text-[#fe2c55] text-sm" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#fe2c55] hover:bg-[#e0264c] disabled:opacity-50 rounded-full py-3 font-semibold transition"
      >
        <Upload size={18} />
        {loading ? "Publication…" : "Publier la story"}
      </button>
    </form>
  );
}
