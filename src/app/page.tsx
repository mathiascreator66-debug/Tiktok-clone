import VideoFeed from "@/components/VideoFeed";
import { getSession } from "@/lib/auth";
import { getMixedFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const feed = await getMixedFeed(session);
  return <VideoFeed initialVideos={feed} isLoggedIn={!!session} />;
}
