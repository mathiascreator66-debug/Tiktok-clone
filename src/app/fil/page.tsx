"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  ImagePlus,
} from "lucide-react";
import Avatar from "@/components/Avatar";
import PostCommentsSheet from "@/components/PostCommentsSheet";
import { formatRelativeFr } from "@/lib/time";
import { formatCount } from "@/lib/format";

type Post = {
  id: string;
  content: string;
  visibility: string;
  createdAt: string;
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  images: string[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  isOwner: boolean;
};

export default function FilPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "FOLLOWERS">("PUBLIC");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/posts");
    const data = await res.json();
    setPosts(data.posts || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  function onFiles(files: FileList | null) {
    if (!files) return;
    const arr = [...Array.from(files), ...images].slice(0, 6);
    previews.forEach((u) => URL.revokeObjectURL(u));
    setImages(arr);
    setPreviews(arr.map((f) => URL.createObjectURL(f)));
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && images.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("content", content.trim());
      form.append("visibility", visibility);
      for (const f of images) form.append("images", f);
      const res = await fetch("/api/posts", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (res.status === 401) {
        window.location.href = "/connexion?next=/fil";
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setContent("");
      setImages([]);
      previews.forEach((u) => URL.revokeObjectURL(u));
      setPreviews([]);
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function toggleLike(id: string) {
    const res = await fetch(`/api/posts/${id}/like`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction: "like" }),
    });
    if (res.status === 401) {
      window.location.href = "/connexion?next=/fil";
      return;
    }
    const data = await res.json();
    setPosts((ps) =>
      ps.map((p) =>
        p.id === id
          ? {
              ...p,
              likedByMe: data.liked,
              likeCount: p.likeCount + (data.liked ? 1 : -1),
            }
          : p
      )
    );
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette publication ?")) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE", credentials: "include" });
    setPosts((ps) => ps.filter((p) => p.id !== id));
  }

  async function share(p: Post) {
    const url = `${window.location.origin}/fil#${p.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "AfriVoix", text: p.content.slice(0, 120), url });
        return;
      } catch { /* */ }
    }
    await navigator.clipboard.writeText(url);
    alert("Lien copié");
  }

  return (
    <>
      <div className="min-h-[100dvh] pt-2 md:pt-16 pb-28 max-w-lg mx-auto px-3">
      <header className="flex items-center gap-2 h-12 mb-4">
        <Link href="/" className="p-2 -ml-1 rounded-full hover:bg-white/10" aria-label="Retour">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg">Publications</h1>
      </header>

      <form
        onSubmit={publish}
        className="rounded-2xl bg-white/[0.06] border border-white/10 p-3 mb-4 space-y-3"
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Que voulez-vous dire ?"
          rows={3}
          maxLength={5000}
          className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-white/35"
        />
        {previews.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {previews.map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="" className="h-20 w-20 object-cover rounded-lg" />
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="p-2 rounded-full bg-white/10"
            aria-label="Photos"
          >
            <ImagePlus size={18} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "FOLLOWERS")}
            className="bg-white/10 rounded-full px-3 py-1.5 text-xs outline-none"
          >
            <option value="PUBLIC">Public</option>
            <option value="FOLLOWERS">Abonnés</option>
          </select>
          <button
            type="submit"
            disabled={loading || (!content.trim() && images.length === 0)}
            className="ml-auto px-4 py-1.5 rounded-full bg-[#1877f2] text-sm font-semibold disabled:opacity-40"
          >
            Publier
          </button>
        </div>
        {error && <p className="text-xs text-[#fe2c55]">{error}</p>}
      </form>

      <ul className="space-y-3">
        {posts.map((p) => (
          <li
            key={p.id}
            id={p.id}
            className="rounded-2xl bg-white/[0.05] border border-white/10 overflow-hidden"
          >
            <div className="flex items-center gap-2 p-3">
              <Link href={`/profil/${p.author.username}`}>
                <Avatar
                  username={p.author.username}
                  avatarUrl={p.author.avatarUrl}
                  size={40}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/profil/${p.author.username}`}
                  className="font-semibold text-sm hover:underline"
                >
                  {p.author.displayName || p.author.username}
                </Link>
                <p className="text-[11px] text-white/40">
                  {formatRelativeFr(p.createdAt)}
                  {p.visibility === "FOLLOWERS" ? " · Abonnés" : ""}
                </p>
              </div>
              {p.isOwner && (
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="p-2 text-white/40 hover:text-[#fe2c55]"
                  aria-label="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            {p.content && (
              <p className="px-3 pb-2 text-sm whitespace-pre-wrap break-words">
                {p.content}
              </p>
            )}
            {p.images.length > 0 && (
              <div
                className={`grid gap-0.5 ${
                  p.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                }`}
              >
                {p.images.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="w-full aspect-square object-cover"
                  />
                ))}
              </div>
            )}
            <div className="flex border-t border-white/10 text-sm">
              <button
                type="button"
                onClick={() => toggleLike(p.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 hover:bg-white/5"
              >
                <Heart
                  size={16}
                  className={p.likedByMe ? "fill-[#fe2c55] text-[#fe2c55]" : ""}
                />
                J’aime
                {p.likeCount > 0 ? ` · ${formatCount(p.likeCount)}` : ""}
              </button>
              <button
                type="button"
                onClick={() => setCommentPost(p)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 hover:bg-white/5"
                aria-label={`Commenter la publication de @${p.author.username}`}
              >
                <MessageCircle size={16} /> Commenter
                {p.commentCount > 0 ? ` · ${formatCount(p.commentCount)}` : ""}
              </button>
              <button
                type="button"
                onClick={() => share(p)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 hover:bg-white/5"
              >
                <Share2 size={16} /> Partager
              </button>
            </div>
          </li>
        ))}
        {posts.length === 0 && (
          <p className="text-center text-white/40 text-sm py-12">
            Aucune publication pour l’instant.
          </p>
        )}
      </ul>
      </div>
      <PostCommentsSheet
        post={commentPost}
        onClose={() => setCommentPost(null)}
        onCommentAdded={(postId) => {
          setPosts((current) =>
            current.map((post) =>
              post.id === postId
                ? { ...post, commentCount: post.commentCount + 1 }
                : post
            )
          );
          setCommentPost((current) =>
            current && current.id === postId
              ? { ...current, commentCount: current.commentCount + 1 }
              : current
          );
        }}
      />
    </>
  );
}
