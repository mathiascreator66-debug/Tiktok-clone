import { prisma } from "./prisma";
import type { SessionUser } from "./auth";
import type { FeedVideo } from "./types";
import { parseOverlaysField, parseCaptionsField, normalizeStoredGain } from "./media-edit";

type VideoWithRelations = {
  id: string;
  caption: string;
  videoUrl: string;
  coverUrl?: string | null;
  soundName: string | null;
  soundUrl: string | null;
  originalVolume?: number | null;
  soundVolume?: number | null;
  soundTrimStartMs?: number | null;
  soundTrimEndMs?: number | null;
  videoTrimStartMs?: number | null;
  videoTrimEndMs?: number | null;
  textOverlays?: string | null;
  captions?: string | null;
  pinnedAt: Date | null;
  boostedUntil: Date | null;
  createdAt: Date;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isPro: boolean;
    proUntil: Date | null;
    isVerified?: boolean;
  };
  likes: { id: string }[] | false;
  reposts: { id: string }[] | false;
  bookmarks: { id: string }[] | false;
  _count: { likes: number; comments: number; reposts: number; bookmarks: number };
  hashtags?: { hashtag: { name: string } }[];
};

function mapVideo(
  v: VideoWithRelations,
  session: SessionUser | null,
  repost?: FeedVideo["repost"]
): FeedVideo {
  return {
    id: v.id,
    caption: v.caption,
    videoUrl: v.videoUrl,
    coverUrl: v.coverUrl ?? null,
    soundName: v.soundName,
    soundUrl: v.soundUrl ?? null,
    originalVolume: normalizeStoredGain(v.originalVolume ?? 1),
    soundVolume: normalizeStoredGain(v.soundVolume ?? 1),
    soundTrimStartMs: typeof v.soundTrimStartMs === "number" ? v.soundTrimStartMs : 0,
    soundTrimEndMs: v.soundTrimEndMs ?? null,
    videoTrimStartMs: typeof v.videoTrimStartMs === "number" ? v.videoTrimStartMs : 0,
    videoTrimEndMs: v.videoTrimEndMs ?? null,
    textOverlays: parseOverlaysField(v.textOverlays ?? null),
    captions: parseCaptionsField(v.captions ?? null),
    createdAt: v.createdAt.toISOString(),
    likeCount: v._count.likes,
    commentCount: v._count.comments,
    repostCount: v._count.reposts,
    bookmarkCount: v._count.bookmarks,
    likedByMe: Array.isArray(v.likes) ? v.likes.length > 0 : false,
    repostedByMe: Array.isArray(v.reposts) ? v.reposts.length > 0 : false,
    bookmarkedByMe: Array.isArray(v.bookmarks) ? v.bookmarks.length > 0 : false,
    isOwner: session?.id === v.userId,
    pinned: Boolean(v.pinnedAt),
    boostedUntil: v.boostedUntil ? v.boostedUntil.toISOString() : null,
    hashtags: v.hashtags?.map((h) => h.hashtag.name) ?? [],
    user: {
      id: v.user.id,
      username: v.user.username,
      displayName: v.user.displayName,
      avatarUrl: v.user.avatarUrl,
      isVerified: Boolean(v.user.isVerified),
      isPro: Boolean(
        v.user.isPro &&
          (!v.user.proUntil || v.user.proUntil.getTime() > Date.now())
      ),
    },
    repost: repost ?? null,
  };
}

const videoInclude = (session: SessionUser | null) => ({
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      isPro: true,
      proUntil: true,
      isVerified: true,
    },
  },
  hashtags: { include: { hashtag: { select: { name: true } } } },
  likes: session
    ? { where: { userId: session.id }, select: { id: true } }
    : (false as const),
  reposts: session
    ? { where: { userId: session.id }, select: { id: true } }
    : (false as const),
  bookmarks: session
    ? { where: { userId: session.id }, select: { id: true } }
    : (false as const),
  _count: { select: { likes: true, comments: true, reposts: true, bookmarks: true } },
});

async function hiddenVideoIds(session: SessionUser | null): Promise<string[]> {
  if (!session) return [];
  const rows = await prisma.notInterested.findMany({
    where: { userId: session.id },
    select: { videoId: true },
  });
  return rows.map((r) => r.videoId);
}

/**
 * Engagement score for « Pour toi » (no ML):
 *
 *   score =
 *     likes
 *     + comments * 2
 *     + bookmarks
 *     + recentWatchBoost          // +15 if any watch in last 48h on same creator
 *     + followAffinity             // +25 if viewer follows creator
 *     + hashtagAffinity            // +8 per overlapping hashtag with recent watches (cap 40)
 *     + paidBoostBonus             // +1e12 while boostedUntil > now (sorts first)
 *     + recencyBonus               // max(0, 72 - ageHours)  // soft freshness
 *
 * Documented here so future waves can swap for real ranking without changing callers.
 */
function engagementScore(opts: {
  likes: number;
  comments: number;
  bookmarks: number;
  createdAt: Date;
  boostedUntil: Date | null;
  followsCreator: boolean;
  recentWatchCreator: boolean;
  hashtagOverlap: number;
}): number {
  const now = Date.now();
  const ageHours = (now - opts.createdAt.getTime()) / 3_600_000;
  const paidBoost =
    opts.boostedUntil && opts.boostedUntil.getTime() > now ? 1_000_000_000_000 : 0;
  const recentWatchBoost = opts.recentWatchCreator ? 15 : 0;
  const followAffinity = opts.followsCreator ? 25 : 0;
  const hashtagAffinity = Math.min(40, opts.hashtagOverlap * 8);
  const recencyBonus = Math.max(0, 72 - ageHours);
  return (
    opts.likes +
    opts.comments * 2 +
    opts.bookmarks +
    recentWatchBoost +
    followAffinity +
    hashtagAffinity +
    paidBoost +
    recencyBonus
  );
}

