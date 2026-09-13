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
import VerifiedBadge from "./VerifiedBadge";
import CommentPanel from "./CommentPanel";
import Toast from "./Toast";
import VideoOwnerMenu from "./VideoOwnerMenu";
import ShareSheet from "./ShareSheet";
import GiftSheet from "./GiftSheet";
import type { FeedVideo } from "@/lib/types";
import { soundLabel } from "@/lib/sounds";
import { formatCount } from "@/lib/format";
import type { PlaybackRate } from "@/lib/limits";
import { LinkifiedText } from "@/lib/linkify";
import { applyMediaGain } from "@/lib/media-edit";
import VideoMediaOverlays from "./VideoMediaOverlays";
import PlaylistPicker from "./PlaylistPicker";
import { reuseSoundNavigate } from "@/lib/download-video";
import { getDataSaver, translateBestEffort } from "@/lib/preferences";

type WatchSource = "pour_toi" | "profil" | "recherche" | "abonnements" | "autre";

type Props = {
  video: FeedVideo;
  isActive: boolean;
  isLoggedIn: boolean;
  hasInteracted: boolean;
  onInteract: () => void;
  onDeleted?: () => void;
  onHide?: (videoId: string) => void;
  /** Trafic analytics : pour_toi | profil | recherche | abonnements | autre */
  watchSource?: WatchSource;
};

