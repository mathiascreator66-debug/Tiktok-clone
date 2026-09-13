import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { REPORT_REASONS } from "@/lib/limits";

const VALID = new Set<string>(REPORT_REASONS.map((r) => r.id));

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    const video = await prisma.video.findUnique({ where: { id: params.id } });
    if (!video) {
      return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = String(body.reason || "other");
    if (!VALID.has(reason)) {
      return NextResponse.json({ error: "Motif invalide." }, { status: 400 });
    }

    await prisma.report.create({
      data: { userId: session.id, videoId: params.id, reason },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
