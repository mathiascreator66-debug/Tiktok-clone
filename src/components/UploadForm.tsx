"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Film, Images } from "lucide-react";
import {
  CAPTION_MAX_LENGTH,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  MAX_VIDEO_DURATION_SEC,
  formatBytesFr,
} from "@/lib/limits";
import { originalSoundName } from "@/lib/sounds";
import SoundPicker from "./SoundPicker";

export default function UploadForm({ username }: { username: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [soundName, setSoundName] = useState(originalSoundName(username));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [durationSec, setDurationSec] = useState<number | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`Vidéo trop lourde (max ${MAX_UPLOAD_LABEL}).`);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setDurationSec(null);
    setError("");
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.onloadedmetadata = () => {
      const d = vid.duration;
      URL.revokeObjectURL(vid.src);
      if (Number.isFinite(d)) {
        setDurationSec(d);
        if (d > MAX_VIDEO_DURATION_SEC + 1) {
          setError(`Vidéo trop longue (max ${MAX_VIDEO_DURATION_SEC / 60} min).`);
          setFile(null);
          setPreview(null);
        }
      }
    };
    vid.src = url;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choisissez une vidéo.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Vidéo trop lourde (max ${MAX_UPLOAD_LABEL}).`);
      return;
    }
    if (durationSec != null && durationSec > MAX_VIDEO_DURATION_SEC + 1) {
      setError(`Vidéo trop longue (max ${MAX_VIDEO_DURATION_SEC / 60} min).`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("caption", caption);
      form.append("video", file);
      form.append("soundName", soundName);
      if (durationSec != null) form.append("durationSec", String(durationSec));
      const res = await fetch("/api/videos", {
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
        className="relative aspect-[9/16] max-h-[46vh] rounded-2xl border-2 border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-[#fe2c55]/50 transition"
      >
        {preview ? (
          <video
            src={preview}
            className="absolute inset-0 w-full h-full object-cover"
            muted
            loop
            autoPlay
            playsInline
          />
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
              <Images size={28} className="text-white/50" />
            </div>
            <p className="text-white/70 text-sm font-medium">Galerie</p>
            <p className="text-white/45 text-sm mt-1">
              Appuyez pour choisir une vidéo
            </p>
            <p className="text-white/30 text-xs mt-2">
              MP4, WebM, MOV — max {MAX_UPLOAD_LABEL}, {MAX_VIDEO_DURATION_SEC / 60} min
            </p>
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

      {file && (
        <p className="text-xs text-white/45 flex items-center gap-2">
          <Film size={12} />
          <span className="truncate">{file.name}</span>
          <span className="shrink-0">{formatBytesFr(file.size)}</span>
        </p>
      )}

      <p className="text-[12px] text-white/40 leading-relaxed">
        Conseils durée : <span className="text-white/70">15 s</span> pour plus
        de vues · jusqu’à <span className="text-white/70">60 s</span> recommandé
        (pas de limite caméra).
      </p>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">Légende</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          maxLength={CAPTION_MAX_LENGTH}
          placeholder="Décrivez votre vidéo..."
          className="w-full bg-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55] resize-none"
          required
        />
        <p className="text-[11px] text-white/35 mt-1 text-right">
          {CAPTION_MAX_LENGTH - caption.length} caractères restants
        </p>
      </div>

      <SoundPicker
        value={soundName}
        username={username}
        onChange={setSoundName}
      />

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
