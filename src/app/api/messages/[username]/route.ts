import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { findOrCreateConversation } from "@/lib/messages";
import { encryptMessageBody, decryptMessageBody } from "@/lib/crypto-messages";

type Ctx = { params: { username: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const other = await prisma.user.findUnique({
      where: { username: params.username.toLowerCase() },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });
    if (!other) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    if (other.id === session.id) {
      return NextResponse.json({ error: "Impossible de vous écrire." }, { status: 400 });
    }

    const conv = await findOrCreateConversation(session.id, other.id);

    // Mark their messages as read
    await prisma.message.updateMany({
      where: {
        conversationId: conv.id,
        senderId: { not: session.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    const messages = await prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: {
        sender: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    const iFollowThem = Boolean(
      await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.id,
            followingId: other.id,
          },
        },
      })
    );

    return NextResponse.json({
      conversationId: conv.id,
      other,
      iFollowThem,
      messages: messages.map((m) => ({
        id: m.id,
        body: decryptMessageBody(m.body),
        senderId: m.senderId,
        senderUsername: m.sender.username,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
        mine: m.senderId === session.id,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const other = await prisma.user.findUnique({
      where: { username: params.username.toLowerCase() },
      select: { id: true, username: true },
    });
    if (!other) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    if (other.id === session.id) {
      return NextResponse.json({ error: "Impossible de vous écrire." }, { status: 400 });
    }

    const body = await req.json();
    const text = String(body.body || "").trim();
    if (!text) {
      return NextResponse.json({ error: "Message vide." }, { status: 400 });
    }
    if (text.length > 2000) {
      return NextResponse.json(
        { error: "Message limité à 2000 caractères." },
        { status: 400 }
      );
    }

    const conv = await findOrCreateConversation(session.id, other.id);
    const message = await prisma.message.create({
      data: {
        conversationId: conv.id,
        senderId: session.id,
        body: encryptMessageBody(text),
      },
    });
    await prisma.conversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      message: {
        id: message.id,
        body: decryptMessageBody(message.body),
        senderId: message.senderId,
        createdAt: message.createdAt.toISOString(),
        readAt: null,
        mine: true,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
