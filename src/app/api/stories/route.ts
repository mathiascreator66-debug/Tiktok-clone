import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  ensureUploadDir,
  saveUploadFile,
  isAllowedAudioFile,
  audioExtFor,
} from "@/lib/uploads";
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  MAX_STORY_DURATION_SEC,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_LABEL,
} from "@/lib/limits";
import { parseClientDuration, resolveDurationSeconds } from "@/lib/duration";
import { safeError } from "@/lib/safe-log";
import { parseGain, normalizeStoredGain, parseTrimMs } from "@/lib/media-edit";

const MAX_BYTES = MAX_UPLOAD_BYTES;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

function isImageOrMp4(mime: string, filename: string) {
  if (ALLOWED.has(mime)) return true;
  const ext = path.extname(filename).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm"].includes(ext);
}

export async function GET() {
  try {
    const session = await getSession();
    const now = new Date();

    const stories = await prisma.story.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        views: session
          ? { where: { userId: session.id }, select: { id: true } }
          : false,
      },
    });

    const followingIds = new Set<string>();
    if (session) {
      const follows = await prisma.follow.findMany({
        where: { followerId: session.id },
        select: { followingId: true },
      });
      follows.forEach((f) => followingIds.add(f.followingId));
    }

    type StoryRow = (typeof stories)[number];
    const byUser = new Map<
      string,
      {
        user: StoryRow["user"];
        stories: {
          id: string;
          mediaUrl: string;
          caption: string | null;
          soundName: string | null;
          soundUrl: string | null;
          originalVolume: number;
          soundVolume: number;
          soundTrimStartMs: number;
          soundTrimEndMs: number | null;
          createdAt: string;
          expiresAt: string;
          viewedByMe: boolean;
        }[];
      }
    >();

    for (const s of stories) {
      const viewedByMe =
        session && Array.isArray(s.views) ? s.views.length > 0 : false;
      const entry = byUser.get(s.userId) ?? {
        user: s.user,
        stories: [],
      };
      entry.stories.push({
        id: s.id,
        mediaUrl: s.mediaUrl,
        caption: s.caption,
        soundName: s.soundName,
        soundUrl: s.soundUrl,
        originalVolume: normalizeStoredGain(s.originalVolume ?? 1),
        soundVolume: normalizeStoredGain(s.soundVolume ?? 1),
        soundTrimStartMs: s.soundTrimStartMs ?? 0,
        soundTrimEndMs: s.soundTrimEndMs ?? null,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        viewedByMe,
      });
      byUser.set(s.userId, entry);
    }

    const groups = Array.from(byUser.values()).map((g) => ({
      user: g.user,
      stories: g.stories,
      hasUnviewed: g.stories.some((st) => !st.viewedByMe),
      isOwn: session ? g.user.id === session.id : false,
      isFollowing: followingIds.has(g.user.id),
    }));

    groups.sort((a, b) => {
      if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
      if (a.isFollowing !== b.isFollowing) return a.isFollowing ? -1 : 1;
      if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1;
      const aLast = a.stories[a.stories.length - 1]?.createdAt ?? "";
      const bLast = b.stories[b.stories.length - 1]?.createdAt ?? "";
      return bLast.localeCompare(aLast);
    });

    return NextResponse.json({
      groups: groups.map((g) => ({
        user: g.user,
        stories: g.stories,
        hasUnviewed: g.hasUnviewed,
      })),
    });
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
    const captionRaw = form.get("caption");
    const caption =
      captionRaw != null && String(captionRaw).trim()
        ? String(captionRaw).trim().slice(0, 200)
        : null;
    const isAiGeneratedRaw = String(form.get("isAiGenerated") ?? "false").trim().toLowerCase();
    const isAiGenerated = ["1", "true", "yes", "on"].includes(isAiGeneratedRaw);
    const file = form.get("media") as File | null;
    const soundRaw = String(form.get("soundName") || "").trim();
    const audioFile = form.get("audio") as File | null;
    const clientDuration = parseClientDuration(form.get("durationSec"));
    const originalVolume = parseGain(form.get("originalVolume"), 1);
    const soundVolume = parseGain(form.get("soundVolume"), 1);
    const soundTrimStartMs = parseTrimMs(form.get("soundTrimStartMs"), 0) ?? 0;
    let soundTrimEndMs = parseTrimMs(form.get("soundTrimEndMs"), null);
    if (soundTrimEndMs != null && soundTrimEndMs <= soundTrimStartMs) {
      soundTrimEndMs = null;
    }

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "Image ou vidéo requise." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop lourd (max ${MAX_UPLOAD_LABEL}).` },
        { status: 400 }
      );
    }
    if (!isImageOrMp4(file.type, file.name)) {
      return NextResponse.json(
        { error: "Formats acceptés : JPEG, PNG, WebP, MP4, WebM." },
        { status: 400 }
      );
    }

    if (
      clientDuration != null &&
      clientDuration > MAX_STORY_DURATION_SEC + 1
    ) {
      return NextResponse.json(
        {
          error: `Story trop longue (max ${MAX_STORY_DURATION_SEC / 60} minutes).`,
        },
        { status: 400 }
      );
    }

    if (audioFile && audioFile.size > 0) {
      if (!isAllowedAudioFile(audioFile)) {
        return NextResponse.json(
          { error: "Format audio non supporté (mp3, m4a, aac, wav, ogg)." },
          { status: 400 }
        );
      }
      if (audioFile.size > MAX_AUDIO_BYTES) {
        return NextResponse.json(
          { error: `Audio trop lourd (max ${MAX_AUDIO_LABEL}).` },
          { status: 400 }
        );
      }
    }

    const ext =
      path.extname(file.name) ||
      (file.type === "image/png"
        ? ".png"
        : file.type === "image/webp"
          ? ".webp"
          : file.type.startsWith("video/")
            ? ".mp4"
            : ".jpg");
    const filename = `${randomUUID()}${ext}`;
    const uploadsDir = await ensureUploadDir("stories");
    const fullPath = path.join(uploadsDir, filename);
    // Store as-is — no re-encode
    await saveUploadFile(file, fullPath);

    let durationSec: number | null = null;
    const isVid =
      file.type.startsWith("video/") ||
      [".mp4", ".webm"].includes(ext.toLowerCase());
    if (isVid) {
      durationSec = await resolveDurationSeconds(fullPath, clientDuration);
      if (durationSec != null && durationSec > MAX_STORY_DURATION_SEC + 1) {
        await unlink(fullPath).catch(() => {});
        return NextResponse.json(
          {
            error: `Story trop longue (max ${MAX_STORY_DURATION_SEC / 60} minutes).`,
          },
          { status: 400 }
        );
      }
    }

    let soundUrl: string | null = null;
    let soundName: string | null = soundRaw || null;
    if (audioFile && audioFile.size > 0) {
      const aExt = audioExtFor(audioFile);
      const aName = `${randomUUID()}${aExt}`;
      const audioDir = await ensureUploadDir("audio");
      await saveUploadFile(audioFile, path.join(audioDir, aName));
      soundUrl = `/uploads/audio/${aName}`;
      if (!soundName) {
        soundName =
          audioFile.name.replace(/\.[^.]+$/, "").trim().slice(0, 60) ||
          "Musique galerie";
      }
    }

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    const story = await prisma.story.create({
      data: {
        userId: session.id,
        mediaUrl: `/uploads/stories/${filename}`,
        caption,
        isAiGenerated,
        soundName,
        soundUrl,
        originalVolume,
        soundVolume: soundUrl ? soundVolume : 1,
        soundTrimStartMs: soundUrl ? soundTrimStartMs : 0,
        soundTrimEndMs: soundUrl ? soundTrimEndMs : null,
        durationSec: durationSec ?? null,
        createdAt,
        expiresAt,
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
      story: {
        id: story.id,
        mediaUrl: story.mediaUrl,
        caption: story.caption,
        isAiGenerated: story.isAiGenerated,
        soundName: story.soundName,
        soundUrl: story.soundUrl,
        originalVolume: story.originalVolume,
        soundVolume: story.soundVolume,
        soundTrimStartMs: story.soundTrimStartMs,
        soundTrimEndMs: story.soundTrimEndMs,
        createdAt: story.createdAt.toISOString(),
        expiresAt: story.expiresAt.toISOString(),
        viewedByMe: true,
        user: story.user,
      },
    });
  } catch (e) {
    safeError(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
