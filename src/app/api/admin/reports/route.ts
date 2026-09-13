import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { safeError } from "@/lib/safe-log";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const actor = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        isAdmin: true,
        isModerator: true,
        accountStatus: true,
        username: true,
      },
    });
    if (
      !actor ||
      actor.accountStatus !== "ACTIVE" ||
      (!actor.isAdmin && !actor.isModerator)
    ) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const body = await req.json();
    const reportId = String(body.reportId || "");
    const action = String(body.action || "");
    if (!reportId || !["resolve", "dismiss"].includes(action)) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const status = action === "resolve" ? "resolved" : "dismissed";
    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        resolvedAt: new Date(),
        resolvedById: actor.id,
      },
    });

    const log = await prisma.adminAction.create({
      data: {
        actorId: actor.id,
        action: `report_${status}`,
        targetType: "report",
        targetId: report.id,
        meta: JSON.stringify({
          targetType: report.targetType,
          targetId: report.targetId,
        }),
      },
      include: { actor: { select: { username: true } } },
    });

    return NextResponse.json({
      ok: true,
      actionLog: {
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        actor: log.actor.username,
        meta: log.meta,
      },
    });
  } catch (e) {
    safeError(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
