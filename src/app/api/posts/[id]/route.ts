import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const post = await prisma.post.findUnique({ where: { id: params.id } });
    if (!post || post.authorId !== session.id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }
    const body = await req.json();
    const content = String(body.content ?? post.content).trim().slice(0, 5000);
    const updated = await prisma.post.update({
      where: { id: post.id },
      data: { content },
    });
    return NextResponse.json({ post: { id: updated.id, content: updated.content } });
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
    const post = await prisma.post.findUnique({ where: { id: params.id } });
    if (!post || post.authorId !== session.id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }
    await prisma.post.delete({ where: { id: post.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
