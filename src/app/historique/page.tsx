import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelativeFr } from "@/lib/time";

export const dynamic = "force-dynamic";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function HistoriquePage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const events = await prisma.watchEvent.findMany({
    where: { userId: session.id },
    orderBy: { watchedAt: "desc" },
    take: 120,
    include: {
      video: {
        select: {
          id: true,
          caption: true,
          videoUrl: true,
          user: { select: { username: true, displayName: true } },
        },
      },
    },
  });

  const seen = new Set<string>();
  const unique = events.filter((e) => {
    if (seen.has(e.videoId)) return false;
    seen.add(e.videoId);
    return true;
  });

  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const groups: { title: string; items: typeof unique }[] = [
    { title: "Aujourd’hui", items: [] },
    { title: "Hier", items: [] },
    { title: "Plus tôt", items: [] },
  ];

  for (const e of unique) {
    if (e.watchedAt >= todayStart) groups[0].items.push(e);
    else if (e.watchedAt >= yesterdayStart) groups[1].items.push(e);
    else groups[2].items.push(e);
  }

  return (
    <div className="min-h-[100dvh] pt-2 md:pt-16 pb-24 max-w-lg mx-auto px-3">
      <header className="flex items-center gap-2 h-12 mb-4">
        <Link
          href="/parametres"
          className="p-2 -ml-1 rounded-full hover:bg-white/10"
          aria-label="Retour"
        >
          <ArrowLeft size={22} />
        </Link>
        <h1 className="font-bold text-lg">Historique de visionnage</h1>
      </header>

      {unique.length === 0 ? (
        <div className="text-center py-16 px-4">
          <Clock size={36} className="mx-auto text-white/20 mb-3" />
          <p className="font-semibold">Rien pour le moment</p>
          <p className="text-white/45 text-sm mt-1">
            Les vidéos regardées plus de 2 secondes apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups
            .filter((g) => g.items.length)
            .map((g) => (
              <section key={g.title}>
                <h2 className="text-xs uppercase tracking-wide text-white/40 font-medium px-1 mb-2">
                  {g.title}
                </h2>
                <ul className="space-y-1">
                  {g.items.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/?v=${e.video.id}`}
                        className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5"
                      >
                        <div className="w-14 h-[76px] rounded overflow-hidden bg-white/5 shrink-0">
                          <video
                            src={e.video.videoUrl}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm line-clamp-2">{e.video.caption}</p>
                          <p className="text-xs text-white/45 mt-0.5">
                            @{e.video.user.username}
                          </p>
                          <p className="text-[11px] text-white/30 mt-0.5">
                            {formatRelativeFr(e.watchedAt.toISOString())}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
