import { prisma } from "@/lib/prisma";
import { ageFromBirthdate } from "@/lib/auth";
import { formatCount } from "@/lib/format";
import { formatEuros } from "@/lib/wallet-shared";
import {
  type StudioRange,
  RANGE_LABELS,
  SOURCE_LABELS,
} from "@/lib/studio-types";

export type { StudioRange };
export { RANGE_LABELS, SOURCE_LABELS };

export function parseRange(raw: string | null): StudioRange {
  if (raw === "1d" || raw === "7d" || raw === "28d") return raw;
  return "7d";
}

export function rangeDays(range: StudioRange): number {
  if (range === "1d") return 1;
  if (range === "7d") return 7;
  return 28;
}

/** Period window [start, end) and previous equivalent [prevStart, start). */
export function periodBounds(range: StudioRange, now = new Date()) {
  const days = rangeDays(range);
  const end = new Date(now);
  const start = new Date(now);
  if (range === "1d") {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setTime(end.getTime() - days * 24 * 60 * 60 * 1000);
  }
  const prevStart = new Date(start.getTime() - (end.getTime() - start.getTime()));
  return { start, end, prevStart, days };
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatPctDelta(pct: number | null): {
  text: string;
  positive: boolean | null;
} {
  if (pct === null) return { text: "—", positive: null };
  if (pct === 0) return { text: "0 %", positive: null };
  const positive = pct > 0;
  const sign = positive ? "+" : "";
  return { text: `${sign}${pct.toFixed(pct % 1 === 0 ? 0 : 1).replace(".", ",")} %`, positive };
}

export function formatWatchDuration(ms: number): string {
  if (!ms || ms < 0) return "0 s";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  if (min < 60) return rem ? `${min} min ${rem} s` : `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildDaySeries(
  start: Date,
  end: Date,
  counts: Map<string, number>
): { date: string; label: string; value: number }[] {
  const out: { date: string; label: string; value: number }[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  // include today even if end is "now"
  while (cur.getTime() <= endDay.getTime()) {
    const key = dayKey(cur);
    out.push({
      date: key,
      label: cur.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      value: counts.get(key) ?? 0,
    });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export async function assertVideoOwnerOrAdmin(
  videoId: string,
  userId: string
): Promise<{
  id: string;
  userId: string;
  caption: string;
  coverUrl: string | null;
  videoUrl: string;
  durationSec: number | null;
  createdAt: Date;
} | null> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      userId: true,
      caption: true,
      coverUrl: true,
      videoUrl: true,
      durationSec: true,
      createdAt: true,
    },
  });
  if (!video) return null;
  if (video.userId === userId) return video;
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (admin?.isAdmin) return video;
  return null;
}

export async function getCreatorVideoIds(userId: string): Promise<string[]> {
  const vids = await prisma.video.findMany({
    where: { userId },
    select: { id: true },
  });
  return vids.map((v) => v.id);
}

type CountOpts = {
  videoIds: string[];
  start: Date;
  end: Date;
};

export async function countViewsInRange({ videoIds, start, end }: CountOpts) {
  if (!videoIds.length) return 0;
  return prisma.watchEvent.count({
    where: {
      videoId: { in: videoIds },
      watchedAt: { gte: start, lt: end },
    },
  });
}

export async function countInteractionsInRange({
  videoIds,
  start,
  end,
}: CountOpts) {
  if (!videoIds.length) return 0;
  const [likes, comments, reposts, bookmarks] = await Promise.all([
    prisma.like.count({
      where: { videoId: { in: videoIds }, createdAt: { gte: start, lt: end } },
    }),
    prisma.comment.count({
      where: { videoId: { in: videoIds }, createdAt: { gte: start, lt: end } },
    }),
    prisma.repost.count({
      where: { videoId: { in: videoIds }, createdAt: { gte: start, lt: end } },
    }),
    prisma.bookmark.count({
      where: { videoId: { in: videoIds }, createdAt: { gte: start, lt: end } },
    }),
  ]);
  return likes + comments + reposts + bookmarks;
}

/** Net followers ≈ follows gained in period (no unfollow log). */
export async function countNetFollowersInRange(
  userId: string,
  start: Date,
  end: Date
) {
  return prisma.follow.count({
    where: {
      followingId: userId,
      createdAt: { gte: start, lt: end },
    },
  });
}

export async function sumEstimatedRevenueCents(
  userId: string,
  start: Date,
  end: Date
) {
  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      createdAt: { gte: start, lt: end },
      type: { in: ["tip_received"] },
    },
    select: { amountCents: true, type: true },
  });
  // tip_received is credit to creator; boost is a cost so exclude from "revenus"
  return txs.reduce((s, t) => s + Math.max(0, t.amountCents), 0);
}

export async function viewsByDay(
  videoIds: string[],
  start: Date,
  end: Date
) {
  if (!videoIds.length) return buildDaySeries(start, end, new Map());
  const events = await prisma.watchEvent.findMany({
    where: {
      videoId: { in: videoIds },
      watchedAt: { gte: start, lt: end },
    },
    select: { watchedAt: true },
  });
  const map = new Map<string, number>();
  for (const e of events) {
    const k = dayKey(e.watchedAt);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return buildDaySeries(start, end, map);
}

export async function getOverviewForUser(userId: string, range: StudioRange) {
  const { start, end, prevStart } = periodBounds(range);
  const videoIds = await getCreatorVideoIds(userId);

  const [
    views,
    prevViews,
    interactions,
    prevInteractions,
    followers,
    prevFollowers,
    revenueCents,
    prevRevenueCents,
    series,
    latestVideo,
  ] = await Promise.all([
    countViewsInRange({ videoIds, start, end }),
    countViewsInRange({ videoIds, start: prevStart, end: start }),
    countInteractionsInRange({ videoIds, start, end }),
    countInteractionsInRange({ videoIds, start: prevStart, end: start }),
    countNetFollowersInRange(userId, start, end),
    countNetFollowersInRange(userId, prevStart, start),
    sumEstimatedRevenueCents(userId, start, end),
    sumEstimatedRevenueCents(userId, prevStart, start),
    viewsByDay(videoIds, start, end),
    prisma.video.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        caption: true,
        coverUrl: true,
        videoUrl: true,
        createdAt: true,
        _count: { select: { watchEvents: true } },
      },
    }),
  ]);

  let latestViewsPeriod = 0;
  let latestViewsPrev = 0;
  if (latestVideo) {
    latestViewsPeriod = await prisma.watchEvent.count({
      where: {
        videoId: latestVideo.id,
        watchedAt: { gte: start, lt: end },
      },
    });
    latestViewsPrev = await prisma.watchEvent.count({
      where: {
        videoId: latestVideo.id,
        watchedAt: { gte: prevStart, lt: start },
      },
    });
  }

  return {
    range,
    period: { start: start.toISOString(), end: end.toISOString() },
    kpis: {
      views: {
        value: views,
        display: formatCount(views),
        delta: formatPctDelta(pctChange(views, prevViews)),
      },
      interactions: {
        value: interactions,
        display: formatCount(interactions),
        delta: formatPctDelta(pctChange(interactions, prevInteractions)),
      },
      followersNet: {
        value: followers,
        display: formatCount(followers),
        delta: formatPctDelta(pctChange(followers, prevFollowers)),
        note: "Approximatif (follows gagnés ; pas de journal d’unfollows)",
      },
      revenue: {
        value: revenueCents,
        display: formatEuros(revenueCents),
        delta: formatPctDelta(pctChange(revenueCents, prevRevenueCents)),
        note: "Pourboires reçus (crédits virtuels démo)",
      },
    },
    viewsSeries: series,
    latestContent: latestVideo
      ? {
          id: latestVideo.id,
          caption: latestVideo.caption,
          coverUrl: latestVideo.coverUrl,
          videoUrl: latestVideo.videoUrl,
          createdAt: latestVideo.createdAt.toISOString(),
          viewsTotal: latestVideo._count.watchEvents,
          viewsPeriod: latestViewsPeriod,
          viewsDelta: formatPctDelta(
            pctChange(latestViewsPeriod, latestViewsPrev)
          ),
        }
      : null,
  };
}

export async function getVideoAnalytics(
  videoId: string,
  ownerId: string,
  tab: "overview" | "viewers" | "engagement",
  range: StudioRange = "7d"
) {
  const video = await assertVideoOwnerOrAdmin(videoId, ownerId);
  if (!video) return null;

  const { start, end } = periodBounds(range);

  const [likeCount, commentCount, repostCount, bookmarkCount, viewCount] =
    await Promise.all([
      prisma.like.count({ where: { videoId } }),
      prisma.comment.count({ where: { videoId } }),
      prisma.repost.count({ where: { videoId } }),
      prisma.bookmark.count({ where: { videoId } }),
      prisma.watchEvent.count({ where: { videoId } }),
    ]);

  const header = {
    id: video.id,
    caption: video.caption,
    coverUrl: video.coverUrl,
    videoUrl: video.videoUrl,
    durationSec: video.durationSec,
    createdAt: video.createdAt.toISOString(),
    counts: {
      views: viewCount,
      likes: likeCount,
      comments: commentCount,
      shares: repostCount,
      bookmarks: bookmarkCount,
      viewsDisplay: formatCount(viewCount),
      likesDisplay: formatCount(likeCount),
      commentsDisplay: formatCount(commentCount),
      sharesDisplay: formatCount(repostCount),
      bookmarksDisplay: formatCount(bookmarkCount),
    },
  };

  if (tab === "overview") {
    const events = await prisma.watchEvent.findMany({
      where: { videoId, watchedAt: { gte: start, lt: end } },
      select: {
        watchMs: true,
        completed: true,
        progressPct: true,
        source: true,
        watchedAt: true,
        userId: true,
      },
    });

    const totalWatchMs = events.reduce((s, e) => s + (e.watchMs ?? 0), 0);
    const withMs = events.filter((e) => e.watchMs != null && e.watchMs > 0);
    const avgWatchMs =
      withMs.length > 0
        ? Math.round(withMs.reduce((s, e) => s + (e.watchMs || 0), 0) / withMs.length)
        : 0;
    const completedCount = events.filter((e) => e.completed).length;
    const completionRate =
      events.length > 0 ? Math.round((completedCount / events.length) * 1000) / 10 : 0;

    // Attribution followers: follows created in period by users who watched this video first in period
    const watcherIds = [
      ...new Set(events.map((e) => e.userId).filter(Boolean) as string[]),
    ];
    let newFollowersAttributed = 0;
    if (watcherIds.length) {
      newFollowersAttributed = await prisma.follow.count({
        where: {
          followingId: video.userId,
          followerId: { in: watcherIds },
          createdAt: { gte: start, lt: end },
        },
      });
    }

    const map = new Map<string, number>();
    for (const e of events) {
      const k = dayKey(e.watchedAt);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    const viewsSeries = buildDaySeries(start, end, map);

    // Retention curve: bucket by progressPct or approx from watchMs / duration
    const durationMs =
      video.durationSec && video.durationSec > 0
        ? video.durationSec * 1000
        : null;
    const buckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const retention: { pct: number; viewers: number; rate: number }[] = [];
    const n = events.length || 1;
    let retentionLimited = false;
    if (events.some((e) => e.progressPct != null || e.watchMs != null)) {
      for (const pct of buckets) {
        const reached = events.filter((e) => {
          let p = e.progressPct;
          if (p == null && e.watchMs != null && durationMs) {
            p = Math.min(100, Math.round((e.watchMs / durationMs) * 100));
          }
          if (p == null && e.completed) p = 100;
          if (p == null) return pct === 0;
          return p >= pct;
        }).length;
        retention.push({
          pct,
          viewers: reached,
          rate: Math.round((reached / n) * 1000) / 10,
        });
      }
    } else {
      retentionLimited = true;
      // best-effort flat-ish curve from completed flag only
      for (const pct of buckets) {
        const rate =
          pct === 0
            ? 100
            : pct === 100
              ? completionRate
              : Math.max(completionRate, 100 - pct * 0.7);
        retention.push({ pct, viewers: Math.round((rate / 100) * events.length), rate: Math.round(rate * 10) / 10 });
      }
    }

    const sourceCounts = new Map<string, number>();
    for (const e of events) {
      const s = e.source && SOURCE_LABELS[e.source] ? e.source : "autre";
      sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1);
    }
    const trafficSources = Object.keys(SOURCE_LABELS).map((key) => ({
      key,
      label: SOURCE_LABELS[key],
      count: sourceCounts.get(key) ?? 0,
      pct:
        events.length > 0
          ? Math.round(((sourceCounts.get(key) ?? 0) / events.length) * 1000) / 10
          : 0,
    }));

    return {
      header,
      range,
      tab,
      overview: {
        keyIndicators: {
          views: events.length,
          viewsDisplay: formatCount(events.length),
          totalWatchMs,
          totalWatchDisplay: formatWatchDuration(totalWatchMs),
          avgWatchMs,
          avgWatchDisplay: formatWatchDuration(avgWatchMs),
          completionRate,
          newFollowersAttributed,
        },
        viewsSeries,
        retention: {
          limited: retentionLimited,
          note: retentionLimited
            ? "Courbe approximative — la progression détaillée sera disponible au fur et à mesure des visionnages."
            : null,
          points: retention,
        },
        trafficSources,
      },
    };
  }

  if (tab === "viewers") {
    try {
      const events = await prisma.watchEvent.findMany({
        where: { videoId, watchedAt: { gte: start, lt: end } },
        select: { userId: true, watchedAt: true },
      });

      const loggedInEvents = events.filter((e) => e.userId);
      const anonCount = events.length - loggedInEvents.length;

      const distinctIds = [
        ...new Set(
          loggedInEvents
            .map((e) => e.userId)
            .filter((id): id is string => Boolean(id))
        ),
      ];
      let newViewers = 0;
      let returningViewers = 0;
      if (distinctIds.length) {
        // Avoid Prisma distinct quirks: fetch prior userIds then unique in JS
        const priorRows = await prisma.watchEvent.findMany({
          where: {
            videoId,
            userId: { in: distinctIds },
            watchedAt: { lt: start },
          },
          select: { userId: true },
        });
        const priorSet = new Set(
          priorRows.map((p) => p.userId).filter((id): id is string => Boolean(id))
        );
        for (const id of distinctIds) {
          if (priorSet.has(id)) returningViewers += 1;
          else newViewers += 1;
        }
      }

      let followerViewers = 0;
      let nonFollowerViewers = 0;
      if (distinctIds.length) {
        const follows = await prisma.follow.findMany({
          where: {
            followingId: video.userId,
            followerId: { in: distinctIds },
          },
          select: { followerId: true },
        });
        const followSet = new Set(follows.map((f) => f.followerId));
        for (const id of distinctIds) {
          if (followSet.has(id)) followerViewers += 1;
          else nonFollowerViewers += 1;
        }
      }

      const users = distinctIds.length
        ? await prisma.user.findMany({
            where: { id: { in: distinctIds } },
            select: { id: true, birthdate: true, country: true },
          })
        : [];

      const ageBuckets: Record<string, number> = {
        "18-24": 0,
        "25-34": 0,
        "35-44": 0,
        "45-54": 0,
        "55+": 0,
        inconnu: 0,
      };
      const countryCounts = new Map<string, number>();
      let withBirthdate = 0;
      let withCountry = 0;
      for (const u of users) {
        if (u.birthdate) {
          try {
            const age = ageFromBirthdate(
              u.birthdate instanceof Date ? u.birthdate : new Date(u.birthdate)
            );
            if (!Number.isFinite(age) || age < 0) {
              ageBuckets.inconnu += 1;
            } else {
              withBirthdate += 1;
              if (age < 25) ageBuckets["18-24"] += 1;
              else if (age < 35) ageBuckets["25-34"] += 1;
              else if (age < 45) ageBuckets["35-44"] += 1;
              else if (age < 55) ageBuckets["45-54"] += 1;
              else ageBuckets["55+"] += 1;
            }
          } catch {
            ageBuckets.inconnu += 1;
          }
        } else {
          ageBuckets.inconnu += 1;
        }
        if (u.country) {
          withCountry += 1;
          countryCounts.set(u.country, (countryCounts.get(u.country) ?? 0) + 1);
        }
      }

      const denom = Math.max(users.length, 1);
      const countries = [...countryCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([code, count]) => ({
          code,
          count,
          pct: users.length > 0 ? Math.round((count / denom) * 1000) / 10 : 0,
        }));

      return {
        header,
        range,
        tab,
        viewers: {
          totalWatches: events.length,
          distinctLoggedIn: distinctIds.length,
          anonymousWatches: anonCount,
          limitedNote:
            anonCount > 0 || distinctIds.length === 0
              ? "Données limitées — démographie basée sur les comptes connectés uniquement. Pas de genre enregistré."
              : "Données démographiques basées sur les spectateurs connectés. Le sexe n’est pas collecté.",
          types: {
            newViewers,
            returningViewers,
            followerViewers,
            nonFollowerViewers,
          },
          gender: {
            available: false,
            note: "Données limitées — le sexe n’est pas enregistré sur AfriVoix.",
          },
          age: {
            sampleSize: withBirthdate,
            buckets: Object.entries(ageBuckets).map(([label, count]) => ({
              label,
              count,
              pct:
                users.length > 0
                  ? Math.round((count / denom) * 1000) / 10
                  : 0,
            })),
          },
          locations: {
            sampleSize: withCountry,
            countries,
            note:
              withCountry === 0
                ? "Données limitées — peu de profils renseignent le pays."
                : null,
          },
        },
      };
    } catch (err) {
      console.error("viewers tab error", err);
      return {
        header,
        range,
        tab,
        viewers: {
          totalWatches: 0,
          distinctLoggedIn: 0,
          anonymousWatches: 0,
          limitedNote: "Données limitées — impossible d’agréger les spectateurs pour cette période.",
          types: {
            newViewers: 0,
            returningViewers: 0,
            followerViewers: 0,
            nonFollowerViewers: 0,
          },
          gender: {
            available: false,
            note: "Données limitées — le sexe n’est pas enregistré sur AfriVoix.",
          },
          age: { sampleSize: 0, buckets: [] },
          locations: {
            sampleSize: 0,
            countries: [],
            note: "Données limitées",
          },
        },
      };
    }
  }

  // engagement
  const [likes, comments, reposts, bookmarks, topComments] = await Promise.all([
    prisma.like.count({
      where: { videoId, createdAt: { gte: start, lt: end } },
    }),
    prisma.comment.count({
      where: { videoId, createdAt: { gte: start, lt: end } },
    }),
    prisma.repost.count({
      where: { videoId, createdAt: { gte: start, lt: end } },
    }),
    prisma.bookmark.count({
      where: { videoId, createdAt: { gte: start, lt: end } },
    }),
    prisma.comment.findMany({
      where: { videoId, parentId: null },
      orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { username: true, avatarUrl: true } },
        _count: { select: { likes: true, replies: true } },
      },
    }),
  ]);

  return {
    header,
    range,
    tab,
    engagement: {
      likes,
      comments,
      shares: reposts,
      saves: bookmarks,
      likesDisplay: formatCount(likes),
      commentsDisplay: formatCount(comments),
      sharesDisplay: formatCount(reposts),
      savesDisplay: formatCount(bookmarks),
      topComments: topComments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        username: c.user.username,
        avatarUrl: c.user.avatarUrl,
        likeCount: c._count.likes,
        replyCount: c._count.replies,
      })),
    },
  };
}

export { formatCount, formatEuros };
