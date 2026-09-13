"use client";

/**
 * Sous-titres / transcription.
 * Auto: Web Speech API (webkitSpeechRecognition) pendant lecture vidéo — best-effort,
 * dépend du navigateur / langue / permission micro. Pas de cloud STT payant.
 * Toujours: édition manuelle des cues {startMs,endMs,text}.
 */

import { useEffect, useRef, useState } from "react";
import { Captions, Mic, Plus, Trash2, Square } from "lucide-react";
import type { CaptionCue } from "@/lib/media-edit";

type Props = {
  cues: CaptionCue[];
  onChange: (next: CaptionCue[]) => void;
  /** Video object URL for timed speech recognition while playing */
  videoUrl?: string | null;
};

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((ev: {
    resultIndex: number;
    results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
  }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function CaptionEditor({ cues, onChange, videoUrl }: Props) {
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const [showCaptions, setShowCaptions] = useState(true);
  const recRef = useRef<SpeechRec | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cueStartRef = useRef(0);

  const speechOk = typeof window !== "undefined" && Boolean(getSpeechRecognition());

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function addCue() {
    const lastEnd = cues.length ? cues[cues.length - 1].endMs : 0;
    onChange([
      ...cues,
      { startMs: lastEnd, endMs: lastEnd + 2500, text: "" },
    ]);
  }

  function updateCue(i: number, patch: Partial<CaptionCue>) {
    onChange(cues.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function removeCue(i: number) {
    onChange(cues.filter((_, idx) => idx !== i));
  }

  function pasteAsCues(raw: string) {
    const lines = raw
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    const next: CaptionCue[] = lines.map((text, i) => ({
      startMs: i * 2500,
      endMs: (i + 1) * 2500,
      text,
    }));
    onChange(next);
    setStatus(`${next.length} ligne(s) importée(s). Ajustez les temps.`);
  }

  function startSpeech() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setStatus("Reconnaissance vocale indisponible sur ce navigateur.");
      return;
    }
    try {
      recRef.current?.stop();
    } catch {
      /* */
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "fr-FR";
    cueStartRef.current =
      videoRef.current && Number.isFinite(videoRef.current.currentTime)
        ? Math.round(videoRef.current.currentTime * 1000)
        : 0;

    const collected: CaptionCue[] = [...cues];

    rec.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) {
          const now =
            videoRef.current && Number.isFinite(videoRef.current.currentTime)
              ? Math.round(videoRef.current.currentTime * 1000)
              : cueStartRef.current + 2500;
          const start = cueStartRef.current;
          const end = Math.max(start + 800, now);
          collected.push({ startMs: start, endMs: end, text: t.trim() });
          cueStartRef.current = end;
          onChange([...collected]);
        } else {
          interim = t;
        }
      }
      if (interim) setStatus(`… ${interim}`);
    };
    rec.onerror = (ev) => {
      setStatus(`Erreur speech: ${ev.error}`);
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setStatus((s) => s || "Transcription arrêtée. Éditez les sous-titres.");
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
    setStatus(
      "Écoute… Parlez clairement (ou laissez jouer l'audio de la vidéo près du micro). Best-effort navigateur."
    );
    if (videoRef.current && videoUrl) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => {});
    }
  }

  function stopSpeech() {
    try {
      recRef.current?.stop();
    } catch {
      /* */
    }
    setListening(false);
    videoRef.current?.pause();
  }

  return (
    <div className="space-y-3 rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-white/70 flex items-center gap-1.5">
          <Captions size={14} /> Sous-titres / Transcription
        </p>
        <label className="flex items-center gap-1.5 text-[11px] text-white/50">
          <input
            type="checkbox"
            checked={showCaptions}
            onChange={(e) => setShowCaptions(e.target.checked)}
            className="accent-[#fe2c55]"
          />
          Aperçu
        </label>
      </div>

      <p className="text-[10px] text-white/35 leading-relaxed">
        {/* Honest: no Whisper/cloud key on this box — SpeechRecognition is best-effort */}
        Auto-transcription via Web Speech API (Chrome/Edge, fr-FR) — best-effort.
        Vous pouvez toujours coller ou taper le texte manuellement.
      </p>

      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full max-h-28 rounded-lg object-cover bg-black"
          playsInline
          controls
          muted={false}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {speechOk ? (
          <button
            type="button"
            onClick={() => (listening ? stopSpeech() : startSpeech())}
            className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 ${
              listening
                ? "bg-[#fe2c55] text-white"
                : "bg-white/10 hover:bg-white/15"
            }`}
          >
            {listening ? <Square size={12} /> : <Mic size={12} />}
            {listening ? "Arrêter" : "Transcrire (micro)"}
          </button>
        ) : (
          <span className="text-[11px] text-white/40">
            SpeechRecognition non disponible — édition manuelle uniquement.
          </span>
        )}
        <button
          type="button"
          onClick={addCue}
          className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/15 rounded-full px-3 py-1.5"
        >
          <Plus size={12} /> Cue
        </button>
      </div>

      {status && (
        <p className="text-[11px] text-[#25f4ee]/80" role="status">
          {status}
        </p>
      )}

      <textarea
        placeholder="Coller un transcript (une ligne = un sous-titre)…"
        rows={2}
        className="w-full bg-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-[#fe2c55] resize-none"
        onBlur={(e) => {
          if (e.target.value.trim()) {
            pasteAsCues(e.target.value);
            e.target.value = "";
          }
        }}
      />

      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {cues.map((c, i) => (
          <li key={i} className="flex gap-2 items-start bg-black/25 rounded-lg p-2">
            <div className="flex flex-col gap-1 shrink-0 w-16">
              <input
                type="number"
                step={0.1}
                min={0}
                title="Début (s)"
                value={(c.startMs / 1000).toFixed(1)}
                onChange={(e) =>
                  updateCue(i, {
                    startMs: Math.round((Number(e.target.value) || 0) * 1000),
                  })
                }
                className="w-full bg-white/10 rounded px-1 py-0.5 text-[10px]"
              />
              <input
                type="number"
                step={0.1}
                min={0}
                title="Fin (s)"
                value={(c.endMs / 1000).toFixed(1)}
                onChange={(e) =>
                  updateCue(i, {
                    endMs: Math.round((Number(e.target.value) || 0) * 1000),
                  })
                }
                className="w-full bg-white/10 rounded px-1 py-0.5 text-[10px]"
              />
            </div>
            <textarea
              value={c.text}
              onChange={(e) => updateCue(i, { text: e.target.value })}
              rows={2}
              maxLength={300}
              className="flex-1 bg-white/10 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[#fe2c55] resize-none"
              placeholder="Texte du sous-titre…"
            />
            <button
              type="button"
              onClick={() => removeCue(i)}
              className="p-1 rounded bg-white/10"
              aria-label="Supprimer"
            >
              <Trash2 size={12} />
            </button>
          </li>
        ))}
      </ul>

      {showCaptions && cues.length > 0 && (
        <div className="rounded-lg bg-black/50 px-3 py-2 text-center text-sm font-semibold text-white shadow">
          {cues[0]?.text || "…"}
          <p className="text-[9px] font-normal text-white/40 mt-1">
            Aperçu style TikTok (premier cue)
          </p>
        </div>
      )}
    </div>
  );
}
