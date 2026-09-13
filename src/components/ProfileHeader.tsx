"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  CreditCard,
  Crown,
  Flag,
  Gift,
  History,
  LayoutGrid,
  Link as LinkIcon,
  ListMusic,
  Menu,
  Radio,
  Share2,
  UserPlus,
  WalletCards,
} from "lucide-react";
import type { ProfileLinkItem } from "@/lib/types";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import FollowButton from "./FollowButton";
import SettingsDrawer from "./SettingsDrawer";
import TipSheet from "./TipSheet";
import CreatorPremiumPanel from "./CreatorPremiumPanel";
import StoryViewer from "./StoryViewer";
import { formatCount } from "@/lib/format";
import type { StoryGroup } from "@/lib/types";
import ProfileShareSheet from "./ProfileShareSheet";
import AvatarLightbox from "./AvatarLightbox";

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
  panneauSlug?: string | null;
  playlists?: { id: string; title: string; coverUrl?: string | null; itemCount: number }[];
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
  panneauSlug = null,
  playlists = [],
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
  const [photoOpen, setPhotoOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);

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

  useEffect(() => {
    if (isMe || !isLoggedIn) return;
    fetch(`/api/blocks/${encodeURIComponent(username)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setBlocked(!!d.blocked))
      .catch(() => {});
  }, [username, isMe, isLoggedIn]);

  async function toggleBlock() {
    if (!isLoggedIn) {
      window.location.href = "/connexion";
      return;
    }
    if (!blocked && !confirm(`Bloquer @${username} ?`)) return;
    setBlockBusy(true);
    try {
      const res = await fetch(`/api/blocks/${encodeURIComponent(username)}`, {
        method: blocked ? "DELETE" : "POST",
        credentials: "include",
      });
      if (res.ok) {
        setBlocked(!blocked);
        if (!blocked) window.location.href = "/";
      }
    } finally {
      setBlockBusy(false);
    }
  }

  const hasStories = Boolean(storyGroup?.stories.length) || hasActiveStories;
  const ringUnviewed = storyGroup?.hasUnviewed ?? hasActiveStories;

  function onAvatarActivate() {
    // TikTok-like: story ring → stories; otherwise → full photo
    if (storyGroup && storyGroup.stories.length > 0) {
      setViewerOpen(true);
      return;
    }
    setPhotoOpen(true);
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

        <button
          type="button"
          onClick={onAvatarActivate}
          onContextMenu={(e) => {
            e.preventDefault();
            setPhotoOpen(true);
          }}
          disabled={hasStories && !storyGroup}
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25f4ee] disabled:opacity-90"
          aria-label={
            hasStories
              ? `Voir les stories de @${username}`
              : `Voir la photo de profil de @${username}`
          }
          title={hasStories ? "Appui long / clic droit : voir la photo" : undefined}
        >
          {hasStories ? (
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
          ) : (
            <Avatar username={username} avatarUrl={avatarUrl} size={88} isPro={isPro} />
          )}
        </button>

        <div className="flex items-center gap-2 mt-3">
          <h1 className="text-xl font-bold">{displayName}</h1>
          {(isVerified || isPro) && <VerifiedBadge size={18} />}
        </div>
        <p className="text-white/50 text-sm">@{username}</p>

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

        <div className={`mt-4 flex w-full max-w-md gap-2 justify-center px-1 ${isMe ? "" : "flex-wrap"}`}>
          {isMe ? (
            <>
              <Link
                href={`/profil/${username}/modifier`}
                className="flex-1 bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2.5 rounded-md text-sm font-semibold"
              >
                Modifier le profil
              </Link>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2.5 rounded-md text-sm font-semibold"
              >
                <Share2 size={15} /> Partager le profil
              </button>
            </>
          ) : (
            <>
              {isLoggedIn ? (
                <FollowButton
                  username={username}
                  initialFollowing={following}
                  onChange={(next) => {
                    setFollowing(next);
                    setFollowerCount((count) => count + (next ? 1 : -1));
                  }}
                />
              ) : (
                <Link href="/connexion" className="bg-[#fe2c55] px-5 py-2 rounded-md text-sm font-semibold text-white">
                  Suivre
                </Link>
              )}
              <Link
                href={isLoggedIn ? `/messages/${username}` : "/connexion"}
                className="bg-white/10 border border-white/15 px-5 py-2 rounded-md text-sm font-semibold"
              >
                Message
              </Link>
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setTipOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 px-4 py-2 rounded-md text-sm font-semibold"
                >
                  <Gift size={14} className="text-[#fe2c55]" /> Pourboire
                </button>
              ) : (
                <Link href="/connexion" className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 px-4 py-2 rounded-md text-sm font-semibold">
                  <Gift size={14} className="text-[#fe2c55]" /> Pourboire
                </Link>
              )}
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 px-4 py-2 rounded-md text-sm font-semibold"
              >
                <Share2 size={14} /> Partager
              </button>
              {panneauSlug && (
                <Link href={`/communaute/${panneauSlug}`} className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 px-4 py-2 rounded-md text-sm font-semibold">
                  <Radio size={14} className="text-[#25bcb7] dark:text-[#25f4ee]" /> Panneau
                </Link>
              )}
              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => setReportOpen((open) => !open)}
                  className="p-2 bg-white/10 border border-white/15 rounded-md"
                  aria-label="Signaler"
                >
                  <Flag size={14} />
                </button>
              )}
              {isLoggedIn && (
                <button
                  type="button"
                  disabled={blockBusy}
                  onClick={toggleBlock}
                  className="px-3 py-2 bg-white/10 border border-white/15 rounded-md text-sm text-[#fe2c55]"
                >
                  {blocked ? "Débloquer" : "Bloquer"}
                </button>
              )}
            </>
          )}
        </div>

        {isMe && (
          <div
            className="mt-3 flex w-full gap-2 overflow-x-auto scrollbar-hide px-1 pb-1 snap-x snap-mandatory"
            aria-label="Raccourcis du profil"
          >
            <Shortcut href="/studio" icon={BarChart3} label="Studio / Statistiques" />
            <Shortcut href="/solde" icon={WalletCards} label="Solde" />
            <Shortcut
              href={panneauSlug ? `/communaute/${panneauSlug}` : "/communautes?creer=1"}
              icon={Radio}
              label="Panneau"
            />
            <Shortcut href="/fil" icon={LayoutGrid} label="Fil / Publications" />
            <Shortcut href="/historique" icon={History} label="Historique" />
            <Shortcut href="/pro" icon={BadgeCheck} label={isPro ? "Pro actif" : "Pro"} />
            <Shortcut href="/parametres/paiements" icon={CreditCard} label="Paiements" />
            <button
              type="button"
              onClick={() => setPremiumOpen((open) => !open)}
              aria-expanded={premiumOpen}
              className={`shrink-0 snap-start inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                premiumOpen
                  ? "border-amber-400/50 bg-amber-400/15 text-amber-500"
                  : "border-white/10 bg-white/10 hover:bg-white/15"
              }`}
            >
              <Crown size={14} /> Premium
            </button>
          </div>
        )}

        {playlists.length > 0 && (
          <div className="mt-4 w-full max-w-md text-left">
            <p className="text-xs text-white/45 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ListMusic size={12} /> Playlist
            </p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {playlists.map((pl) => (
                <Link
                  key={pl.id}
                  href={`/playlists/${pl.id}`}
                  className="shrink-0 w-28 rounded-xl overflow-hidden bg-white/5 border border-white/10"
                >
                  <div className="aspect-square bg-white/10 relative">
                    {pl.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pl.coverUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30">
                        <ListMusic size={22} />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold px-2 py-1.5 truncate">
                    {pl.title}
                  </p>
                  <p className="text-[10px] text-white/40 px-2 pb-1.5">
                    {pl.itemCount} vidéo{pl.itemCount === 1 ? "" : "s"}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

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

        {(!isMe || premiumOpen) && (
          <div className="w-full max-w-md mt-4">
            <CreatorPremiumPanel
              username={username}
              isMe={isMe}
              isLoggedIn={isLoggedIn}
            />
          </div>
        )}
      </div>

      <AvatarLightbox
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        avatarUrl={avatarUrl}
        username={username}
        displayName={displayName}
      />

      <ProfileShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        username={username}
        displayName={displayName}
      />

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


function Shortcut({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof BarChart3;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="shrink-0 snap-start inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
    >
      <Icon size={14} className="text-[#25bcb7] dark:text-[#25f4ee]" />
      {label}
    </Link>
  );
}
