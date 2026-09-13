"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  X,
  Heart,
  Smile,
  ImagePlus,
  SendHorizontal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Avatar from "./Avatar";
import type { CommentItem } from "@/lib/types";
import { formatRelativeFr } from "@/lib/time";
import { LinkifiedText } from "@/lib/linkify";
import Link from "next/link";

type Props = {
  videoId: string;
  open: boolean;
  onClose: () => void;
  onCommentAdded: () => void;
  isLoggedIn: boolean;
};

type SortMode = "recent" | "popular";

type MentionUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
  displayName: string | null;
};

type MeUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

const EMOJIS = [
  "😀", "😂", "🤣", "😊", "😍", "😘", "🥰", "😎",
  "🤔", "😢", "😭", "😤", "😡", "🥺", "😴", "🤗",
  "👍", "👎", "👏", "🙌", "🔥", "❤️", "💯", "✨",
  "🎉", "💀", "👀", "💪", "🙏", "🤣", "😁", "🤩",
  "😇", "😜", "🤭", "😅", "🫡", "🫶", "💋", "🌸",
];

const REPLIES_PREVIEW = 2;

export default function CommentPanel({
  videoId,
  open,
  onClose,
  onCommentAdded,
  isLoggedIn,
}: Props) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [sort, setSort] = useState<SortMode>("recent");
  const [replyTo, setReplyTo] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [me, setMe] = useState<MeUser | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>(
    {}
  );
  const [mentions, setMentions] = useState<MentionUser[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const likingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !isLoggedIn) return;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setMe({
            id: d.user.id,
            username: d.user.username,
            avatarUrl: d.user.avatarUrl,
          });
        }
      })
      .catch(() => {});
  }, [open, isLoggedIn]);

  const loadComments = useCallback(() => {
    if (!open) return;
    setFetching(true);
    setError("");
    fetch(`/api/videos/${videoId}/comments?sort=${sort}`, {
      credentials: "include",
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Erreur");
        setComments(d.comments || []);
        setTotalCount(d.totalCount ?? (d.comments || []).length);
      })
      .catch(() => {
        setComments([]);
        setError("Impossible de charger les commentaires.");
      })
      .finally(() => setFetching(false));
  }, [open, videoId, sort]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

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

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Mention typeahead when typing @
  useEffect(() => {
    if (!isLoggedIn || !mentionOpen) return;
    const t = setTimeout(() => {
      fetch(
        `/api/users/mention?q=${encodeURIComponent(mentionQuery)}`,
        { credentials: "include" }
      )
        .then((r) => r.json())
        .then((d) => setMentions(d.users || []))
        .catch(() => setMentions([]));
    }, 150);
    return () => clearTimeout(t);
  }, [mentionQuery, mentionOpen, isLoggedIn]);

  function updateCommentInTree(
    list: CommentItem[],
    id: string,
    updater: (c: CommentItem) => CommentItem
  ): CommentItem[] {
    return list.map((c) => {
      if (c.id === id) return updater(c);
      if (c.replies.length) {
        return { ...c, replies: updateCommentInTree(c.replies, id, updater) };
      }
      return c;
    });
  }

  function insertReply(
    list: CommentItem[],
    parentId: string,
    reply: CommentItem
  ): CommentItem[] {
    return list.map((c) => {
      if (c.id === parentId) {
        return { ...c, replies: [...c.replies, reply] };
      }
      // Also check if parent is a nested reply — we flatten to top-level parent on server,
      // but keep recursive for safety
      if (c.replies.length) {
        return { ...c, replies: insertReply(c.replies, parentId, reply) };
      }
      return c;
    });
  }

  async function toggleLike(commentId: string) {
    if (!isLoggedIn) {
      setError("Connectez-vous pour aimer un commentaire.");
      return;
    }
    if (likingRef.current.has(commentId)) return;
    likingRef.current.add(commentId);

    // Optimistic
    setComments((prev) =>
      updateCommentInTree(prev, commentId, (c) => ({
        ...c,
        likedByMe: !c.likedByMe,
        likeCount: c.likedByMe ? Math.max(0, c.likeCount - 1) : c.likeCount + 1,
      }))
    );

    try {
      const res = await fetch(`/api/comments/${commentId}/like`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        loadComments();
        setError(data.error || "Erreur.");
        return;
      }
      setComments((prev) =>
        updateCommentInTree(prev, commentId, (c) => ({
          ...c,
          likedByMe: data.liked,
          likeCount: data.likeCount,
        }))
      );
    } catch {
      loadComments();
    } finally {
      likingRef.current.delete(commentId);
    }
  }

  function startReply(c: CommentItem) {
    if (!isLoggedIn) {
      setError("Connectez-vous pour répondre.");
      return;
    }
    setReplyTo({ id: c.id, username: c.user.username });
    setText((t) => (t.startsWith(`@${c.user.username}`) ? t : `@${c.user.username} `));
    setShowEmoji(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function cancelReply() {
    setReplyTo(null);
  }

  function insertEmoji(emoji: string) {
    setText((t) => t + emoji);
    inputRef.current?.focus();
  }

  function onTextChange(value: string) {
    setText(value);
    const caret = inputRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const match = before.match(/@([a-zA-Z0-9_]*)$/);
    if (match) {
      setMentionOpen(true);
      setMentionQuery(match[1]);
    } else {
      setMentionOpen(false);
      setMentionQuery("");
    }
  }

  function pickMention(u: MentionUser) {
    const caret = inputRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, caret);
    const after = text.slice(caret);
    const replaced = before.replace(/@([a-zA-Z0-9_]*)$/, `@${u.username} `);
    setText(replaced + after);
    setMentionOpen(false);
    setMentionQuery("");
    setTimeout(() => inputRef.current?.focus(), 30);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      setError("Connectez-vous pour commenter.");
      return;
    }
    if (!text.trim() && !imageFile) return;
    setLoading(true);
    setError("");
    try {
      let res: Response;
      if (imageFile) {
        const form = new FormData();
        form.append("content", text.trim());
        if (replyTo) form.append("parentId", replyTo.id);
        form.append("image", imageFile);
        res = await fetch(`/api/videos/${videoId}/comments`, {
          method: "POST",
          credentials: "include",
          body: form,
        });
      } else {
        res = await fetch(`/api/videos/${videoId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            content: text.trim(),
            parentId: replyTo?.id ?? null,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur lors de l'envoi.");
        return;
      }
      const comment = data.comment as CommentItem;
      if (comment.parentId) {
        setComments((prev) => insertReply(prev, comment.parentId!, comment));
        setExpandedReplies((prev) => ({ ...prev, [comment.parentId!]: true }));
      } else {
        setComments((prev) => [comment, ...prev]);
      }
      setTotalCount((n) => n + 1);
      setText("");
      setReplyTo(null);
      setImageFile(null);
      setShowEmoji(false);
      setMentionOpen(false);
      onCommentAdded();
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  const headerLabel = useMemo(() => {
    if (fetching) return "Chargement…";
    const n = totalCount;
    return `${n} commentaire${n !== 1 ? "s" : ""}`;
  }, [fetching, totalCount]);

  if (!open || !mounted) return null;

  function renderComment(c: CommentItem, isReply = false) {
    const replies = c.replies || [];
    const expanded = expandedReplies[c.id];
    const showAll = expanded || replies.length <= REPLIES_PREVIEW;
    const visibleReplies = showAll
      ? replies
      : replies.slice(0, REPLIES_PREVIEW);
    const hiddenCount = replies.length - visibleReplies.length;

    return (
      <div key={c.id} className={isReply ? "mt-3" : ""}>
        <div className={`flex gap-3 ${isReply ? "pl-0" : ""}`}>
          <Link href={`/profil/${c.user.username}`} onClick={onClose}>
            <Avatar
              username={c.user.username}
              avatarUrl={c.user.avatarUrl}
              size={isReply ? 28 : 36}
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
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
                <p className="text-sm text-white break-words mt-0.5 whitespace-pre-wrap">
                  <LinkifiedText text={c.content.trim()} />
                </p>
                {c.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.imageUrl}
                    alt="Pièce jointe"
                    className="mt-2 max-h-48 rounded-xl object-cover border border-white/10"
                  />
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => startReply(c)}
                    className="text-[11px] font-semibold text-white/45 hover:text-white/80"
                  >
                    Répondre
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleLike(c.id)}
                className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5 min-w-[28px]"
                aria-label="J'aime"
              >
                <Heart
                  size={16}
                  className={
                    c.likedByMe
                      ? "fill-[#fe2c55] text-[#fe2c55]"
                      : "text-white/40"
                  }
                />
                {c.likeCount > 0 && (
                  <span className="text-[10px] text-white/40 tabular-nums">
                    {c.likeCount}
                  </span>
                )}
              </button>
            </div>

            {replies.length > 0 && (
              <div className="mt-1 border-l border-white/10 pl-3 ml-1">
                {visibleReplies.map((r) => renderComment(r, true))}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedReplies((p) => ({ ...p, [c.id]: true }))
                    }
                    className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-white/50 hover:text-white/80"
                  >
                    <ChevronDown size={14} />
                    Voir {hiddenCount} réponse{hiddenCount > 1 ? "s" : ""} de plus
                  </button>
                )}
                {expanded && replies.length > REPLIES_PREVIEW && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedReplies((p) => ({ ...p, [c.id]: false }))
                    }
                    className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-white/50 hover:text-white/80"
                  >
                    <ChevronUp size={14} />
                    Réduire
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
        className="bg-[#121212] rounded-t-2xl max-h-[75dvh] min-h-[50%] flex flex-col border-t border-white/10 shadow-2xl w-full max-w-lg mx-auto"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="font-semibold text-sm truncate">{headerLabel}</h3>
            <div className="flex items-center rounded-full bg-white/5 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setSort("recent")}
                className={`px-2.5 py-1 rounded-full transition ${
                  sort === "recent"
                    ? "bg-white/15 text-white font-semibold"
                    : "text-white/45"
                }`}
              >
                Récent
              </button>
              <button
                type="button"
                onClick={() => setSort("popular")}
                className={`px-2.5 py-1 rounded-full transition ${
                  sort === "popular"
                    ? "bg-white/15 text-white font-semibold"
                    : "text-white/45"
                }`}
              >
                Populaires
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full shrink-0"
            aria-label="Fermer"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        {/* List */}
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
          {comments.map((c) => renderComment(c))}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-white/10 bg-[#121212] pb-[calc(0.5rem+env(safe-area-inset-bottom))] relative">
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
            <>
              {replyTo && (
                <div className="flex items-center justify-between px-4 pt-2 text-[11px] text-white/50">
                  <span>
                    En réponse à{" "}
                    <span className="text-[#25f4ee] font-semibold">
                      @{replyTo.username}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={cancelReply}
                    className="text-white/40 hover:text-white/70"
                  >
                    Annuler
                  </button>
                </div>
              )}

              {imagePreview && (
                <div className="px-4 pt-2 flex items-start gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Aperçu"
                    className="h-16 w-16 rounded-lg object-cover border border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setImageFile(null)}
                    className="text-xs text-white/50 hover:text-white"
                  >
                    Retirer
                  </button>
                </div>
              )}

              {showEmoji && (
                <div className="mx-3 mt-2 p-2 rounded-xl bg-[#1e1e1e] border border-white/10 grid grid-cols-8 gap-1 max-h-36 overflow-y-auto">
                  {EMOJIS.map((em, i) => (
                    <button
                      key={`emoji-${i}-${em}`}
                      type="button"
                      onClick={() => insertEmoji(em)}
                      className="text-xl leading-none p-1.5 hover:bg-white/10 rounded-lg"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              {mentionOpen && mentions.length > 0 && (
                <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl bg-[#1e1e1e] border border-white/10 shadow-xl max-h-40 overflow-y-auto z-10">
                  {mentions.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => pickMention(u)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-left"
                    >
                      <Avatar
                        username={u.username}
                        avatarUrl={u.avatarUrl}
                        size={28}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          @{u.username}
                        </p>
                        {u.displayName && (
                          <p className="text-[11px] text-white/40 truncate">
                            {u.displayName}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={submit}
                className="flex items-center gap-2 px-3 pt-2.5 pb-1"
              >
                <Avatar
                  username={me?.username || "moi"}
                  avatarUrl={me?.avatarUrl}
                  size={32}
                />
                <div className="flex-1 flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
                  <input
                    ref={inputRef}
                    value={text}
                    onChange={(e) => onTextChange(e.target.value)}
                    placeholder="Ajouter un commentaire…"
                    disabled={loading}
                    className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none disabled:opacity-50 min-w-0"
                    maxLength={500}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmoji((v) => !v)}
                    className={`p-1.5 rounded-full hover:bg-white/10 ${
                      showEmoji ? "text-[#25f4ee]" : "text-white/60"
                    }`}
                    aria-label="Émojis"
                  >
                    <Smile size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="p-1.5 rounded-full hover:bg-white/10 text-white/60"
                    aria-label="Joindre une image"
                  >
                    <ImagePlus size={18} />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setImageFile(f);
                      e.target.value = "";
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={(!text.trim() && !imageFile) || loading}
                  className="shrink-0 p-2.5 bg-[#fe2c55] hover:bg-[#e0264c] disabled:opacity-40 disabled:hover:bg-[#fe2c55] rounded-full transition"
                  aria-label="Envoyer"
                >
                  <SendHorizontal size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
