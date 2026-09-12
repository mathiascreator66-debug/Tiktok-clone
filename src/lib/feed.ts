import { prisma } from "./prisma";
import type { SessionUser } from "./auth";
import type { FeedVideo } from "./types";

type VideoWithRelations = {
  id: string;
  caption: string;
  videoUrl: string;
  createdAt: Date;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  likes: { id: string }[] | false;
  reposts: { id: string }[] | false;
  _count: { likes: number; comments: number; reposts: number };
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
    createdAt: v.createdAt.toISOString(),
    likeCount: v._count.likes,
    commentCount: v._count.comments,
    repostCount: v._count.reposts,
    likedByMe: Array.isArray(v.likes) ? v.likes.length > 0 : false,
    repostedByMe: Array.isArray(v.reposts) ? v.reposts.length > 0 : false,
    isOwner: session?.id === v.userId,
    user: v.user,
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
    },
  },
  likes: session
    ? { where: { userId: session.id }, select: { id: true } }
    : (false as const),
  reposts: session
    ? { where: { userId: session.id }, select: { id: true } }
    : (false as const),
  _count: { select: { likes: true, comments: true, reposts: true } },
});

async function buildMixedFeed(
  session: SessionUser | null,
  userIds?: string[]
): Promise<FeedVideo[]> {
  const videoWhere = userIds ? { userId: { in: userIds } } : undefined;
  const repostWhere = userIds ? { userId: { in: userIds } } : undefined;

  const [videos, reposts] = await Promise.all([
    prisma.video.findMany({
      where: videoWhere,
      orderBy: { createdAt: "desc" },
      include: videoInclude(session),
    }),
    prisma.repost.findMany({
      where: repostWhere,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true } },
        video: { include: videoInclude(session) },
      },
    }),
  ]);

  type Item = { sortAt: number; feedKey: string; item: FeedVideo };

  const items: Item[] = [
    ...videos.map((v) => ({
      sortAt: v.createdAt.getTime(),
      feedKey: `v-${v.id}`,
      item: mapVideo(v as VideoWithRelations, session),
    })),
    ...reposts.map((r) => ({
      sortAt: r.createdAt.getTime(),
      feedKey: `r-${r.id}`,
      item: mapVideo(r.video as VideoWithRelations, session, {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        user: r.user,
      }),
    })),
  ];

  items.sort((a, b) => b.sortAt - a.sortAt);
  return items.map((i) => i.item);
}

/** Fil mélangé : vidéos originales + republications, triés par date. */
export async function getMixedFeed(
  session: SessionUser | null
): Promise<FeedVideo[]> {
  return buildMixedFeed(session);
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
  return buildMixedFeed(session, ids);
}
