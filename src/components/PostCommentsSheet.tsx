"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import Avatar from "./Avatar";
import { formatRelativeFr } from "@/lib/time";

type SheetPost = {
  id: string;
  content: string;
  commentCount: number;
  author: { username: string; displayName: string | null };
};

type Comment = {
  id: string;
  content: string;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!post) return;
    let active = true;
    setLoading(true);
    setError("");
    setComments([]);
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!post || !text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim() }),
      });
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
      onCommentAdded(post.id);
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
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
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{comment.content}</p>
              </div>
            </article>
          ))}
        </div>

        <form onSubmit={submit} className="shrink-0 border-t border-white/10 bg-[var(--nav)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {error && <p className="mb-2 text-xs text-[#fe2c55]">{error}</p>}
          <div className="flex min-w-0 items-center gap-2">
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
              disabled={sending || !text.trim()}
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
