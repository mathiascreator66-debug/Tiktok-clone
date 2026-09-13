"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Gift, Flag, Link as LinkIcon, Menu, Pencil, UserPlus, Sparkles, BarChart3 } from "lucide-react";
import type { ProfileLinkItem } from "@/lib/types";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import FollowButton from "./FollowButton";
import SettingsDrawer from "./SettingsDrawer";
import TipSheet from "./TipSheet";
import StoryViewer from "./StoryViewer";
import { formatCount } from "@/lib/format";
import type { StoryGroup } from "@/lib/types";

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
  isPro?: boolean;
  isVerified?: boolean;
  /** Server hint — client also refetches for freshness */
  hasActiveStories?: boolean;
  links?: ProfileLinkItem[];
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
  isPro = false,
  isVerified = false,
  hasActiveStories = false,
  links = [],
}: Props) {
  const [drawer, setDrawer] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const followingCount = fc;
  const [followerCount, setFollowerCount] = useState(fr);
  const [following, setFollowing] = useState(initialFollowing);
  const [storyGroup, setStoryGroup] = useState<StoryGroup | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const loadStories = useCallback(async () => {
    try {
      const res = await fetch(`/api/stories/u/${encodeURIComponent(username)}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      const stories = data.stories || [];
      if (!stories.length || !data.user) {
        setStoryGroup(null);
        return;
      }
      setStoryGroup({
        user: data.user,
        stories,
        hasUnviewed: stories.some((s: { viewedByMe: boolean }) => !s.viewedByMe),
      });
    } catch {
      /* ignore */
    }
  }, [username]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const hasStories = Boolean(storyGroup?.stories.length) || hasActiveStories;
  const ringUnviewed = storyGroup?.hasUnviewed ?? hasActiveStories;

  function onAvatarActivate() {
    if (storyGroup && storyGroup.stories.length > 0) {
      setViewerOpen(true);
    }
  }


  async function reportUser(reason: string) {
    setReportMsg(null);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "user", targetId: username, reason }),
    });
    if (res.ok) {
      setReportMsg("Signalement envoyé");
      setReportOpen(false);
    } else {
      const d = await res.json().catch(() => ({}));
      setReportMsg(d.error || "Échec du signalement");
    }
  }

  return (
    <>
      <div className="relative flex flex-col items-center text-center mb-6 pt-2">
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

        {hasStories ? (
          <button
            type="button"
            onClick={onAvatarActivate}
            disabled={!storyGroup}
            className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25f4ee] disabled:opacity-90"
            aria-label={`Voir les stories de @${username}`}
          >
            <div
              className={`p-[3px] rounded-full ${
                ringUnviewed
                  ? "bg-gradient-to-tr from-[#fe2c55] via-[#ff7a45] to-[#25f4ee]"
                  : "bg-white/35"
              }`}
            >
              <div className="rounded-full bg-black p-[2px]">
                <Avatar username={username} avatarUrl={avatarUrl} size={88} isPro={isPro} />
              </div>
            </div>
          </button>
        ) : (
          <Avatar username={username} avatarUrl={avatarUrl} size={88} isPro={isPro} />
        )}

        <div className="flex items-center gap-2 mt-3">
          <h1 className="text-xl font-bold">{displayName}</h1>
          {isPro && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase bg-amber-400 text-black px-1.5 py-0.5 rounded-full">
              <Sparkles size={10} /> Pro
            </span>
          )}
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
        <p className="text-white/50 text-sm inline-flex items-center gap-1.5">
          <span>@{username}</span>
          {isVerified && <VerifiedBadge size={15} />}
        </p>

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

        {links.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-3 px-2">
            {links.map((l, i) => {
              // Visitors see label only; never the raw URL (hostname fallback).
              let chip = (l.label || "").trim();
              if (!chip) {
                try {
                  chip = new URL(l.url).hostname.replace(/^www\./, "");
                } catch {
                  chip = "Lien";
                }
              }
              return (
                <a
                  key={l.id || i}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#25f4ee]"
                  title={chip}
                >
                  <LinkIcon size={12} />
                  {chip}
                </a>
              );
            })}
          </div>
        )}

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
              <Link
                href="/studio"
                className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 px-5 py-2 rounded-md text-sm font-semibold"
              >
                <BarChart3 size={14} className="text-[#25f4ee]" /> Statistiques
              </Link>
              <Link
                href="/solde"
                className="inline-block bg-white/10 border border-white/15 px-5 py-2 rounded-md text-sm font-semibold"
              >
                Solde
              </Link>
              {!isPro && (
                <Link
                  href="/pro"
                  className="inline-block bg-amber-400/90 text-black px-5 py-2 rounded-md text-sm font-semibold"
                >
                  Pro
                </Link>
              )}
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
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setTipOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 px-5 py-2 rounded-md text-sm font-semibold"
                >
                  <Gift size={14} className="text-[#fe2c55]" /> Offrir
                </button>
              ) : (
                <Link
                  href="/connexion"
                  className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 px-5 py-2 rounded-md text-sm font-semibold"
                >
                  <Gift size={14} className="text-[#fe2c55]" /> Offrir
                </Link>
              )}
              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => setReportOpen((v) => !v)}
                  className="inline-flex items-center gap-1 bg-white/10 border border-white/15 px-3 py-2 rounded-md text-sm"
                  aria-label="Signaler"
                >
                  <Flag size={14} />
                </button>
              )}
            </>
          )}
        </div>
        {reportMsg && <p className="text-xs text-[#d4af37] mt-2">{reportMsg}</p>}
        {reportOpen && (
          <div className="mt-2 rounded-xl border border-white/10 bg-black/80 p-3 space-y-1.5">
            <p className="text-xs text-white/50 mb-1">Signaler @{username}</p>
            {[
              ["spam", "Spam"],
              ["hate", "Haine / harcèlement"],
              ["violence", "Violence"],
              ["other", "Autre"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="block w-full text-left text-sm px-2 py-1.5 rounded hover:bg-white/10"
                onClick={() => reportUser(id)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isMe && (
        <SettingsDrawer open={drawer} onClose={() => setDrawer(false)} />
      )}

      {viewerOpen && storyGroup && (
        <StoryViewer
          groups={[storyGroup]}
          startGroupIndex={0}
          isLoggedIn={isLoggedIn}
          currentUsername={isMe ? username : null}
          onClose={() => setViewerOpen(false)}
          onViewed={(storyId) => {
            setStoryGroup((prev) => {
              if (!prev) return prev;
              const stories = prev.stories.map((s) =>
                s.id === storyId ? { ...s, viewedByMe: true } : s
              );
              return {
                ...prev,
                stories,
                hasUnviewed: stories.some((s) => !s.viewedByMe),
              };
            });
          }}
        />
      )}

      <TipSheet
        open={tipOpen}
        onClose={() => setTipOpen(false)}
        toUsername={username}
        isLoggedIn={isLoggedIn}
      />
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
