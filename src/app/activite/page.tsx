import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ActivityCenter from "@/components/ActivityCenter";

export const dynamic = "force-dynamic";

export default async function ActivitePage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [likes, comments, followers, saves] = await Promise.all([
    prisma.like.findMany({
      where: {
        createdAt: { gte: since },
        video: { userId: session.id },
        NOT: { userId: session.id },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        user: {
          select: { username: true, displayName: true, avatarUrl: true },
        },
        video: { select: { id: true, caption: true } },
      },
    }),
    prisma.comment.findMany({
      where: {
        createdAt: { gte: since },
        video: { userId: session.id },
        NOT: { userId: session.id },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        user: {
          select: { username: true, displayName: true, avatarUrl: true },
        },
        video: { select: { id: true, caption: true } },
      },
    }),
    prisma.follow.findMany({
      where: {
        followingId: session.id,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        follower: {
          select: { username: true, displayName: true, avatarUrl: true },
        },
      },
    }),
    prisma.bookmark.findMany({
      where: {
        createdAt: { gte: since },
        video: { userId: session.id },
        NOT: { userId: session.id },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        user: {
          select: { username: true, displayName: true, avatarUrl: true },
        },
        video: { select: { id: true, caption: true } },
      },
    }),
  ]);

  const items = [
    ...likes.map((l) => ({
      id: `like-${l.id}`,
      kind: "like" as const,
      at: l.createdAt.toISOString(),
      user: l.user,
      text: `a aimé votre vidéo « ${l.video.caption.slice(0, 40)}${
        l.video.caption.length > 40 ? "…" : ""
      } »`,
    })),
    ...comments.map((c) => ({
      id: `comment-${c.id}`,
      kind: "comment" as const,
      at: c.createdAt.toISOString(),
      user: c.user,
      text: `a commenté : « ${c.content.slice(0, 60)}${
        c.content.length > 60 ? "…" : ""
      } »`,
    })),
    ...followers.map((f) => ({
      id: `follow-${f.id}`,
      kind: "follow" as const,
      at: f.createdAt.toISOString(),
      user: f.follower,
      text: "a commencé à vous suivre",
    })),
    ...saves.map((s) => ({
      id: `save-${s.id}`,
      kind: "save" as const,
      at: s.createdAt.toISOString(),
      user: s.user,
      text: `a enregistré votre vidéo « ${s.video.caption.slice(0, 40)}${
        s.video.caption.length > 40 ? "…" : ""
      } »`,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-24 max-w-lg mx-auto px-3">
      <header className="flex items-center gap-2 h-12 mb-3">
        <Link
          href={`/profil/${session.username}`}
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg">Centre des activités</h1>
      </header>
      <ActivityCenter items={items} />
    </div>
  );
}
