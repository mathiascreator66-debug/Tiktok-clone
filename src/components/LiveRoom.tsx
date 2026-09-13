"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gift, Heart, Radio, X } from "lucide-react";
import Avatar from "./Avatar";
import { formatCount } from "@/lib/format";

type LiveData = {
  id: string;
  title: string | null;
  status: string;
  viewerPeak: number;
  startedAt: string;
  endedAt: string | null;
  likeCount: number;
  likedByMe: boolean;
  isOwner: boolean;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  comments: {
    id: string;
    content: string;
    user: { username: string; avatarUrl: string | null };
  }[];
};

export default function LiveRoom({ liveId }: { liveId: string }) {
  const [live, setLive] = useState<LiveData | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recap, setRecap] = useState<{
    durationSec: number;
    viewerPeak: number;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/lives/${liveId}`, { credentials: "include" });
    if (!res.ok) {
      setError("Live introuvable.");
      return;
    }
    const data = await res.json();
    setLive(data.live);
  }, [liveId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [live?.comments.length]);

  useEffect(() => {
    if (!live?.isOwner || live.status !== "LIVE") return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setError("Caméra inaccessible — autorisez l’accès.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [live?.isOwner, live?.status]);

  async function endLive() {
    const res = await fetch(`/api/lives/${liveId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "ENDED" }),
    });
    const data = await res.json();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (res.ok) {
      setRecap({
        durationSec: data.live.durationSec || 0,
        viewerPeak: data.live.viewerPeak || 0,
      });
      setLive((l) => (l ? { ...l, status: "ENDED" } : l));
    }
  }

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    const res = await fetch(`/api/lives/${liveId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    if (res.status === 401) {
      window.location.href = `/connexion?next=/live/${liveId}`;
      return;
    }
    await load();
  }

  async function heart() {
    await fetch(`/api/lives/${liveId}/like`, {
      method: "POST",
      credentials: "include",
    });
    setLive((l) =>
      l
        ? {
            ...l,
            likedByMe: true,
            likeCount: l.likedByMe ? l.likeCount : l.likeCount + 1,
          }
        : l
    );
  }

  if (recap) {
    const m = Math.floor(recap.durationSec / 60);
    const s = recap.durationSec % 60;
    return (
      <div className="force-dark fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-6 text-center">
        <Radio size={40} className="text-[#fe2c55] mb-4" />
        <h1 className="text-2xl font-bold mb-2">Live terminé</h1>
        <p className="text-white/60 text-sm mb-1">
          Durée {m}:{String(s).padStart(2, "0")}
        </p>
        <p className="text-white/60 text-sm mb-8">
          {formatCount(recap.viewerPeak)} spectateur
          {recap.viewerPeak === 1 ? "" : "s"} (pic)
        </p>
        <Link
          href="/"
          className="px-6 py-3 rounded-full bg-[#fe2c55] font-semibold text-sm"
        >
          Retour
        </Link>
      </div>
    );
  }

  if (error && !live) {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-[#fe2c55]">
        {error}
      </div>
    );
  }
  if (!live) {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-white/40">
        Chargement…
      </div>
    );
  }

  const name = live.user.displayName || live.user.username;

  return (
    <div className="force-dark fixed inset-0 z-50 bg-black flex flex-col">
      {/* Camera / placeholder fullscreen */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80">
        {live.isOwner && live.status === "LIVE" ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover scale-x-[-1]"
            muted
            playsInline
            autoPlay
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a0520]">
            <Avatar
              username={live.user.username}
              avatarUrl={live.user.avatarUrl}
              size={96}
            />
            <p className="mt-4 font-bold text-lg">{name}</p>
            <p className="text-white/50 text-sm">
              {live.status === "LIVE" ? "En direct" : "Live terminé"}
            </p>
            <p className="text-[11px] text-white/35 mt-2 px-8 text-center">
              Diffusion WebRTC peer-to-peer arrive bientôt — chat & réactions
              sont actifs.
            </p>
          </div>
        )}
      </div>

      <header className="relative z-10 flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          href={`/profil/${live.user.username}`}
          className="flex items-center gap-2 min-w-0"
        >
          <div className="relative">
            <Avatar
              username={live.user.username}
              avatarUrl={live.user.avatarUrl}
              size={40}
            />
            {live.status === "LIVE" && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-bold bg-[#fe2c55] px-1 rounded">
                LIVE
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{name}</p>
            <p className="text-[11px] text-white/70">
              {formatCount(live.viewerPeak)} spectateurs
            </p>
          </div>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {live.isOwner && live.status === "LIVE" ? (
            <button
              type="button"
              onClick={endLive}
              className="px-3 py-1.5 rounded-full bg-[#fe2c55] text-xs font-bold"
            >
              Terminer
            </button>
          ) : (
            <Link
              href="/"
              className="p-2 rounded-full bg-black/40"
              aria-label="Fermer"
            >
              <X size={18} />
            </Link>
          )}
        </div>
      </header>

      <div className="relative z-10 mt-auto px-3 pb-2 max-h-[40vh] overflow-y-auto space-y-1.5 pointer-events-none">
        {live.comments.map((c) => (
          <p key={c.id} className="text-sm pointer-events-auto">
            <span className="font-semibold text-[#25f4ee]">
              @{c.user.username}
            </span>{" "}
            <span className="text-white/90">{c.content}</span>
          </p>
        ))}
        <div ref={chatEnd} />
      </div>

      {live.status === "LIVE" && (
        <form
          onSubmit={sendComment}
          className="relative z-10 flex items-center gap-2 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dire quelque chose…"
            maxLength={200}
            className="flex-1 bg-black/45 border border-white/20 rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-white/40"
          />
          <button
            type="button"
            onClick={heart}
            className="p-2.5 rounded-full bg-black/45"
            aria-label="J’aime"
          >
            <Heart
              size={20}
              className={live.likedByMe ? "fill-[#fe2c55] text-[#fe2c55]" : ""}
            />
          </button>
          <Link
            href={`/solde`}
            className="p-2.5 rounded-full bg-black/45"
            aria-label="Cadeau"
            title="Pourboires"
          >
            <Gift size={20} className="text-[#fe2c55]" />
          </Link>
        </form>
      )}
    </div>
  );
}
