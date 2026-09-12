import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import { formatCount } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AmisPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const following = await prisma.follow.findMany({
    where: { followerId: session.id },
    orderBy: { createdAt: "desc" },
    include: {
      following: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          _count: { select: { followers: true } },
        },
      },
    },
  });

  const followingIds = following.map((f) => f.followingId);
  const suggestions = await prisma.user.findMany({
    where: { id: { notIn: [session.id, ...followingIds] } },
    take: 12,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      _count: { select: { followers: true } },
    },
  });

  return (
    <div className="min-h-[100dvh] pt-4 md:pt-20 pb-24 px-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Amis</h1>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-white/50 mb-3 uppercase tracking-wide">
          Suivis ({following.length})
        </h2>
        {following.length === 0 ? (
          <p className="text-white/40 text-sm py-4">
            Vous ne suivez personne pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-1">
            {following.map((f) => {
              const u = f.following;
              return (
                <li
                  key={u.id}
                  className="flex items-center gap-3 py-2.5"
                >
                  <Link href={`/profil/${u.username}`} className="shrink-0">
                    <Avatar
                      username={u.username}
                      avatarUrl={u.avatarUrl}
                      size={48}
                    />
                  </Link>
                  <Link href={`/profil/${u.username}`} className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {u.displayName || u.username}
                    </p>
                    <p className="text-xs text-white/40 truncate">
                      @{u.username} · {formatCount(u._count.followers)} abonnés
                    </p>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/messages/${u.username}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-md bg-white/10 border border-white/15"
                    >
                      Message
                    </Link>
                    <FollowButton
                      username={u.username}
                      initialFollowing
                      size="sm"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-white/50 mb-3 uppercase tracking-wide">
          Suggestions
        </h2>
        {suggestions.length === 0 ? (
          <p className="text-white/40 text-sm py-4">Aucune suggestion.</p>
        ) : (
          <ul className="space-y-1">
            {suggestions.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-2.5">
                <Link href={`/profil/${u.username}`} className="shrink-0">
                  <Avatar
                    username={u.username}
                    avatarUrl={u.avatarUrl}
                    size={48}
                  />
                </Link>
                <Link href={`/profil/${u.username}`} className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {u.displayName || u.username}
                  </p>
                  <p className="text-xs text-white/40 truncate">
                    @{u.username}
                    {u.bio ? ` · ${u.bio}` : ""}
                  </p>
                </Link>
                <FollowButton
                  username={u.username}
                  initialFollowing={false}
                  size="sm"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
