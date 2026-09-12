"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import { formatInboxTime } from "@/lib/format";

type Msg = {
  id: string;
  body: string;
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(username)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Échec d'envoi");
        setText(body);
        return;
      }
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
    } finally {
      setSending(false);
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
              className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[15px] ${
                m.mine
                  ? "bg-[#fe2c55] text-white rounded-br-md"
                  : "bg-white/10 text-white rounded-bl-md"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
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

      <form
        onSubmit={onSubmit}
        className="shrink-0 flex items-end gap-2 px-3 py-3 border-t border-white/10 bg-black pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Envoyer un message…"
          maxLength={2000}
          className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25f4ee]/50 placeholder:text-white/35"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="p-2.5 rounded-full bg-[#fe2c55] disabled:opacity-40"
          aria-label="Envoyer"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
