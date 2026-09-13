import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { slug: string } };

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
    });
    if (!community) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    if (!community.isPublic && community.ownerId !== session.id) {
      return NextResponse.json({ error: "Panneau privé." }, { status: 403 });
    }
    await prisma.communityMember.upsert({
      where: {
        communityId_userId: {
          communityId: community.id,
          userId: session.id,
        },
      },
      create: {
        communityId: community.id,
        userId: session.id,
        role: community.ownerId === session.id ? "OWNER" : "MEMBER",
      },
      update: {},
    });
    return NextResponse.json({ ok: true, joined: true });
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
    const community = await prisma.community.findUnique({
      where: { slug: params.slug },
    });
    if (!community) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    if (community.ownerId === session.id) {
      return NextResponse.json(
        { error: "Le propriétaire ne peut pas quitter." },
        { status: 400 }
      );
    }
    await prisma.communityMember.deleteMany({
      where: { communityId: community.id, userId: session.id },
    });
    return NextResponse.json({ ok: true, joined: false });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
