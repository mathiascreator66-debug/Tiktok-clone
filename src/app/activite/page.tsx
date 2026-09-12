import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Heart, MessageCircle, UserPlus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Avatar from "@/components/Avatar";
import { formatRelativeFr } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ActivitePage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [likes, comments, followers] = await Promise.all([
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
  ]);

  type Item = {
    id: string;
    kind: "like" | "comment" | "follow";
    at: Date;
    user: { username: string; displayName: string | null; avatarUrl: string | null };
    text: string;
  };

  const items: Item[] = [
    ...likes.map((l) => ({
      id: `like-${l.id}`,
      kind: "like" as const,
      at: l.createdAt,
      user: l.user,
      text: `a aimé votre vidéo « ${l.video.caption.slice(0, 40)}${
        l.video.caption.length > 40 ? "…" : ""
      } »`,
    })),
    ...comments.map((c) => ({
      id: `comment-${c.id}`,
      kind: "comment" as const,
      at: c.createdAt,
      user: c.user,
      text: `a commenté : « ${c.content.slice(0, 60)}${
        c.content.length > 60 ? "…" : ""
      } »`,
    })),
    ...followers.map((f) => ({
      id: `follow-${f.id}`,
      kind: "follow" as const,
      at: f.createdAt,
      user: f.follower,
      text: "a commencé à vous suivre",
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-24 max-w-lg mx-auto px-3">
      <header className="flex items-center gap-2 h-12 mb-4">
        <Link
          href={`/profil/${session.username}`}
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg">Centre des activités</h1>
      </header>

      {items.length === 0 ? (
        <p className="text-white/45 text-sm text-center py-16 px-4">
          Aucune activité récente sur vos vidéos (30 derniers jours).
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/profil/${item.user.username}`}
                className="flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-white/5"
              >
                <div className="relative shrink-0">
                  <Avatar
                    username={item.user.username}
                    avatarUrl={item.user.avatarUrl}
                    size={44}
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                      item.kind === "like"
                        ? "bg-[#fe2c55]"
                        : item.kind === "comment"
                          ? "bg-sky-500"
                          : "bg-emerald-500"
                    }`}
                  >
                    {item.kind === "like" ? (
                      <Heart size={11} fill="white" className="text-white" />
                    ) : item.kind === "comment" ? (
                      <MessageCircle size={11} className="text-white" />
                    ) : (
                      <UserPlus size={11} className="text-white" />
                    )}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm">
                    <span className="font-semibold">
                      {item.user.displayName || item.user.username}
                    </span>{" "}
                    <span className="text-white/70">{item.text}</span>
                  </p>
                  <p className="text-[11px] text-white/35 mt-0.5">
                    {formatRelativeFr(item.at.toISOString())}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
