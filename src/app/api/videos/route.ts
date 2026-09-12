import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getFollowingFeed, getMixedFeed } from "@/lib/feed";
import { ensureUploadDir } from "@/lib/uploads";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const feed = req.nextUrl.searchParams.get("feed");

    if (feed === "following") {
      if (!session) {
        return NextResponse.json(
          { error: "Connexion requise." },
          { status: 401 }
        );
      }
      const videos = await getFollowingFeed(session);
      return NextResponse.json({ videos });
    }

    const videos = await getMixedFeed(session);
    return NextResponse.json({ videos });
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
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Vidéo trop lourde (max 50 Mo)." },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name) || ".mp4";
    const filename = `${randomUUID()}${ext}`;
    const uploadsDir = await ensureUploadDir();
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadsDir, filename), buffer);

    const video = await prisma.video.create({
      data: {
        caption,
        videoUrl: `/uploads/${filename}`,
        userId: session.id,
      },
      include: {
        user: {
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
      video: {
        id: video.id,
        caption: video.caption,
        videoUrl: video.videoUrl,
        createdAt: video.createdAt.toISOString(),
        likeCount: 0,
        commentCount: 0,
        repostCount: 0,
        likedByMe: false,
        repostedByMe: false,
        isOwner: true,
        user: video.user,
        repost: null,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
