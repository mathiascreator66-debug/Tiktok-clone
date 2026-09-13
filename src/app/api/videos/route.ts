import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getFollowingFeed, getMixedFeed } from "@/lib/feed";
import { ensureUploadDir } from "@/lib/uploads";
import {
  CAPTION_MAX_LENGTH,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  MAX_VIDEO_DURATION_SEC,
} from "@/lib/limits";
import { originalSoundName, soundLabel } from "@/lib/sounds";
import { syncVideoHashtags } from "@/lib/hashtags";
import { parseClientDuration, probeDurationSeconds } from "@/lib/duration";
import { safeError } from "@/lib/safe-log";

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
    safeError(e);
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
    const soundRaw = String(form.get("soundName") || "").trim();
    const clientDuration = parseClientDuration(form.get("durationSec"));

    if (!caption) {
      return NextResponse.json({ error: "Légende requise." }, { status: 400 });
    }
    if (caption.length > CAPTION_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Légende trop longue (max ${CAPTION_MAX_LENGTH}).` },
        { status: 400 }
      );
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
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Vidéo trop lourde (max ${MAX_UPLOAD_LABEL}).` },
        { status: 400 }
      );
    }

    if (clientDuration != null && clientDuration > MAX_VIDEO_DURATION_SEC + 1) {
      return NextResponse.json(
        {
          error: `Vidéo trop longue (max ${MAX_VIDEO_DURATION_SEC / 60} minutes).`,
        },
        { status: 400 }
      );
    }

    const ext = path.extname(file.name) || ".mp4";
    const filename = `${randomUUID()}${ext}`;
    const uploadsDir = await ensureUploadDir();
    const fullPath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);

    let durationSec = clientDuration;
    const probed = await probeDurationSeconds(fullPath);
    if (probed != null) durationSec = probed;

    if (durationSec != null && durationSec > MAX_VIDEO_DURATION_SEC + 1) {
      await unlink(fullPath).catch(() => {});
      return NextResponse.json(
        {
          error: `Vidéo trop longue (max ${MAX_VIDEO_DURATION_SEC / 60} minutes).`,
        },
        { status: 400 }
      );
    }

    const soundName = soundLabel(soundRaw, session.username);

    const video = await prisma.video.create({
      data: {
        caption,
        videoUrl: `/uploads/${filename}`,
        soundName: soundName || originalSoundName(session.username),
        userId: session.id,
        durationSec: durationSec ?? null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    const tags = await syncVideoHashtags(video.id, caption);

    return NextResponse.json({
      video: {
        id: video.id,
        caption: video.caption,
        videoUrl: video.videoUrl,
        soundName: video.soundName,
        createdAt: video.createdAt.toISOString(),
        likeCount: 0,
        commentCount: 0,
        repostCount: 0,
        bookmarkCount: 0,
        likedByMe: false,
        repostedByMe: false,
        bookmarkedByMe: false,
        isOwner: true,
        pinned: false,
        boostedUntil: null,
        hashtags: tags,
        user: video.user,
        repost: null,
      },
    });
  } catch (e) {
    safeError(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
