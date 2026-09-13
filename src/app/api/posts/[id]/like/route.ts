import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const reaction = String(body.reaction || "like").slice(0, 16);
    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId: params.id, userId: session.id } },
    });
    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }
    await prisma.postLike.create({
      data: { postId: params.id, userId: session.id, reaction },
    });
    return NextResponse.json({ liked: true, reaction });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
