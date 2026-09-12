"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Pencil, UserPlus } from "lucide-react";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import SettingsDrawer from "./SettingsDrawer";
import { formatCount } from "@/lib/format";

type Props = {
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  isMe: boolean;
  isLoggedIn: boolean;
  initialFollowing: boolean;
  followingCount: number;
  followerCount: number;
  likeCount: number;
};

export default function ProfileHeader({
  username,
  displayName,
  bio,
  avatarUrl,
  isMe,
  isLoggedIn,
  initialFollowing,
  followingCount: fc,
  followerCount: fr,
  likeCount,
}: Props) {
  const [drawer, setDrawer] = useState(false);
  const followingCount = fc;
  const [followerCount, setFollowerCount] = useState(fr);
  const [following, setFollowing] = useState(initialFollowing);

  return (
    <>
      <div className="relative flex flex-col items-center text-center mb-6 pt-2">
        {/* Top actions */}
        <div className="absolute top-0 inset-x-0 flex items-center justify-between px-1">
          <div className="w-10">
            {!isMe && isLoggedIn && (
              <Link
                href="/amis"
                className="p-2 inline-flex rounded-full hover:bg-white/10"
                aria-label="Amis"
              >
                <UserPlus size={20} />
              </Link>
            )}
          </div>
          {isMe && (
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="p-2 rounded-full hover:bg-white/10"
              aria-label="Menu"
            >
              <Menu size={22} />
            </button>
          )}
        </div>

        <Avatar username={username} avatarUrl={avatarUrl} size={88} />

        <div className="flex items-center gap-2 mt-3">
          <h1 className="text-xl font-bold">{displayName}</h1>
          {isMe && (
            <Link
              href={`/profil/${username}/modifier`}
              className="p-1.5 rounded-md bg-white/10 border border-white/15 hover:bg-white/15"
              aria-label="Modifier le profil"
            >
              <Pencil size={14} />
            </Link>
          )}
        </div>
        <p className="text-white/50 text-sm">@{username}</p>

        {/* Stats: Suivis / Followers / J'aime */}
        <div className="flex gap-8 mt-4">
          <Stat value={followingCount} label="Suivis" />
          <Stat value={followerCount} label="Followers" />
          <Stat value={likeCount} label="J'aime" />
        </div>

        {bio ? (
          <p className="text-white/75 text-sm mt-3 max-w-md whitespace-pre-wrap px-2">
            {bio}
          </p>
        ) : isMe ? (
          <p className="text-white/35 text-sm mt-3 italic">
            Pas encore de bio — ajoutez-en une !
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {isMe ? (
            <>
              <Link
                href={`/profil/${username}/modifier`}
                className="inline-block bg-white/10 hover:bg-white/15 border border-white/15 px-5 py-2 rounded-md text-sm font-semibold"
              >
                Modifier
              </Link>
              <Link
                href="/telecharger"
                className="inline-block bg-[#fe2c55] px-5 py-2 rounded-md text-sm font-semibold"
              >
                Publier
              </Link>
            </>
          ) : (
            <>
              {isLoggedIn ? (
                <FollowButton
                  username={username}
                  initialFollowing={following}
                  onChange={(next) => {
                    setFollowing(next);
                    setFollowerCount((c) => c + (next ? 1 : -1));
                  }}
                />
              ) : (
                <Link
                  href="/connexion"
                  className="bg-[#fe2c55] px-5 py-2 rounded-md text-sm font-semibold"
                >
                  Suivre
                </Link>
              )}
              {isLoggedIn ? (
                <Link
                  href={`/messages/${username}`}
                  className="bg-white/10 border border-white/15 px-5 py-2 rounded-md text-sm font-semibold"
                >
                  Message
                </Link>
              ) : (
                <Link
                  href="/connexion"
                  className="bg-white/10 border border-white/15 px-5 py-2 rounded-md text-sm font-semibold"
                >
                  Message
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {isMe && (
        <SettingsDrawer open={drawer} onClose={() => setDrawer(false)} />
      )}
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[64px]">
      <p className="font-bold text-lg leading-tight">{formatCount(value)}</p>
      <p className="text-white/45 text-xs">{label}</p>
    </div>
  );
}
