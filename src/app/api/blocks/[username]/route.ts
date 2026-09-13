import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { username: string } };

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const other = await prisma.user.findUnique({
      where: { username: params.username.toLowerCase() },
      select: { id: true },
    });
    if (!other) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    if (other.id === session.id) {
      return NextResponse.json({ error: "Impossible." }, { status: 400 });
    }
    await prisma.block.upsert({
      where: {
        blockerId_blockedId: {
          blockerId: session.id,
          blockedId: other.id,
        },
      },
      create: { blockerId: session.id, blockedId: other.id },
      update: {},
    });
    // Remove follow both ways
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: session.id, followingId: other.id },
          { followerId: other.id, followingId: session.id },
        ],
      },
    });
    return NextResponse.json({ blocked: true });
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
    const other = await prisma.user.findUnique({
      where: { username: params.username.toLowerCase() },
      select: { id: true },
    });
    if (!other) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    await prisma.block.deleteMany({
      where: { blockerId: session.id, blockedId: other.id },
    });
    return NextResponse.json({ blocked: false });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ blocked: false });
    }
    const other = await prisma.user.findUnique({
      where: { username: params.username.toLowerCase() },
      select: { id: true },
    });
    if (!other) return NextResponse.json({ blocked: false });
    const row = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: session.id,
          blockedId: other.id,
        },
      },
    });
    return NextResponse.json({ blocked: Boolean(row) });
  } catch {
    return NextResponse.json({ blocked: false });
  }
}
