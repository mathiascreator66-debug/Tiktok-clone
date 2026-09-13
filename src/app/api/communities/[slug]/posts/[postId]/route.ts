import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { slug: string; postId: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const post = await prisma.communityPost.findUnique({
      where: { id: params.postId },
      include: { community: true },
    });
    if (!post || post.community.slug !== params.slug) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    if (post.community.ownerId !== session.id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }
    const body = await req.json();
    if (body.pin === true) {
      await prisma.communityPost.update({
        where: { id: post.id },
        data: { pinnedAt: new Date() },
      });
    } else if (body.pin === false) {
      await prisma.communityPost.update({
        where: { id: post.id },
        data: { pinnedAt: null },
      });
    }
    return NextResponse.json({ ok: true });
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
    const post = await prisma.communityPost.findUnique({
      where: { id: params.postId },
      include: { community: true },
    });
    if (!post || post.community.slug !== params.slug) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    if (post.community.ownerId !== session.id && post.authorId !== session.id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }
    await prisma.communityPost.delete({ where: { id: post.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