export default function VideoCard({
  video,
  isActive,
  isLoggedIn,
  onInteract,
  onDeleted,
  onHide,
  watchSource = "pour_toi",
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
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [boostedUntil, setBoostedUntil] = useState(video.boostedUntil);
  const [aiGenerated, setAiGenerated] = useState(Boolean(video.isAiGenerated));
  const [premiumOnly, setPremiumOnly] = useState(Boolean(video.isPremiumSubscribersOnly));
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  /** Browser blocked unmuted autoplay — show « Activer le son » until gesture. */
  const [needsSoundGesture, setNeedsSoundGesture] = useState(false);
  const [liking, setLiking] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [currentMs, setCurrentMs] = useState(0);
  const [showCaptions, setShowCaptions] = useState(true);
  const [translated, setTranslated] = useState(false);
  const lastTapRef = useRef(0);
  const muteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const likingRef = useRef(false);
  const watchSentRef = useRef(false);
  const watchEventIdRef = useRef<string | null>(null);
  const maxWatchMsRef = useRef(0);
  const watchSourceRef = useRef(watchSource);
  watchSourceRef.current = watchSource;

  const videoTrimStartSec = (video.videoTrimStartMs || 0) / 1000;
  const videoTrimEndSec =
    video.videoTrimEndMs != null ? video.videoTrimEndMs / 1000 : null;

  // Prefer unmuted autoplay. Browsers often block unmuted autoplay without a
  // prior user gesture (Chrome/Safari autoplay policy) — on NotAllowedError we
  // fall back to muted playback and show « Activer le son » until the user taps.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = playbackRate;
    applyMediaGain(el, video.originalVolume ?? 1);

    if (isActive && !commentsOpen && !shareOpen && !giftOpen && !paused) {
      const start = videoTrimStartSec;
      if (el.currentTime < start || (videoTrimEndSec != null && el.currentTime >= videoTrimEndSec)) {
        el.currentTime = start;
      }
      const tryUnmuted = !muted;
      el.muted = !tryUnmuted;
      const play = el.play();
      if (play) {
        play
          .then(() => {
            if (tryUnmuted) setNeedsSoundGesture(false);
          })
          .catch((err: unknown) => {
            const name =
              err && typeof err === "object" && "name" in err
                ? String((err as { name: string }).name)
                : "";
            if (tryUnmuted && (name === "NotAllowedError" || name === "AbortError")) {
              el.muted = true;
              setNeedsSoundGesture(true);
              el.play().catch(() => {});
            }
          });
      }
    } else if (!isActive) {
      el.pause();
      setPaused(false);
    } else {
      el.pause();
    }
  }, [
    isActive,
    commentsOpen,
    shareOpen,
    giftOpen,
    playbackRate,
    paused,
    muted,
    video.originalVolume,
    videoTrimStartSec,
    videoTrimEndSec,
  ]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    // Mix: never force-mute original just because gallery music is attached.
    el.muted = muted || needsSoundGesture;
    applyMediaGain(el, video.originalVolume ?? 1);
  }, [muted, needsSoundGesture, video.originalVolume]);

  // Play attached gallery audio mixed with original; pause when inactive / muted
  useEffect(() => {
    const audio = audioRef.current;
    const vid = videoRef.current;
    if (!audio || !video.soundUrl) return;
    const trimStart = (video.soundTrimStartMs || 0) / 1000;
    const trimEnd =
      video.soundTrimEndMs != null ? video.soundTrimEndMs / 1000 : null;
    applyMediaGain(audio, video.soundVolume ?? 1);
    const canHear = !muted && !needsSoundGesture;
    if (
      isActive &&
      !commentsOpen &&
      !shareOpen &&
      !giftOpen &&
      !paused &&
      canHear
    ) {
      const offset = vid
        ? Math.max(0, vid.currentTime - videoTrimStartSec)
        : 0;
      const target = trimStart + offset;
      if (trimEnd != null && target >= trimEnd) {
        audio.pause();
        return;
      }
      if (Math.abs(audio.currentTime - target) > 0.35) {
        audio.currentTime = target;
      }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [
    isActive,
    commentsOpen,
    shareOpen,
    giftOpen,
    paused,
    muted,
    needsSoundGesture,
    video.soundUrl,
    video.soundVolume,
    video.soundTrimStartMs,
    video.soundTrimEndMs,
    videoTrimStartSec,
  ]);

  // Analytics: record watch + progress (logged-in upsert / anonymous create)
  useEffect(() => {
    if (!isActive) return;

    function sendWatch(payload: {
      watchMs?: number;
      completed?: boolean;
      progressPct?: number;
    }) {
      const body: Record<string, unknown> = {
        source: watchSourceRef.current,
        ...payload,
      };
      if (watchEventIdRef.current) body.eventId = watchEventIdRef.current;
      return fetch(`/api/videos/${video.id}/watch`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then(async (res) => {
          if (!res.ok) return;
          try {
            const data = await res.json();
            if (data.eventId) watchEventIdRef.current = data.eventId;
          } catch {
            /* ignore */
          }
        })
        .catch(() => {});
    }

    const startTimer = setTimeout(() => {
      if (watchSentRef.current) return;
      watchSentRef.current = true;
      const el = videoRef.current;
      const watchMs = el
        ? Math.max(
            maxWatchMsRef.current,
            Math.round(
              Math.max(0, el.currentTime - videoTrimStartSec) * 1000
            )
          )
        : maxWatchMsRef.current;
      maxWatchMsRef.current = watchMs;
      void sendWatch({ watchMs });
    }, 2000);

    const onTime = () => {
      const el = videoRef.current;
      if (!el) return;
      const ms = Math.round(
        Math.max(0, el.currentTime - videoTrimStartSec) * 1000
      );
      if (ms > maxWatchMsRef.current) maxWatchMsRef.current = ms;
    };
    const el = videoRef.current;
    el?.addEventListener("timeupdate", onTime);

    return () => {
      clearTimeout(startTimer);
      el?.removeEventListener("timeupdate", onTime);
      if (watchSentRef.current || maxWatchMsRef.current > 0) {
        const watchMs = maxWatchMsRef.current;
        const durMs =
          videoTrimEndSec != null
            ? Math.max(0, (videoTrimEndSec - videoTrimStartSec) * 1000)
            : el?.duration && Number.isFinite(el.duration)
              ? Math.max(0, (el.duration - videoTrimStartSec) * 1000)
              : null;
        const progressPct =
          durMs && durMs > 0
            ? Math.min(100, Math.round((watchMs / durMs) * 100))
            : undefined;
        const completed = progressPct != null ? progressPct >= 95 : false;
        void sendWatch({ watchMs, progressPct, completed });
      }
    };
  }, [isActive, video.id, videoTrimStartSec, videoTrimEndSec]);

  // Reset per-video watch session when sliding to another card
  useEffect(() => {
    if (!isActive) {
      watchSentRef.current = false;
      watchEventIdRef.current = null;
      maxWatchMsRef.current = 0;
    }
  }, [isActive, video.id]);

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

  function unlockSound() {
    onInteract();
    setNeedsSoundGesture(false);
    setMuted(false);
    const el = videoRef.current;
    if (el) {
      el.muted = false;
      applyMediaGain(el, video.originalVolume ?? 1);
      el.play().catch(() => {});
    }
    const audio = audioRef.current;
    if (audio && video.soundUrl) {
      applyMediaGain(audio, video.soundVolume ?? 1);
      audio.play().catch(() => {});
    }
  }

  function toggleMute(e?: React.MouseEvent) {
    e?.stopPropagation();
    onInteract();
    if (needsSoundGesture || muted) {
      unlockSound();
      return;
    }
    setMuted(true);
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
      if (needsSoundGesture) {
        unlockSound();
        return;
      }
      setPaused((p) => !p);
    }, 280);
  }

  if (hidden) return null;


  return (
    <div className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center bg-black overflow-hidden">
      <video
        ref={videoRef}
        src={video.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop={videoTrimEndSec == null && videoTrimStartSec <= 0}
        playsInline
        muted={muted || needsSoundGesture}
        onClick={handleTap}
        preload="metadata"
        onTimeUpdate={() => {
          const a = audioRef.current;
          const v = videoRef.current;
          if (!v) return;
          setCurrentMs(Math.round(v.currentTime * 1000));
          // Respect video trim window
          if (v.currentTime < videoTrimStartSec) {
            v.currentTime = videoTrimStartSec;
          }
          if (videoTrimEndSec != null && v.currentTime >= videoTrimEndSec - 0.05) {
            v.currentTime = videoTrimStartSec;
            if (a && video.soundUrl) {
              a.currentTime = (video.soundTrimStartMs || 0) / 1000;
            }
          }
          if (!a || !video.soundUrl) return;
          const trimStart = (video.soundTrimStartMs || 0) / 1000;
          const trimEnd =
            video.soundTrimEndMs != null ? video.soundTrimEndMs / 1000 : null;
          const offset = Math.max(0, v.currentTime - videoTrimStartSec);
          const target = trimStart + offset;
          if (trimEnd != null && target >= trimEnd) {
            a.pause();
            return;
          }
          if (Math.abs(a.currentTime - target) > 0.35) {
            a.currentTime = target;
          }
        }}
        onEnded={() => {
          const v = videoRef.current;
          if (v && (videoTrimStartSec > 0 || videoTrimEndSec != null)) {
            v.currentTime = videoTrimStartSec;
            v.play().catch(() => {});
          }
          audioRef.current?.pause();
        }}
        onPlay={() => {
          const a = audioRef.current;
          if (!a || !video.soundUrl || muted || needsSoundGesture) return;
          applyMediaGain(a, video.soundVolume ?? 1);
          a.play().catch(() => {});
        }}
        onPause={() => {
          audioRef.current?.pause();
        }}
      />
      {video.soundUrl ? (
        <audio ref={audioRef} src={video.soundUrl} preload={typeof window !== "undefined" && getDataSaver() ? "metadata" : "auto"} />
      ) : null}

      <VideoMediaOverlays
        overlays={video.textOverlays || []}
        captions={video.captions || []}
        currentMs={currentMs}
        showCaptions={showCaptions}
      />

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
              setGiftOpen(true);
            }}
            className="flex flex-col items-center gap-1 group"
            aria-label="Cadeau"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-active:scale-90 transition">
              <Gift size={26} className="text-[#fe2c55]" />
            </div>
            <span className="text-xs font-semibold">Cadeau</span>
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
            isAiGenerated={aiGenerated}
            isPremiumSubscribersOnly={premiumOnly}
            onCaptionUpdated={setCaption}
            onBoosted={setBoostedUntil}
            onAiGenerated={setAiGenerated}
            onPremiumOnly={setPremiumOnly}
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
          {(video.user.isVerified || video.user.isPro) && (
            <VerifiedBadge size={15} className="ml-1 align-middle inline-flex" />
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
        <p className="text-sm mt-1 text-white/90 line-clamp-3 pointer-events-auto">
          <LinkifiedText
            text={translated ? translateBestEffort(caption, "en") : caption}
          />
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setTranslated((v) => !v);
          }}
          className="mt-1 text-[10px] text-[#25f4ee]/80 pointer-events-auto"
        >
          {translated ? "Voir l’original" : "Traduire"}
        </button>
        <div className="mt-2 flex items-center gap-2 text-xs text-white/70 min-w-0">
          <Music2 size={12} className="shrink-0 opacity-80" />
          <span className="truncate">
            {soundLabel(video.soundName, video.user.username)}
          </span>
          {video.soundUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                reuseSoundNavigate({
                  soundUrl: video.soundUrl!,
                  soundName: video.soundName,
                  soundVolume: video.soundVolume,
                });
              }}
              className="shrink-0 pointer-events-auto px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-[10px] font-semibold whitespace-nowrap"
            >
              Utiliser ce son
            </button>
          )}
        </div>
        {playbackRate !== 1 && (
          <p className="mt-1 text-[11px] text-white/50">{playbackRate}×</p>
        )}
      </div>

      {needsSoundGesture && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            unlockSound();
          }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-white text-black text-sm font-semibold shadow-lg"
        >
          Activer le son
        </button>
      )}

      {paused && isActive && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center text-white text-2xl">
            ▶
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toggleMute}
        className="absolute top-4 right-4 md:top-16 z-20 p-2 rounded-full bg-black/40"
        aria-label={muted || needsSoundGesture ? "Activer le son" : "Couper le son"}
      >
        {muted || needsSoundGesture ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      {(video.captions?.length ?? 0) > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowCaptions((s) => !s);
          }}
          className="absolute top-16 right-3 z-20 w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-[10px] font-bold"
          aria-label={showCaptions ? "Masquer les sous-titres" : "Afficher les sous-titres"}
        >
          {showCaptions ? "CC" : "cc"}
        </button>
      )}


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
        videoId={video.id}
        isLoggedIn={isLoggedIn}
        bookmarked={bookmarked}
        playbackRate={playbackRate}
        allowDownload={video.allowDownload !== false}
        soundUrl={video.soundUrl}
        soundName={video.soundName}
        soundVolume={video.soundVolume}
        onCopyLink={copyLink}
        onToggleBookmark={toggleBookmark}
        onNotInterested={hideVideo}
        onReport={reportVideo}
        onPlaybackRate={setPlaybackRate}
        onUseSound={
          video.soundUrl
            ? () =>
                reuseSoundNavigate({
                  soundUrl: video.soundUrl!,
                  soundName: video.soundName,
                  soundVolume: video.soundVolume,
                })
            : undefined
        }
        onAddToPlaylist={
          isLoggedIn ? () => setPlaylistOpen(true) : undefined
        }
      />

      <PlaylistPicker
        open={playlistOpen}
        onClose={() => setPlaylistOpen(false)}
        videoId={video.id}
        onDone={(msg) => setToast(msg)}
      />


      {(aiGenerated || (premiumOnly && !video.isCreatorSubscriber && !video.isOwner)) && (
        <div className="absolute top-14 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
          {aiGenerated && (
            <span className="inline-flex items-center rounded-md bg-black/65 border border-white/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white/90">
              Contenu IA
            </span>
          )}
          {premiumOnly && !video.isCreatorSubscriber && !video.isOwner && (
            <span className="inline-flex items-center rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-black">
              Premium abonnés
            </span>
          )}
        </div>
      )}

      {premiumOnly && !video.isCreatorSubscriber && !video.isOwner && (
        <div className="absolute inset-0 z-[25] flex flex-col items-center justify-center bg-black/70 backdrop-blur-md px-6 text-center">
          <p className="font-bold text-lg mb-1">Contenu Premium</p>
          <p className="text-sm text-white/70 mb-3">
            Réservé aux abonnés Premium de @{video.user.username}
            <span className="block text-[11px] text-white/45 mt-1">
              ≠ badge certifié ≠ AfriVoix Pro
            </span>
          </p>
          <a
            href={`/profil/${video.user.username}`}
            className="bg-[#fe2c55] px-4 py-2 rounded-full text-sm font-semibold"
          >
            Voir l&apos;abonnement
          </a>
        </div>
      )}

      <GiftSheet
        open={giftOpen}
        onClose={() => setGiftOpen(false)}
        toUsername={video.user.username}
        videoId={video.id}
        isLoggedIn={isLoggedIn}
        onGifted={(g) => setToast(`${g.emoji} ${g.label} envoyé (démo)`)}
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
