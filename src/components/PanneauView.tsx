"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Heart,
  ImagePlus,
  Send,
  Calendar,
  FolderOpen,
  Vote,
  Video,
} from "lucide-react";
import Avatar from "./Avatar";
import { formatCount } from "@/lib/format";
import { formatRelativeFr } from "@/lib/time";

type Post = {
  id: string;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  viewCount: number;
  pinnedAt: string | null;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

type Community = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  rules: string | null;
  avatarUrl: string | null;
  memberCount: number;
  owner: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  myRole: string | null;
  isMember: boolean;
  isOwner: boolean;
  posts: Post[];
};

export default function PanneauView({ slug }: { slug: string }) {
  const [c, setC] = useState<Community | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [chip, setChip] = useState<"publications" | "sondage" | "evenements">(
    "publications"
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/communities/${encodeURIComponent(slug)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        setError("Panneau introuvable.");
        return;
      }
      const data = await res.json();
      setC(data.community);
      setError(null);
    } catch {
      setError("Erreur réseau.");
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [c?.posts.length]);

  async function toggleJoin() {
    if (!c) return;
    const method = c.isMember ? "DELETE" : "POST";
    const res = await fetch(`/api/communities/${c.slug}/join`, {
      method,
      credentials: "include",
    });
    if (res.status === 401) {
      window.location.href = `/connexion?next=/communaute/${c.slug}`;
      return;
    }
    await load();
  }

  async function publish(extra?: FormData) {
    if (!c || sending) return;
    if (!text.trim() && !extra) return;
    setSending(true);
    try {
      const form = extra || new FormData();
      if (!form.has("content")) form.append("content", text.trim());
      const res = await fetch(`/api/communities/${c.slug}/posts`, {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Échec publication");
        return;
      }
      setText("");
      await load();
    } finally {
      setSending(false);
    }
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const form = new FormData();
    form.append("content", text.trim());
    form.append("image", f);
    await publish(form);
    e.target.value = "";
  }

  async function onPickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const form = new FormData();
    form.append("content", text.trim());
    form.append("video", f);
    await publish(form);
    e.target.value = "";
  }

  async function toggleLike(postId: string) {
    if (!c) return;
    const res = await fetch(
      `/api/communities/${c.slug}/posts/${postId}/like`,
      { method: "POST", credentials: "include" }
    );
    if (res.status === 401) {
      window.location.href = `/connexion?next=/communaute/${c.slug}`;
      return;
    }
    const data = await res.json();
    setC((prev) =>
      prev
        ? {
            ...prev,
            posts: prev.posts.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    likedByMe: data.liked,
                    likeCount: p.likeCount + (data.liked ? 1 : -1),
                  }
                : p
            ),
          }
        : prev
    );
  }

  if (error && !c) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-[#fe2c55]">
        {error}
      </div>
    );
  }
  if (!c) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center text-white/40">
        Chargement…
      </div>
    );
  }

  const canPost = c.isOwner || c.isMember;
  const ownerLabel = c.owner.displayName || c.owner.username;

  return (
    <div className="fixed inset-x-0 top-0 bottom-14 z-40 flex flex-col bg-background md:inset-0 md:pt-14">
      <header className="flex items-center gap-2 px-3 h-14 border-b border-white/10 shrink-0 bg-[var(--nav)] backdrop-blur">
        <Link
          href={`/profil/${c.owner.username}`}
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        <Avatar
          username={c.owner.username}
          avatarUrl={c.avatarUrl || c.owner.avatarUrl}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">
            Panneau par {ownerLabel}
          </p>
          <p className="text-[11px] text-white/45">
            {formatCount(c.memberCount)} membre
            {c.memberCount === 1 ? "" : "s"}
          </p>
        </div>
        {c.isOwner && (
          <Link
            href="/studio"
            className="p-2 rounded-full hover:bg-white/10"
            aria-label="Stats"
          >
            <BarChart3 size={18} className="text-[#25f4ee]" />
          </Link>
        )}
        <button
          type="button"
          onClick={toggleJoin}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
            c.isMember
              ? "bg-white/10 text-white/70"
              : "bg-[#fe2c55] text-white"
          }`}
        >
          {c.isMember ? (c.isOwner ? "Proprio" : "Quitter") : "Rejoindre"}
        </button>
      </header>

      {c.rules && (
        <div className="px-3 py-2 text-[11px] text-white/45 bg-white/[0.03] border-b border-white/5">
          <span className="font-semibold text-white/60">Règles · </span>
          {c.rules}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4 pb-6 space-y-4">
        {c.posts.length === 0 && (
          <p className="text-center text-white/35 text-sm py-16">
            Aucune publication pour l’instant.
          </p>
        )}
        {[...c.posts].reverse().map((p) => (
          <article key={p.id} className="flex gap-2 items-end">
            <Avatar username={p.author.username} avatarUrl={p.author.avatarUrl} size={28} />
            <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-[#183b2a] text-white dark:bg-[#1f3d2b] overflow-hidden shadow-lg">
              <p className="px-3 pt-2 text-[11px] font-semibold text-[#25f4ee]">
                {p.author.displayName || p.author.username}
              </p>
              {p.videoUrl && (
                <video
                  src={p.videoUrl}
                  controls
                  playsInline
                  className="w-full max-h-72 object-cover bg-black"
                />
              )}
              {p.imageUrl && !p.videoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt=""
                  className="w-full max-h-72 object-cover"
                />
              )}
              {p.content && (
                <p className="px-3 pt-2.5 pb-1 text-[15px] whitespace-pre-wrap break-words">
                  {p.content}
                </p>
              )}
              <div className="px-3 pb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleLike(p.id)}
                  className="inline-flex items-center gap-1 text-xs bg-black/25 rounded-full px-2 py-1"
                >
                  <Heart
                    size={12}
                    className={
                      p.likedByMe ? "fill-[#fe2c55] text-[#fe2c55]" : ""
                    }
                  />
                  {p.likeCount || ""}
                </button>
                <p className="text-[10px] text-white/45">
                  Vu par {formatCount(p.viewCount)} ·{" "}
                  {formatRelativeFr(p.createdAt)}
                </p>
              </div>
            </div>
          </article>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-white/10 bg-[var(--nav)] backdrop-blur">
        <div className="flex gap-2 px-3 pt-2 overflow-x-auto scrollbar-hide">
          {(
            [
              ["sondage", "Sondage", Vote],
              ["publications", "Publications", FolderOpen],
              ["evenements", "Événements", Calendar],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setChip(id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                chip === id
                  ? "bg-white text-black border-white"
                  : "bg-transparent text-white/60 border-white/20"
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
        {chip !== "publications" && (
          <p className="px-3 pt-2 text-[11px] text-white/35">
            {chip === "sondage"
              ? "Sondages — bientôt disponible."
              : "Événements — bientôt disponible."}
          </p>
        )}

        {error && <p className="px-3 pt-2 text-xs text-[#fe2c55]">{error}</p>}
        {canPost ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              publish();
            }}
            className="flex min-w-0 items-end gap-2 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="shrink-0 p-2.5 rounded-full bg-white/10 hover:bg-white/15"
              aria-label="Joindre une image"
              title="Joindre une image"
            >
              <ImagePlus size={18} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickImage}
            />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Écrire une actu…"
              maxLength={2000}
              className="min-w-0 flex-1 bg-white/10 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#25f4ee]/40"
            />
            <button
              type="button"
              onClick={() => videoRef.current?.click()}
              className="shrink-0 p-2.5 rounded-full bg-white/10 hover:bg-white/15"
              aria-label="Joindre une vidéo"
              title="Joindre une vidéo"
            >
              <Video size={18} />
            </button>
            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={onPickVideo}
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="shrink-0 p-2.5 rounded-full bg-[#25f4ee] text-black disabled:opacity-40"
              aria-label="Publier"
            >
              <Send size={18} />
            </button>
          </form>
        ) : (
          <p className="px-3 py-3 text-center text-xs text-white/40 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            Rejoignez le panneau pour suivre les actus.
          </p>
        )}
      </div>
    </div>
  );
}
