"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ImagePlus,
  Mic,
  Send,
  Smile,
  Square,
  Video,
  X,
} from "lucide-react";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import { formatInboxTime } from "@/lib/format";

const EMOJIS = [
  "😀", "😂", "🤣", "😊", "😍", "😘", "🥰", "😎",
  "🤩", "😢", "😭", "😡", "👍", "👎", "👏", "🙏",
  "🔥", "💯", "❤️", "💔", "✨", "🎉", "🎵", "📸",
];

type Msg = {
  id: string;
  body: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  audioDurationMs?: number | null;
  senderId: string;
  createdAt: string;
  readAt: string | null;
  mine: boolean;
};

type Other = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export default function ChatThread({ username }: { username: string }) {
  const [other, setOther] = useState<Other | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [iFollowThem, setIFollowThem] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [preview, setPreview] = useState<{
    file: File;
    url: string;
    kind: "image" | "video";
  } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recMs, setRecMs] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStart = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(username)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur de chargement");
        return;
      }
      const data = await res.json();
      setOther(data.other);
      setMessages(data.messages || []);
      setIFollowThem(!!data.iFollowThem);
      setError(null);
    } catch {
      setError("Erreur réseau");
    }
  }, [username]);

  useEffect(() => {
    load().then(() => {
      firstLoad.current = false;
    });
    const id = setInterval(load, 4000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: firstLoad.current ? "auto" : "smooth",
    });
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
      if (recTimer.current) clearInterval(recTimer.current);
      mediaRecorder.current?.stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendPayload(form: FormData) {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(username)}`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Échec d'envoi");
        return;
      }
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
      setText("");
      setShowEmoji(false);
      if (preview) {
        URL.revokeObjectURL(preview.url);
        setPreview(null);
      }
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (sending) return;
    if (!body && !preview) return;
    const form = new FormData();
    form.append("body", body);
    if (preview?.kind === "image") form.append("image", preview.file);
    if (preview?.kind === "video") form.append("video", preview.file);
    await sendPayload(form);
  }

  function onPick(kind: "image" | "video", file: File | undefined) {
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview({ file, url: URL.createObjectURL(file), kind });
  }

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size) chunks.current.push(ev.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recTimer.current) clearInterval(recTimer.current);
        const duration = Date.now() - recStart.current;
        setRecording(false);
        setRecMs(0);
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        if (blob.size < 100 || duration < 400) return;
        const file = new File([blob], `vocal-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        const form = new FormData();
        form.append("body", "");
        form.append("audio", file);
        form.append("audioDurationMs", String(Math.min(duration, 120_000)));
        await sendPayload(form);
      };
      mediaRecorder.current = mr;
      recStart.current = Date.now();
      setRecording(true);
      setRecMs(0);
      recTimer.current = setInterval(() => {
        const elapsed = Date.now() - recStart.current;
        setRecMs(elapsed);
        if (elapsed >= 120_000) stopRec();
      }, 200);
      mr.start();
    } catch {
      setError("Micro inaccessible.");
    }
  }

  function stopRec() {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
  }

  const display = other?.displayName || other?.username || username;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black md:pt-14">
      <header className="flex items-center gap-3 px-3 h-14 border-b border-white/10 shrink-0 bg-black/95">
        <Link
          href="/messages"
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        {other && (
          <Link
            href={`/profil/${other.username}`}
            className="flex items-center gap-2 min-w-0 flex-1"
          >
            <Avatar username={other.username} avatarUrl={other.avatarUrl} size={36} />
            <div className="min-w-0">
              <p className="font-semibold truncate text-sm">{display}</p>
              <p className="text-xs text-white/40 truncate">@{other.username}</p>
            </div>
          </Link>
        )}
        {other && !iFollowThem && (
          <FollowButton
            username={other.username}
            initialFollowing={false}
            size="sm"
            onChange={(f) => setIFollowThem(f)}
          />
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {error && (
          <p className="text-center text-sm text-[#fe2c55] py-2">{error}</p>
        )}
        {!other && !error && (
          <p className="text-center text-white/40 text-sm py-10">Chargement…</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[15px] overflow-hidden ${
                m.mine
                  ? "bg-[#fe2c55] text-white rounded-br-md"
                  : "bg-white/10 text-white rounded-bl-md"
              }`}
            >
              {m.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.imageUrl}
                  alt=""
                  className="rounded-xl max-h-56 w-full object-cover mb-1.5 -mx-0.5"
                />
              )}
              {m.videoUrl && (
                <video
                  src={m.videoUrl}
                  controls
                  playsInline
                  className="rounded-xl max-h-56 w-full mb-1.5 bg-black"
                />
              )}
              {m.audioUrl && (
                <div className="mb-1.5">
                  <audio src={m.audioUrl} controls className="w-full max-w-[220px]" />
                  {m.audioDurationMs != null && (
                    <p className="text-[10px] opacity-70 mt-0.5">
                      {Math.round(m.audioDurationMs / 1000)} s
                    </p>
                  )}
                </div>
              )}
              {m.body && (
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              )}
              <p
                className={`text-[10px] mt-1 ${
                  m.mine ? "text-white/70" : "text-white/40"
                }`}
              >
                {formatInboxTime(m.createdAt)}
                {m.mine && m.readAt ? " · Vu" : ""}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {showEmoji && (
        <div className="px-3 pb-1">
          <div className="grid grid-cols-8 gap-1 p-2 rounded-xl bg-[#1e1e1e] border border-white/10 max-h-36 overflow-y-auto">
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                className="text-xl p-1 hover:bg-white/10 rounded"
                onClick={() => setText((t) => t + em)}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {preview && (
        <div className="px-3 pb-2 flex items-center gap-2">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/10">
            {preview.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt="" className="w-full h-full object-cover" />
            ) : (
              <video src={preview.url} className="w-full h-full object-cover" muted />
            )}
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(preview.url);
                setPreview(null);
              }}
              className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70"
              aria-label="Retirer"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {recording && (
        <div className="px-3 pb-2 flex items-center gap-3 text-sm text-[#fe2c55]">
          <span className="w-2 h-2 rounded-full bg-[#fe2c55] animate-pulse" />
          Enregistrement… {Math.floor(recMs / 1000)}s / 120s
          <button
            type="button"
            onClick={stopRec}
            className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#fe2c55] text-white text-xs font-semibold"
          >
            <Square size={12} /> Envoyer
          </button>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="shrink-0 flex items-end gap-1.5 px-2 py-3 border-t border-white/10 bg-black pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className={`p-2.5 rounded-full ${showEmoji ? "text-[#25f4ee]" : "text-white/60"} hover:bg-white/10`}
          aria-label="Emojis"
        >
          <Smile size={20} />
        </button>
        <button
          type="button"
          onClick={() => imageRef.current?.click()}
          className="p-2.5 rounded-full text-white/60 hover:bg-white/10"
          aria-label="Photo"
        >
          <ImagePlus size={20} />
        </button>
        <input
          ref={imageRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onPick("image", e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => videoRef.current?.click()}
          className="p-2.5 rounded-full text-white/60 hover:bg-white/10"
          aria-label="Vidéo"
        >
          <Video size={20} />
        </button>
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => onPick("video", e.target.files?.[0])}
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Envoyer un message…"
          maxLength={2000}
          className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25f4ee]/50 placeholder:text-white/35"
        />
        {!text.trim() && !preview ? (
          <button
            type="button"
            onClick={recording ? stopRec : startRec}
            className={`p-2.5 rounded-full ${recording ? "bg-[#fe2c55]" : "bg-white/10"}`}
            aria-label="Vocal"
          >
            <Mic size={18} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={sending}
            className="p-2.5 rounded-full bg-[#fe2c55] disabled:opacity-40"
            aria-label="Envoyer"
          >
            <Send size={18} />
          </button>
        )}
      </form>
    </div>
  );
}
