import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import ProfileVideoGrid from "@/components/ProfileVideoGrid";

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
      _count: { select: { videos: true, likes: true, reposts: true } },
    },
  });

  if (!user) notFound();

  const isMe = session?.id === user.id;
  const displayName = user.displayName || user.username;

  return (
    <div className="min-h-[100dvh] pt-6 md:pt-20 pb-20 px-4 max-w-2xl mx-auto">
      <div className="flex flex-col items-center text-center mb-8">
        <Avatar username={user.username} avatarUrl={user.avatarUrl} size={96} />
        <h1 className="text-2xl font-bold mt-4">@{user.username}</h1>
        {user.displayName && user.displayName !== user.username && (
          <p className="text-white/70 text-sm mt-0.5">{displayName}</p>
        )}
        {user.bio ? (
          <p className="text-white/70 text-sm mt-3 max-w-md whitespace-pre-wrap">
            {user.bio}
          </p>
        ) : isMe ? (
          <p className="text-white/35 text-sm mt-3 italic">
            Pas encore de bio — ajoutez-en une !
          </p>
        ) : null}
        <p className="text-white/40 text-sm mt-2">
          Membre depuis{" "}
          {new Date(user.createdAt).toLocaleDateString("fr-FR", {
            month: "long",
            year: "numeric",
          })}
        </p>
        <div className="flex gap-8 mt-4">
          <div>
            <p className="font-bold text-lg">{user._count.videos}</p>
            <p className="text-white/40 text-xs">Vidéos</p>
          </div>
          <div>
            <p className="font-bold text-lg">{user._count.reposts}</p>
            <p className="text-white/40 text-xs">Republications</p>
          </div>
          <div>
            <p className="font-bold text-lg">{user._count.likes}</p>
            <p className="text-white/40 text-xs">J&apos;aime donnés</p>
          </div>
        </div>
        {isMe && (
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <Link
              href={`/profil/${user.username}/modifier`}
              className="inline-block bg-white/10 hover:bg-white/15 border border-white/15 px-5 py-2 rounded-full text-sm font-semibold"
            >
              Modifier
            </Link>
            <Link
              href="/telecharger"
              className="inline-block bg-[#fe2c55] px-5 py-2 rounded-full text-sm font-semibold"
            >
              Publier
            </Link>
          </div>
        )}
      </div>

      <h2 className="font-semibold mb-3 border-b border-white/10 pb-2">
        Vidéos
      </h2>

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
