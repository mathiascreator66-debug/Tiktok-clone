import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getFollowingFeed, getMixedFeed } from "@/lib/feed";
import {
  ensureUploadDir,
  saveUploadFile,
  isAllowedAudioFile,
  audioExtFor,
} from "@/lib/uploads";
import {
  CAPTION_MAX_LENGTH,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  MAX_VIDEO_DURATION_SEC,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_LABEL,
} from "@/lib/limits";
import { originalSoundName, soundLabel } from "@/lib/sounds";
import { syncVideoHashtags } from "@/lib/hashtags";
import { parseClientDuration, resolveDurationSeconds } from "@/lib/duration";
import { safeError } from "@/lib/safe-log";
import {
  parseGain,
  parseTrimMs,
  serializeOverlays,
  serializeCaptions,
  parseOverlaysField,
  parseCaptionsField,
} from "@/lib/media-edit";

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
    const audioFile = form.get("audio") as File | null;
    const originalVolume = parseGain(form.get("originalVolume"), 1);
    const soundVolume = parseGain(form.get("soundVolume"), 1);
    const soundTrimStartMs = parseTrimMs(form.get("soundTrimStartMs"), 0) ?? 0;
    let soundTrimEndMs = parseTrimMs(form.get("soundTrimEndMs"), null);
    if (
      soundTrimEndMs != null &&
      soundTrimEndMs <= soundTrimStartMs
    ) {
      soundTrimEndMs = null;
    }
    const videoTrimStartMs = parseTrimMs(form.get("videoTrimStartMs"), 0) ?? 0;
    let videoTrimEndMs = parseTrimMs(form.get("videoTrimEndMs"), null);
    if (videoTrimEndMs != null && videoTrimEndMs <= videoTrimStartMs) {
      videoTrimEndMs = null;
    }
    const coverFile = form.get("cover") as File | null;
    const textOverlaysRaw = String(form.get("textOverlays") || "").trim();
    const captionsRaw = String(form.get("captions") || "").trim();
    const allowDownloadRaw = String(form.get("allowDownload") ?? "true").trim().toLowerCase();
    const allowDownload = !["0", "false", "no", "off"].includes(allowDownloadRaw);
    // Optional: reuse existing gallery sound by URL (no re-upload)
    const reuseSoundUrl = String(form.get("reuseSoundUrl") || "").trim();
    const reuseSoundName = String(form.get("reuseSoundName") || "").trim();
    const textOverlays = textOverlaysRaw
      ? serializeOverlays(parseOverlaysField(textOverlaysRaw))
      : null;
    const captions = captionsRaw
      ? serializeCaptions(parseCaptionsField(captionsRaw))
      : null;

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

    const ext = path.extname(file.name) || ".mp4";
    const filename = `${randomUUID()}${ext}`;
    const uploadsDir = await ensureUploadDir();
    const fullPath = path.join(uploadsDir, filename);
    // Store as-is — no server re-encode for fast publish
    await saveUploadFile(file, fullPath);

    // Prefer client HTML5 duration; skip slow ffprobe when available
    const durationSec = await resolveDurationSeconds(fullPath, clientDuration);

    if (durationSec != null && durationSec > MAX_VIDEO_DURATION_SEC + 1) {
      await unlink(fullPath).catch(() => {});
      return NextResponse.json(
        {
          error: `Vidéo trop longue (max ${MAX_VIDEO_DURATION_SEC / 60} minutes).`,
        },
        { status: 400 }
      );
    }

    let soundUrl: string | null = null;
    let soundName = soundLabel(soundRaw, session.username);

    if (audioFile && audioFile.size > 0) {
      const aExt = audioExtFor(audioFile);
      const aName = `${randomUUID()}${aExt}`;
      const audioDir = await ensureUploadDir("audio");
      await saveUploadFile(audioFile, path.join(audioDir, aName));
      soundUrl = `/uploads/audio/${aName}`;
      const base =
        audioFile.name.replace(/\.[^.]+$/, "").trim().slice(0, 60) ||
        "Musique galerie";
      soundName = soundRaw || base;
    } else if (
      reuseSoundUrl.startsWith("/uploads/audio/") &&
      !reuseSoundUrl.includes("..")
    ) {
      soundUrl = reuseSoundUrl;
      soundName = reuseSoundName || soundRaw || "Son réutilisé";
    }

    let coverUrl: string | null = null;
    if (coverFile && coverFile.size > 0) {
      if (
        !coverFile.type.startsWith("image/") &&
        !/\.(jpe?g|png|webp)$/i.test(coverFile.name)
      ) {
        return NextResponse.json(
          { error: "Couverture : image JPEG/PNG/WebP requise." },
          { status: 400 }
        );
      }
      if (coverFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Couverture trop lourde (max 5 Mo)." },
          { status: 400 }
        );
      }
      const cExt =
        path.extname(coverFile.name).toLowerCase() ||
        (coverFile.type.includes("png")
          ? ".png"
          : coverFile.type.includes("webp")
            ? ".webp"
            : ".jpg");
      const cName = `${randomUUID()}${cExt === ".jpeg" ? ".jpg" : cExt}`;
      const coverDir = await ensureUploadDir("covers");
      await saveUploadFile(coverFile, path.join(coverDir, cName));
      coverUrl = `/uploads/covers/${cName}`;
    }

    const video = await prisma.video.create({
      data: {
        caption,
        videoUrl: `/uploads/${filename}`,
        coverUrl,
        soundName: soundName || originalSoundName(session.username),
        soundUrl,
        originalVolume,
        soundVolume: soundUrl ? soundVolume : 1,
        soundTrimStartMs: soundUrl ? soundTrimStartMs : 0,
        soundTrimEndMs: soundUrl ? soundTrimEndMs : null,
        videoTrimStartMs,
        videoTrimEndMs,
        textOverlays,
        captions,
        allowDownload,
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
        coverUrl: video.coverUrl,
        soundName: video.soundName,
        soundUrl: video.soundUrl,
        originalVolume: video.originalVolume,
        soundVolume: video.soundVolume,
        soundTrimStartMs: video.soundTrimStartMs,
        soundTrimEndMs: video.soundTrimEndMs,
        videoTrimStartMs: video.videoTrimStartMs,
        videoTrimEndMs: video.videoTrimEndMs,
        textOverlays: parseOverlaysField(video.textOverlays),
        captions: parseCaptionsField(video.captions),
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
        allowDownload: video.allowDownload,
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
