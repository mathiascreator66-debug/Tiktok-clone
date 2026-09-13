import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { slug: string; postId: string } };

export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const post = await prisma.communityPost.findUnique({
      where: { id: params.postId },
      include: { community: { select: { slug: true } } },
    });
    if (!post || post.community.slug !== params.slug) {
      return NextResponse.json({ error: "Introuvable." }, { status: 404 });
    }
    const existing = await prisma.communityPostLike.findUnique({
      where: {
        postId_userId: { postId: post.id, userId: session.id },
      },
    });
    if (existing) {
      await prisma.communityPostLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }
    await prisma.communityPostLike.create({
      data: { postId: post.id, userId: session.id },
    });
    return NextResponse.json({ liked: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
