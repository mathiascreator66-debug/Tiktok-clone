"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SendHorizontal, X } from "lucide-react";
import Avatar from "./Avatar";
import type { StoryGroup } from "@/lib/types";
import { applyMediaGain } from "@/lib/media-edit";
import { STORY_COMMENT_MAX, STORY_QUICK_EMOJIS } from "@/lib/limits";
import { LinkifiedText } from "@/lib/linkify";
import Link from "next/link";

type Props = {
  groups: StoryGroup[];
  startGroupIndex: number;
  isLoggedIn: boolean;
  currentUsername?: string | null;
  onClose: () => void;
  onViewed: (storyId: string, userId: string) => void;
};

const IMAGE_MS = 5000;

function isVideo(url: string) {
  return /\.mp4($|\?)/i.test(url);
}

export default function StoryViewer({
  groups,
  startGroupIndex,
  isLoggedIn,
  currentUsername,
  onClose,
  onViewed,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [groupIndex, setGroupIndex] = useState(startGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [recentComments, setRecentComments] = useState<
    { id: string; content: string; user: string }[]
  >([]);
  const rafRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const startTs = useRef(0);
  const progressRef = useRef(0);
  const pausedRef = useRef(false);
  const pauseAtRef = useRef(0);
  const inputFocused = useRef(false);

  useEffect(() => setMounted(true), []);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const isOwn = Boolean(
    currentUsername && group && group.user.username === currentUsername
  );

  const markViewed = useCallback(
    (sId: string, uId: string) => {
      onViewed(sId, uId);
      if (!isLoggedIn) return;
      fetch("/api/stories/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ storyId: sId }),
      }).catch(() => {});
    },
    [isLoggedIn, onViewed]
  );

  const goNext = useCallback(() => {
    if (inputFocused.current) return;
    const g = groups[groupIndex];
    if (!g) return;
    if (storyIndex < g.stories.length - 1) {
      setStoryIndex((i) => i + 1);
      setProgress(0);
      progressRef.current = 0;
      return;
    }
    if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
      setProgress(0);
      progressRef.current = 0;
      return;
    }
    onClose();
  }, [groups, groupIndex, storyIndex, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      setProgress(0);
      progressRef.current = 0;
      return;
    }
    if (groupIndex > 0) {
      const prev = groups[groupIndex - 1];
      setGroupIndex((i) => i - 1);
      setStoryIndex(Math.max(0, prev.stories.length - 1));
      setProgress(0);
      progressRef.current = 0;
      return;
    }
    setProgress(0);
    progressRef.current = 0;
  }, [storyIndex, groupIndex, groups]);

  useEffect(() => {
    if (!story || !group) return;
    markViewed(story.id, group.user.id);
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load reactions / owner comments for current story
  useEffect(() => {
    if (!story) return;
    setMyReactions(new Set());
    setRecentComments([]);
    setComment("");
    let cancelled = false;
    (async () => {
      try {
        const [rRes, cRes] = await Promise.all([
          fetch(`/api/story/${story.id}/reactions`, { credentials: "include" }),
          isOwn
            ? fetch(`/api/story/${story.id}/comments`, {
                credentials: "include",
              })
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (rRes.ok) {
          const data = await rRes.json();
          const mine = new Set<string>();
          for (const r of data.reactions || []) {
            if (r.reactedByMe) mine.add(r.emoji);
          }
          setMyReactions(mine);
        }
        if (cRes && cRes.ok) {
          const data = await cRes.json();
          setRecentComments(
            (data.comments || []).slice(0, 8).map(
              (c: {
                id: string;
                content: string;
                user: { username: string };
              }) => ({
                id: c.id,
                content: c.content,
                user: c.user.username,
              })
            )
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [story?.id, isOwn, story]); // story used for id; keep id primary

  useEffect(() => {
    if (!story) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const video = isVideo(story.mediaUrl);
    const hasGalleryMusic = Boolean(story.soundUrl);
    setProgress(0);
    progressRef.current = 0;
    startTs.current = performance.now();
    pausedRef.current = false;

    // Mix: play gallery track alongside original (originalVolume); do not force-mute.
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.pause();
      if (hasGalleryMusic && story.soundUrl) {
        audioEl.src = story.soundUrl;
        const trimStart = (story.soundTrimStartMs || 0) / 1000;
        const trimEnd =
          story.soundTrimEndMs != null ? story.soundTrimEndMs / 1000 : null;
        applyMediaGain(audioEl, story.soundVolume ?? 1);
        audioEl.currentTime = trimStart;
        audioEl.play().catch(() => {});
        if (trimEnd != null && trimEnd > trimStart) {
          const stopMs = (trimEnd - trimStart) * 1000;
          window.setTimeout(() => {
            if (audioRef.current === audioEl) audioEl.pause();
          }, stopMs);
        }
      } else {
        audioEl.removeAttribute("src");
        audioEl.load();
      }
    }

    if (video) {
      const tick = () => {
        const el = videoRef.current;
        if (el && el.duration && Number.isFinite(el.duration) && !pausedRef.current) {
          const p = Math.min(1, el.currentTime / el.duration);
          progressRef.current = p;
          setProgress(p);
          if (el.ended || p >= 0.99) {
            goNext();
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      const el = videoRef.current;
      if (el) {
        el.currentTime = 0;
        el.muted = false;
        applyMediaGain(el, story.originalVolume ?? 1);
        // Prefer unmuted; browsers may block — fall back muted silently.
        el.play().catch(() => {
          el.muted = true;
          el.play().catch(() => {});
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    } else {
      const tick = (now: number) => {
        if (pausedRef.current) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        const p = Math.min(1, (now - startTs.current) / IMAGE_MS);
        progressRef.current = p;
        setProgress(p);
        if (p >= 1) {
          goNext();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    const audioElCleanup = audioEl;
    return () => {
      document.body.style.overflow = prevOverflow;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioElCleanup?.pause();
    };
  }, [story?.id, groupIndex, storyIndex, goNext, story]);

  function pause() {
    if (inputFocused.current) return;
    pausedRef.current = true;
    pauseAtRef.current = progressRef.current;
    videoRef.current?.pause();
    audioRef.current?.pause();
  }

  function resume() {
    if (inputFocused.current) return;
    if (!pausedRef.current) return;
    pausedRef.current = false;
    if (story && !isVideo(story.mediaUrl)) {
      startTs.current = performance.now() - pauseAtRef.current * IMAGE_MS;
    }
    const vel = videoRef.current;
    if (vel) {
      applyMediaGain(vel, story?.originalVolume ?? 1);
      vel.play().catch(() => {});
    }
    if (story?.soundUrl && audioRef.current) {
      applyMediaGain(audioRef.current, story.soundVolume ?? 1);
      audioRef.current.play().catch(() => {});
    }
  }

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1600);
  }

  async function sendComment(e?: React.FormEvent) {
    e?.preventDefault();
    if (!story || !isLoggedIn || isOwn) return;
    const content = comment.trim().slice(0, STORY_COMMENT_MAX);
    if (!content) return;
    setSending(true);
    try {
      const res = await fetch(`/api/story/${story.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showFlash(data.error || "Erreur");
        return;
      }
      setComment("");
      showFlash("Réponse envoyée");
    } catch {
      showFlash("Erreur réseau");
    } finally {
      setSending(false);
    }
  }

  async function react(emoji: string) {
    if (!story || !isLoggedIn) {
      showFlash("Connectez-vous pour réagir");
      return;
    }
    // optimistic
    setMyReactions((prev) => {
      const next = new Set(prev);
      if (next.has(emoji)) next.delete(emoji);
      else next.add(emoji);
      return next;
    });
    try {
      const res = await fetch(`/api/story/${story.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showFlash(data.error || "Erreur");
      }
    } catch {
      showFlash("Erreur réseau");
    }
  }

  if (!mounted || !group || !story) return null;

  const video = isVideo(story.mediaUrl);

  const ui = (
    <div
      className="fixed inset-0 z-[110] bg-black flex flex-col"
      onTouchMove={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Stories"
    >
      <audio ref={audioRef} playsInline preload="auto" />

      <div className="absolute top-0 inset-x-0 z-20 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] flex gap-1">
        {group.stories.map((s, i) => (
          <div
            key={s.id}
            className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden"
          >
            <div
              className="h-full bg-white rounded-full"
              style={{
                width:
                  i < storyIndex
                    ? "100%"
                    : i === storyIndex
                      ? `${progress * 100}%`
                      : "0%",
              }}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-4 inset-x-0 z-20 flex items-center justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          href={`/profil/${group.user.username}`}
          onClick={onClose}
          className="flex items-center gap-2"
        >
          <Avatar
            username={group.user.username}
            avatarUrl={group.user.avatarUrl}
            size={32}
          />
          <span className="text-sm font-semibold drop-shadow">
            @{group.user.username}
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-black/40"
          aria-label="Fermer"
        >
          <X size={22} />
        </button>
      </div>

      <div className="relative flex-1 flex items-center justify-center">
        {video ? (
          <video
            ref={videoRef}
            key={story.id}
            src={story.mediaUrl}
            className="absolute inset-0 w-full h-full object-contain bg-black"
            playsInline
            autoPlay
            muted={false}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={story.id}
            src={story.mediaUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        )}

        <button
          type="button"
          className="absolute left-0 top-0 bottom-0 w-[30%] z-10"
          aria-label="Précédent"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          onPointerDown={pause}
          onPointerUp={resume}
          onPointerCancel={resume}
        />
        <button
          type="button"
          className="absolute right-0 top-0 bottom-0 w-[30%] z-10"
          aria-label="Suivant"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          onPointerDown={pause}
          onPointerUp={resume}
          onPointerCancel={resume}
        />
      </div>

      {story.caption && (
        <p className="absolute bottom-36 inset-x-0 z-20 px-4 text-center text-sm text-white drop-shadow">
          <LinkifiedText text={story.caption} />
        </p>
      )}

      {story.soundName && (
        <p className="absolute bottom-28 inset-x-0 z-20 px-4 text-center text-[11px] text-white/70">
          ♪ {story.soundName}
        </p>
      )}

      {/* Owner: incoming replies */}
      {isOwn && recentComments.length > 0 && (
        <div className="absolute bottom-24 inset-x-0 z-30 px-3 max-h-28 overflow-y-auto space-y-1 pointer-events-none">
          {recentComments.map((c) => (
            <p
              key={c.id}
              className="text-xs bg-black/50 rounded-lg px-2 py-1 text-white/90"
            >
              <span className="font-semibold">@{c.user}</span> {c.content}
            </p>
          ))}
        </div>
      )}

      {/* Viewer: emoji row + comment input */}
      {!isOwn && (
        <div className="absolute bottom-0 inset-x-0 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))] px-3 pt-2 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex gap-1.5 mb-2 overflow-x-auto scrollbar-hide justify-center">
            {STORY_QUICK_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => react(em)}
                className={`text-xl w-10 h-10 rounded-full flex items-center justify-center transition ${
                  myReactions.has(em)
                    ? "bg-white/30 scale-110"
                    : "bg-white/10 hover:bg-white/20"
                }`}
                aria-label={`Réagir ${em}`}
              >
                {em}
              </button>
            ))}
          </div>
          {isLoggedIn ? (
            <form onSubmit={sendComment} className="flex gap-2 items-center">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={STORY_COMMENT_MAX}
                placeholder="Répondre à la story…"
                className="flex-1 bg-white/15 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/40"
                onFocus={() => {
                  inputFocused.current = true;
                  pause();
                }}
                onBlur={() => {
                  inputFocused.current = false;
                  resume();
                }}
              />
              <button
                type="submit"
                disabled={sending || !comment.trim()}
                className="p-2.5 rounded-full bg-[#fe2c55] disabled:opacity-40"
                aria-label="Envoyer"
              >
                <SendHorizontal size={18} />
              </button>
            </form>
          ) : (
            <p className="text-center text-xs text-white/50 py-2">
              <Link href="/connexion" className="text-[#25f4ee] underline">
                Connectez-vous
              </Link>{" "}
              pour commenter ou réagir
            </p>
          )}
        </div>
      )}

      {flash && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-black/70 rounded-xl px-4 py-2 text-sm">
          {flash}
        </div>
      )}
    </div>
  );

  return createPortal(ui, document.body);
}
