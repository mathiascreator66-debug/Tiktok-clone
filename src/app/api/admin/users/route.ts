import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { safeError } from "@/lib/safe-log";

async function logAction(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  meta?: object
) {
  return prisma.adminAction.create({
    data: {
      actorId,
      action,
      targetType,
      targetId,
      meta: meta ? JSON.stringify(meta) : null,
    },
    include: { actor: { select: { username: true } } },
  });
}

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
      },
    });
    if (!actor || actor.accountStatus !== "ACTIVE" || !actor.isAdmin) {
      return NextResponse.json(
        { error: "Réservé aux administrateurs." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const userId = String(body.userId || "");
    const action = String(body.action || "");
    if (!userId || !action) {
      return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    // Moderators cannot ban admins — admins also shouldn't soft-lock themselves oddly
    if ((action === "ban" || action === "suspend") && target.isAdmin) {
      return NextResponse.json(
        { error: "Impossible de sanctionner un administrateur." },
        { status: 403 }
      );
    }

    let updated = target;
    if (action === "suspend") {
      updated = await prisma.user.update({
        where: { id: userId },
        data: { accountStatus: "SUSPENDED" },
      });
    } else if (action === "ban") {
      updated = await prisma.user.update({
        where: { id: userId },
        data: { accountStatus: "BANNED" },
      });
    } else if (action === "unban") {
      updated = await prisma.user.update({
        where: { id: userId },
        data: { accountStatus: "ACTIVE" },
      });
    } else if (action === "verify") {
      updated = await prisma.user.update({
        where: { id: userId },
        data: { isVerified: Boolean(body.value) },
      });
    } else if (action === "make_moderator") {
      updated = await prisma.user.update({
        where: { id: userId },
        data: { isModerator: true },
      });
    } else {
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
    }

    const log = await logAction(actor.id, action, "user", userId);

    return NextResponse.json({
      message: "Action effectuée",
      user: {
        id: updated.id,
        accountStatus: updated.accountStatus,
        isVerified: updated.isVerified,
        isModerator: updated.isModerator,
        isAdmin: updated.isAdmin,
      },
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
