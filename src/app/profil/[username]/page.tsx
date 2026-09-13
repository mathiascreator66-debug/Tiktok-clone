import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileTabs from "@/components/ProfileTabs";
import { isProActive } from "@/lib/wallet-shared";

export const dynamic = "force-dynamic";

export default async function ProfilPage({
  params,
}: {
  params: { username: string };
}) {
  const session = await getSession();
  const user = await prisma.user.findUnique({
    where: { username: params.username.toLowerCase() },
    include: {
      videos: {
        orderBy: [{ pinnedAt: "desc" }, { createdAt: "desc" }],
        include: {
          _count: { select: { likes: true, comments: true, reposts: true } },
        },
      },
      profileLinks: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, url: true, label: true },
      },
      _count: {
        select: {
          videos: true,
          following: true,
          followers: true,
        },
      },
    },
  });

  if (!user) notFound();

  const isMe = session?.id === user.id;
  const displayName = user.displayName || user.username;

  const likeAgg = await prisma.like.count({
    where: { video: { userId: user.id } },
  });

  let initialFollowing = false;
  if (session && !isMe) {
    const f = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.id,
          followingId: user.id,
        },
      },
    });
    initialFollowing = Boolean(f);
  }

  const now = new Date();
  const activeStoryCount = await prisma.story.count({
    where: { userId: user.id, expiresAt: { gt: now } },
  });

  let likedVideos: {
    id: string;
    caption: string;
    videoUrl: string;
    coverUrl: string | null;
    likeCount: number;
    commentCount: number;
  }[] = [];

  if (isMe) {
    const likes = await prisma.like.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        video: {
          include: {
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
    });
    likedVideos = likes.map((l) => ({
      id: l.video.id,
      caption: l.video.caption,
      videoUrl: l.video.videoUrl,
      coverUrl: l.video.coverUrl ?? null,
      likeCount: l.video._count.likes,
      commentCount: l.video._count.comments,
    }));
  }

  return (
    <div className="min-h-[100dvh] pt-4 md:pt-20 pb-20 px-4 max-w-2xl mx-auto">
      <ProfileHeader
        username={user.username}
        displayName={displayName}
        bio={user.bio}
        avatarUrl={user.avatarUrl}
        isMe={isMe}
        isLoggedIn={!!session}
        initialFollowing={initialFollowing}
        followingCount={user._count.following}
        followerCount={user._count.followers}
        likeCount={likeAgg}
        isPro={isProActive(user)}
        hasActiveStories={activeStoryCount > 0}
        links={user.profileLinks}
      />

      <ProfileTabs
        videos={user.videos.map((v) => ({
          id: v.id,
          caption: v.caption,
          videoUrl: v.videoUrl,
          coverUrl: v.coverUrl ?? null,
          likeCount: v._count.likes,
          commentCount: v._count.comments,
          pinned: Boolean(v.pinnedAt),
        }))}
        likedVideos={likedVideos}
        isOwner={isMe}
        isMe={isMe}
      />
    </div>
  );
}
