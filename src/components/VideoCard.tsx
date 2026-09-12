"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Share2, Volume2, VolumeX } from "lucide-react";
import Avatar from "./Avatar";
import CommentPanel from "./CommentPanel";
import type { FeedVideo } from "@/lib/types";

type Props = {
  video: FeedVideo;
  isActive: boolean;
  isLoggedIn: boolean;
  hasInteracted: boolean;
  onInteract: () => void;
};

export default function VideoCard({
  video,
  isActive,
  isLoggedIn,
  hasInteracted,
  onInteract,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(video.likedByMe);
  const [likeCount, setLikeCount] = useState(video.likeCount);
  const [commentCount, setCommentCount] = useState(video.commentCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isActive) {
      el.currentTime = 0;
      const play = el.play();
      if (play) play.catch(() => {});
    } else {
      el.pause();
    }
  }, [isActive]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted || !hasInteracted;
    }
  }, [muted, hasInteracted]);

  async function toggleLike() {
    if (!isLoggedIn) {
      window.location.href = "/connexion";
      return;
    }
    if (liking) return;
    setLiking(true);
    // Optimistic
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    try {
      const res = await fetch(`/api/videos/${video.id}/like`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setLiked(prevLiked);
        setLikeCount(prevCount);
        return;
      }
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLiking(false);
    }
  }

  function handleTap() {
    onInteract();
    if (!hasInteracted) {
      setMuted(false);
    } else {
      setMuted((m) => !m);
    }
  }

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

      {/* Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/70 via-transparent to-black/20" />

      {/* Right actions */}
      <div className="absolute right-3 bottom-28 md:bottom-24 flex flex-col items-center gap-5 z-20">
        <Link href={`/profil/${video.user.username}`} className="mb-1">
          <Avatar
            username={video.user.username}
            avatarUrl={video.user.avatarUrl}
            size={48}
          />
        </Link>

        <button
          onClick={toggleLike}
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
          onClick={() => setCommentsOpen(true)}
          className="flex flex-col items-center gap-1 group"
          aria-label="Commentaires"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-active:scale-90 transition">
            <MessageCircle size={28} className="text-white" />
          </div>
          <span className="text-xs font-semibold">{commentCount}</span>
        </button>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: "ClipTok",
                text: video.caption,
                url: window.location.href,
              }).catch(() => {});
            }
          }}
          className="flex flex-col items-center gap-1 group"
          aria-label="Partager"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-active:scale-90 transition">
            <Share2 size={26} className="text-white" />
          </div>
          <span className="text-xs font-semibold">Partager</span>
        </button>
      </div>

      {/* Bottom caption */}
      <div className="absolute left-0 right-16 bottom-16 md:bottom-20 px-4 z-20 pointer-events-none">
        <Link
          href={`/profil/${video.user.username}`}
          className="font-bold text-base pointer-events-auto hover:underline"
        >
          @{video.user.username}
        </Link>
        <p className="text-sm mt-1 text-white/90 line-clamp-3">{video.caption}</p>
      </div>

      {/* Mute indicator */}
      <button
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
    </div>
  );
}
