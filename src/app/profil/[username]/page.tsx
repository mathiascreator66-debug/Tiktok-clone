import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import ProfileHeader from "@/components/ProfileHeader";
import ProfileTabs from "@/components/ProfileTabs";

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
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { likes: true, comments: true, reposts: true } },
        },
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
        hasActiveStories={activeStoryCount > 0}
      />

      <ProfileTabs
        videos={user.videos.map((v) => ({
          id: v.id,
          caption: v.caption,
          videoUrl: v.videoUrl,
          likeCount: v._count.likes,
          commentCount: v._count.comments,
        }))}
        likedVideos={likedVideos}
        isOwner={isMe}
        isMe={isMe}
      />
    </div>
  );
}
