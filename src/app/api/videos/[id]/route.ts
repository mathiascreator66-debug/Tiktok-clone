import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    const video = await prisma.video.findUnique({ where: { id: params.id } });
    if (!video) {
      return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
    }
    if (video.userId !== session.id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }

    const body = await req.json();
    const caption = String(body.caption ?? "").trim();
    if (!caption) {
      return NextResponse.json({ error: "Légende requise." }, { status: 400 });
    }
    if (caption.length > 300) {
      return NextResponse.json(
        { error: "Légende trop longue (max 300)." },
        { status: 400 }
      );
    }

    const updated = await prisma.video.update({
      where: { id: params.id },
      data: { caption },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: { select: { likes: true, comments: true, reposts: true } },
      },
    });

    return NextResponse.json({
      video: {
        id: updated.id,
        caption: updated.caption,
        videoUrl: updated.videoUrl,
        createdAt: updated.createdAt.toISOString(),
        likeCount: updated._count.likes,
        commentCount: updated._count.comments,
        repostCount: updated._count.reposts,
        user: updated.user,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    const video = await prisma.video.findUnique({ where: { id: params.id } });
    if (!video) {
      return NextResponse.json({ error: "Vidéo introuvable." }, { status: 404 });
    }
    if (video.userId !== session.id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
    }

    await prisma.video.delete({ where: { id: params.id } });

    // Supprimer le fichier local s'il est dans /uploads/
    if (video.videoUrl.startsWith("/uploads/")) {
      const filename = path.basename(video.videoUrl);
      const filePath = path.join(process.cwd(), "public", "uploads", filename);
      try {
        await unlink(filePath);
      } catch {
        // Fichier déjà absent — ok
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
