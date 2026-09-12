import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { username: string } };

async function targetUser(username: string) {
  return prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, username: true },
  });
}

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const target = await targetUser(params.username);
    if (!target) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    if (target.id === session.id) {
      return NextResponse.json({ error: "Impossible de vous suivre vous-même." }, { status: 400 });
    }
    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: session.id,
          followingId: target.id,
        },
      },
      update: {},
      create: { followerId: session.id, followingId: target.id },
    });
    const [followingCount, followerCount] = await Promise.all([
      prisma.follow.count({ where: { followerId: target.id } }),
      prisma.follow.count({ where: { followingId: target.id } }),
    ]);
    return NextResponse.json({
      following: true,
      counts: { following: followingCount, followers: followerCount },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const target = await targetUser(params.username);
    if (!target) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    await prisma.follow.deleteMany({
      where: { followerId: session.id, followingId: target.id },
    });
    const [followingCount, followerCount] = await Promise.all([
      prisma.follow.count({ where: { followerId: target.id } }),
      prisma.follow.count({ where: { followingId: target.id } }),
    ]);
    return NextResponse.json({
      following: false,
      counts: { following: followingCount, followers: followerCount },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
