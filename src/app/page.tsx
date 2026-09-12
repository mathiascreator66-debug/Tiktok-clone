import VideoFeed from "@/components/VideoFeed";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  const videos = await prisma.video.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
      likes: session
        ? { where: { userId: session.id }, select: { id: true } }
        : false,
      _count: { select: { likes: true, comments: true } },
    },
  });

  const feed = videos.map((v) => ({
    id: v.id,
    caption: v.caption,
    videoUrl: v.videoUrl,
    createdAt: v.createdAt.toISOString(),
    likeCount: v._count.likes,
    commentCount: v._count.comments,
    likedByMe: Array.isArray(v.likes) ? v.likes.length > 0 : false,
    user: v.user,
  }));

  return <VideoFeed initialVideos={feed} isLoggedIn={!!session} />;
}
