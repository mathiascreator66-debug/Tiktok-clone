"use client";

/**
 * Cover editor: scrub video timeline → canvas JPEG capture,
 * TikTok-like framed text styles, drag-to-reposition baked into export.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import {
  COVER_TEXT_STYLES,
  getCoverTextStyle,
  type CoverTextStyle,
} from "@/lib/media-edit";

type Props = {
  videoUrl: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (blob: Blob, previewUrl: string) => void;
  initialTimeSec?: number;
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCoverText(
  ctx: CanvasRenderingContext2D,
  text: string,
  style: CoverTextStyle,
  canvasW: number,
  canvasH: number,
  xPct: number,
  yPct: number
) {
  const raw = text.trim().slice(0, 80);
  if (!raw) return;
  const display = style.uppercase ? raw.toUpperCase() : raw;
  const lines = display.split("\n");
  const fontSize = Math.round(Math.min(canvasW, canvasH) * 0.065);
  ctx.font = `bold ${fontSize}px ${style.stack}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (style.letterSpacing) {
    // canvas letterSpacing not universal — skip
  }

  const lineH = fontSize * 1.2;
  let maxW = 0;
  for (const line of lines) {
    maxW = Math.max(maxW, ctx.measureText(line).width);
  }

  const cx = (xPct / 100) * canvasW;
  const cy = (yPct / 100) * canvasH;
  const blockH = lines.length * lineH;
  const padX =
    style.frame === "banner"
      ? Math.max(fontSize * 0.6, canvasW * 0.04)
      : fontSize * 0.55;
  const padY = fontSize * 0.35;

  let boxW =
    style.frame === "banner"
      ? Math.min(canvasW * 0.92, maxW + padX * 2)
      : maxW + padX * 2;
  if (style.frame === "banner") {
    boxW = canvasW * (style.id === "bannerWide" ? 0.96 : 0.88);
  }
  const boxH = blockH + padY * 2;
  const boxX = cx - boxW / 2;
  const boxY = cy - boxH / 2;

  if (style.bg && style.frame !== "none") {
    ctx.save();
    if (style.frame === "pill" || style.frame === "glass") {
      roundRect(ctx, boxX, boxY, boxW, boxH, boxH / 2);
      ctx.fillStyle = style.bg;
      ctx.fill();
    } else if (style.frame === "banner") {
      roundRect(ctx, boxX, boxY, boxW, boxH, Math.min(12, fontSize * 0.25));
      ctx.fillStyle = style.bg;
      ctx.fill();
    } else if (style.frame === "double") {
      const outerPad = fontSize * 0.18;
      roundRect(
        ctx,
        boxX - outerPad,
        boxY - outerPad,
        boxW + outerPad * 2,
        boxH + outerPad * 2,
        Math.min(14, fontSize * 0.3)
      );
      ctx.strokeStyle = style.stroke || "#25f4ee";
      ctx.lineWidth = Math.max(2, fontSize / 14);
      ctx.stroke();
      roundRect(ctx, boxX, boxY, boxW, boxH, Math.min(10, fontSize * 0.25));
      ctx.fillStyle = style.bg;
      ctx.fill();
    }
    ctx.restore();
  }

  lines.forEach((line, i) => {
    const ly = cy - ((lines.length - 1) * lineH) / 2 + i * lineH;
    if (style.shadow && style.frame === "none") {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
    }
    if (style.stroke && style.strokeWidth) {
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = Math.max(
        2,
        (fontSize / 12) * (style.strokeWidth || 1)
      );
      ctx.lineJoin = "round";
      ctx.strokeText(line, cx, ly);
    }
    ctx.fillStyle = style.fill;
    ctx.fillText(line, cx, ly);
    if (style.shadow && style.frame === "none") ctx.restore();
  });
}

function cssForStyle(style: CoverTextStyle): CSSProperties {
  const base: CSSProperties = {
    fontFamily: style.stack,
    color: style.fill,
    fontWeight: 700,
    textAlign: "center",
    textTransform: style.uppercase ? "uppercase" : undefined,
    maxWidth: "90%",
    wordBreak: "break-word",
    lineHeight: 1.2,
    userSelect: "none",
    cursor: "grab",
    touchAction: "none",
  };
  if (style.frame === "none") {
    return {
      ...base,
      WebkitTextStroke:
        style.stroke && style.strokeWidth
          ? `${Math.max(1, style.strokeWidth)}px ${style.stroke}`
          : undefined,
      textShadow: style.shadow || "0 2px 8px rgba(0,0,0,0.65)",
      padding: "2px 4px",
    };
  }
  if (style.frame === "pill" || style.frame === "glass") {
    return {
      ...base,
      backgroundColor: style.bg,
      borderRadius: 9999,
      padding: "6px 14px",
      boxShadow:
        style.frame === "glass"
          ? "0 2px 12px rgba(0,0,0,0.25)"
          : "0 2px 10px rgba(0,0,0,0.35)",
      backdropFilter: style.frame === "glass" ? "blur(6px)" : undefined,
    };
  }
  if (style.frame === "banner") {
    return {
      ...base,
      backgroundColor: style.bg,
      borderRadius: 8,
      padding: "8px 18px",
      width: style.id === "bannerWide" ? "92%" : "auto",
      minWidth: "55%",
      boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
    };
  }
  // double
  return {
    ...base,
    backgroundColor: style.bg,
    borderRadius: 8,
    padding: "8px 14px",
    border: `2px solid ${style.stroke || "#25f4ee"}`,
    outline: `2px solid ${style.stroke || "#25f4ee"}`,
    outlineOffset: 4,
    boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
  };
}

export default function CoverEditor({
  videoUrl,
  open,
  onClose,
  onConfirm,
  initialTimeSec = 0,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [duration, setDuration] = useState(0);
  const [timeSec, setTimeSec] = useState(initialTimeSec);
  const [text, setText] = useState("");
  const [styleId, setStyleId] = useState(COVER_TEXT_STYLES[0].id);
  const [xPct, setXPct] = useState(50);
  const [yPct, setYPct] = useState(72);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);

  const style = getCoverTextStyle(styleId);

  useEffect(() => {
    if (!open) return;
    setTimeSec(initialTimeSec);
    setFrameUrl(null);
    setReady(false);
    setText("");
    setStyleId(COVER_TEXT_STYLES[0].id);
    setXPct(50);
    setYPct(72);
  }, [open, initialTimeSec, videoUrl]);

  useEffect(() => {
    return () => {
      if (frameUrl) URL.revokeObjectURL(frameUrl);
    };
  }, [frameUrl]);

  function seekTo(t: number) {
    const el = videoRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(t, duration || t));
    el.currentTime = clamped;
    setTimeSec(clamped);
  }

  const captureFrame = useCallback((): Promise<Blob> => {
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
        drawCoverText(ctx, text, getCoverTextStyle(styleId), w, h, xPct, yPct);
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
  }, [text, styleId, xPct, yPct]);

  async function refreshFrameOnly() {
    try {
      setBusy(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const w = video.videoWidth || 720;
      const h = video.videoHeight || 1280;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob((b) => res(b), "image/jpeg", 0.85)
      );
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setFrameUrl((prev) => {
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

  function onTextPointerDown(e: React.PointerEvent) {
    if (!text.trim()) return;
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    moveTextToPointer(e);
  }

  function moveTextToPointer(e: React.PointerEvent) {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = Math.min(
      92,
      Math.max(8, ((e.clientX - rect.left) / rect.width) * 100)
    );
    const ny = Math.min(
      92,
      Math.max(8, ((e.clientY - rect.top) / rect.height) * 100)
    );
    setXPct(nx);
    setYPct(ny);
  }

  function onTextPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    moveTextToPointer(e);
  }

  function onTextPointerUp(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
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
        <div
          ref={stageRef}
          className="relative max-h-full max-w-full touch-none"
          style={{ aspectRatio: "9 / 16", width: "min(100%, 42vh)" }}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute opacity-0 pointer-events-none w-px h-px"
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
              void refreshFrameOnly();
            }}
          />
          {frameUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={frameUrl}
              alt="Aperçu couverture"
              className="absolute inset-0 w-full h-full object-contain rounded-xl pointer-events-none select-none"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 rounded-xl bg-white/5 animate-pulse" />
          )}

          {text.trim() ? (
            <div
              role="presentation"
              onPointerDown={onTextPointerDown}
              onPointerMove={onTextPointerMove}
              onPointerUp={onTextPointerUp}
              onPointerCancel={onTextPointerUp}
              className="absolute z-20 active:cursor-grabbing"
              style={{
                left: `${xPct}%`,
                top: `${yPct}%`,
                transform: "translate(-50%, -50%)",
                ...cssForStyle(style),
                fontSize: "clamp(14px, 4.2vw, 22px)",
              }}
            >
              {style.uppercase ? text.trim().toUpperCase() : text.trim()}
            </div>
          ) : null}

          {text.trim() ? (
            <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white/45 z-10 pointer-events-none">
              Glissez le texte pour le positionner
            </p>
          ) : null}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3 pt-3 border-t border-white/10 max-h-[42vh] overflow-y-auto">
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
            onPointerDown={(e) => e.stopPropagation()}
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
            className="w-full bg-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
          />
        </div>

        <div>
          <p className="text-[11px] text-white/45 mb-1.5">
            Styles & cadres (comme TikTok)
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {COVER_TEXT_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyleId(s.id)}
                className={`shrink-0 px-2.5 py-1.5 rounded-full text-[11px] font-semibold border ${
                  styleId === s.id
                    ? "border-white scale-[1.02]"
                    : "border-transparent opacity-80"
                }`}
                style={{
                  fontFamily: s.stack,
                  color: s.fill,
                  backgroundColor:
                    s.bg ||
                    (s.frame === "none" ? "rgba(255,255,255,0.12)" : "#333"),
                  textTransform: s.uppercase ? "uppercase" : undefined,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void refreshFrameOnly()}
          disabled={busy || !ready}
          className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 rounded-full py-2.5 text-sm disabled:opacity-50"
        >
          <ImageIcon size={16} />
          Actualiser l&apos;image
        </button>
      </div>
    </div>
  );
}
