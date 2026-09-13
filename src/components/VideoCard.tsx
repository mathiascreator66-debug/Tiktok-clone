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
  Bookmark,
  Gift,
} from "lucide-react";
import Avatar from "./Avatar";
import CommentPanel from "./CommentPanel";
import Toast from "./Toast";
import VideoOwnerMenu from "./VideoOwnerMenu";
import ShareSheet from "./ShareSheet";
import TipSheet from "./TipSheet";
import type { FeedVideo } from "@/lib/types";
import { soundLabel } from "@/lib/sounds";
import { formatCount } from "@/lib/format";
import type { PlaybackRate } from "@/lib/limits";
import { LinkifiedText } from "@/lib/linkify";

type Props = {
  video: FeedVideo;
  isActive: boolean;
  isLoggedIn: boolean;
  hasInteracted: boolean;
  onInteract: () => void;
  onDeleted?: () => void;
  onHide?: (videoId: string) => void;
};

export default function VideoCard({
  video,
  isActive,
  isLoggedIn,
  hasInteracted,
  onInteract,
  onDeleted,
  onHide,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [liked, setLiked] = useState(video.likedByMe);
  const [likeCount, setLikeCount] = useState(video.likeCount);
  const [commentCount, setCommentCount] = useState(video.commentCount);
  const [reposted, setReposted] = useState(video.repostedByMe);
  const [repostCount, setRepostCount] = useState(video.repostCount);
  const [bookmarked, setBookmarked] = useState(video.bookmarkedByMe);
  const [bookmarkCount, setBookmarkCount] = useState(video.bookmarkCount);
  const [caption, setCaption] = useState(video.caption);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [boostedUntil, setBoostedUntil] = useState(video.boostedUntil);
  const [muted, setMuted] = useState(true);
  const [liking, setLiking] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const lastTapRef = useRef(0);
  const muteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const likingRef = useRef(false);
  const watchSentRef = useRef(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = playbackRate;
    if (isActive && !commentsOpen && !shareOpen && !tipOpen) {
      el.currentTime = 0;
      const play = el.play();
      if (play) play.catch(() => {});
    } else if (!isActive) {
      el.pause();
    }
  }, [isActive, commentsOpen, shareOpen, tipOpen, playbackRate]);

  useEffect(() => {
    if (videoRef.current) {
      // Gallery music: always mute original video track (documented behavior)
      const forceMute = Boolean(video.soundUrl) || muted || !hasInteracted;
      videoRef.current.muted = forceMute;
    }
  }, [muted, hasInteracted, video.soundUrl]);

  // Play attached gallery audio with the video; pause when inactive
  useEffect(() => {
    const audio = audioRef.current;
    const vid = videoRef.current;
    if (!audio || !video.soundUrl) return;
    if (isActive && !commentsOpen && !shareOpen && !tipOpen && hasInteracted && !muted) {
      if (vid) audio.currentTime = vid.currentTime;
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isActive, commentsOpen, shareOpen, tipOpen, hasInteracted, muted, video.soundUrl]);

  useEffect(() => {
    if (!isActive || !isLoggedIn || watchSentRef.current) return;
    const t = setTimeout(() => {
      if (watchSentRef.current) return;
      watchSentRef.current = true;
      fetch(`/api/videos/${video.id}/watch`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {
        watchSentRef.current = false;
      });
    }, 2000);
    return () => clearTimeout(t);
  }, [isActive, isLoggedIn, video.id]);

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
      if (forceLike && prevLiked) {
        return;
      }
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

  async function toggleBookmark() {
    if (!isLoggedIn) {
      window.location.href = "/connexion";
      return;
    }
    if (bookmarking) return;
    setBookmarking(true);
    const prev = bookmarked;
    const prevCount = bookmarkCount;
    const next = !bookmarked;
    setBookmarked(next);
    setBookmarkCount(next ? bookmarkCount + 1 : Math.max(0, bookmarkCount - 1));
    try {
      const res = await fetch(`/api/videos/${video.id}/bookmark`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setBookmarked(prev);
        setBookmarkCount(prevCount);
        setToast(data.error || "Erreur");
        return;
      }
      setBookmarked(data.bookmarked);
      setBookmarkCount(data.bookmarkCount);
      setToast(data.bookmarked ? "Enregistré" : "Retiré des favoris");
    } catch {
      setBookmarked(prev);
      setBookmarkCount(prevCount);
    } finally {
      setBookmarking(false);
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/?v=${video.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast("Lien copié");
    } catch {
      setToast("Impossible de copier le lien");
    }
  }

  async function hideVideo() {
    setHidden(true);
    onHide?.(video.id);
    if (isLoggedIn) {
      try {
        await fetch(`/api/videos/${video.id}/not-interested`, {
          method: "POST",
          credentials: "include",
        });
      } catch {
        /* ignore */
      }
    }
    setToast("Vidéo masquée");
  }

  async function reportVideo(reason: string) {
    const res = await fetch(`/api/videos/${video.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason }),
    });
    if (res.ok) setToast("Signalement envoyé");
    else setToast("Impossible de signaler");
  }

  function handleTap() {
    if (commentsOpen || shareOpen) return;
    const now = Date.now();
    const delta = now - lastTapRef.current;
    lastTapRef.current = now;

    if (delta < 280 && delta > 0) {
      if (muteTimerRef.current) {
        clearTimeout(muteTimerRef.current);
        muteTimerRef.current = null;
      }
      showHeartBurst();
      void doLike(true);
      onInteract();
      return;
    }

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


  return (
    <div className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center bg-black overflow-hidden">
      <video
        ref={videoRef}
        src={video.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        playsInline
        muted={Boolean(video.soundUrl) || muted || !hasInteracted}
        onClick={handleTap}
        preload="metadata"
        onTimeUpdate={() => {
          const a = audioRef.current;
          const v = videoRef.current;
          if (a && v && video.soundUrl && Math.abs(a.currentTime - v.currentTime) > 0.35) {
            a.currentTime = v.currentTime;
          }
        }}
      />
      {video.soundUrl ? (
        <audio ref={audioRef} src={video.soundUrl} loop preload="auto" />
      ) : null}

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/70 via-transparent to-black/20" />

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
              animation: "afrivoix-heart-pop 0.7s ease-out forwards",
            }}
          />
        </div>
      )}

      <div className="absolute right-3 bottom-28 md:bottom-24 flex flex-col items-center gap-3.5 z-20">
        <Link href={`/profil/${video.user.username}`} className="mb-1">
          <Avatar
            username={video.user.username}
            avatarUrl={video.user.avatarUrl}
            size={48}
            isPro={Boolean(video.user.isPro)}
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
          <span className="text-xs font-semibold">{formatCount(likeCount)}</span>
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
          <span className="text-xs font-semibold">{formatCount(commentCount)}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void toggleBookmark();
          }}
          disabled={bookmarking}
          className="flex flex-col items-center gap-1 group"
          aria-label="Enregistrer"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-active:scale-90 transition">
            <Bookmark
              size={26}
              className={
                bookmarked ? "fill-yellow-400 text-yellow-400" : "text-white"
              }
            />
          </div>
          <span className="text-xs font-semibold">
            {bookmarkCount > 0 ? formatCount(bookmarkCount) : "Enreg."}
          </span>
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
            {repostCount > 0 ? formatCount(repostCount) : "Republier"}
          </span>
        </button>


        {!video.isOwner && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isLoggedIn) {
                window.location.href = "/connexion";
                return;
              }
              setTipOpen(true);
            }}
            className="flex flex-col items-center gap-1 group"
            aria-label="Offrir"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-active:scale-90 transition">
              <Gift size={26} className="text-[#fe2c55]" />
            </div>
            <span className="text-xs font-semibold">Offrir</span>
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShareOpen(true);
          }}
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
            pinned={video.pinned}
            boostedUntil={boostedUntil}
            onCaptionUpdated={setCaption}
            onBoosted={setBoostedUntil}
            onDeleted={() => {
              setHidden(true);
              onDeleted?.();
            }}
          />
        )}
      </div>

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
          {video.user.isVerified && (
            <span className="inline-block ml-1 text-[#25f4ee] text-xs" title="Vérifié">✓</span>
          )}
          {video.user.displayName &&
            video.user.displayName !== video.user.username && (
              <span className="font-normal text-white/50 text-sm ml-1.5">
                {video.user.displayName}
              </span>
            )}
        </Link>
        {boostedUntil && new Date(boostedUntil).getTime() > Date.now() && (
          <span className="inline-block mb-1 text-[10px] font-semibold uppercase tracking-wide bg-amber-400/90 text-black px-1.5 py-0.5 rounded pointer-events-auto">
            Boosté
          </span>
        )}
        <p className="text-sm mt-1 text-white/90 line-clamp-3 pointer-events-auto"><LinkifiedText text={caption} /></p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-white/70 truncate">
          <Music2 size={12} className="shrink-0 opacity-80" />
          <span className="truncate">
            {soundLabel(video.soundName, video.user.username)}
          </span>
        </p>
        {playbackRate !== 1 && (
          <p className="mt-1 text-[11px] text-white/50">{playbackRate}×</p>
        )}
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

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        caption={caption}
        isLoggedIn={isLoggedIn}
        bookmarked={bookmarked}
        playbackRate={playbackRate}
        onCopyLink={copyLink}
        onToggleBookmark={toggleBookmark}
        onNotInterested={hideVideo}
        onReport={reportVideo}
        onPlaybackRate={setPlaybackRate}
      />

      <TipSheet
        open={tipOpen}
        onClose={() => setTipOpen(false)}
        toUsername={video.user.username}
        videoId={video.id}
        isLoggedIn={isLoggedIn}
        onTipped={() => setToast("Pourboire envoyé (démo)")}
      />

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes afrivoix-heart-pop{0%{transform:scale(.3);opacity:0}40%{transform:scale(1.15);opacity:1}70%{transform:scale(1);opacity:1}100%{transform:scale(1.4);opacity:0}}`,
        }}
      />
    </div>
  );
}
