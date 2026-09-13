import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { REPORT_REASONS, REPORT_TARGET_TYPES } from "@/lib/limits";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { safeError } from "@/lib/safe-log";

const VALID_REASON = new Set<string>(REPORT_REASONS.map((r) => r.id));
const VALID_TYPE = new Set<string>(REPORT_TARGET_TYPES);

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const limited = rateLimit(`report:${clientIp(req)}:${session.id}`, 20, 60_000);
    if (!limited.ok) {
      return NextResponse.json({ error: "Trop de signalements." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const targetType = String(body.targetType || "").toLowerCase();
    const targetId = String(body.targetId || "").trim();
    const reason = String(body.reason || "other");

    if (!VALID_TYPE.has(targetType) || !targetId) {
      return NextResponse.json({ error: "Cible invalide." }, { status: 400 });
    }
    if (!VALID_REASON.has(reason)) {
      return NextResponse.json({ error: "Motif invalide." }, { status: 400 });
    }

    let videoId: string | null = null;
    if (targetType === "video") {
      const v = await prisma.video.findUnique({ where: { id: targetId } });
      if (!v) return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
      videoId = v.id;
    } else if (targetType === "user") {
      const u = await prisma.user.findFirst({
        where: { OR: [{ id: targetId }, { username: targetId.toLowerCase() }] },
      });
      if (!u) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
      // normalize to user id
      body._resolved = u.id;
    } else if (targetType === "comment") {
      const c = await prisma.comment.findUnique({ where: { id: targetId } });
      if (!c) return NextResponse.json({ error: "Commentaire introuvable." }, { status: 404 });
      videoId = c.videoId;
    } else if (targetType === "story") {
      const s = await prisma.story.findUnique({ where: { id: targetId } });
      if (!s) return NextResponse.json({ error: "Story introuvable." }, { status: 404 });
    }

    const resolvedId =
      targetType === "user" && body._resolved ? String(body._resolved) : targetId;

    await prisma.report.create({
      data: {
        userId: session.id,
        targetType,
        targetId: resolvedId,
        videoId,
        reason,
        status: "open",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    safeError(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
