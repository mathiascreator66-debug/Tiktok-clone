import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** AfriPulse — tendances locales par pays (hashtags + sons). */
export async function GET(req: NextRequest) {
  try {
    const country = (req.nextUrl.searchParams.get("country") || "BJ").toUpperCase().slice(0, 2);

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Videos from creators in that country, recent
    const videos = await prisma.video.findMany({
      where: {
        createdAt: { gte: since },
        user: { country },
      },
      select: {
        id: true,
        soundName: true,
        soundUrl: true,
        hashtags: { include: { hashtag: { select: { name: true } } } },
        _count: { select: { likes: true, watchEvents: true } },
      },
      take: 200,
    });

    const tagScore = new Map<string, number>();
    const soundScore = new Map<string, { score: number; soundUrl: string | null }>();

    for (const v of videos) {
      const weight = 1 + v._count.likes + Math.min(20, v._count.watchEvents);
      for (const h of v.hashtags) {
        const name = h.hashtag.name.toLowerCase();
        tagScore.set(name, (tagScore.get(name) || 0) + weight);
      }
      if (v.soundName) {
        const key = v.soundName;
        const prev = soundScore.get(key) || { score: 0, soundUrl: v.soundUrl };
        soundScore.set(key, {
          score: prev.score + weight,
          soundUrl: prev.soundUrl || v.soundUrl,
        });
      }
    }

    // Fallback curated if empty
    const hashtags = [...tagScore.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, score]) => ({ name, score }));

    const sounds = [...soundScore.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 8)
      .map(([name, v]) => ({ name, score: v.score, soundUrl: v.soundUrl }));

    if (hashtags.length === 0) {
      hashtags.push(
        { name: "afrique", score: 10 },
        { name: "benin", score: 9 },
        { name: "afrobeat", score: 8 },
        { name: "culture", score: 7 },
        { name: "tendance", score: 6 }
      );
    }

    return NextResponse.json({
      country,
      label:
        country === "BJ"
          ? "Bénin"
          : country === "CI"
            ? "Côte d’Ivoire"
            : country === "SN"
              ? "Sénégal"
              : country === "CM"
                ? "Cameroun"
                : country,
      hashtags,
      sounds,
      note: "AfriPulse — tendances 7 jours sur AfriVoix",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
