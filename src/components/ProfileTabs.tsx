"use client";

import { useState } from "react";
import { Grid3X3, Heart, Lock } from "lucide-react";
import ProfileVideoGrid from "./ProfileVideoGrid";

type VideoItem = {
  id: string;
  caption: string;
  videoUrl: string;
  likeCount: number;
  commentCount: number;
  pinned?: boolean;
};

type Props = {
  videos: VideoItem[];
  likedVideos: VideoItem[];
  isOwner: boolean;
  isMe: boolean;
};

type Tab = "videos" | "private" | "liked";

export default function ProfileTabs({
  videos,
  likedVideos,
  isOwner,
  isMe,
}: Props) {
  const [tab, setTab] = useState<Tab>("videos");

  return (
    <div>
      <div className="border-b border-white/10 mb-1">
        <div className="flex justify-center gap-1">
          <TabBtn
            active={tab === "videos"}
            onClick={() => setTab("videos")}
            label="Vidéos"
            icon={<Grid3X3 size={18} />}
          />
          <TabBtn
            active={tab === "private"}
            onClick={() => setTab("private")}
            label="Privé"
            icon={<Lock size={18} />}
          />
          <TabBtn
            active={tab === "liked"}
            onClick={() => setTab("liked")}
            label="Aimés"
            icon={<Heart size={18} />}
          />
        </div>
      </div>

      {tab === "videos" && (
        <ProfileVideoGrid videos={videos} isOwner={isOwner} />
      )}

      {tab === "private" && (
        <div className="py-12 px-6 text-center">
          <Lock size={36} className="mx-auto text-white/25 mb-3" />
          <p className="text-white/70 font-semibold text-sm">
            Aucune vidéo privée
          </p>
          <p className="text-white/40 text-sm mt-2 max-w-xs mx-auto">
            {isMe
              ? "Les publications marquées comme privées apparaîtront ici. Pour l’instant, toutes vos vidéos sont publiques."
              : "Cet utilisateur n’a pas de vidéos privées visibles."}
          </p>
        </div>
      )}

      {tab === "liked" && (
        <>
          {!isMe ? (
            <p className="text-white/40 text-center py-10 text-sm px-4">
              Les vidéos aimées sont visibles uniquement par le titulaire du
              compte.
            </p>
          ) : likedVideos.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <Heart size={36} className="mx-auto text-white/25 mb-3" />
              <p className="text-white/70 font-semibold text-sm">
                Aucune vidéo aimée
              </p>
              <p className="text-white/40 text-sm mt-2">
                Les vidéos auxquelles vous mettez un j’aime apparaîtront ici.
              </p>
            </div>
          ) : (
            <ProfileVideoGrid videos={likedVideos} isOwner={false} />
          )}
        </>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold border-b-2 transition ${
        active
          ? "border-white text-white"
          : "border-transparent text-white/40 hover:text-white/70"
      }`}
      aria-label={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
