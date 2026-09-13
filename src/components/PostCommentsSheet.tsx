"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, MessageCircle, Send, Video, X } from "lucide-react";
import Avatar from "./Avatar";
import { formatRelativeFr } from "@/lib/time";
import { assertVideoMaxDuration } from "@/lib/media-duration-client";
import { MAX_COMMENT_VIDEO_DURATION_SEC } from "@/lib/limits";

type SheetPost = {
  id: string;
  content: string;
  commentCount: number;
  author: { username: string; displayName: string | null };
};

type Comment = {
  id: string;
  content: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

type Props = {
  post: SheetPost | null;
  onClose: () => void;
  onCommentAdded: (postId: string) => void;
};

export default function PostCommentsSheet({ post, onClose, onCommentAdded }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!post) return;
    let active = true;
    setLoading(true);
    setError("");
    setComments([]);
    setImageFile(null);
    setVideoFile(null);
    fetch(`/api/posts/${post.id}/comments`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Impossible de charger les commentaires.");
        if (active) setComments(data.comments || []);
      })
      .catch((err: Error) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      active = false;
    };
  }, [post]);

  useEffect(() => {
    if (!post) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [post, onClose]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (!videoFile) {
      setVideoPreview(null);
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  async function onPickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    e.target.value = "";
    if (!f) return;
    try {
      await assertVideoMaxDuration(f, MAX_COMMENT_VIDEO_DURATION_SEC);
      setVideoFile(f);
      setImageFile(null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vidéo invalide.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!post || sending) return;
    if (!text.trim() && !imageFile && !videoFile) return;
    setSending(true);
    setError("");
    try {
      let res: Response;
      if (imageFile || videoFile) {
        const form = new FormData();
        form.append("content", text.trim());
        if (imageFile) form.append("image", imageFile);
        if (videoFile) {
          form.append("video", videoFile);
          try {
            const d = await assertVideoMaxDuration(
              videoFile,
              MAX_COMMENT_VIDEO_DURATION_SEC
            );
            form.append("durationSec", String(d));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Vidéo invalide.");
            return;
          }
        }
        res = await fetch(`/api/posts/${post.id}/comments`, {
          method: "POST",
          credentials: "include",
          body: form,
        });
      } else {
        res = await fetch(`/api/posts/${post.id}/comments`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text.trim() }),
        });
      }
      if (res.status === 401) {
        window.location.href = `/connexion?next=/fil%23${post.id}`;
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Impossible de publier le commentaire.");
        return;
      }
      setComments((current) => [...current, data.comment]);
      setText("");
      setImageFile(null);
      setVideoFile(null);
      onCommentAdded(post.id);
      requestAnimationFrame(() =>
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
      );
    } finally {
      setSending(false);
    }
  }

  if (!post) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="comments-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[82dvh] min-h-[48dvh] max-w-lg flex-col rounded-t-2xl border border-white/10 bg-[var(--surface)] text-foreground shadow-2xl md:bottom-6 md:rounded-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h2 id="comments-title" className="font-bold">
              Commentaires
            </h2>
            <p className="text-[11px] text-white/45">
              Publication de @{post.author.username}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Fermer">
            <X size={20} />
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {post.content && (
            <p className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/60 line-clamp-3">
              {post.content}
            </p>
          )}
          {loading && <p className="py-10 text-center text-sm text-white/40">Chargement…</p>}
          {!loading && comments.length === 0 && (
            <div className="py-10 text-center text-white/40">
              <MessageCircle size={28} className="mx-auto mb-2 opacity-60" />
              <p className="text-sm">Soyez la première personne à commenter.</p>
            </div>
          )}
          {comments.map((comment) => (
            <article key={comment.id} className="flex gap-2.5">
              <Avatar username={comment.user.username} avatarUrl={comment.user.avatarUrl} size={34} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="truncate text-xs font-semibold">
                    {comment.user.displayName || comment.user.username}
                  </p>
                  <time className="shrink-0 text-[10px] text-white/35">
                    {formatRelativeFr(comment.createdAt)}
                  </time>
                </div>
                {comment.content && (
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{comment.content}</p>
                )}
                {comment.videoUrl && (
                  <video
                    src={comment.videoUrl}
                    controls
                    playsInline
                    className="mt-2 max-h-48 w-full rounded-xl bg-black border border-white/10"
                  />
                )}
                {comment.imageUrl && !comment.videoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={comment.imageUrl}
                    alt=""
                    className="mt-2 max-h-48 rounded-xl object-cover border border-white/10"
                  />
                )}
              </div>
            </article>
          ))}
        </div>

        <form onSubmit={submit} className="shrink-0 border-t border-white/10 bg-[var(--nav)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {error && <p className="mb-2 text-xs text-[#fe2c55]">{error}</p>}
          {(imagePreview || videoPreview) && (
            <div className="mb-2 flex items-center gap-2">
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="" className="h-14 w-14 rounded-lg object-cover border border-white/10" />
              )}
              {videoPreview && (
                <video src={videoPreview} className="h-14 w-20 rounded-lg object-cover border border-white/10 bg-black" muted />
              )}
              <button
                type="button"
                className="text-xs text-white/50 hover:text-white"
                onClick={() => {
                  setImageFile(null);
                  setVideoFile(null);
                }}
              >
                Retirer
              </button>
            </div>
          )}
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              className="shrink-0 rounded-full p-2.5 bg-white/10 hover:bg-white/15"
              aria-label="Joindre une image"
            >
              <ImagePlus size={18} />
            </button>
            <input
              ref={imageRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setImageFile(f);
                if (f) setVideoFile(null);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => videoRef.current?.click()}
              className="shrink-0 rounded-full p-2.5 bg-white/10 hover:bg-white/15"
              aria-label="Joindre une vidéo (max 1 min)"
              title="Vidéo max 1 minute"
            >
              <Video size={18} />
            </button>
            <input
              ref={videoRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={onPickVideo}
            />
            <input
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={1000}
              placeholder="Ajouter un commentaire…"
              aria-label="Votre commentaire"
              className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm outline-none placeholder:text-white/35 focus:ring-1 focus:ring-[#25f4ee]/50"
            />
            <button
              type="submit"
              disabled={sending || (!text.trim() && !imageFile && !videoFile)}
              className="shrink-0 rounded-full bg-[#fe2c55] p-2.5 text-white disabled:opacity-40"
              aria-label="Publier le commentaire"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
