import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import ProfileVideoGrid from "@/components/ProfileVideoGrid";
import ProfileHeader from "@/components/ProfileHeader";

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

  // Total likes received on this user's videos
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
      />

      <div className="border-b border-white/10 mb-1">
        <div className="flex justify-center">
          <div className="px-6 py-2 border-b-2 border-white text-sm font-semibold">
            Vidéos
          </div>
        </div>
      </div>

      <ProfileVideoGrid
        videos={user.videos.map((v) => ({
          id: v.id,
          caption: v.caption,
          videoUrl: v.videoUrl,
          likeCount: v._count.likes,
          commentCount: v._count.comments,
        }))}
        isOwner={isMe}
      />
    </div>
  );
}
