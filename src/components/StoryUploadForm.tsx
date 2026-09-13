"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, ImagePlus, Music2, X } from "lucide-react";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  MAX_STORY_DURATION_SEC,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_LABEL,
  AUDIO_ACCEPT,
  formatBytesFr,
} from "@/lib/limits";
import { uploadFormData } from "@/lib/upload-client";

export default function StoryUploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [soundName, setSoundName] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [durationSec, setDurationSec] = useState<number | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`Fichier trop lourd (max ${MAX_UPLOAD_LABEL}).`);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    const isVid = f.type.startsWith("video/");
    setIsVideo(isVid);
    const url = URL.createObjectURL(f);
    setPreview(url);
    setDurationSec(null);
    setError("");
    if (isVid) {
      const vid = document.createElement("video");
      vid.preload = "metadata";
      vid.onloadedmetadata = () => {
        const d = vid.duration;
        if (Number.isFinite(d)) {
          setDurationSec(d);
          if (d > MAX_STORY_DURATION_SEC + 1) {
            setError(
              `Story trop longue (max ${MAX_STORY_DURATION_SEC / 60} min).`
            );
            setFile(null);
            setPreview(null);
            URL.revokeObjectURL(url);
          }
        }
      };
      vid.src = url;
    }
  }

  function onAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_AUDIO_BYTES) {
      setError(`Audio trop lourd (max ${MAX_AUDIO_LABEL}).`);
      return;
    }
    if (!f.type.startsWith("audio/") && !/\.(mp3|m4a|aac|wav|ogg)$/i.test(f.name)) {
      setError("Choisissez un fichier audio (mp3, m4a, aac, wav, ogg).");
      return;
    }
    setAudioFile(f);
    setSoundName(f.name.replace(/\.[^.]+$/, "").trim().slice(0, 60));
    setError("");
  }

  function clearAudio() {
    setAudioFile(null);
    setSoundName("");
    if (audioRef.current) audioRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choisissez une image ou une courte vidéo.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Fichier trop lourd (max ${MAX_UPLOAD_LABEL}).`);
      return;
    }
    setLoading(true);
    setProgress(0);
    setError("");
    try {
      const form = new FormData();
      if (caption.trim()) form.append("caption", caption.trim());
      form.append("media", file);
      if (durationSec != null) form.append("durationSec", String(durationSec));
      if (audioFile) {
        form.append("audio", audioFile);
        if (soundName) form.append("soundName", soundName);
      }
      await uploadFormData("/api/stories", form, setProgress);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
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
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
              <ImagePlus size={28} className="text-white/50" />
            </div>
            <p className="text-white/70 text-sm font-medium">Galerie</p>
            <p className="text-white/45 text-sm mt-1">Image ou vidéo courte</p>
            <p className="text-white/30 text-xs mt-2">
              JPEG, PNG, WebP, MP4 — max {MAX_UPLOAD_LABEL} · expire en 24 h
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

      {file && (
        <p className="text-xs text-white/45 truncate">
          {file.name} · {formatBytesFr(file.size)}
        </p>
      )}

      <p className="text-[12px] text-white/40">
        Story : idéalement 15 s. Les stories expirent après 24 h.
      </p>

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

      <div>
        <label className="block text-sm text-white/60 mb-1.5">
          Musique depuis la galerie
        </label>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => audioRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 rounded-xl py-2.5 text-sm"
          >
            <Music2 size={16} />
            {audioFile ? "Changer l'audio" : "Choisir un fichier audio"}
          </button>
          {audioFile && (
            <button
              type="button"
              onClick={clearAudio}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15"
              aria-label="Retirer l'audio"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <input
          ref={audioRef}
          type="file"
          accept={AUDIO_ACCEPT}
          className="hidden"
          onChange={onAudioChange}
        />
        {audioFile && (
          <p className="text-xs text-white/45 mt-1.5 truncate">
            {audioFile.name} · {formatBytesFr(audioFile.size)} — média muet +
            audio galerie
          </p>
        )}
        <p className="text-[11px] text-white/30 mt-1">
          mp3, m4a, aac, wav, ogg — max {MAX_AUDIO_LABEL}
        </p>
      </div>

      {error && (
        <p className="text-[#fe2c55] text-sm" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <div className="space-y-1.5" aria-live="polite">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#25f4ee] transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-white/50 text-center">
            Publication… {progress}%
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#fe2c55] hover:bg-[#e0264c] disabled:opacity-50 rounded-full py-3 font-semibold transition"
      >
        <Upload size={18} />
        {loading ? `Publication… ${progress}%` : "Publier la story"}
      </button>
    </form>
  );
}
