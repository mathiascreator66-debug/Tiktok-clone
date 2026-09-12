import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { otherParticipantId } from "@/lib/messages";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    const tab = req.nextUrl.searchParams.get("tab") || "principal";
    // principal | demandes | nonlu

    const followingIds = new Set(
      (
        await prisma.follow.findMany({
          where: { followerId: session.id },
          select: { followingId: true },
        })
      ).map((f) => f.followingId)
    );

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ participantAId: session.id }, { participantBId: session.id }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        participantA: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        participantB: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    const withMeta = await Promise.all(
      conversations.map(async (c) => {
        const otherId = otherParticipantId(c, session.id);
        const other =
          c.participantAId === otherId ? c.participantA : c.participantB;
        const last = c.messages[0] || null;
        const unread = await prisma.message.count({
          where: {
            conversationId: c.id,
            senderId: { not: session.id },
            readAt: null,
          },
        });
        const iFollowThem = followingIds.has(otherId);
        return {
          id: c.id,
          updatedAt: c.updatedAt.toISOString(),
          other: {
            id: other.id,
            username: other.username,
            displayName: other.displayName,
            avatarUrl: other.avatarUrl,
          },
          lastMessage: last
            ? {
                id: last.id,
                body: last.body,
                senderId: last.senderId,
                createdAt: last.createdAt.toISOString(),
                mine: last.senderId === session.id,
                readAt: last.readAt?.toISOString() ?? null,
              }
            : null,
          unread,
          iFollowThem,
          isRequest: !iFollowThem,
        };
      })
    );

    let filtered = withMeta.filter((c) => c.lastMessage);
    if (tab === "demandes") {
      filtered = filtered.filter((c) => c.isRequest);
    } else if (tab === "nonlu") {
      filtered = filtered.filter((c) => c.unread > 0);
    } else {
      // principal = conversations where I follow them
      filtered = filtered.filter((c) => !c.isRequest);
    }

    // Activity stubs (nouveaux abonnés / likes) — counts only
    const recentFollowers = await prisma.follow.count({
      where: {
        followingId: session.id,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    const recentLikes = await prisma.like.count({
      where: {
        video: { userId: session.id },
        userId: { not: session.id },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    const principalCount = withMeta.filter((c) => c.lastMessage && !c.isRequest).length;
    const demandesCount = withMeta.filter((c) => c.lastMessage && c.isRequest).length;
    const nonluCount = withMeta.filter((c) => c.unread > 0).length;

    return NextResponse.json({
      conversations: filtered,
      tabs: {
        principal: principalCount,
        demandes: demandesCount,
        nonlu: nonluCount,
      },
      activity: {
        newFollowers: recentFollowers,
        likes: recentLikes,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
