"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Film } from "lucide-react";

export default function UploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choisissez une vidéo.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("caption", caption);
      form.append("video", file);
      const res = await fetch("/api/videos", { method: "POST", body: form });
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
        className="relative aspect-[9/16] max-h-[50vh] rounded-2xl border-2 border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-[#fe2c55]/50 transition"
      >
        {preview ? (
          <video src={preview} className="absolute inset-0 w-full h-full object-cover" muted loop autoPlay playsInline />
        ) : (
          <>
            <Film size={48} className="text-white/30 mb-3" />
            <p className="text-white/50 text-sm">Appuyez pour choisir une vidéo</p>
            <p className="text-white/30 text-xs mt-1">MP4, WebM — max 50 Mo</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">Légende</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="Décrivez votre vidéo..."
          className="w-full bg-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55] resize-none"
          required
        />
      </div>

      {error && <p className="text-[#fe2c55] text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#fe2c55] hover:bg-[#e0264c] disabled:opacity-50 rounded-full py-3 font-semibold transition"
      >
        <Upload size={18} />
        {loading ? "Publication..." : "Publier"}
      </button>
    </form>
  );
}
