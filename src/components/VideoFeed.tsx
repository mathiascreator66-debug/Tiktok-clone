"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import VideoCard from "./VideoCard";
import StoryRail from "./StoryRail";
import type { FeedVideo } from "@/lib/types";

type Tab = "foryou" | "following";

type Props = {
  initialVideos: FeedVideo[];
  isLoggedIn: boolean;
  currentUsername?: string | null;
};

export default function VideoFeed({
  initialVideos,
  isLoggedIn,
  currentUsername = null,
}: Props) {
  const [tab, setTab] = useState<Tab>("foryou");
  const [forYouVideos, setForYouVideos] = useState(initialVideos);
  const [followingVideos, setFollowingVideos] = useState<FeedVideo[] | null>(
    null
  );
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingError, setFollowingError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const followingFetched = useRef(false);

  useEffect(() => {
    setForYouVideos(initialVideos);
  }, [initialVideos]);

  const videos = useMemo(
    () => (tab === "foryou" ? forYouVideos : followingVideos ?? []),
    [tab, forYouVideos, followingVideos]
  );

  const loadFollowing = useCallback(async () => {
    if (!isLoggedIn) return;
    setFollowingLoading(true);
    setFollowingError(null);
    try {
      const res = await fetch("/api/videos?feed=following", { credentials: "include" });
      if (res.status === 401) {
        setFollowingError("login");
        setFollowingVideos([]);
        return;
      }
      if (!res.ok) throw new Error("fail");
      const data = await res.json();
      setFollowingVideos(data.videos ?? []);
      followingFetched.current = true;
    } catch {
      setFollowingError("error");
      setFollowingVideos([]);
    } finally {
      setFollowingLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (tab !== "following") return;
    if (!isLoggedIn) {
      setFollowingVideos([]);
      setFollowingError("login");
      return;
    }
    if (!followingFetched.current) {
      loadFollowing();
    }
  }, [tab, isLoggedIn, loadFollowing]);

  useEffect(() => {
    setActiveIndex(0);
    containerRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  const onInteract = useCallback(() => setHasInteracted(true), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    const slides = container.querySelectorAll("[data-index]");
    slides.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [videos, tab]);

  function selectTab(next: Tab) {
    setTab(next);
  }

  const tabs = (
    <div className="pointer-events-none absolute top-0 inset-x-0 z-40 flex justify-center pt-[max(0.75rem,env(safe-area-inset-top))] md:pt-16">
      <div className="pointer-events-auto flex items-center gap-6 text-[15px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        <button
          type="button"
          onClick={() => selectTab("foryou")}
          className={`relative pb-1 transition-colors ${
            tab === "foryou" ? "text-white" : "text-white/50"
          }`}
        >
          Pour toi
          {tab === "foryou" && (
            <span className="absolute left-1/2 -translate-x-1/2 bottom-0 h-[3px] w-8 rounded-full bg-white" />
          )}
        </button>
        <button
          type="button"
          onClick={() => selectTab("following")}
          className={`relative pb-1 transition-colors ${
            tab === "following" ? "text-white" : "text-white/50"
          }`}
        >
          Abonnements
          {tab === "following" && (
            <span className="absolute left-1/2 -translate-x-1/2 bottom-0 h-[3px] w-8 rounded-full bg-white" />
          )}
        </button>
        <Link
          href="/recherche"
          className="relative pb-1 text-white/50 hover:text-white transition-colors flex items-center gap-1"
        >
          <Search size={14} />
          Recherche
        </Link>
      </div>
    </div>
  );

  function renderFollowingEmpty() {
    if (!isLoggedIn || followingError === "login") {
      return (
        <div className="h-[100dvh] flex flex-col items-center justify-center text-center px-6">
          <p className="text-xl font-bold mb-2">Abonnements</p>
          <p className="text-white/50 text-sm mb-5 max-w-xs">
            Connectez-vous pour voir les vidéos des comptes que vous suivez.
          </p>
          <Link
            href="/connexion"
            className="bg-[#fe2c55] px-6 py-2.5 rounded-full font-semibold text-sm"
          >
            Se connecter
          </Link>
        </div>
      );
    }

    if (followingLoading) {
      return (
        <div className="h-[100dvh] flex items-center justify-center text-white/50 text-sm">
          Chargement…
        </div>
      );
    }

    if (followingError === "error") {
      return (
        <div className="h-[100dvh] flex flex-col items-center justify-center text-center px-6">
          <p className="text-white/50 text-sm mb-4">Impossible de charger le fil.</p>
          <button
            type="button"
            onClick={() => {
              followingFetched.current = false;
              loadFollowing();
            }}
            className="text-sm font-semibold text-[#fe2c55]"
          >
            Réessayer
          </button>
        </div>
      );
    }

    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center text-center px-6">
        <p className="text-xl font-bold mb-2">Abonnements</p>
        <p className="text-white/50 text-sm mb-5 max-w-xs">
          Suis des comptes pour voir leurs vidéos
        </p>
        <Link
          href="/amis"
          className="bg-[#fe2c55] px-6 py-2.5 rounded-full font-semibold text-sm"
        >
          Trouver des amis
        </Link>
      </div>
    );
  }

  if (tab === "following" && videos.length === 0) {
    return (
      <div className="relative h-[100dvh] w-full">
        {tabs}
        <StoryRail isLoggedIn={isLoggedIn} currentUsername={currentUsername} />
        {renderFollowingEmpty()}
      </div>
    );
  }

  if (tab === "foryou" && videos.length === 0) {
    return (
      <div className="relative h-[100dvh] w-full">
        {tabs}
        <StoryRail isLoggedIn={isLoggedIn} currentUsername={currentUsername} />
        <div className="h-[100dvh] flex flex-col items-center justify-center text-center px-6">
          <p className="text-xl font-bold mb-2">Aucune vidéo</p>
          <p className="text-white/50 text-sm">
            Connectez-vous et publiez la première vidéo !
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full">
      {tabs}
        <StoryRail isLoggedIn={isLoggedIn} currentUsername={currentUsername} />
      <div
        ref={containerRef}
        className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {videos.map((video, i) => {
          const key = video.repost
            ? `r-${video.repost.id}`
            : `v-${video.id}-${i}`;
          return (
            <div key={key} data-index={i} className="h-[100dvh] snap-start">
              <VideoCard
                video={video}
                isActive={i === activeIndex}
                isLoggedIn={isLoggedIn}
                hasInteracted={hasInteracted}
                watchSource={tab === "following" ? "abonnements" : "pour_toi"}
                onInteract={onInteract}
                onDeleted={() => {
                  const removeId = (prev: FeedVideo[]) =>
                    prev.filter((x) => x.id !== video.id);
                  if (tab === "foryou") setForYouVideos(removeId);
                  else setFollowingVideos((prev) => removeId(prev ?? []));
                }}
                onHide={(id) => {
                  const remove = (prev: FeedVideo[]) => prev.filter((x) => x.id !== id);
                  setForYouVideos(remove);
                  setFollowingVideos((prev) => (prev ? remove(prev) : prev));
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
