"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import VideoCard from "./VideoCard";
import type { FeedVideo } from "@/lib/types";

type Props = {
  initialVideos: FeedVideo[];
  isLoggedIn: boolean;
};

export default function VideoFeed({ initialVideos, isLoggedIn }: Props) {
  const [videos, setVideos] = useState(initialVideos);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVideos(initialVideos);
  }, [initialVideos]);

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
  }, [videos]);

  if (videos.length === 0) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center text-center px-6">
        <p className="text-xl font-bold mb-2">Aucune vidéo</p>
        <p className="text-white/50 text-sm">
          Connectez-vous et publiez la première vidéo !
        </p>
      </div>
    );
  }

  return (
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
              onInteract={onInteract}
              onDeleted={() =>
                setVideos((prev) =>
                  prev.filter((v, idx) => {
                    if (idx !== i) return true;
                    return false;
                  })
                )
              }
            />
          </div>
        );
      })}
    </div>
  );
}
