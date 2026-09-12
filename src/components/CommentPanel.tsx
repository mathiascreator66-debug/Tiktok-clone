"use client";

import { useEffect, useState } from "react";
import { X, Send } from "lucide-react";
import Avatar from "./Avatar";
import type { CommentItem } from "@/lib/types";
import Link from "next/link";

type Props = {
  videoId: string;
  open: boolean;
  onClose: () => void;
  onCommentAdded: () => void;
  isLoggedIn: boolean;
};

export default function CommentPanel({
  videoId,
  open,
  onClose,
  onCommentAdded,
  isLoggedIn,
}: Props) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch(`/api/videos/${videoId}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .catch(() => setComments([]));
  }, [open, videoId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) {
      setError("Connectez-vous pour commenter.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setComments((prev) => [data.comment, ...prev]);
      setText("");
      onCommentAdded();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/50">
      <div
        className="bg-[#121212] rounded-t-2xl max-h-[55%] flex flex-col border-t border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold text-sm">
            {comments.length} commentaire{comments.length !== 1 ? "s" : ""}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {comments.length === 0 && (
            <p className="text-white/40 text-sm text-center py-6">
              Aucun commentaire pour l&apos;instant.
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Link href={`/profil/${c.user.username}`}>
                <Avatar username={c.user.username} avatarUrl={c.user.avatarUrl} size={32} />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/profil/${c.user.username}`}
                  className="text-xs font-semibold text-white/70"
                >
                  @{c.user.username}
                </Link>
                <p className="text-sm text-white break-words">{c.content}</p>
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={submit}
          className="flex items-center gap-2 px-3 py-3 border-t border-white/10"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isLoggedIn ? "Ajouter un commentaire..." : "Connectez-vous pour commenter"}
            disabled={!isLoggedIn || loading}
            className="flex-1 bg-white/10 rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55] disabled:opacity-50"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!text.trim() || loading || !isLoggedIn}
            className="p-2 text-[#fe2c55] disabled:opacity-40"
          >
            <Send size={20} />
          </button>
        </form>
        {error && <p className="text-[#fe2c55] text-xs px-4 pb-2">{error}</p>}
      </div>
    </div>
  );
}
