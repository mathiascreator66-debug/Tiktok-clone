"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Film, Images, Music2, X, Camera } from "lucide-react";
import {
  CAPTION_MAX_LENGTH,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  MAX_VIDEO_DURATION_SEC,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_LABEL,
  AUDIO_ACCEPT,
  formatBytesFr,
} from "@/lib/limits";
import { originalSoundName } from "@/lib/sounds";
import { uploadFormData } from "@/lib/upload-client";
import {
  serializeCaptions,
  serializeOverlays,
  type CaptionCue,
  type TextOverlay,
} from "@/lib/media-edit";
import SoundPicker from "./SoundPicker";
import AudioTrimControls from "./AudioTrimControls";
import TextOverlayEditor from "./TextOverlayEditor";
import CaptionEditor from "./CaptionEditor";
import CameraCapture, { type CameraResult } from "./CameraCapture";

export default function UploadForm({ username }: { username: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [soundName, setSoundName] = useState(originalSoundName(username));
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [soundVolume, setSoundVolume] = useState(1);
  const [trimStartSec, setTrimStartSec] = useState(0);
  const [trimEndSec, setTrimEndSec] = useState<number | null>(null);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [captionCues, setCaptionCues] = useState<CaptionCue[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [source, setSource] = useState<"gallery" | "camera">("gallery");
  const [showCamera, setShowCamera] = useState(false);

  function applyMediaFile(f: File, url: string) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(url);
    setDurationSec(null);
    setError("");
    if (f.type.startsWith("video/")) {
      const vid = document.createElement("video");
      vid.preload = "metadata";
      vid.onloadedmetadata = () => {
        const d = vid.duration;
        if (Number.isFinite(d)) {
          setDurationSec(d);
          if (d > MAX_VIDEO_DURATION_SEC + 1) {
            setError(
              `Vidéo trop longue (max ${MAX_VIDEO_DURATION_SEC / 60} min).`
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

  function onCameraCapture(result: CameraResult) {
    setShowCamera(false);
    setSource("camera");
    if (result.kind === "image") {
      URL.revokeObjectURL(result.previewUrl);
      setError(
        "Les photos se publient en Story. Ouvrez l’onglet Story pour une photo, ou filmez une vidéo ici."
      );
      setFile(null);
      return;
    }
    applyMediaFile(result.file, result.previewUrl);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`Vidéo trop lourde (max ${MAX_UPLOAD_LABEL}).`);
      return;
    }
    if (!f.type.startsWith("video/")) {
      setError("Pour Publier, choisissez une vidéo (ou utilisez Story pour une photo).");
      return;
    }
    applyMediaFile(f, URL.createObjectURL(f));
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
    const base = f.name.replace(/\.[^.]+$/, "").trim().slice(0, 60);
    if (base) setSoundName(base);
    setSoundVolume(1);
    setTrimStartSec(0);
    setTrimEndSec(null);
    setError("");
  }

  function clearAudio() {
    setAudioFile(null);
    if (audioRef.current) audioRef.current.value = "";
    setSoundName(originalSoundName(username));
    setSoundVolume(1);
    setTrimStartSec(0);
    setTrimEndSec(null);
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
    setProgress(0);
    setError("");
    try {
      const form = new FormData();
      form.append("caption", caption);
      form.append("video", file);
      form.append("soundName", soundName);
      if (durationSec != null) form.append("durationSec", String(durationSec));
      if (audioFile) {
        form.append("audio", audioFile);
        form.append("soundVolume", String(soundVolume));
        form.append(
          "soundTrimStartMs",
          String(Math.round(trimStartSec * 1000))
        );
        if (trimEndSec != null) {
          form.append(
            "soundTrimEndMs",
            String(Math.round(trimEndSec * 1000))
          );
        }
      }
      const overlaysJson = serializeOverlays(textOverlays);
      if (overlaysJson) form.append("textOverlays", overlaysJson);
      const captionsJson = serializeCaptions(captionCues);
      if (captionsJson) form.append("captions", captionsJson);
      await uploadFormData("/api/videos", form, setProgress);
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
      <div className="flex gap-2 p-1 rounded-full bg-white/5">
        <button
          type="button"
          onClick={() => {
            setSource("gallery");
            setShowCamera(false);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold ${
            source === "gallery" && !showCamera
              ? "bg-white text-black"
              : "text-white/70"
          }`}
        >
          <Images size={14} /> Galerie
        </button>
        <button
          type="button"
          onClick={() => {
            setSource("camera");
            setShowCamera(true);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold ${
            showCamera || (source === "camera" && !file)
              ? "bg-white text-black"
              : "text-white/70"
          }`}
        >
          <Camera size={14} /> Caméra
        </button>
      </div>

      {showCamera ? (
        <CameraCapture
          allowModes={["photo", "video"]}
          maxSeconds={MAX_VIDEO_DURATION_SEC}
          onCapture={onCameraCapture}
          onCancel={() => {
            setShowCamera(false);
            setSource("gallery");
          }}
        />
      ) : (
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
              MP4, WebM, MOV — max {MAX_UPLOAD_LABEL},{" "}
              {MAX_VIDEO_DURATION_SEC / 60} min
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
      )}

      {file && !showCamera && (
        <p className="text-xs text-white/45 flex items-center gap-2">
          <Film size={12} />
          <span className="truncate">{file.name}</span>
          <span className="shrink-0">{formatBytesFr(file.size)}</span>
        </p>
      )}

      <p className="text-[12px] text-white/40 leading-relaxed">
        Conseils durée : <span className="text-white/70">15 s</span> pour plus
        de vues · jusqu&apos;à <span className="text-white/70">60 s</span>{" "}
        recommandé (pas de limite caméra).
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

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-white/80">Son</h3>
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
              {audioFile.name} · {formatBytesFr(audioFile.size)} — la vidéo sera
              muette, l&apos;audio de galerie jouera
            </p>
          )}
          <p className="text-[11px] text-white/30 mt-1">
            mp3, m4a, aac, wav, ogg — max {MAX_AUDIO_LABEL}
          </p>
        </div>

        {audioFile && (
          <AudioTrimControls
            audioFile={audioFile}
            volume={soundVolume}
            trimStartSec={trimStartSec}
            trimEndSec={trimEndSec}
            onVolumeChange={setSoundVolume}
            onTrimChange={(s, e) => {
              setTrimStartSec(s);
              setTrimEndSec(e);
            }}
          />
        )}

        {!audioFile && (
          <SoundPicker
            value={soundName}
            username={username}
            onChange={setSoundName}
          />
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-white/80 mb-2">Texte</h3>
        <TextOverlayEditor
          overlays={textOverlays}
          onChange={setTextOverlays}
          previewUrl={preview}
        />
      </section>

      <section>
        <h3 className="text-sm font-medium text-white/80 mb-2">
          Sous-titres / Transcription
        </h3>
        <CaptionEditor
          cues={captionCues}
          onChange={setCaptionCues}
          videoUrl={preview}
        />
      </section>

      {error && <p className="text-[#fe2c55] text-sm">{error}</p>}

      {loading && (
        <div className="space-y-1.5" aria-live="polite">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#fe2c55] transition-[width] duration-150"
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
        {loading ? `Publication… ${progress}%` : "Publier"}
      </button>
    </form>
  );
}
