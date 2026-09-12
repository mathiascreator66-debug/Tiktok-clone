"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Avatar from "./Avatar";
import type { StoryGroup } from "@/lib/types";
import Link from "next/link";

type Props = {
  groups: StoryGroup[];
  startGroupIndex: number;
  isLoggedIn: boolean;
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
  onClose,
  onViewed,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [groupIndex, setGroupIndex] = useState(startGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startTs = useRef(0);
  const progressRef = useRef(0);
  const pausedRef = useRef(false);
  const pauseAtRef = useRef(0);

  useEffect(() => setMounted(true), []);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];

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

  useEffect(() => {
    if (!story) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const video = isVideo(story.mediaUrl);
    setProgress(0);
    progressRef.current = 0;
    startTs.current = performance.now();
    pausedRef.current = false;

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
        el.play().catch(() => {});
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

    return () => {
      document.body.style.overflow = prevOverflow;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [story?.id, groupIndex, storyIndex, goNext, story]);

  function pause() {
    pausedRef.current = true;
    pauseAtRef.current = progressRef.current;
    videoRef.current?.pause();
  }

  function resume() {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    if (story && !isVideo(story.mediaUrl)) {
      startTs.current = performance.now() - pauseAtRef.current * IMAGE_MS;
    }
    videoRef.current?.play().catch(() => {});
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
        <p className="absolute bottom-10 inset-x-0 z-20 px-4 text-center text-sm text-white drop-shadow pb-[env(safe-area-inset-bottom)]">
          {story.caption}
        </p>
      )}
    </div>
  );

  return createPortal(ui, document.body);
}
