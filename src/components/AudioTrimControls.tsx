"use client";

/**
 * Volume (0–200%) + trim start/end for gallery audio.
 * Optional waveform via Web Audio API decode + canvas peaks (best-effort).
 */

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

type Props = {
  audioFile: File | null;
  /** Object URL or remote URL for preview when no File */
  audioUrl?: string | null;
  volume: number;
  trimStartSec: number;
  trimEndSec: number | null;
  onVolumeChange: (v: number) => void;
  onTrimChange: (startSec: number, endSec: number | null) => void;
};

function formatSec(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AudioTrimControls({
  audioFile,
  audioUrl,
  volume,
  trimStartSec,
  trimEndSec,
  onVolumeChange,
  onTrimChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const src = objectUrl || audioUrl || null;

  useEffect(() => {
    if (!audioFile) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(audioFile);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioFile]);

  // Decode waveform peaks (best-effort; silent fail on CORS / decode errors)
  useEffect(() => {
    if (!src || !canvasRef.current) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    const ctxRaw = canvas.getContext("2d");
    if (!ctxRaw) return;
    const ctx: CanvasRenderingContext2D = ctxRaw;

    async function draw() {
      try {
        const res = await fetch(src!);
        const buf = await res.arrayBuffer();
        const ac = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
        const decoded = await ac.decodeAudioData(buf.slice(0));
        if (cancelled) {
          await ac.close().catch(() => {});
          return;
        }
        setDuration(decoded.duration);
        const peaks = 120;
        const data = decoded.getChannelData(0);
        const block = Math.floor(data.length / peaks);
        const values: number[] = [];
        for (let i = 0; i < peaks; i++) {
          let max = 0;
          const start = i * block;
          for (let j = 0; j < block; j++) {
            const v = Math.abs(data[start + j] || 0);
            if (v > max) max = v;
          }
          values.push(max);
        }
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(254,44,85,0.55)";
        const barW = w / peaks;
        for (let i = 0; i < peaks; i++) {
          const bh = Math.max(2, values[i] * h * 0.9);
          ctx.fillRect(i * barW, (h - bh) / 2, Math.max(1, barW - 1), bh);
        }
        await ac.close().catch(() => {});
      } catch {
        // Waveform optional
        if (!cancelled && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.fillRect(0, canvas.height / 2 - 1, canvas.width, 2);
        }
      }
    }
    draw();
    return () => {
      cancelled = true;
    };
  }, [src]);

  // Probe duration via <audio> if waveform didn't set it
  useEffect(() => {
    if (!src) return;
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setDuration((d) => (d > 0 ? d : a.duration));
      }
    };
    a.src = src;
  }, [src]);

  useEffect(() => {
    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      audioElRef.current?.pause();
    };
  }, []);

  function playPreview() {
    if (!src) return;
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    let a = audioElRef.current;
    if (!a) {
      a = new Audio();
      audioElRef.current = a;
    }
    a.src = src;
    a.volume = Math.min(1, Math.max(0, volume));
    const start = Math.max(0, trimStartSec);
    const end =
      trimEndSec != null && trimEndSec > start
        ? trimEndSec
        : duration > 0
          ? duration
          : start + 8;
    a.currentTime = start;
    a.play()
      .then(() => {
        setPlaying(true);
        const ms = Math.max(200, (end - start) * 1000);
        stopTimerRef.current = setTimeout(() => {
          a!.pause();
          setPlaying(false);
        }, ms);
      })
      .catch(() => setPlaying(false));
  }

  function stopPreview() {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    audioElRef.current?.pause();
    setPlaying(false);
  }

  const endVal =
    trimEndSec != null
      ? trimEndSec
      : duration > 0
        ? duration
        : Math.max(trimStartSec + 1, 30);

  if (!audioFile && !audioUrl) return null;

  return (
    <div className="mt-3 space-y-3 rounded-xl bg-white/5 border border-white/10 p-3">
      <p className="text-xs font-medium text-white/70">Son — volume & coupe</p>

      <div>
        <div className="flex justify-between text-[11px] text-white/45 mb-1">
          <span>Volume</span>
          <span>{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={200}
          step={1}
          value={Math.round(volume * 100)}
          onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
          className="w-full accent-[#fe2c55]"
          aria-label="Volume du son"
        />
      </div>

      <canvas
        ref={canvasRef}
        width={320}
        height={48}
        className="w-full h-12 rounded-lg bg-black/40"
        aria-hidden
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-white/45">Début (s)</label>
          <input
            type="number"
            min={0}
            step={0.1}
            max={duration || 9999}
            value={Number(trimStartSec.toFixed(1))}
            onChange={(e) => {
              const s = Math.max(0, Number(e.target.value) || 0);
              const end =
                trimEndSec != null && trimEndSec <= s
                  ? s + 0.5
                  : trimEndSec;
              onTrimChange(s, end);
            }}
            className="w-full mt-0.5 bg-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
          />
        </div>
        <div>
          <label className="text-[11px] text-white/45">
            Fin (s){duration ? ` · max ${formatSec(duration)}` : ""}
          </label>
          <input
            type="number"
            min={0}
            step={0.1}
            max={duration || 9999}
            value={Number(endVal.toFixed(1))}
            onChange={(e) => {
              const end = Math.max(0, Number(e.target.value) || 0);
              onTrimChange(trimStartSec, end);
            }}
            className="w-full mt-0.5 bg-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={Math.max(duration || 30, 1) * 10}
          value={trimStartSec * 10}
          onChange={(e) => {
            const s = Number(e.target.value) / 10;
            const end =
              trimEndSec != null && trimEndSec <= s ? s + 0.5 : trimEndSec;
            onTrimChange(s, end);
          }}
          className="flex-1 accent-[#25f4ee]"
          aria-label="Début coupe"
        />
        <input
          type="range"
          min={0}
          max={Math.max(duration || 30, 1) * 10}
          value={endVal * 10}
          onChange={(e) => {
            onTrimChange(trimStartSec, Number(e.target.value) / 10);
          }}
          className="flex-1 accent-[#fe2c55]"
          aria-label="Fin coupe"
        />
      </div>

      <button
        type="button"
        onClick={() => (playing ? stopPreview() : playPreview())}
        className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/15 rounded-full px-3 py-1.5"
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
        {playing ? "Arrêter l'aperçu" : "Aperçu du segment"}
      </button>
      <p className="text-[10px] text-white/30">
        Le son démarre à {formatSec(trimStartSec)}
        {trimEndSec != null ? ` et s'arrête à ${formatSec(trimEndSec)}` : ""}.
      </p>
    </div>
  );
}
