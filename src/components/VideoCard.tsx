"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Share2,
  Repeat2,
  Volume2,
  VolumeX,
  Music2,
} from "lucide-react";
import Avatar from "./Avatar";
import CommentPanel from "./CommentPanel";
import Toast from "./Toast";
import VideoOwnerMenu from "./VideoOwnerMenu";
import type { FeedVideo } from "@/lib/types";

type Props = {
  video: FeedVideo;
  isActive: boolean;
  isLoggedIn: boolean;
  hasInteracted: boolean;
  onInteract: () => void;
  onDeleted?: () => void;
};

export default function VideoCard({
  video,
  isActive,
  isLoggedIn,
  hasInteracted,
  onInteract,
  onDeleted,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(video.likedByMe);
  const [likeCount, setLikeCount] = useState(video.likeCount);
  const [commentCount, setCommentCount] = useState(video.commentCount);
  const [reposted, setReposted] = useState(video.repostedByMe);
  const [repostCount, setRepostCount] = useState(video.repostCount);
  const [caption, setCaption] = useState(video.caption);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liking, setLiking] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const lastTapRef = useRef(0);
  const muteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const likingRef = useRef(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive && !commentsOpen) {
      el.currentTime = 0;
      const play = el.play();
      if (play) play.catch(() => {});
    } else if (!isActive) {
      el.pause();
    }
  }, [isActive, commentsOpen]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted || !hasInteracted;
    }
  }, [muted, hasInteracted]);

  async function doLike(forceLike = false) {
    if (!isLoggedIn) {
      window.location.href = "/connexion";
      return;
    }
    if (likingRef.current) return;
    if (forceLike && liked) return;

    likingRef.current = true;
    setLiking(true);
    const prevLiked = liked;
    const prevCount = likeCount;
    const nextLiked = forceLike ? true : !liked;
    setLiked(nextLiked);
    setLikeCount(
      forceLike
        ? liked
          ? likeCount
          : likeCount + 1
        : liked
          ? likeCount - 1
          : likeCount + 1
    );
    try {
      // If forceLike and already liked, skip API
      if (forceLike && prevLiked) {
        return;
      }
      // If forceLike and not liked, or toggle: hit API
      // For forceLike when not liked, we need to like. For toggle when liked, unlike.
      // Problem: toggle API always toggles. So if we want forceLike and already liked, we skip.
      // If forceLike and not liked, toggle will like — good.
      // If not forceLike, toggle — good.
      const res = await fetch(`/api/videos/${video.id}/like`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setLiked(prevLiked);
        setLikeCount(prevCount);
        return;
      }
      // If forceLike requested like but API returned unliked (race), re-toggle
      if (forceLike && !data.liked) {
        const res2 = await fetch(`/api/videos/${video.id}/like`, {
          method: "POST",
          credentials: "include",
        });
        const data2 = await res2.json();
        if (res2.ok) {
          setLiked(data2.liked);
          setLikeCount(data2.likeCount);
        }
        return;
      }
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      likingRef.current = false;
      setLiking(false);
    }
  }

  async function toggleLike(e: React.MouseEvent) {
    e.stopPropagation();
    await doLike(false);
  }

  function showHeartBurst() {
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 800);
  }

  async function toggleRepost(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isLoggedIn) {
      window.location.href = "/connexion";
      return;
    }
    if (reposting) return;
    setReposting(true);
    const prev = reposted;
    const prevCount = repostCount;
    const next = !reposted;
    setReposted(next);
    setRepostCount(next ? repostCount + 1 : Math.max(0, repostCount - 1));
    try {
      const res = await fetch(`/api/videos/${video.id}/repost`, {
        method: next ? "POST" : "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setReposted(prev);
        setRepostCount(prevCount);
        setToast(data.error || "Erreur");
        return;
      }
      setReposted(data.reposted);
      setRepostCount(data.repostCount);
      setToast(data.reposted ? "Republié dans ton fil" : "Republication retirée");
    } catch {
      setReposted(prev);
      setRepostCount(prevCount);
    } finally {
      setReposting(false);
    }
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}/?v=${video.id}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "ClipTok",
          text: caption,
          url,
        });
        return;
      }
    } catch {
      // utilisateur a annulé ou share indisponible → fallback
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("Lien copié");
    } catch {
      setToast("Impossible de copier le lien");
    }
  }

  function handleTap() {
    if (commentsOpen) return;
    const now = Date.now();
    const delta = now - lastTapRef.current;
    lastTapRef.current = now;

    if (delta < 280 && delta > 0) {
      if (muteTimerRef.current) {
        clearTimeout(muteTimerRef.current);
        muteTimerRef.current = null;
      }
      // Double-tap → like + heart animation
      showHeartBurst();
      void doLike(true);
      onInteract();
      return;
    }

    // Delay single-tap mute so a double-tap can cancel it
    if (muteTimerRef.current) clearTimeout(muteTimerRef.current);
    muteTimerRef.current = setTimeout(() => {
      muteTimerRef.current = null;
      onInteract();
      if (!hasInteracted) {
        setMuted(false);
      } else {
        setMuted((m) => !m);
      }
    }, 280);
  }

  if (hidden) return null;

  const displayName = video.user.displayName || video.user.username;

  return (
    <div className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center bg-black overflow-hidden">
      <video
        ref={videoRef}
        src={video.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        playsInline
        muted={muted || !hasInteracted}
        onClick={handleTap}
        preload="metadata"
      />

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/70 via-transparent to-black/20" />

      {/* Double-tap heart burst */}
      {heartBurst && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <Heart
            size={96}
            className="fill-[#fe2c55] text-[#fe2c55] drop-shadow-lg animate-ping"
            style={{ animationDuration: "0.6s", animationIterationCount: 1 }}
          />
          <Heart
            size={88}
            className="absolute fill-[#fe2c55] text-[#fe2c55] drop-shadow-2xl scale-100 opacity-90"
            style={{
              animation: "cliptok-heart-pop 0.7s ease-out forwards",
            }}
          />
        </div>
      )}

      {/* Right actions */}
      <div className="absolute right-3 bottom-28 md:bottom-24 flex flex-col items-center gap-4 z-20">
        <Link href={`/profil/${video.user.username}`} className="mb-1">
          <Avatar
            username={video.user.username}
            avatarUrl={video.user.avatarUrl}
            size={48}
          />
        </Link>

        <button
          type="button"
          onClick={toggleLike}
          disabled={liking}
          className="flex flex-col items-center gap-1 group"
          aria-label="J'aime"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-active:scale-90 transition">
            <Heart
              size={28}
              className={liked ? "fill-[#fe2c55] text-[#fe2c55]" : "text-white"}
            />
          </div>
          <span className="text-xs font-semibold">{likeCount}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setCommentsOpen(true);
          }}
          className="flex flex-col items-center gap-1 group"
          aria-label="Commentaires"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-active:scale-90 transition">
            <MessageCircle size={28} className="text-white" />
          </div>
          <span className="text-xs font-semibold">{commentCount}</span>
        </button>

        <button
          type="button"
          onClick={toggleRepost}
          className="flex flex-col items-center gap-1 group"
          aria-label="Republier"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-active:scale-90 transition">
            <Repeat2
              size={26}
              className={reposted ? "text-[#25f4ee]" : "text-white"}
            />
          </div>
          <span className="text-xs font-semibold">
            {repostCount > 0 ? repostCount : "Republier"}
          </span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex flex-col items-center gap-1 group"
          aria-label="Partager"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-active:scale-90 transition">
            <Share2 size={26} className="text-white" />
          </div>
          <span className="text-xs font-semibold">Partager</span>
        </button>

        {video.isOwner && (
          <VideoOwnerMenu
            videoId={video.id}
            caption={caption}
            onCaptionUpdated={setCaption}
            onDeleted={() => {
              setHidden(true);
              onDeleted?.();
            }}
          />
        )}
      </div>

      {/* Bottom caption + music */}
      <div className="absolute left-0 right-16 bottom-16 md:bottom-20 px-4 z-20 pointer-events-none">
        {video.repost && (
          <p className="text-xs text-white/60 mb-1 flex items-center gap-1 pointer-events-auto">
            <Repeat2 size={12} className="text-[#25f4ee]" />
            Republie{" "}
            <Link
              href={`/profil/${video.repost.user.username}`}
              className="font-semibold hover:underline text-white/80"
            >
              @{video.repost.user.username}
            </Link>
          </p>
        )}
        <Link
          href={`/profil/${video.user.username}`}
          className="font-bold text-base pointer-events-auto hover:underline"
        >
          @{video.user.username}
          {video.user.displayName &&
            video.user.displayName !== video.user.username && (
              <span className="font-normal text-white/50 text-sm ml-1.5">
                {displayName}
              </span>
            )}
        </Link>
        <p className="text-sm mt-1 text-white/90 line-clamp-3">{caption}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-white/70 truncate">
          <Music2 size={12} className="shrink-0 opacity-80" />
          <span className="truncate">
            Son original — @{video.user.username}
          </span>
        </p>
      </div>

      <button
        type="button"
        onClick={handleTap}
        className="absolute top-4 right-4 md:top-16 z-20 p-2 rounded-full bg-black/40"
        aria-label={muted || !hasInteracted ? "Activer le son" : "Couper le son"}
      >
        {muted || !hasInteracted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <CommentPanel
        videoId={video.id}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCommentAdded={() => setCommentCount((c) => c + 1)}
        isLoggedIn={isLoggedIn}
      />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <style dangerouslySetInnerHTML={{
        __html: `@keyframes cliptok-heart-pop{0%{transform:scale(.3);opacity:0}40%{transform:scale(1.15);opacity:1}70%{transform:scale(1);opacity:1}100%{transform:scale(1.4);opacity:0}}`,
      }} />
    </div>
  );
}
