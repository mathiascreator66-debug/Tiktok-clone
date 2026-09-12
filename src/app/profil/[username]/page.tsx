import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { Heart, MessageCircle } from "lucide-react";

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
          _count: { select: { likes: true, comments: true } },
        },
      },
      _count: { select: { videos: true, likes: true } },
    },
  });

  if (!user) notFound();

  const isMe = session?.id === user.id;

  return (
    <div className="min-h-[100dvh] pt-6 md:pt-20 pb-20 px-4 max-w-2xl mx-auto">
      <div className="flex flex-col items-center text-center mb-8">
        <Avatar username={user.username} avatarUrl={user.avatarUrl} size={96} />
        <h1 className="text-2xl font-bold mt-4">@{user.username}</h1>
        <p className="text-white/40 text-sm mt-1">
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
            <p className="font-bold text-lg">{user._count.likes}</p>
            <p className="text-white/40 text-xs">J&apos;aime donnés</p>
          </div>
        </div>
        {isMe && (
          <form action="/api/auth/logout" method="POST" className="mt-4">
            <Link
              href="/telecharger"
              className="inline-block bg-[#fe2c55] px-6 py-2 rounded-full text-sm font-semibold mr-2"
            >
              Publier
            </Link>
          </form>
        )}
      </div>

      <h2 className="font-semibold mb-3 border-b border-white/10 pb-2">
        Vidéos
      </h2>

      {user.videos.length === 0 ? (
        <p className="text-white/40 text-center py-10 text-sm">
          Aucune vidéo publiée.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {user.videos.map((v) => (
            <Link
              key={v.id}
              href="/"
              className="relative aspect-[9/16] bg-white/5 rounded overflow-hidden group"
            >
              <video
                src={v.videoUrl}
                className="w-full h-full object-cover"
                muted
                preload="metadata"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                <div className="flex gap-2 text-xs">
                  <span className="flex items-center gap-0.5">
                    <Heart size={12} /> {v._count.likes}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <MessageCircle size={12} /> {v._count.comments}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
