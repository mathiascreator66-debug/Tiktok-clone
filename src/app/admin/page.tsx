import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — AfriVoix" };

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const me = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      username: true,
      isAdmin: true,
      isModerator: true,
      accountStatus: true,
    },
  });
  if (!me || me.accountStatus !== "ACTIVE" || (!me.isAdmin && !me.isModerator)) {
    redirect("/");
  }

  const [userCount, videoCount, openReports, openTickets, suspended, banned] =
    await Promise.all([
      prisma.user.count(),
      prisma.video.count(),
      prisma.report.count({ where: { status: "open" } }),
      prisma.helpTicket.count({ where: { status: "open" } }),
      prisma.user.count({ where: { accountStatus: "SUSPENDED" } }),
      prisma.user.count({ where: { accountStatus: "BANNED" } }),
    ]);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      accountStatus: true,
      isAdmin: true,
      isModerator: true,
      isVerified: true,
      createdAt: true,
      country: true,
    },
  });

  const reports = await prisma.report.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      user: { select: { id: true, username: true } },
    },
  });

  const actions = await prisma.adminAction.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      actor: { select: { username: true } },
    },
  });

  const tickets = await prisma.helpTicket.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <AdminPanel
      me={{ id: me.id, username: me.username, isAdmin: me.isAdmin }}
      counts={{
        users: userCount,
        videos: videoCount,
        openReports,
        openTickets,
        suspended,
        banned,
      }}
      users={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
      reports={reports.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        reporter: r.user.username,
      }))}
      actions={actions.map((a) => ({
        id: a.id,
        createdAt: a.createdAt.toISOString(),
        action: a.action,
        targetType: a.targetType,
        targetId: a.targetId,
        actor: a.actor.username,
        meta: a.meta,
      }))}
      tickets={tickets.map((t) => ({
        id: t.id,
        createdAt: t.createdAt.toISOString(),
        email: t.email,
        subject: t.subject,
        message: t.message,
      }))}
    />
  );
}
