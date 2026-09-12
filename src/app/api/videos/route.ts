import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        likes: session
          ? { where: { userId: session.id }, select: { id: true } }
          : false,
        _count: { select: { likes: true, comments: true } },
      },
    });

    const feed = videos.map((v) => ({
      id: v.id,
      caption: v.caption,
      videoUrl: v.videoUrl,
      createdAt: v.createdAt.toISOString(),
      likeCount: v._count.likes,
      commentCount: v._count.comments,
      likedByMe: Array.isArray(v.likes) ? v.likes.length > 0 : false,
      user: v.user,
    }));

    return NextResponse.json({ videos: feed });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }

    const form = await req.formData();
    const caption = String(form.get("caption") || "").trim();
    const file = form.get("video") as File | null;

    if (!caption) {
      return NextResponse.json({ error: "Légende requise." }, { status: 400 });
    }
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Vidéo requise." }, { status: 400 });
    }
    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "Le fichier doit être une vidéo." },
        { status: 400 }
      );
    }
    // 50 Mo max
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Vidéo trop lourde (max 50 Mo)." },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name) || ".mp4";
    const filename = `${randomUUID()}${ext}`;
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir, filename), buffer);

    const video = await prisma.video.create({
      data: {
        caption,
        videoUrl: `/uploads/${filename}`,
        userId: session.id,
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({
      video: {
        id: video.id,
        caption: video.caption,
        videoUrl: video.videoUrl,
        createdAt: video.createdAt.toISOString(),
        likeCount: 0,
        commentCount: 0,
        likedByMe: false,
        user: video.user,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
