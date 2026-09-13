"use client";

import Link from "next/link";
import { Heart, MessageCircle, Pin, BarChart3 } from "lucide-react";
import VideoOwnerMenu from "./VideoOwnerMenu";
import { useRouter } from "next/navigation";
import { useState } from "react";

type VideoItem = {
  id: string;
  caption: string;
  videoUrl: string;
  coverUrl?: string | null;
  likeCount: number;
  commentCount: number;
  pinned?: boolean;
};

export default function ProfileVideoGrid({
  videos: initial,
  isOwner,
}: {
  videos: VideoItem[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [videos, setVideos] = useState(initial);

  if (videos.length === 0) {
    return (
      <p className="text-white/40 text-center py-10 text-sm">
        Aucune vidéo publiée.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {videos.map((v) => (
        <div
          key={v.id}
          className="relative aspect-[9/16] bg-white/5 rounded overflow-hidden group"
        >
          {v.pinned && (
            <span className="absolute top-1 left-1 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#fe2c55] text-white text-[10px] font-semibold shadow">
              <Pin size={9} /> Épinglé
            </span>
          )}
          <Link href="/" className="absolute inset-0">
            {v.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.coverUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={v.videoUrl}
                className="w-full h-full object-cover"
                muted
                preload="metadata"
              />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-end p-2 pointer-events-none">
              <div className="flex gap-2 text-xs">
                <span className="flex items-center gap-0.5">
                  <Heart size={12} /> {v.likeCount}
                </span>
                <span className="flex items-center gap-0.5">
                  <MessageCircle size={12} /> {v.commentCount}
                </span>
              </div>
            </div>
          </Link>
          {isOwner && (
            <Link
              href={`/studio/videos/${v.id}`}
              className="absolute bottom-1 left-1 z-10 p-1.5 rounded-full bg-black/60 text-[#25f4ee]"
              aria-label="Statistiques"
              onClick={(e) => e.stopPropagation()}
            >
              <BarChart3 size={12} />
            </Link>
          )}
          {isOwner && (
            <div className="absolute top-1 right-1 z-10">
              <VideoOwnerMenu
                videoId={v.id}
                caption={v.caption}
                pinned={v.pinned}
                variant="grid"
                onCaptionUpdated={(caption) => {
                  setVideos((prev) =>
                    prev.map((x) => (x.id === v.id ? { ...x, caption } : x))
                  );
                }}
                onPinned={(pinned) => {
                  setVideos((prev) => {
                    const next = prev.map((x) =>
                      x.id === v.id ? { ...x, pinned } : x
                    );
                    return [...next].sort((a, b) => {
                      if (a.pinned && !b.pinned) return -1;
                      if (!a.pinned && b.pinned) return 1;
                      return 0;
                    });
                  });
                }}
                onDeleted={() => {
                  setVideos((prev) => prev.filter((x) => x.id !== v.id));
                  router.refresh();
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
