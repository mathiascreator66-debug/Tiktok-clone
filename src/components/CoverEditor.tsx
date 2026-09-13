"use client";

/**
 * Cover editor: scrub video timeline → canvas JPEG capture, optional text overlay baked in.
 */

import { useEffect, useRef, useState } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import { FONT_PRESETS, OVERLAY_COLORS } from "@/lib/media-edit";

type Props = {
  videoUrl: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (blob: Blob, previewUrl: string) => void;
  initialTimeSec?: number;
};

export default function CoverEditor({
  videoUrl,
  open,
  onClose,
  onConfirm,
  initialTimeSec = 0,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [timeSec, setTimeSec] = useState(initialTimeSec);
  const [text, setText] = useState("");
  const [fontId, setFontId] = useState(FONT_PRESETS[0].id);
  const [color, setColor] = useState("#ffffff");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTimeSec(initialTimeSec);
    setPreviewUrl(null);
    setReady(false);
    setText("");
  }, [open, initialTimeSec, videoUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function seekTo(t: number) {
    const el = videoRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(t, duration || t));
    el.currentTime = clamped;
    setTimeSec(clamped);
  }

  function captureFrame(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        reject(new Error("Vidéo indisponible"));
        return;
      }
      const w = video.videoWidth || 720;
      const h = video.videoHeight || 1280;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas indisponible"));
        return;
      }
      ctx.drawImage(video, 0, 0, w, h);
      if (text.trim()) {
        const preset =
          FONT_PRESETS.find((f) => f.id === fontId) || FONT_PRESETS[0];
        const fontSize = Math.round(Math.min(w, h) * 0.07);
        ctx.font = `bold ${fontSize}px ${preset.stack}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = color;
        ctx.strokeStyle = "rgba(0,0,0,0.75)";
        ctx.lineWidth = Math.max(2, fontSize / 12);
        const x = w / 2;
        const y = h * 0.72;
        const lines = text.trim().slice(0, 80).split("\n");
        lines.forEach((line, i) => {
          const ly = y + i * fontSize * 1.15;
          ctx.strokeText(line, x, ly);
          ctx.fillText(line, x, ly);
        });
      }
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error("Échec capture"));
          else resolve(blob);
        },
        "image/jpeg",
        0.88
      );
    });
  }

  async function refreshPreview() {
    try {
      setBusy(true);
      const blob = await captureFrame();
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    try {
      setBusy(true);
      const blob = await captureFrame();
      const url = URL.createObjectURL(blob);
      onConfirm(blob, url);
      onClose();
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col">
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-white/10"
          aria-label="Fermer"
        >
          <X size={20} />
        </button>
        <h2 className="text-sm font-semibold">Modifier la couverture</h2>
        <button
          type="button"
          onClick={confirm}
          disabled={busy || !ready}
          className="text-sm font-semibold text-[#fe2c55] px-2 disabled:opacity-50"
        >
          OK
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 relative min-h-0">
        <video
          ref={videoRef}
          src={videoUrl}
          className={`max-h-full max-w-full object-contain rounded-xl ${
            previewUrl ? "absolute opacity-0 pointer-events-none w-px h-px" : ""
          }`}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={() => {
            const el = videoRef.current;
            if (!el) return;
            setDuration(el.duration || 0);
            setReady(true);
            const t = Math.min(initialTimeSec, el.duration || 0);
            el.currentTime = t;
            setTimeSec(t);
          }}
          onSeeked={() => {
            void refreshPreview();
          }}
        />
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Aperçu couverture"
            className="max-h-full max-w-full object-contain rounded-xl"
          />
        ) : null}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3 pt-3 border-t border-white/10">
        <div>
          <div className="flex justify-between text-[11px] text-white/45 mb-1">
            <span>Image de couverture</span>
            <span>
              {timeSec.toFixed(1)}s
              {duration ? ` / ${duration.toFixed(1)}s` : ""}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(duration || 1, 0.1)}
            step={0.05}
            value={Math.min(timeSec, duration || timeSec)}
            onChange={(e) => {
              seekTo(Number(e.target.value));
            }}
            className="w-full accent-[#fe2c55]"
            aria-label="Position de la couverture"
          />
        </div>

        <div>
          <label className="block text-[11px] text-white/45 mb-1">
            Texte sur la couverture (optionnel)
          </label>
          <input
            type="text"
            value={text}
            maxLength={80}
            placeholder="Ajouter un texte…"
            onChange={(e) => setText(e.target.value)}
            onBlur={() => void refreshPreview()}
            className="w-full bg-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {FONT_PRESETS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFontId(f.id);
                setTimeout(() => void refreshPreview(), 0);
              }}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] ${
                fontId === f.id
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/70"
              }`}
              style={{ fontFamily: f.stack }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {OVERLAY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                setTimeout(() => void refreshPreview(), 0);
              }}
              className={`w-7 h-7 rounded-full border-2 ${
                color === c ? "border-white" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Couleur ${c}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => void refreshPreview()}
          disabled={busy || !ready}
          className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 rounded-full py-2.5 text-sm disabled:opacity-50"
        >
          <ImageIcon size={16} />
          Actualiser l&apos;aperçu
        </button>
      </div>
    </div>
  );
}
