import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const VALID_SOURCES = new Set([
  "pour_toi",
  "profil",
  "recherche",
  "abonnements",
  "autre",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();

    const video = await prisma.video.findUnique({
      where: { id: params.id },
      select: { id: true, durationSec: true },
    });
    if (!video) {
      return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
    }

    let body: {
      watchMs?: number;
      completed?: boolean;
      source?: string;
      progressPct?: number;
      eventId?: string;
    } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const watchMs =
      typeof body.watchMs === "number" && body.watchMs >= 0
        ? Math.min(Math.round(body.watchMs), 30 * 60 * 1000)
        : undefined;
    let progressPct =
      typeof body.progressPct === "number" && body.progressPct >= 0
        ? Math.min(100, Math.round(body.progressPct))
        : undefined;
    if (
      progressPct == null &&
      watchMs != null &&
      video.durationSec &&
      video.durationSec > 0
    ) {
      progressPct = Math.min(
        100,
        Math.round((watchMs / (video.durationSec * 1000)) * 100)
      );
    }
    let completed = Boolean(body.completed);
    if (!completed && progressPct != null && progressPct >= 95) completed = true;
    if (
      !completed &&
      watchMs != null &&
      video.durationSec &&
      video.durationSec > 0 &&
      watchMs >= video.durationSec * 1000 * 0.95
    ) {
      completed = true;
    }

    const source =
      body.source && VALID_SOURCES.has(body.source) ? body.source : "autre";

    // Upsert: update recent event for same user+video (2h), else create
    if (session) {
      if (body.eventId) {
        const existing = await prisma.watchEvent.findFirst({
          where: { id: body.eventId, userId: session.id, videoId: params.id },
        });
        if (existing) {
          const updated = await prisma.watchEvent.update({
            where: { id: existing.id },
            data: {
              watchMs: watchMs ?? existing.watchMs,
              completed: completed || existing.completed,
              progressPct:
                progressPct != null
                  ? Math.max(existing.progressPct ?? 0, progressPct)
                  : existing.progressPct,
              source: existing.source || source,
            },
          });
          return NextResponse.json({ ok: true, eventId: updated.id });
        }
      }

      const since = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const recent = await prisma.watchEvent.findFirst({
        where: {
          userId: session.id,
          videoId: params.id,
          watchedAt: { gte: since },
        },
        orderBy: { watchedAt: "desc" },
      });

      if (recent && (watchMs != null || progressPct != null || body.completed)) {
        const updated = await prisma.watchEvent.update({
          where: { id: recent.id },
          data: {
            watchMs:
              watchMs != null
                ? Math.max(recent.watchMs ?? 0, watchMs)
                : recent.watchMs,
            completed: completed || recent.completed,
            progressPct:
              progressPct != null
                ? Math.max(recent.progressPct ?? 0, progressPct)
                : recent.progressPct,
            source: recent.source || source,
          },
        });
        return NextResponse.json({ ok: true, eventId: updated.id });
      }

      if (recent && watchMs == null && progressPct == null) {
        // Heartbeat without progress — keep same event
        return NextResponse.json({ ok: true, eventId: recent.id });
      }

      const created = await prisma.watchEvent.create({
        data: {
          userId: session.id,
          videoId: params.id,
          watchMs: watchMs ?? null,
          completed,
          progressPct: progressPct ?? null,
          source,
        },
      });
      return NextResponse.json({ ok: true, eventId: created.id });
    }

    // Anonymous: create lightweight event (no user history)
    const created = await prisma.watchEvent.create({
      data: {
        userId: null,
        videoId: params.id,
        watchMs: watchMs ?? null,
        completed,
        progressPct: progressPct ?? null,
        source,
      },
    });
    return NextResponse.json({ ok: true, eventId: created.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