async function buildMixedFeed(
  session: SessionUser | null,
  userIds?: string[],
  rankByEngagement = false
): Promise<FeedVideo[]> {
  const hidden = await hiddenVideoIds(session);
  const videoWhere = {
    ...(userIds ? { userId: { in: userIds } } : {}),
    ...(hidden.length ? { id: { notIn: hidden } } : {}),
  };
  const repostWhere = {
    ...(userIds ? { userId: { in: userIds } } : {}),
    ...(hidden.length ? { videoId: { notIn: hidden } } : {}),
  };

  const [videos, reposts] = await Promise.all([
    prisma.video.findMany({
      where: videoWhere,
      orderBy: { createdAt: "desc" },
      include: videoInclude(session),
      take: rankByEngagement ? 200 : undefined,
    }),
    prisma.repost.findMany({
      where: repostWhere,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true } },
        video: { include: videoInclude(session) },
      },
      take: rankByEngagement ? 100 : undefined,
    }),
  ]);

  type Item = { sortAt: number; score: number; feedKey: string; item: FeedVideo };

  let followingSet = new Set<string>();
  const recentWatchCreators = new Set<string>();
  const affinityTags = new Set<string>();

  if (session && rankByEngagement) {
    const [follows, watches] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: session.id },
        select: { followingId: true },
      }),
      prisma.watchEvent.findMany({
        where: {
          userId: session.id,
          watchedAt: { gte: new Date(Date.now() - 48 * 3600_000) },
        },
        select: {
          video: {
            select: {
              userId: true,
              hashtags: { include: { hashtag: { select: { name: true } } } },
            },
          },
        },
        take: 50,
      }),
    ]);
    followingSet = new Set(follows.map((f) => f.followingId));
    for (const w of watches) {
      recentWatchCreators.add(w.video.userId);
      for (const h of w.video.hashtags) affinityTags.add(h.hashtag.name);
    }
  }

  const items: Item[] = [
    ...videos.map((v) => {
      const mapped = mapVideo(v as VideoWithRelations, session);
      const tags = (v as VideoWithRelations).hashtags?.map((h) => h.hashtag.name) ?? [];
      const overlap = tags.filter((t) => affinityTags.has(t)).length;
      const score = rankByEngagement
        ? engagementScore({
            likes: v._count.likes,
            comments: v._count.comments,
            bookmarks: v._count.bookmarks,
            createdAt: v.createdAt,
            boostedUntil: v.boostedUntil,
            followsCreator: followingSet.has(v.userId),
            recentWatchCreator: recentWatchCreators.has(v.userId),
            hashtagOverlap: overlap,
          })
        : v.createdAt.getTime();
      return {
        sortAt: v.createdAt.getTime(),
        score,
        feedKey: `v-${v.id}`,
        item: mapped,
      };
    }),
    ...reposts.map((r) => {
      const mapped = mapVideo(r.video as VideoWithRelations, session, {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        user: r.user,
      });
      const vv = r.video as VideoWithRelations;
      const tags = vv.hashtags?.map((h) => h.hashtag.name) ?? [];
      const overlap = tags.filter((t) => affinityTags.has(t)).length;
      const score = rankByEngagement
        ? engagementScore({
            likes: vv._count.likes,
            comments: vv._count.comments,
            bookmarks: vv._count.bookmarks,
            createdAt: r.createdAt,
            boostedUntil: vv.boostedUntil,
            followsCreator: followingSet.has(vv.userId),
            recentWatchCreator: recentWatchCreators.has(vv.userId),
            hashtagOverlap: overlap,
          }) * 0.9
        : r.createdAt.getTime();
      return {
        sortAt: r.createdAt.getTime(),
        score,
        feedKey: `r-${r.id}`,
        item: mapped,
      };
    }),
  ];

  if (rankByEngagement) {
    items.sort((a, b) => b.score - a.score || b.sortAt - a.sortAt);
  } else {
    const now = Date.now();
    const boostScore = (item: FeedVideo): number => {
      if (!item.boostedUntil) return 0;
      const t = new Date(item.boostedUntil).getTime();
      return t > now ? t : 0;
    };
    items.sort((a, b) => {
      const ba = boostScore(a.item);
      const bb = boostScore(b.item);
      if (ba !== bb) return bb - ba;
      return b.sortAt - a.sortAt;
    });
  }
  return items.map((i) => i.item);
}

/** Fil « Pour toi » : classement par score d'engagement (voir engagementScore). */
export async function getMixedFeed(
  session: SessionUser | null
): Promise<FeedVideo[]> {
  return buildMixedFeed(session, undefined, true);
}

/**
 * Fil Abonnements : originales + republications des comptes suivis.
 * Retourne [] si l'utilisateur ne suit personne.
 */
export async function getFollowingFeed(
  session: SessionUser
): Promise<FeedVideo[]> {
  const follows = await prisma.follow.findMany({
    where: { followerId: session.id },
    select: { followingId: true },
  });
  const ids = follows.map((f) => f.followingId);
  if (ids.length === 0) return [];
  return buildMixedFeed(session, ids, false);
}
