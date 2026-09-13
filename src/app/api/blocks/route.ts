import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const rows = await prisma.block.findMany({
      where: { blockerId: session.id },
      orderBy: { createdAt: "desc" },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
    return NextResponse.json({
      blocks: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        user: r.blocked,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
