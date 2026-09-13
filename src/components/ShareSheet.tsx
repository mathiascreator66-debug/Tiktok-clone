"use client";

import { useEffect, useState } from "react";
import {
  Bookmark,
  Copy,
  EyeOff,
  Flag,
  Gauge,
  X,
} from "lucide-react";
import {
  PLAYBACK_RATES,
  REPORT_REASONS,
  type PlaybackRate,
} from "@/lib/limits";

type Props = {
  open: boolean;
  onClose: () => void;
  caption: string;
  isLoggedIn: boolean;
  bookmarked: boolean;
  playbackRate: PlaybackRate;
  onCopyLink: () => void;
  onToggleBookmark: () => void;
  onNotInterested: () => void;
  onReport: (reason: string) => Promise<void>;
  onPlaybackRate: (rate: PlaybackRate) => void;
};

export default function ShareSheet({
  open,
  onClose,
  caption,
  isLoggedIn,
  bookmarked,
  playbackRate,
  onCopyLink,
  onToggleBookmark,
  onNotInterested,
  onReport,
  onPlaybackRate,
}: Props) {
  const [view, setView] = useState<"main" | "speed" | "report">("main");
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (!open) setView("main");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submitReport(reason: string) {
    if (!isLoggedIn) {
      window.location.href = "/connexion";
      return;
    }
    setReporting(true);
    try {
      await onReport(reason);
      onClose();
    } finally {
      setReporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl border-t border-white/10 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[80dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <p className="font-semibold text-sm">
            {view === "speed"
              ? "Vitesse de lecture"
              : view === "report"
                ? "Signaler"
                : "Partager"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {view === "main" && (
          <>
            <div className="grid grid-cols-4 gap-3 px-4 py-3">
              <SheetAction
                icon={<Copy size={22} />}
                label="Copier le lien"
                onClick={() => {
                  onCopyLink();
                  onClose();
                }}
              />
              <SheetAction
                icon={
                  <Bookmark
                    size={22}
                    className={bookmarked ? "fill-yellow-400 text-yellow-400" : ""}
                  />
                }
                label="Enregistrer"
                onClick={() => {
                  if (!isLoggedIn) {
                    window.location.href = "/connexion";
                    return;
                  }
                  onToggleBookmark();
                  onClose();
                }}
              />
              <SheetAction
                icon={<EyeOff size={22} />}
                label="Pas intéressé"
                onClick={() => {
                  onNotInterested();
                  onClose();
                }}
              />
              <SheetAction
                icon={<Flag size={22} />}
                label="Signaler"
                onClick={() => {
                  if (!isLoggedIn) {
                    window.location.href = "/connexion";
                    return;
                  }
                  setView("report");
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setView("speed")}
              className="mx-4 mb-3 w-[calc(100%-2rem)] flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-left"
            >
              <Gauge size={20} className="text-white/70" />
              <span className="flex-1 text-sm font-medium">
                Vitesse de lecture
              </span>
              <span className="text-xs text-white/45">{playbackRate}×</span>
            </button>
            <p className="px-4 pb-2 text-[11px] text-white/30 truncate">
              {caption}
            </p>
          </>
        )}

        {view === "speed" && (
          <div className="px-4 pb-4 space-y-2">
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => {
                  onPlaybackRate(rate);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${
                  playbackRate === rate
                    ? "bg-white text-black"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <span>{rate === 1 ? "Normale (1×)" : `${rate}×`}</span>
                {playbackRate === rate && <span className="text-xs">✓</span>}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setView("main")}
              className="w-full text-center text-sm text-white/50 py-2"
            >
              Retour
            </button>
          </div>
        )}

        {view === "report" && (
          <div className="px-4 pb-4 space-y-1">
            <p className="text-xs text-white/45 mb-2">
              Pourquoi signalez-vous cette vidéo ?
            </p>
            {REPORT_REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={reporting}
                onClick={() => submitReport(r.id)}
                className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm disabled:opacity-50"
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setView("main")}
              className="w-full text-center text-sm text-white/50 py-2"
            >
              Retour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SheetAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2"
    >
      <span className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
        {icon}
      </span>
      <span className="text-[11px] text-white/70 text-center leading-tight">
        {label}
      </span>
    </button>
  );
}
