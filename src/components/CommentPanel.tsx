"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Avatar from "./Avatar";
import type { CommentItem } from "@/lib/types";
import { formatRelativeFr } from "@/lib/time";
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
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    setError("");
    fetch(`/api/videos/${videoId}/comments`, { credentials: "include" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Erreur");
        setComments(d.comments || []);
      })
      .catch(() => {
        setComments([]);
        setError("Impossible de charger les commentaires.");
      })
      .finally(() => setFetching(false));
  }, [open, videoId]);

  // Lock body scroll / feed snap while open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
    };
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      setError("Connectez-vous pour commenter.");
      return;
    }
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'envoi.");
        return;
      }
      setComments((prev) => [data.comment, ...prev]);
      setText("");
      onCommentAdded();
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (!open || !mounted) return null;

  const panel = (
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60"
      onClick={onClose}
      onTouchMove={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Commentaires"
    >
      <div
        className="bg-[#121212] rounded-t-2xl max-h-[70dvh] min-h-[45%] flex flex-col border-t border-white/10 shadow-2xl w-full max-w-lg mx-auto"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div>
            <h3 className="font-semibold text-sm">Commentaires</h3>
            <p className="text-[11px] text-white/40">
              {fetching
                ? "Chargement…"
                : `${comments.length} commentaire${comments.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full"
            aria-label="Fermer"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4 min-h-0">
          {!fetching && comments.length === 0 && !error && (
            <div className="text-center py-10 px-4">
              <p className="text-white/70 text-sm font-medium mb-1">
                Aucun commentaire pour l&apos;instant
              </p>
              <p className="text-white/40 text-xs">
                Soyez le premier à laisser un avis !
              </p>
            </div>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Link href={`/profil/${c.user.username}`} onClick={onClose}>
                <Avatar
                  username={c.user.username}
                  avatarUrl={c.user.avatarUrl}
                  size={36}
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <Link
                    href={`/profil/${c.user.username}`}
                    onClick={onClose}
                    className="text-xs font-semibold text-white/80 hover:underline"
                  >
                    @{c.user.username}
                  </Link>
                  <span className="text-[10px] text-white/35">
                    {formatRelativeFr(c.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-white break-words mt-0.5">
                  {c.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-[#121212] pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {error && (
            <p className="text-[#fe2c55] text-xs px-4 pt-2" role="alert">
              {error}
            </p>
          )}

          {!isLoggedIn ? (
            <div className="px-4 pt-3 pb-1 flex flex-col items-center gap-2">
              <p className="text-white/50 text-xs text-center">
                Connectez-vous pour commenter cette vidéo
              </p>
              <Link
                href="/connexion"
                onClick={onClose}
                className="w-full text-center bg-[#fe2c55] hover:bg-[#e0264c] rounded-full px-4 py-2.5 text-sm font-semibold transition"
              >
                Se connecter
              </Link>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="flex items-center gap-2 px-3 pt-3 pb-1"
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ajouter un commentaire…"
                disabled={loading}
                className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[#fe2c55] disabled:opacity-50"
                maxLength={500}
                autoFocus
              />
              <button
                type="submit"
                disabled={!text.trim() || loading}
                className="shrink-0 bg-[#fe2c55] hover:bg-[#e0264c] disabled:opacity-40 disabled:hover:bg-[#fe2c55] rounded-full px-4 py-2 text-sm font-semibold transition"
              >
                {loading ? "…" : "Envoyer"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
